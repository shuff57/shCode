# Drives the real spaSHial sandbox page in headless Chrome and measures what the engine does,
# from INSIDE the sandboxed preview iframe (opaque origin, the same attributes as
# components/MoshionPreview.tsx): resting heights, the touch verbs, the API's assignment forms,
# error reporting with line numbers, keyboard input, and that every example runs clean and draws.
#
# NOT part of `npm test` -- needs a browser. Playwright is installed under Python here, not node.
#
#   node scripts/build-spashial-vendor.mjs     # once: Jolt + three.js into public/spashial/vendor/
#   python scripts/drive-spashial.py
#
# Physics itself is covered in Node by scripts/test-spashial-physics.mjs (in npm test). This file
# covers what only a browser can: the wasm loading under CORS, three.js, the sketch API on top.
#
# Headless Chrome here draws with software GL, so frame RATE means nothing and no test asserts on
# it. Tests wait on the sketch's own frameCount, never on wall-clock time.
import io, os, socket, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SHOTS = os.environ.get("SHOTS") or tempfile.mkdtemp(prefix="spashial-")
os.makedirs(SHOTS, exist_ok=True)
print("screenshots ->", SHOTS)
fails = []
def check(name, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + name + ("" if ok else " -- " + str(detail)))
    if not ok: fails.append(name)
def near(a, b, tol): return a is not None and abs(a - b) <= tol

def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p

if not os.path.exists(os.path.join(ROOT, "public/spashial/vendor/jolt/jolt-physics.wasm.wasm")):
    sys.exit("run `node scripts/build-spashial-vendor.mjs` first")
PORT = int(os.environ.get("PORT") or free_port())
server = subprocess.Popen(["node", os.path.join(ROOT, "scripts/spashial-serve.mjs"), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try: socket.create_connection(("127.0.0.1", PORT), timeout=0.2).close(); break
    except OSError: time.sleep(0.1)
URL = f"http://127.0.0.1:{PORT}/spashial/sandbox.html"

def runner(page):
    for f in page.frames:
        if "runner.html" in f.url: return f
    return None

def run(page, code, frames=1, timeout=90000):
    """Put `code` in the editor, press Run, wait until the sketch has stepped `frames` times."""
    page.fill("#code", code)
    page.click("#run")
    page.wait_for_function("document.getElementById('log').innerText.length > 0", timeout=timeout)
    f = runner(page)
    if "running" in page.inner_text("#log") and frames:
        f.wait_for_function(f"window.frameCount >= {frames}", timeout=timeout)
    return f

def log(page): return page.inner_text("#log")

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--enable-unsafe-swiftshader"])
        page = browser.new_page(viewport={"width": 1280, "height": 760})
        page.goto(URL)

        print("\n== the page and the sandbox")
        f = run(page, "function setup() { world.gravity.y = -10; new Floor(); new Cube(0, 4, 0); }", frames=5)
        check("the engine starts (Jolt wasm loads under the sandbox's CORS rules)", "running" in log(page), log(page))
        proof = f.evaluate("() => ({ origin: self.origin, storage: (() => { try { void localStorage.length; return false; } catch { return true; } })() })")
        check("the preview really is an opaque origin", proof["origin"] == "null" and proof["storage"], proof)
        check("the iframe has the production sandbox attributes",
              page.get_attribute("#frame", "sandbox") == "allow-scripts allow-downloads allow-modals", page.get_attribute("#frame", "sandbox"))

        print("\n== falling and resting (the default example)")
        f = run(page, page.evaluate("EXAMPLES['Falling cubes']"), frames=300)
        ys = f.evaluate("() => [...__spashial.assets].filter(a => a._shape !== 'box' || a._rec.def.w < 30).map(a => [a._shape, a._rec.def.h, a._cur.p[1]])")
        check("the cubes and the sphere come to rest on the floor", len(ys) == 3 and all(near(y, h / 2, 0.08) for _, h, y in ys), ys)

        print("\n== the touch verbs")
        f = run(page, """
window.__t = { collides: 0, colliding: 0, collided: 0, group: 0, overlaps: 0, overlapped: 0, zoneBlocked: false, cb: null };
let box, floor, zone, ball, g;
function setup() {
  world.gravity.y = -10;
  floor = new Floor();
  box = new Cube(0, 3, 0); box.bounciness = 0;
  g = new Group(); g.add(box);
  zone = new Cube(6, 2, 0, 4, 1, 4, 'none');
  ball = new Sphere(6, 5, 0, 0.6);
  window.__ball = ball;
}
function update() {
  if (box.collides(floor, (a, b) => { __t.cb = [a === box, b === floor]; })) __t.collides++;
  __t.colliding = Math.max(__t.colliding, box.colliding(floor));
  if (box.collided(floor)) __t.collided++;
  if (g.collides(floor)) __t.group++;
  if (ball.overlaps(zone)) __t.overlaps++;
  if (ball.overlapped(zone)) __t.overlapped++;
  if (ball.collides(zone)) __t.zoneBlocked = true;
}""", frames=300)
        t = f.evaluate("() => window.__t")
        check("collides is true on exactly one frame", t["collides"] == 1, t)
        check("colliding counts frames while resting", t["colliding"] > 120, t)
        check("collided has not fired while still touching", t["collided"] == 0, t)
        check("a Group answers collides for any member", t["group"] == 1, t)
        check("the callback gets (self, other)", t["cb"] == [True, True], t)
        check("a ball overlaps a sensor zone for several frames", t["overlaps"] > 5, t)
        check("overlapped fires once, when it leaves", t["overlapped"] == 1, t)
        check("a sensor is never a physical collision", t["zoneBlocked"] is False, t)
        check("and the ball fell straight through it", near(f.evaluate("() => __ball._cur.p[1]"), 0.3, 0.08), f.evaluate("() => __ball._cur.p[1]"))

        print("\n== the API's assignment forms (units per frame, degrees)")
        f = run(page, """
window.__r = {};
function setup() {
  world.gravity = [0, 0, 0];
  const a = new Cube(1, 2, 3);
  a.pos = [4, 5, 6]; a.pos.y += 1;
  __r.pos = [a.x, a.y, a.z];
  a.pos.set(1, 1, 1); __r.pos2 = [a.pos.x, a.pos.y, a.pos.z];
  a.vel.x = 0.1; __r.vel = a.vel.x;
  window.__a = a;
  const b = new Cube(10, 0, 0);
  b.rotation.y = 90; __r.rotY = b.rotation.y;
  b.rotation = [0, 45, 0]; __r.rotY2 = b.rotation.y;
  const s = new Sphere(0, 0, 0, 2); __r.sphere = [s.w, s.h, s.d, s.diameter];
  s.w = 3; __r.sphere2 = [s.w, s.h, s.d];
  __r.cone = (c => [c.w, c.h, c.d])(new Cone(0, 0, 0, 2));
  __r.capsule = (c => [c.w, c.h])(new Capsule(0, 0, 0, 1));
  __r.torus = (c => [c.w, c.h, c.d])(new Torus(0, 0, 0, 2));
  __r.mass = [new Cube(0, 0, 0, 1).mass, new Cube(0, 0, 0, 2).mass];
  const k = new Cube(0, 0, 0, 1, 'static'); __r.static = [k.collider, k.mass];
  const sh = new Cube(0, 0, 0); sh.shape = 'sphere'; __r.shape = sh.shape;
  __r.dist = new Cube(0, 0, 0).distanceTo(3, 4, 0);
  b.color = 'gold';
  const cl = b.clone(); __r.clone = [cl.x === b.x, cl.color === b.color, cl !== b];
  cl.remove(); // a clone is made on top of its original, and two solid bodies there push apart
  const r = new Cube(0, 0, 0); r.remove(); __r.removed = r.removed;
  __r.count = allAssets.length;
  __r.gravity = [world.gravity.x, world.gravity.y, world.gravity.z];
}
function update() { if (frameCount === 60) __r.x60 = __a.x; }""", frames=62)
        r = f.evaluate("() => window.__r")
        check("pos accepts an array and a live component (4,5,6 then y += 1)", r["pos"] == [4, 6, 6], r["pos"])
        check("pos.set moves all three", r["pos2"] == [1, 1, 1], r["pos2"])
        check("vel is units per frame and reads back what was set", near(r["vel"], 0.1, 1e-6), r["vel"])
        check("setting vel.x = 0.1 moves a body about 0.1 per frame (1 -> ~6.9 in 60 frames)", near(r.get("x60"), 6.9, 0.2), r.get("x60"))
        check("rotation is degrees and assignable as an array", near(r["rotY"], 90, 0.01) and near(r["rotY2"], 45, 0.01), (r["rotY"], r["rotY2"]))
        check("a sphere has one size", r["sphere"] == [2, 2, 2, 2] and r["sphere2"] == [3, 3, 3], (r["sphere"], r["sphere2"]))
        check("cone, capsule and torus default sizes", r["cone"] == [2, 2, 2] and r["capsule"] == [1, 2] and near(r["torus"][1], 0.7, 1e-9), (r["cone"], r["capsule"], r["torus"]))
        check("mass follows volume (1 m cube = 1 kg, 2 m cube = 8 kg)", near(r["mass"][0], 1, 0.01) and near(r["mass"][1], 8, 0.05), r["mass"])
        check("a static body has no mass", r["static"] == ["static", 0], r["static"])
        check("shape can be changed", r["shape"] == "sphere", r["shape"])
        check("distanceTo", near(r["dist"], 5, 1e-6), r["dist"])
        check("clone copies the look and is a new body", r["clone"] == [True, True, True], r["clone"])
        check("remove() marks it removed", r["removed"] is True, r["removed"])
        check("every asset is in allAssets", r["count"] >= 10, r["count"])
        check("world.gravity can be assigned as an array", r["gravity"] == [0, 0, 0], r["gravity"])

        print("\n== mistakes are reported in plain words, with a line number")
        run(page, "function setup() {\n  new Cube(1, 2);\n}", frames=0)
        page.wait_for_function("document.getElementById('log').innerText.includes('line')", timeout=20000)
        l = log(page)
        check("a wrong argument list explains itself", "takes x, y, z" in l, l)
        check("and names line 2", "line 2" in l, l)
        run(page, "function setup() {\n  world.gravty.y = 1;\n}", frames=0)
        page.wait_for_function("document.getElementById('log').innerText.includes('line')", timeout=20000)
        check("a typo points at its line", "line 2" in log(page) and "TypeError" in log(page), log(page))
        run(page, "function setup() {\n  const a = new Cube(0, 0, 0);\n  a.collider = 'bouncy';\n}", frames=0)
        page.wait_for_function("document.getElementById('log').innerText.includes('line')", timeout=20000)
        check("a bad collider lists the choices", "'dynamic', 'static', 'kinematic' or 'none'" in log(page), log(page))
        run(page, "function setup() { quality = 'ultra'; }", frames=0)
        page.wait_for_function("document.getElementById('log').innerText.includes('line')", timeout=20000)
        check("a bad quality lists the choices", "quality must be 'auto', 'low', 'medium' or 'high'" in log(page), log(page))
        run(page, "function setup() { new Torus(0, 0, 0, 1, 2, 1); }", frames=0)
        page.wait_for_function("document.getElementById('log').innerText.includes('line')", timeout=20000)
        check("a torus thicker than it is wide is refused", "torus needs h" in log(page), log(page))
        f = run(page, "let n = 0;\nfunction update() { n++; if (n === 3) throw new Error('boom'); }", frames=1)
        page.wait_for_function("document.getElementById('log').innerText.includes('boom')", timeout=20000)
        a = f.evaluate("() => window.frameCount"); time.sleep(0.6); b = f.evaluate("() => window.frameCount")
        check("an error in update() stops the loop (no 60-a-second flood)", a == b, (a, b))

        print("\n== the keyboard")
        f = run(page, "window.__k = { w: 0, space: 0 };\nfunction update() { if (kb.pressing('w')) __k.w++; if (kb.presses('space')) __k.space++; }", frames=5)
        page.click("#frame")
        base = f.evaluate("() => window.frameCount")
        page.keyboard.down("w")
        f.wait_for_function(f"window.frameCount >= {base + 40}", timeout=60000)
        page.keyboard.up("w")
        page.keyboard.press("Space")
        f.wait_for_function(f"window.frameCount >= {base + 60}", timeout=60000)
        k = f.evaluate("() => window.__k")
        check("holding W counts frames", k["w"] >= 20, k)
        check("Space presses exactly once", k["space"] == 1, k)

        print("\n== quality and the performance panel")
        f = run(page, "function setup() { showPerf(true); quality = 'low'; }", frames=10)
        s = f.evaluate("() => ({ scale: __spashial.renderScale, perf: __spashial.perf, mode: quality })")
        check("quality = 'low' fixes the render scale at 0.5", s["scale"] == 0.5 and s["mode"] == "low" and s["perf"] is True, s)
        f = run(page, "function setup() { new Floor(); new Cube(0, 1, 0); quality = 'high'; }", frames=10)
        check("quality = 'high' is 1 and never above (integrated graphics)", f.evaluate("() => __spashial.renderScale") == 1, "")
        check("three.js reports draw calls", f.evaluate("() => __spashial.renderer.info.render.calls") > 0, "")

        print("\n== every example runs clean and draws something")
        from PIL import Image
        names = page.evaluate("Object.keys(EXAMPLES)")
        for name in names:
            page.select_option("#examples", label=name)
            page.wait_for_function("document.getElementById('log').innerText.length > 0", timeout=90000)
            f = runner(page)
            f.wait_for_function("window.frameCount >= 200", timeout=120000)
            l = log(page)
            clean = "running" in l and "Error" not in l and "error" not in l.lower().replace("running", "")
            check(f"'{name}' runs without errors", clean, l)
            png = page.locator("#frame").screenshot()
            img = Image.open(io.BytesIO(png)).convert("RGB").resize((160, 90))
            pixels = img.get_flattened_data() if hasattr(img, "get_flattened_data") else img.getdata()
            colors = len(set(pixels))
            safe = "".join(c if c.isalnum() else "-" for c in name)
            open(os.path.join(SHOTS, safe + ".png"), "wb").write(png)
            check(f"'{name}' draws a real picture (not blank)", colors > 12, f"{colors} colours")

        print("\n== the shapes settle at their own half-height")
        f = run(page, page.evaluate("EXAMPLES['All the shapes']"), frames=420)
        rest = f.evaluate("() => [...__spashial.assets].filter(a => a._collider === 'dynamic').map(a => [a._shape, a._rec.def.h / 2, a._cur.p[1]])")
        check("all six shapes rest on the floor", len(rest) == 6 and all(near(y, h2, 0.1) for _, h2, y in rest), rest)

        print("\n== the walking example can jump only from the ground")
        f = run(page, page.evaluate("EXAMPLES['Walk and jump (WASD + Space)']"), frames=120)
        page.click("#frame")
        y0 = f.evaluate("() => __spashial.assets.values().next().value && [...__spashial.assets].find(a => a._rec.def.lockRotation)._cur.p[1]")
        page.keyboard.press("Space")
        f.wait_for_function("window.frameCount >= 140", timeout=60000)
        y1 = f.evaluate("() => [...__spashial.assets].find(a => a._rec.def.lockRotation)._cur.p[1]")
        check("Space on the ground makes the player jump", y1 > y0 + 0.4, (y0, y1))

        browser.close()
finally:
    server.terminate()

print("\n%s" % ("ALL PASSED" if not fails else "FAILED: " + ", ".join(fails)))
sys.exit(1 if fails else 0)
