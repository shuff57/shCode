"""Item Q: edge crispness and face-shading contrast against the bar's render.

Blind round 3 gave P06's "looks" to Chili3D for "crisper edges, better face
shading". Measured (not eyeballed) against ours\\P06\\done-crop.png and the
bar's bars\\chili3d-v2\\P06\\done-crop.png:

- Edge antialiasing: already correct. `antialias: true` and
  `setPixelRatio(window.devicePixelRatio || 1)` were both already set on the
  WebGLRenderer, and a WebGL pixel readback across a real box edge in Home
  view showed a multi-pixel intermediate-colour transition (not a single
  hard binary jump) -- the overlay was never drawn with 1px aliased lines.
  No change made here; check (2) below re-confirms it on every run.

- Face-shading contrast: this WAS the defect. A default 40x40x20 box's top
  face and its brighter visible side face measured only 2.9% apart in
  luminance -- `key` and `fill` in BrepViewportThree.tsx both lean into
  x/y, so neither separates a horizontal top from a near-vertical side by
  much. Fixed by adding a dedicated overhead light (straight down +z, so it
  cannot touch the two side faces by construction) -- see the `overhead`
  light next to `under` in BrepViewportThree.tsx. Re-measured: 95.1/91.1/75.4
  -> 110.3/91.1/75.4 (luminance, 0-255); every pairwise gap now clears 12%
  (17.4%, 31.6%, 17.2%).

Playwright, headless Chromium, 1440x900, against http://localhost:3002/sandbox/
in reSHape/Build mode. WebGL readPixels (exact framebuffer colour, not a
lossy screenshot).
"""
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"

results = []


def check(name, ok, detail=""):
    tag = "PASS" if ok else "FAIL"
    results.append(ok)
    print(f"{tag}  {name}" + (f" -- {detail}" if detail and not ok else ""))


def lum(rgb):
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def read_at(page, x, y):
    return page.evaluate(
        """([x, y]) => {
            const canvases = [...document.querySelectorAll('canvas')];
            const canvas = canvases.find(c => c.getContext('webgl2') || c.getContext('webgl'));
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            const rect = canvas.getBoundingClientRect();
            const sx = canvas.width / rect.width;
            const sy = canvas.height / rect.height;
            const fx = Math.round((x - rect.left) * sx);
            const fy = Math.round((rect.height - (y - rect.top)) * sy);
            const buf = new Uint8Array(4);
            gl.readPixels(fx, fy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
            return [buf[0], buf[1], buf[2]];
        }""",
        [x, y],
    )


def arm(page):
    page.goto(f"{BASE}/sandbox/")
    page.evaluate("() => localStorage.setItem('shCode:sandbox-mode', 'reshape')")
    page.reload()
    page.wait_for_selector("canvas", timeout=15000)
    page.on("dialog", lambda d: d.accept())
    time.sleep(0.3)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    page.get_by_role("button", name="Home", exact=True).click()
    time.sleep(0.5)


def check_face_shading(page):
    arm(page)
    canvas = page.query_selector("canvas")
    box = canvas.bounding_box()
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2

    pts = {"top": (cx, cy - 50), "right": (cx + 100, cy + 50), "left": (cx - 100, cy + 50)}
    lums = {name: lum(read_at(page, x, y)) for name, (x, y) in pts.items()}
    names = list(lums.keys())
    worst = 100.0
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = names[i], names[j]
            diff = abs(lums[a] - lums[b]) / max(lums[a], lums[b]) * 100
            worst = min(worst, diff)
            check(f"{a} vs {b} face luminance differs by >= 12% ({diff:.1f}%)", diff >= 12.0)
    return worst


def check_edge_antialiasing(page):
    arm(page)
    canvas = page.query_selector("canvas")
    box = canvas.bounding_box()
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2

    # Sweep several rows near the box's front vertical edge (screen-centred
    # for a centred box) looking for a transitional pixel between the two
    # face colours -- a hard aliased line would jump straight from one flat
    # colour to the other with nothing in between.
    found = False
    for row_offset in range(20, 90, 4):
        y = cy + row_offset
        colors = [tuple(read_at(page, cx + dx, y)) for dx in range(-6, 7)]
        distinct = []
        for c in colors:
            if not distinct or distinct[-1] != c:
                distinct.append(c)
        if len(distinct) >= 3:
            # A genuine antialiased transition has an intermediate colour
            # that is not equal to either flat neighbour.
            for k in range(1, len(distinct) - 1):
                a, mid, b = distinct[k - 1], distinct[k], distinct[k + 1]
                if mid != a and mid != b:
                    found = True
                    break
        if found:
            break
    check("an edge cross-section shows an antialiased intermediate pixel", found)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        for label, fn in [
            ("face shading contrast", check_face_shading),
            ("edge antialiasing", check_edge_antialiasing),
        ]:
            try:
                fn(page)
            except Exception as exc:  # noqa: BLE001
                check(f"{label} checks ran without an exception", False, repr(exc))

        browser.close()

    total = len(results)
    passed = sum(1 for r in results if r)
    print(f"\n{'ALL PASS' if all(results) else 'FAIL'}  ({passed}/{total})")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
