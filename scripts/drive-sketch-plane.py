# Drives the live sandbox and measures that a sketch can actually leave the
# ground plane: all three choices are offered, picking one really reorients
# the sketch in space (not just the panel), the corners and rules come with
# it, and a CIRCLE reaches the panel too -- it used to be skipped entirely,
# so a circle was born on xy and could never stand up.
#
# NOT part of `npm test` -- needs a dev server on :3002 and Playwright, which
# is installed under Python here, not node. Run it by hand:
#
#   npm run dev &
#   python scripts/drive-sketch-plane.py
#
# The three planes were already proven to BUILD in
# scripts/model-codegen-assertions.cjs (onXZ/onYZ). What was never checked,
# because it could not happen, is a student choosing one.
import os, sys, tempfile
from playwright.sync_api import sync_playwright
SHOTS = os.environ.get("SHOTS") or tempfile.mkdtemp(prefix="plane-")
print("screenshots ->", SHOTS)
fails = []
def check(name, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + name + ("" if ok else " -- " + str(detail)))
    if not ok: fails.append(name)

def bbox_of(pg):
    pts = pg.locator(".sketch-lines polygon").first.get_attribute("points").split()
    xs = [float(p.split(",")[0]) for p in pts]
    ys = [float(p.split(",")[1]) for p in pts]
    return (max(xs) - min(xs), max(ys) - min(ys))

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

    check("the plane row offers all three", pg.locator(".sk-planes button").count() == 3,
          pg.locator(".sk-planes button").count())
    check("a new sketch starts on the Ground",
          pg.get_by_label("Sit the sketch on the Ground plane").get_attribute("aria-pressed") == "true")
    ground = bbox_of(pg)
    pg.screenshot(path=SHOTS + "/30-ground.png")

    pg.get_by_label("Sit the sketch on the Front plane").click()
    pg.wait_for_timeout(2500)
    check("Front becomes the pressed one",
          pg.get_by_label("Sit the sketch on the Front plane").get_attribute("aria-pressed") == "true")
    check("...and Ground stops being pressed",
          pg.get_by_label("Sit the sketch on the Ground plane").get_attribute("aria-pressed") == "false")
    front = bbox_of(pg)
    check("the sketch really moved in space, not just in the panel",
          abs(front[0] - ground[0]) > 3 or abs(front[1] - ground[1]) > 3,
          f"ground {ground} vs front {front}")
    pg.screenshot(path=SHOTS + "/31-front.png")

    pg.get_by_label("Sit the sketch on the Side plane").click()
    pg.wait_for_timeout(2500)
    side = bbox_of(pg)
    check("Side is a third distinct orientation, not a repeat of Front",
          abs(side[0] - front[0]) > 3 or abs(side[1] - front[1]) > 3,
          f"front {front} vs side {side}")
    check("the corners and rules came with it -- still 4 edge rows",
          pg.locator(".sk-table tbody tr").count() == 4,
          pg.locator(".sk-table tbody tr").count())
    pg.screenshot(path=SHOTS + "/32-side.png")

    # The circle, which used to get no panel at all and so could never leave xy.
    pg.locator('button[title*="ircle"]').first.click()
    pg.wait_for_timeout(2500)
    check("a circle reaches the panel now", pg.locator(".sk-planes button").count() == 3,
          pg.locator(".sk-planes button").count())
    check("...and gets ONLY the plane row -- no edge table for a shape with no edges",
          pg.locator(".sk-table").count() == 0, pg.locator(".sk-table").count())
    pg.get_by_label("Sit the sketch on the Front plane").click()
    pg.wait_for_timeout(2500)
    check("a circle can stand up too",
          pg.get_by_label("Sit the sketch on the Front plane").get_attribute("aria-pressed") == "true")
    pg.screenshot(path=SHOTS + "/33-circle-front.png")
    b.close()

print("\n" + ("FAIL: " + ", ".join(fails) if fails else "ALL PASS"))
sys.exit(1 if fails else 0)
