"""Item I follow-up (P14): does the edge highlight overlay draw through a
nearer, opaque face?

BrepViewportThree.tsx's hover/selected edge highlights used to render with
`depthTest: false` -- a real, confirmed hazard: a highlight tube's own
geometry can extend past where it is genuinely occluded by a nearer face
(an open hollow's back-wall edge, seen from "Look from above", say), and
depthTest:false makes that hidden portion draw right through the face
anyway. Switched to `polygonOffset` (the same technique the face highlights
already use) so ordinary depth testing applies, with just enough offset to
avoid z-fighting the coincident real edge.

MEASURED, NOT REPRODUCED: extensive live testing (a kernel/mesh-level
investigation confirming the floor's own geometry has no seam to draw, plus
a 70-point sweep of every real edge-hover position around a hollowed box
from "Look from above", reading the floor centre pixel via a WebGL
readback at each one) could not reproduce the ORIGINAL "diagonal line
across the floor" artifact under either the old (depthTest:false) or new
(polygonOffset) code -- recorded here as the measured reason this probe
cannot show a before/after difference, not because nothing was fixed. The
depthTest:false mechanism is real regardless (it is a general hazard, not
specific to this one shape), and this check exists to guard it: any real
regression that puts a highlight geometrically behind the floor and still
visible would fail check (2) below.

Playwright, headless Chromium, 1440x900, against http://localhost:3002/sandbox/
in reSHape/Build mode. Prints one PASS/FAIL line per check and exits
non-zero on any FAIL.
"""
import math
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"

results = []


def check(name, ok, detail=""):
    tag = "PASS" if ok else "FAIL"
    results.append(ok)
    print(f"{tag}  {name}" + (f" -- {detail}" if detail and not ok else ""))


def read_pixel(page, x, y):
    """Reads the WebGL canvas's own back buffer at the CSS point (x, y),
    accounting for devicePixelRatio -- a plain screenshot crop would see
    compositing/scaling the raw framebuffer readback does not."""
    return page.evaluate(
        f"""() => {{
            const c = document.querySelector('canvas');
            const rect = c.getBoundingClientRect();
            const readX = Math.round(({x} - rect.left) * (c.width / rect.width));
            const readY = Math.round(({y} - rect.top) * (c.height / rect.height));
            const gl = c.getContext('webgl2') || c.getContext('webgl');
            if (!gl) return null;
            const px = new Uint8Array(4);
            gl.readPixels(readX, gl.drawingBufferHeight - readY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
            return [px[0], px[1], px[2]];
        }}"""
    )


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"{BASE}/sandbox/")
        page.evaluate("() => localStorage.setItem('shCode:sandbox-mode', 'reshape')")
        page.reload()
        page.wait_for_selector("canvas", timeout=15000)
        page.on("dialog", lambda d: d.accept())
        time.sleep(0.5)

        page.get_by_title("Add a box").click()
        time.sleep(0.3)
        canvas = page.query_selector("canvas")
        box = canvas.bounding_box()
        cx = box["x"] + box["width"] / 2
        cy = box["y"] + box["height"] / 2
        page.mouse.click(cx, cy - 100)
        time.sleep(0.3)
        page.get_by_role("button", name="Hollow", exact=True).click()
        time.sleep(0.3)
        page.get_by_title("Look from above").click()
        time.sleep(0.3)
        page.mouse.move(cx, cy)
        for _ in range(6):
            page.mouse.wheel(0, -150)
            time.sleep(0.1)
        time.sleep(0.3)

        box2 = page.query_selector("canvas").bounding_box()
        fcx = box2["x"] + box2["width"] / 2
        fcy = box2["y"] + box2["height"] / 2

        # (1) Every real edge-hover position around the hollowed box's own
        # silhouette (crosshair cursor confirms hitAt() actually resolved
        # an edge there, not a guess at screen coordinates).
        found = []
        for radius in [150, 200, 250, 300]:
            for deg in range(0, 360, 3):
                rad = math.radians(deg)
                x = fcx + radius * math.cos(rad)
                y = fcy + radius * math.sin(rad) * 0.6
                page.mouse.move(x, y)
                time.sleep(0.03)
                cursor = page.evaluate("() => document.querySelector('canvas').style.cursor")
                if cursor == "crosshair":
                    found.append((x, y))
        check("found real edge-hover positions around the hollowed box",
              len(found) > 10, f"found {len(found)}")

        # (2) For each, the FLOOR CENTRE pixel -- never on any real edge's
        # own screen projection -- must never read as the hover/selected
        # highlight colour (cyan ~139,233,253 / pink ~255,121,198). A
        # regression that lets an occluded highlight segment draw through
        # would show up here as the floor centre picking up that colour
        # while some entirely different edge is hovered.
        bad = []
        sample = found[:60] if len(found) > 60 else found
        for (x, y) in sample:
            page.mouse.move(x, y)
            time.sleep(0.04)
            rgb = read_pixel(page, fcx, fcy)
            if rgb is None:
                continue
            r, g, b = rgb
            cyan_like = abs(r - 139) < 40 and abs(g - 233) < 40 and abs(b - 253) < 40
            pink_like = abs(r - 255) < 40 and abs(g - 121) < 40 and abs(b - 198) < 40
            if cyan_like or pink_like:
                bad.append(((round(x), round(y)), (r, g, b)))
        check("the floor centre pixel never picks up a hover/selected edge "
              "highlight colour while a DIFFERENT edge is hovered",
              len(bad) == 0, f"{len(bad)} of {len(sample)} sampled points bled through: {bad[:5]}")

        browser.close()

    total = len(results)
    passed = sum(1 for r in results if r)
    print(f"\n{'ALL PASS' if all(results) else 'FAIL'}  ({passed}/{total})")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
