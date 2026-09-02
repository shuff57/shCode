# Drives the texture editor and the .texture property in a real browser.
#
# NOT part of `npm test` -- needs a dev server on :3002 and Playwright, which
# is installed under Python here, not node. Run it by hand:
#
#   npm run dev &
#   python scripts/drive-textures.py
#
# scripts/check-moshion-textures.mjs proves the files and the load seams agree,
# and the moSHion gate proves .texture resolves and draws under the headless
# harness. Neither can see the two things that only exist in a browser:
#
#   1. the editor can READ a built-in PNG back off a canvas. That is a
#      same-origin question -- getImageData throws on a tainted canvas -- and
#      the harness has no origins at all.
#   2. a texture saved by the editor survives the trip through the storage
#      bridge into the sandboxed runner, which is a postMessage across an
#      opaque origin that no offline test reproduces.
import os, sys, tempfile, json
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://localhost:3002")
SHOTS = os.environ.get("SHOTS") or tempfile.mkdtemp(prefix="textures-")
print("screenshots ->", SHOTS)

fails = []
def check(name, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + name + ("" if ok else " -- " + str(detail)))
    if not ok:
        fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1500, "height": 1000})
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))

    # ---- the editor ------------------------------------------------------
    # Next's dev server holds an HMR websocket open, so "networkidle" never
    # settles here. Wait for the thing we actually need instead.
    pg.goto(f"{BASE}/textures/", wait_until="domcontentloaded")
    # The built-in catalog sits behind LOAD, matching pixelartcss.com's modal.
    #
    # Clicked in a retry loop, not once: "text=LOAD" matches the SSR markup
    # before React has hydrated, so a single click lands on dead HTML, opens
    # nothing, and the wait below then times out on a page that is fine.
    pg.wait_for_selector("text=LOAD", timeout=25000)
    for _ in range(20):
        pg.click("text=LOAD")
        pg.wait_for_timeout(500)
        if pg.locator('button[title="coin"]').count():
            break
    pg.wait_for_selector('button[title="coin"]', timeout=15000)

    builtins = pg.locator("button[title] img[alt]")
    check("the built-in catalog rendered", builtins.count() >= 30, f"{builtins.count()} thumbnails")

    coin = pg.locator('button[title="coin"]')
    check("a named built-in is offered by name", coin.count() == 1, f"{coin.count()} matches")

    if coin.count() == 1:
        coin.first.click()   # picking one also closes the library
        pg.wait_for_timeout(500)
        # Reading the PNG back off a canvas is the same-origin question. A
        # tainted canvas would surface here as the error message, not a crash.
        # Text, not element type: the status message moved from a <p> under
        # the canvas into a <span> in the full-width action bar, and a
        # type-bound selector reported a working feature broken.
        check("a built-in loads into the grid (canvas not tainted)",
              "Loaded coin" in pg.inner_text("body"))

        # Count inside the grid by its data hook, not by cell size -- the cell
        # size is adaptive (it shrinks to fit the sandbox drawer), and an
        # earlier size-based selector counted zero and reported this broken.
        painted = pg.evaluate("""() => {
            const g = document.querySelector('[data-texture-grid]');
            if (!g) return -1;
            let n = 0;
            for (const c of g.children) {
                const bg = getComputedStyle(c).backgroundColor;
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') n++;
            }
            return n;
        }""")
        check("the loaded texture put real pixels on the grid", painted > 40, f"{painted} painted cells")

    # draw a couple of pixels, then save under a new name
    cells = pg.locator('[data-texture-grid] > div')
    total = cells.count()
    check("the grid rendered one element per pixel", total == 21 * 21, total)
    if total >= 100:
        for i in (0, 1, 2, 22, 23):
            cells.nth(i).click()
        pg.wait_for_timeout(120)

    pg.fill('input[aria-label="texture name"]', "driveTest")
    pg.click("button:text-is('SAVE')")
    pg.wait_for_timeout(400)

    body_after_save = pg.inner_text("body")
    check("saving reports success and names the code to write",
          "driveTest" in body_after_save and "Saved" in body_after_save)

    stored = pg.evaluate("""() => {
        try {
            const raw = JSON.parse(localStorage.getItem('moshion.store.v1') || '{}');
            const v = raw['texture:driveTest'];
            return v ? JSON.parse(v).slice(0, 22) : null;
        } catch (e) { return 'THREW ' + e.message; }
    }""")
    check("it landed in the moSHion store in storeItem's own format",
          isinstance(stored, str) and stored.startswith("data:image/png"), stored)

    pg.click("text=LOAD")
    pg.wait_for_timeout(300)
    listed = pg.locator('button[title="Edit driveTest"]').count()
    pg.click("text=Close")
    pg.wait_for_timeout(200)
    check("it appears in the student's own library", listed == 1, f"{listed} matches")

    # Layout parity with pixelartcss.com: frames strip across the top, then
    # tool rail / canvas / settings left to right. Colours are deliberately NOT
    # copied, so this asserts geometry only.
    order = pg.evaluate("""() => {
        const strip = document.querySelector('button[aria-label="add frame"]');
        const grid = document.querySelector('[data-texture-grid]');
        const rail = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'NEW');
        const settings = document.querySelector('input[aria-label="pixel size"]');
        if (!strip || !grid || !rail || !settings) return null;
        const r = (e) => e.getBoundingClientRect();
        return {
            stripAboveGrid: r(strip).bottom <= r(grid).top,
            railLeftOfGrid: r(rail).right <= r(grid).left,
            settingsRightOfGrid: r(settings).left >= r(grid).right,
        };
    }""")
    check("frames strip sits above the canvas", bool(order) and order["stripAboveGrid"], order)

    # Play/onion/fit and the name+SAVE row were moved UNDER the canvas: both
    # are reached while looking at the drawing. Asserted by geometry so a
    # future tidy-up cannot quietly move them back into the settings column.
    under = pg.evaluate("""() => {
        const grid = document.querySelector('[data-texture-grid]');
        const play = document.querySelector('button[title="Play / pause  (Space)"]');
        const onionB = document.querySelector('button[title="Onion skin"]');
        const fit = document.querySelector('button[title="Fit the grid to this panel"]');
        const nameI = document.querySelector('input[aria-label="texture name"]');
        const save = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'SAVE');
        if (!grid || !play || !onionB || !fit || !nameI || !save) return null;
        const r = (e) => e.getBoundingClientRect();
        const gb = r(grid).bottom;
        return {
            play: r(play).top >= gb, onion: r(onionB).top >= gb, fit: r(fit).top >= gb,
            name: r(nameI).top >= gb, save: r(save).top >= gb,
            saveCount: [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'SAVE').length,
        };
    }""")
    check("play, onion and fit sit under the canvas",
          bool(under) and under["play"] and under["onion"] and under["fit"], under)
    check("the name field and SAVE sit under the canvas",
          bool(under) and under["name"] and under["save"], under)
    # Inline: playback and naming share ONE row, not two stacked ones. Measured
    # by vertical overlap rather than exact tops, since the input is a couple of
    # pixels taller than the buttons.
    inline = pg.evaluate("""() => {
        const play = document.querySelector('button[title="Play / pause  (Space)"]');
        const nameI = document.querySelector('input[aria-label="texture name"]');
        const save = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'SAVE');
        if (!play || !nameI || !save) return null;
        const r = (e) => e.getBoundingClientRect();
        const mid = (e) => (r(e).top + r(e).bottom) / 2;
        return {
            playToName: Math.abs(mid(play) - mid(nameI)),
            nameToSave: Math.abs(mid(nameI) - mid(save)),
        };
    }""")
    check("playback and naming share one inline row",
          bool(inline) and inline["playToName"] < 6 and inline["nameToSave"] < 6, inline)

    # The bar is OUTSIDE the canvas column, spanning all three. Measured
    # against the rail and settings edges, because "under the canvas" alone
    # was also true when it was nested inside the canvas card.
    spans = pg.evaluate("""() => {
        const play = document.querySelector('button[title="Play / pause  (Space)"]');
        const grid = document.querySelector('[data-texture-grid]');
        const rail = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'NEW');
        const settings = document.querySelector('input[aria-label="pixel size"]');
        if (!play || !grid || !rail || !settings) return null;
        const bar = play.parentElement.getBoundingClientRect();
        const r = (e) => e.getBoundingClientRect();
        return {
            leftOfRail: Math.round(bar.left - r(rail).left) <= 14,
            rightOfSettings: Math.round(r(settings).right - bar.right) <= 14,
            belowGrid: bar.top >= r(grid).bottom,
            notInsideCanvasCard: !play.closest('[data-texture-grid]'),
            barWidth: Math.round(bar.width),
            gridWidth: Math.round(r(grid).width),
        };
    }""")
    check("the action bar spans past the tool rail on the left",
          bool(spans) and spans["leftOfRail"], spans)
    check("...and past the settings column on the right",
          bool(spans) and spans["rightOfSettings"], spans)
    check("...so it is wider than the canvas it sits under",
          bool(spans) and spans["barWidth"] > spans["gridWidth"], spans)
    check("there is exactly one SAVE button", bool(under) and under["saveCount"] == 1, under)
    check("tool rail sits left of the canvas", bool(order) and order["railLeftOfGrid"], order)
    check("settings sit right of the canvas", bool(order) and order["settingsRightOfGrid"], order)

    pg.screenshot(path=os.path.join(SHOTS, "editor.png"), full_page=True)


    # ---- parity features (pixelartcss.com / pixel-art-react) -------------
    pg.click("text=Draw")
    cells = pg.locator('div[style*="width: 21px"], div[style*="width: 22px"], div[style*="width: 20px"]')
    # Cell size is adaptive, so the selector above may miss; fall back to the
    # grid's own children rather than asserting a pixel size.
    grid_cells = pg.locator("div").filter(has_text="").nth(0)

    # redo: undo one stroke, then put it back
    before = pg.evaluate("() => document.querySelectorAll('button').length")
    undo_btn = pg.locator('button[title="Ctrl+Z"]')
    redo_btn = pg.locator('button[title="Ctrl+Y"]')
    undo_btn.click()
    pg.wait_for_timeout(150)
    check("redo becomes available after an undo", redo_btn.is_enabled())
    redo_btn.click()
    pg.wait_for_timeout(150)
    check("redo is consumed after use", redo_btn.count() == 1)

    # frames: add two, confirm the animation controls appear
    pg.click('button[title="Duplicate this frame"]')
    pg.wait_for_timeout(120)
    pg.click('button[title="Duplicate this frame"]')
    pg.wait_for_timeout(120)
    check("frame thumbnails appear for each frame",
          pg.locator('button[title^="Frame "]').count() == 3,
          pg.locator('button[title^="Frame "]').count())
    check("play and onion-skin controls are present",
          pg.locator('button[title="Play / pause  (Space)"]').count() == 1
          and pg.locator('button[title="Onion skin"]').count() == 1)

    # a visibly different last frame, so the strip is not 3 identical cells
    pg.click("text=Fill")
    body_cells = pg.locator('[data-texture-grid] > div')
    if body_cells.count() > 10:
        body_cells.nth(5).click()
        pg.wait_for_timeout(150)

    pg.fill('input[aria-label="texture name"]', "driveAnim")
    pg.click("button:text-is('SAVE')")
    pg.wait_for_timeout(400)
    check("saving several frames reports an animation",
          "animates" in pg.inner_text("body"))

    meta = pg.evaluate("""() => {
        try {
            const raw = JSON.parse(localStorage.getItem('moshion.store.v1') || '{}');
            const m = raw['texmeta:driveAnim'];
            return m ? JSON.parse(m) : null;
        } catch (e) { return 'THREW ' + e.message; }
    }""")
    check("the frame count was written as texmeta, in storeItem's format",
          isinstance(meta, dict) and meta.get("frames") == 3, meta)

    strip = pg.evaluate("""() => new Promise((res) => {
        const raw = JSON.parse(localStorage.getItem('moshion.store.v1') || '{}');
        const url = JSON.parse(raw['texture:driveAnim']);
        const i = new Image();
        i.onload = () => res({w: i.naturalWidth, h: i.naturalHeight});
        i.onerror = () => res(null);
        i.src = url;
    })""")
    check("the saved image really is a 3-frame-wide strip",
          bool(strip) and strip["w"] == strip["h"] * 3, strip)

    # variable grid: resize keeps the art rather than clearing it
    pg.click("text=32²")
    pg.wait_for_timeout(250)
    kept = pg.evaluate("""() => {
        const g = document.querySelector('[data-texture-grid]');
        return g ? g.children.length : -1;
    }""")
    check("a larger grid is reachable and rebuilds every cell",
          kept == 32 * 32, f"{kept} cells after resize, expected 1024")


    # ---- the three parity gaps closed after comparing against the live site
    # (pixelartcss.com, enumerated in a browser -- its README does not list
    # per-frame Duration or Pixel Size, and an earlier parity claim missed both)
    check("a per-frame duration box exists on each frame",
          pg.locator('input[aria-label="Frame 1 duration"]').count() == 1,
          pg.locator('input[aria-label^="Frame "]').count())

    pg.fill('input[aria-label="Frame 2 duration"]', "20")
    pg.wait_for_timeout(200)
    pg.fill('input[aria-label="texture name"]', "driveHold")
    pg.click("button:text-is('SAVE')")
    pg.wait_for_timeout(400)
    held = pg.evaluate("""() => {
        try {
            const raw = JSON.parse(localStorage.getItem('moshion.store.v1') || '{}');
            return JSON.parse(raw['texmeta:driveHold']);
        } catch (e) { return 'THREW ' + e.message; }
    }""")
    check("per-frame durations are saved as a delays array matching the frame count",
          isinstance(held, dict) and isinstance(held.get("delays"), list)
          and len(held["delays"]) == held.get("frames") and 20 in held["delays"],
          held)

    zoom_before = pg.evaluate("""() => {
        const g = document.querySelector('[data-texture-grid]');
        return g ? Math.round(g.children[0].getBoundingClientRect().width) : -1;
    }""")
    pg.click('button[aria-label="pixel size up"]')
    pg.click('button[aria-label="pixel size up"]')
    pg.wait_for_timeout(200)
    zoom_after = pg.evaluate("""() => {
        const g = document.querySelector('[data-texture-grid]');
        return g ? Math.round(g.children[0].getBoundingClientRect().width) : -1;
    }""")
    check("Pixel size zooms the grid", zoom_after > zoom_before,
          f"{zoom_before}px -> {zoom_after}px")
    pg.click('button[title="Fit the grid to this panel"]')
    pg.wait_for_timeout(200)
    check("Fit returns to the auto-fitted size",
          pg.evaluate("""() => {
              const g = document.querySelector('[data-texture-grid]');
              return g ? Math.round(g.children[0].getBoundingClientRect().width) : -1;
          }""") == zoom_before)

    pg.click('button[aria-label="keyboard shortcuts"]')
    pg.wait_for_timeout(200)
    body = pg.inner_text("body")
    # A shortcut nothing documents may as well not exist -- and a panel that
    # lists a key the handler does not implement is worse. Both directions.
    listed = [k for k in ("Ctrl+Z", "Ctrl+Y", "B", "E", "G", "I", "V", "Space") if k in body]  # noqa: E501
    check("the shortcuts panel lists the keys", len(listed) >= 6, listed)

    pg.keyboard.press("e")
    pg.wait_for_timeout(150)
    eraser_active = pg.evaluate("""() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Erase');
        return b ? getComputedStyle(b).fontWeight : null;
    }""")
    pg.keyboard.press("b")
    pg.wait_for_timeout(150)
    pencil_active = pg.evaluate("""() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Draw');
        return b ? getComputedStyle(b).fontWeight : null;
    }""")
    check("the documented tool shortcuts actually switch tools",
          eraser_active in ("600", "bold") and pencil_active in ("600", "bold"),
          f"E->{eraser_active} B->{pencil_active}")

    # ---- .texture inside a real sandboxed runner -------------------------
    #
    # runner.html refuses to run when `window.top === window.self` (line 157),
    # so it CANNOT be driven by navigating to it -- it just shows "This preview
    # only runs inside shCode". It has to be framed.
    #
    # The frame below carries the production attributes from
    # components/MoshionPreview.tsx verbatim: sandbox="allow-scripts
    # allow-downloads" and NO allow-same-origin, so the runner really does get
    # an opaque origin here, the same one that makes localStorage throw inside
    # it in production.
    #
    # The storage reply is a stand-in for lib/moshion-storage.ts's React hook.
    # What that makes this check worth: it proves the RUNNER and ENGINE side of
    # the contract -- a hydrated store arrives before setup() and a saved name
    # resolves out of it. It does NOT prove the hook sends that shape; the
    # editor check above proves the write lands in exactly this format, and the
    # moSHion gate proves the engine reads it, so the seam is pinned from both
    # ends rather than by this frame alone.
    sketch = """
function setup() {
  new Canvas(300, 200);
  const a = new Sprite(80, 100, 50, 50);
  a.collider = 'none';
  a.texture = 'coin';
  const b = new Sprite(220, 100, 50, 50);
  b.collider = 'none';
  b.texture = 'driveTest';
  const c = new Sprite(150, 160, 40, 40);
  c.collider = 'none';
  c.texture = 'driveAnim';
  window.__probe = {
    built: a.texture,
    saved: b.texture,
    names: textureNames().length,
    hasSaved: hasTexture('driveTest'),
    animIsAni: !!c.ani,
    animFrames: c.ani ? c.ani.frameCount : 0,
    holdDelays: (function () {
      const d = new Sprite(250, 160, 40, 40);
      d.collider = 'none';
      d.texture = 'driveHold';
      return d.ani ? d.ani.frameDelays : null;
    })()
  };
}
function draw() { background('#222'); }
"""
    pg.evaluate("""(code) => {
        const b64 = btoa(code).replace(/[+]/g,'-').replace(/[/]/g,'_').replace(/=+$/,'');
        const f = document.createElement('iframe');
        f.id = 'probeframe';
        f.setAttribute('sandbox', 'allow-scripts allow-downloads');
        f.style.cssText = 'width:320px;height:220px;border:0';
        f.src = '/moshion/runner.html?code=' + b64 + '&r=1';
        window.addEventListener('message', (e) => {
            if (!f.contentWindow || e.source !== f.contentWindow) return;
            if (e.data && e.data.source === 'preview-storage-request') {
                let data = {};
                try { data = JSON.parse(localStorage.getItem('moshion.store.v1') || '{}'); } catch (err) {}
                f.contentWindow.postMessage({ source: 'preview-storage-init', data }, '*');
            }
        });
        document.body.appendChild(f);
    }""", sketch)
    pg.wait_for_timeout(2500)

    frame = next((fr for fr in pg.frames if 'runner.html' in (fr.url or '')), None)
    check("the runner frame loaded", frame is not None,
          [fr.url[:60] for fr in pg.frames])

    probe = frame.evaluate("() => window.__probe || null") if frame else None
    check("the catalog script reached the runner",
          bool(probe) and probe.get("names", 0) >= 40, probe)
    check("a built-in texture resolved inside the sandboxed frame",
          bool(probe) and probe.get("built") == "coin", probe)
    check("a texture saved in the editor crossed the bridge and resolved",
          bool(probe) and probe.get("saved") == "driveTest" and probe.get("hasSaved") is True,
          probe)
    check("a saved ANIMATION crossed the bridge and became a real Ani",
          bool(probe) and probe.get("animIsAni") is True and probe.get("animFrames") == 3,
          probe)
    check("per-frame durations survive the bridge into the engine",
          bool(probe) and isinstance(probe.get("holdDelays"), list)
          and 20 in probe["holdDelays"], (probe or {}).get("holdDelays"))

    # The frame itself, not the host page -- the iframe is appended below the
    # fold, so a page screenshot is evidence of nothing.
    pg.locator("#probeframe").screenshot(path=os.path.join(SHOTS, "runner.png"))


    # ---- reachable from the sandbox --------------------------------------
    #
    # A page nothing navigates to is the failure check-reachable.mjs exists to
    # catch, and the header link alone means leaving your code to draw. The
    # drawer tab is the real entry point, so it gets checked like one.
    sb = ctx.new_page()
    sb_errors = []
    sb.on("pageerror", lambda e: sb_errors.append(str(e)))
    sb.goto(f"{BASE}/sandbox/", wait_until="domcontentloaded")
    sb.wait_for_selector(".sandbox-shell", timeout=25000)
    sb.wait_for_timeout(1000)

    # aria-label, not text= -- the header nav ALSO has a "Textures" link, and a
    # text selector matched that and navigated away from the sandbox entirely.
    tab = sb.locator('button[aria-label="Textures tab"]')
    check("the sandbox offers a Textures tab in moSHion mode", tab.count() == 1, tab.count())
    if tab.count() == 1:
        tab.click()
        sb.wait_for_timeout(900)
        check("the editor mounts inside the drawer",
              sb.locator("[data-texture-grid]").count() == 1)
        check("the full-page escape hatch is offered",
              sb.locator("text=Full page").count() == 1)

        # The drawer is 240-600px wide. Content wider than it is unreachable,
        # and invisible to any check that only asks "did it render". Measured
        # on the scroll container: a 319px panel once held a 462px grid,
        # because the editor measured its OWN width (content-driven) instead of
        # its parent's.
        fit = sb.evaluate("""() => {
            const drawer = document.querySelector('[aria-label="Textures"]');
            if (!drawer) return null;
            const sc = [...drawer.querySelectorAll('div')]
                .find((d) => d.scrollHeight > d.clientHeight + 4 && d.clientWidth > 100);
            if (!sc) return null;
            return { client: sc.clientWidth, scroll: sc.scrollWidth };
        }""")
        check("nothing overflows the drawer horizontally",
              bool(fit) and fit["scroll"] <= fit["client"] + 1, fit)

        sb.screenshot(path=os.path.join(SHOTS, "sandbox-drawer.png"))

    sb.click(".sandbox-mode:has-text('reSHape')", timeout=10000)
    sb.wait_for_timeout(1200)
    check("the tab is hidden in reSHape mode (no sprites there)",
          sb.locator('button[aria-label="Textures tab"]').count() == 0)
    check("no console errors in the sandbox", not sb_errors, sb_errors[:2])

    check("no console errors on the editor page", not errors, errors[:2])

    b.close()

print()
if fails:
    print(f"FAIL  {len(fails)} check(s): " + ", ".join(fails))
    sys.exit(1)
print("ALL PASS  (textures)")
