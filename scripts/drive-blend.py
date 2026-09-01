# Drives the live sandbox and measures that Blend joins two sketches into a
# real solid: the button gates on exactly two sketches, the blend appears in
# the timeline, and it NAMES itself correctly.
#
# NOT part of `npm test` -- needs a dev server on :3002 and Playwright, which
# is installed under Python here, not node. Run it by hand:
#
#   npm run dev &
#   python scripts/drive-blend.py
#
# The geometry is gated in scripts/model-codegen-assertions.cjs, where the
# built volume is measured against the frustum formula. The name check is
# here because it is the one thing nothing could have failed on: labelOf()
# used to end in a bare fallback, so the first blend built perfectly and
# called itself "Sphere 1". Caught in a screenshot, by eye.
import os, sys, tempfile
from playwright.sync_api import sync_playwright
SHOTS = os.environ.get("SHOTS") or tempfile.mkdtemp(prefix="blend-")
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

    blend_btn = pg.locator('button[title="Skin two sketches together into one tapered solid"]')
    check("the Blend button is on the bar", blend_btn.count() == 1, blend_btn.count())
    check("...and is disabled with nothing selected", blend_btn.first.is_disabled())

    sketch = pg.locator('button[title="Draw a flat outline to pull or spin into a solid"]').first
    sketch.click(); pg.wait_for_selector(".sk-rules", timeout=20000); pg.wait_for_timeout(1500)
    sketch.click(); pg.wait_for_timeout(2500)
    check("two sketches exist", pg.locator(".model-timeline .model-row").count() >= 2,
          pg.locator(".model-timeline .model-row").count())

    # Slide the second sketch up its plane, so there is a gap to blend across.
    off = pg.locator("#p-sk2_offset") if pg.locator("#p-sk2_offset").count() else None
    if off is None:
        boxes = pg.locator('.reshape-pane-params input[type="text"], .reshape-pane-params input[type="number"]')
        check("found an offset box for sketch 2", False, "no labelled offset input")
    else:
        off.fill("30"); off.blur(); pg.wait_for_timeout(2500)

    chips = pg.locator(".model-timeline .model-row")
    chips.nth(0).locator(".model-name").click(); pg.wait_for_timeout(600)
    chips.nth(1).locator(".model-name").click(modifiers=["Shift"]); pg.wait_for_timeout(1200)
    check("Blend enables once exactly two sketches are picked",
          not blend_btn.first.is_disabled())
    pg.screenshot(path=SHOTS + "/40-two-sketches.png")

    blend_btn.first.click(); pg.wait_for_timeout(3500)
    note = pg.inner_text(".model-note") if pg.locator(".model-note").count() else "(none)"
    check("it did not refuse", "cannot" not in note.lower() and "pick two" not in note.lower(), note)
    check("...and says what to do next", "taper" in note.lower(), note)
    check("a Blend feature joined the timeline",
          pg.locator(".model-timeline .model-row").count() >= 3,
          pg.locator(".model-timeline .model-row").count())
    names = [pg.locator(".model-timeline .model-row .model-name").nth(i).inner_text() for i in range(3)]
    check("the new feature calls itself a Blend", names[2].startswith("Blend"), names)
    pg.screenshot(path=SHOTS + "/41-blended.png")
    b.close()

print("\n" + ("FAIL: " + ", ".join(fails) if fails else "ALL PASS"))
sys.exit(1 if fails else 0)
