# Drives the live sandbox and measures what a student sees when their sketch
# rules disagree: the offending EDGES turn red, and a banner fires over the
# canvas. Both were gaps against real Onshape, recorded in
# .gauntlet/onshape-flow.md and closed on 2026-09-01.
#
# NOT part of `npm test` -- it needs a dev server on :3002 and Playwright,
# which is installed under Python here, not node. Run it by hand:
#
#   npm run dev &
#   python scripts/drive-sketch-conflict.py
#
# The pure logic underneath (which edges lose) is gated properly, in
# scripts/sketch-solve-assertions.cjs. What this adds is the half that only
# a browser can answer: whether the marks are actually visible, and whether
# anything else floating over the canvas covers them. Two real placement
# bugs were found here and nowhere else -- the banner sat on the tools
# ribbon and swallowed its clicks, then, centred, was clipped by the Rules
# panel, which grows taller exactly when a conflict exists.
import json, sys, time
from playwright.sync_api import sync_playwright

import os, tempfile
# Screenshots go to $SHOTS if set, else a fresh temp dir whose path is printed.
SCRATCH = os.environ.get("SHOTS") or tempfile.mkdtemp(prefix="sketch-conflict-")
print("screenshots ->", SCRATCH)
fails = []
def check(name, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + name + ("" if ok else " -- " + str(detail)))
    if not ok: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1500, "height": 950})
    ctx.add_init_script(
        "try{localStorage.setItem('shCode:sandbox-mode','reshape');"
        "localStorage.setItem('shCode:sandbox-reshape-build','1');}catch(e){}"
    )
    pg = ctx.new_page()
    pg.on("console", lambda m: print("   [console]", m.type, m.text[:160]))
    pg.goto("http://localhost:3002/sandbox", wait_until="domcontentloaded", timeout=90000)
    pg.wait_for_timeout(2500)

    sketch = pg.locator('button[title="Draw a flat outline to pull or spin into a solid"]')
    check("the Sketch tool is on the bar", sketch.count() == 1, sketch.count())
    sketch.first.click()
    pg.wait_for_selector(".sk-rules", timeout=20000)
    pg.wait_for_timeout(2000)

    check("the outline is drawn on the canvas",
          pg.locator(".sketch-lines polygon").count() >= 1)
    check("nothing is red before any rule is set",
          pg.locator(".sketch-lines .is-losing").count() == 0)
    check("no banner before any rule is set",
          pg.locator(".sketch-alarm").count() == 0)
    pg.screenshot(path=SCRATCH + "/01-clean.png")

    # Contradiction the panel can actually express: edge 1 must be 40, edge 2
    # must be 10, and the two must be equal.
    e1 = pg.get_by_label("Edge 1 length")
    e2 = pg.get_by_label("Edge 2 length")
    e1.fill("40"); e1.blur(); pg.wait_for_timeout(600)
    e2.fill("10"); e2.blur(); pg.wait_for_timeout(600)
    cell = pg.locator('button[aria-label^="Edges 1 and 2:"]')
    check("the pair cell for edges 1 and 2 exists", cell.count() == 1, cell.count())
    cell.first.click()          # none -> equal
    pg.wait_for_timeout(1500)

    label = cell.first.get_attribute("aria-label")
    check("one click sets it to equal", "equal" in (label or ""), label)

    losing = pg.locator(".sketch-lines .is-losing")
    n = losing.count()
    check("exactly the two edges in the argument turn red", n == 2, n)

    poly = pg.locator(".sketch-lines polygon").first.get_attribute("points")
    pts = poly.split()
    runs = [losing.nth(i).get_attribute("points").split() for i in range(n)]
    want = [[pts[0], pts[1]], [pts[1], pts[2]]]
    check("...and they are edge 1 and edge 2 of the outline, not any others",
          sorted(runs) == sorted(want), json.dumps({"got": runs, "want": want}))

    banner = pg.locator(".sketch-alarm")
    check("the banner fires over the canvas", banner.count() == 1, banner.count())
    text = banner.inner_text() if banner.count() else ""
    check("...and says how many rules are in it", "marked in red" in text, text)
    print("   banner text:", repr(text))
    pg.screenshot(path=SCRATCH + "/02-conflict.png")

    # The banner is only useful where nothing else is drawn. Both of these
    # caught a real placement bug on the first live run: at top:12px it sat on
    # the tools ribbon and swallowed the buttons' clicks, and centred it was
    # clipped by the Rules panel -- which grows taller exactly when there is a
    # conflict, so it was hidden precisely when it fires.
    def box(sel):
        loc = pg.locator(sel)
        return loc.first.bounding_box() if loc.count() else None
    def hits(a, c):
        if not a or not c: return False
        return not (a["x"] + a["width"] <= c["x"] or c["x"] + c["width"] <= a["x"]
                    or a["y"] + a["height"] <= c["y"] or c["y"] + c["height"] <= a["y"])
    ab = box(".sketch-alarm")
    check("the banner is clear of the tools ribbon",
          not hits(ab, box(".sandbox-ribbon .model-tools")), ab)
    check("...and clear of the Rules panel it is pointing at",
          not hits(ab, box(".sk-rules")), ab)
    check("...and inside the canvas, not hanging off it",
          ab and box(".handle-layer") and ab["x"] >= box(".handle-layer")["x"], ab)

    # Dismissal, and that it comes back.
    banner.locator("button").click()
    pg.wait_for_timeout(400)
    check("the x hides the banner", pg.locator(".sketch-alarm").count() == 0)
    check("...and the red geometry stays -- dismissing the banner is not dismissing the conflict",
          pg.locator(".sketch-lines .is-losing").count() == 2)
    pg.screenshot(path=SCRATCH + "/03-dismissed.png")

    e2.fill("40"); e2.blur(); pg.wait_for_timeout(1200)
    check("settling the sketch clears the red",
          pg.locator(".sketch-lines .is-losing").count() == 0,
          pg.locator(".sketch-lines .is-losing").count())
    pg.screenshot(path=SCRATCH + "/04-settled.png")

    e2.fill("10"); e2.blur(); pg.wait_for_timeout(1200)
    check("breaking it again brings the dismissed banner back",
          pg.locator(".sketch-alarm").count() == 1)
    pg.screenshot(path=SCRATCH + "/05-again.png")

    b.close()

print("\n" + ("FAIL: " + ", ".join(fails) if fails else "ALL PASS"))
sys.exit(1 if fails else 0)
