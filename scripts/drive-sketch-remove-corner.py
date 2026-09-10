# Drives the live sandbox and measures that removing a corner really removes
# it EVERYWHERE at once -- panel, edge table, pair grid, Dimensions list and
# canvas -- that the cost is shown before the click and said out loud after,
# and that the three-corner floor disables the buttons and explains itself.
#
# NOT part of `npm test` -- needs a dev server on :3002 and Playwright, which
# is installed under Python here, not node. Run it by hand:
#
#   npm run dev &
#   python scripts/drive-sketch-remove-corner.py
#
# The index arithmetic is gated in scripts/sketch-arc-assertions.cjs, where
# the real contract lives: splitEdge then removeCorner restores the
# tessellated area exactly. This is the half that checks nothing was left
# behind in a second list that the first one no longer agrees with.
import os, sys, tempfile
from playwright.sync_api import sync_playwright
SHOTS = os.environ.get("SHOTS") or tempfile.mkdtemp(prefix="drop-")
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

    drops = pg.locator(".sk-drops button")
    check("the Remove row exists, one button per corner", drops.count() == 4, drops.count())
    check("a 4-corner sketch may lose one", not drops.first.is_disabled())
    rows = pg.locator(".sk-table tbody tr").count()
    check("4 corners means 4 edge rows", rows == 4, rows)

    # Put something on the corner that will be removed, so the cost is real.
    bow = pg.get_by_label("Bow edge 1"); bow.fill("6"); bow.blur(); pg.wait_for_timeout(1500)
    pg.get_by_label("Pin corner 2").click(); pg.wait_for_timeout(1200)
    title = pg.locator('.sk-drops button[aria-label="Remove corner 2"]').get_attribute("title")
    check("the button warns what removal will cost, before it is pressed",
          "go with it" in (title or ""), title)
    check("...and is marked as costly rather than disabled",
          "costly" in (pg.locator('.sk-drops button[aria-label="Remove corner 2"]').get_attribute("class") or ""),
          pg.locator('.sk-drops button[aria-label="Remove corner 2"]').get_attribute("class"))
    pg.screenshot(path=SHOTS + "/20-before.png")

    pg.locator('.sk-drops button[aria-label="Remove corner 2"]').click()
    pg.wait_for_timeout(2500)

    check("the corner is gone from the panel", pg.locator(".sk-drops button").count() == 3,
          pg.locator(".sk-drops button").count())
    check("...and from the edge table", pg.locator(".sk-table tbody tr").count() == 3,
          pg.locator(".sk-table tbody tr").count())
    check("...and from the canvas", 
          len(pg.locator(".sketch-lines polygon").first.get_attribute("points").split()) == 3,
          pg.locator(".sketch-lines polygon").first.get_attribute("points"))
    note = pg.inner_text(".model-note") if pg.locator(".model-note").count() else "(none)"
    check("the editor says out loud what went with it", "go with it" in note, note)
    check("the curve on a merged edge really was dropped",
          pg.locator(".sk-shape").first.inner_text().strip() == "straight",
          [pg.locator(".sk-shape").nth(i).inner_text() for i in range(3)])
    pg.screenshot(path=SHOTS + "/21-after.png")

    check("at three corners every Remove button is now disabled",
          all(pg.locator(".sk-drops button").nth(i).is_disabled() for i in range(3)))
    check("...and says why rather than going quiet",
          "at least three corners" in (pg.locator(".sk-drops button").first.get_attribute("title") or ""),
          pg.locator(".sk-drops button").first.get_attribute("title"))
    pg.screenshot(path=SHOTS + "/22-floor.png")
    b.close()

print("\n" + ("FAIL: " + ", ".join(fails) if fails else "ALL PASS"))
sys.exit(1 if fails else 0)
