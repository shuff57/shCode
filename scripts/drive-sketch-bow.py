# Drives the live sandbox and measures that bowing an edge really produces a
# curve: the panel reads "curved", the drawn outline gains arc samples,
# Across/Up/Length go off, an over-ceiling bow is refused with the ceiling
# named, and 0 straightens it back.
#
# NOT part of `npm test` -- needs a dev server on :3002 and Playwright, which
# is installed under Python here, not node. Run it by hand:
#
#   npm run dev &
#   python scripts/drive-sketch-bow.py
#
# The geometry is gated properly in scripts/sketch-arc-assertions.cjs and the
# codegen in scripts/model-codegen-assertions.cjs (which measures the bow all
# the way through to the built solid). This adds the half only a browser can
# answer, and it earned its place: it found that a REFUSED bow left the
# rejected number sitting in the box beside an edge still bowed 8.
import os, sys, tempfile
from playwright.sync_api import sync_playwright
SHOTS = os.environ.get("SHOTS") or tempfile.mkdtemp(prefix="bow-")
print("screenshots ->", SHOTS)
fails = []
def check(name, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + name + ("" if ok else " -- " + str(detail)))
    if not ok: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1500, "height": 950})
    ctx.add_init_script("try{localStorage.setItem('shCode:sandbox-mode','reshape');"
                        "localStorage.setItem('shCode:sandbox-reshape-build','1');}catch(e){}")
    pg = ctx.new_page()
    pg.goto("http://localhost:3002/sandbox", wait_until="domcontentloaded", timeout=90000)
    pg.wait_for_timeout(3000)
    pg.locator('button[title="Draw a flat outline to pull or spin into a solid"]').first.click()
    pg.wait_for_selector(".sk-rules", timeout=20000)
    pg.wait_for_timeout(2000)

    bow = pg.get_by_label("Bow edge 1")
    check("the Bow row exists, one box per edge", pg.locator('.sk-bows input').count() == 4,
          pg.locator('.sk-bows input').count())
    check("edge 1 reads as straight before anything is bowed",
          pg.locator(".sk-shape").first.inner_text().strip() == "straight",
          pg.locator(".sk-shape").first.inner_text())
    straight_pts = pg.locator(".sketch-lines polygon").first.get_attribute("points")
    check("a straight 4-corner sketch draws 4 points", len(straight_pts.split()) == 4,
          len(straight_pts.split()))
    pg.screenshot(path=SHOTS + "/10-straight.png")

    bow.fill("8"); bow.blur(); pg.wait_for_timeout(2000)

    check("edge 1 now reads as curved",
          pg.locator(".sk-shape").first.inner_text().strip() == "curved",
          pg.locator(".sk-shape").first.inner_text())
    curved_pts = pg.locator(".sketch-lines polygon").first.get_attribute("points")
    check("the drawn outline gained arc samples, so it is really a curve",
          len(curved_pts.split()) > len(straight_pts.split()),
          f"{len(straight_pts.split())} -> {len(curved_pts.split())}")
    check("Across is disabled on a curved edge",
          pg.get_by_label("Edge 1 across").is_disabled())
    check("Up is disabled on a curved edge",
          pg.get_by_label("Edge 1 up").is_disabled())
    check("the box shows the bow that was set, not empty",
          pg.get_by_label("Bow edge 1").input_value() == "8",
          pg.get_by_label("Bow edge 1").input_value())
    pg.screenshot(path=SHOTS + "/11-bowed.png")

    # The generated program is checked in scripts/model-codegen-assertions.cjs
    # instead of here -- Build mode hides the editor pane, and clicking Code is
    # a deliberate one-way door, so driving it from the browser tests the door
    # rather than the codegen.

    # Refusal, and straightening back out.
    bow2 = pg.get_by_label("Bow edge 1")
    bow2.fill("999"); bow2.blur(); pg.wait_for_timeout(1500)
    msg = pg.inner_text(".model-note") if pg.locator(".model-note").count() else "(no message shown)"
    check("an over-ceiling bow is refused with the ceiling named",
          "at most" in msg and "half circle" in msg, msg[:200])
    check("...and the edge is still curved at its old bow, not clamped silently",
          pg.get_by_label("Bow edge 1").input_value() == "8",
          pg.get_by_label("Bow edge 1").input_value())

    bow3 = pg.get_by_label("Bow edge 1")
    bow3.fill("0"); bow3.blur(); pg.wait_for_timeout(2000)
    check("0 straightens it again",
          pg.locator(".sk-shape").first.inner_text().strip() == "straight",
          pg.locator(".sk-shape").first.inner_text())
    check("...and the outline is back to 4 points",
          len(pg.locator(".sketch-lines polygon").first.get_attribute("points").split()) == 4)
    pg.screenshot(path=SHOTS + "/13-straightened.png")
    b.close()

print("\n" + ("FAIL: " + ", ".join(fails) if fails else "ALL PASS"))
sys.exit(1 if fails else 0)
