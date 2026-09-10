# Phase B of the reSHape parity gauntlet: the ONE end-to-end drive.
#
# Every earlier driver checks one feature on its own. This one uses them the
# way a student does, in one sitting, through to a file on disk -- which is the
# plan's own exit criterion and the half that had never been run:
#
#   create a feature -> edit via the timeline -> orbit/pan/zoom -> save
#
#
# It found three defects on its first run, none of which any unit test could
# have failed on, because each needed the tools USED TOGETHER:
#   1. the timeline strip lay on top of the runner's Save buttons in Build
#      mode, so a model could be built and never exported. Hit-tested:
#      elementFromPoint at the STL button centre returned the timeline <ol>.
#   2. a save that DECLINES was reported to the host as a build that FAILED,
#      so pressing Save SVG on a solid told the student their numbers had
#      stopped the code -- seconds after the same model exported to STL.
#   3. (open) the runner's error banner is position:fixed at top:0 inside the
#      frame, and Build mode floats a 48px ribbon over that band, so the
#      first line of any runner error is unreadable there.
# Viewport checks compare PIXELS, because the preview is a sandboxed iframe
# without allow-same-origin: its DOM is unreadable by design, so the only
# honest question is whether the picture changed.
import os
import re
import sys
import tempfile
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops

SHOTS = os.environ.get("SHOTS") or tempfile.mkdtemp(prefix="phaseb-")
print("screenshots ->", SHOTS)
fails = []


def check(name, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + name + ("" if ok else " -- " + str(detail)))
    if not ok:
        fails.append(name)


def diff(a, b):
    """Mean absolute pixel difference between two screenshots, 0-255."""
    ia = Image.open(a).convert("L")
    ib = Image.open(b).convert("L")
    if ia.size != ib.size:
        return 255.0
    h = ImageChops.difference(ia, ib).histogram()
    return sum(i * n for i, n in enumerate(h)) / max(1, sum(h))


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1500, "height": 950}, accept_downloads=True)
    ctx.add_init_script(
        "try{localStorage.setItem('shCode:sandbox-mode','reshape');"
        "localStorage.setItem('shCode:sandbox-reshape-build','1');}catch(e){}"
    )
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto("http://localhost:3002/sandbox", wait_until="domcontentloaded", timeout=90000)
    pg.wait_for_timeout(3500)

    print("")
    print("--- 1. create a feature ---")
    pg.locator('button[title="Draw a flat outline to pull or spin into a solid"]').first.click()
    pg.wait_for_selector(".sk-rules", timeout=20000)
    pg.wait_for_timeout(1800)
    pull = pg.locator('button[title="Pull the selected sketch straight up into a solid"]')
    check("Pull is offered once a sketch is selected", not pull.first.is_disabled())
    pull.first.click()
    pg.wait_for_timeout(3500)
    rows = pg.locator(".model-timeline .model-row")
    check("the timeline holds the sketch and the solid it became", rows.count() == 2, rows.count())
    # The model is drawn by the host page (components/model/BrepViewportThree.tsx)
    # since the JSCAD runner iframe was deleted; screenshot that canvas instead.
    frame = pg.locator("canvas").first
    check("the preview canvas is on the page", frame.count() == 1, frame.count())
    solid = SHOTS + "/50-solid.png"
    frame.screenshot(path=solid)

    print("")
    print("--- 2. edit via the timeline ---")
    handles = pg.locator(".model-rollback-handle")
    check("the rollback bar offers a handle per step", handles.count() >= 2, handles.count())
    handles.nth(1).click()
    pg.wait_for_timeout(3000)
    rolled = SHOTS + "/51-rolledback.png"
    frame.screenshot(path=rolled)
    d1 = diff(solid, rolled)
    check("rolling back before the Pull really changes what is built", d1 > 1.0,
          "mean pixel diff " + format(d1, ".2f"))
    handles.nth(handles.count() - 1).click()
    pg.wait_for_timeout(3000)
    restored = SHOTS + "/52-restored.png"
    frame.screenshot(path=restored)
    d2 = diff(solid, restored)
    check("...and rolling forward puts the solid back", d2 < 1.0,
          "mean pixel diff vs original " + format(d2, ".2f"))

    check("the first feature cannot move earlier -- nothing is before it",
          pg.get_by_label("Move Sketch 1 earlier").is_disabled())
    order_before = [rows.nth(i).inner_text().split(chr(10))[0] for i in range(rows.count())]
    pg.get_by_label("Move Sketch 1 later").click()
    pg.wait_for_timeout(1500)
    order_after = [rows.nth(i).inner_text().split(chr(10))[0] for i in range(rows.count())]
    check("moving the sketch PAST the solid that consumes it does not happen",
          order_before == order_after, str(order_before) + " -> " + str(order_after))
    note = pg.inner_text(".model-note") if pg.locator(".model-note").count() else "(none)"
    check("...and it says what the refusal was about, naming both features",
          "built from" in note and "Sketch 1" in note, note)

    print("")
    print("--- 3. orbit, pan, zoom ---")
    box = frame.bounding_box()
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2
    before = SHOTS + "/53-before-nav.png"
    frame.screenshot(path=before)

    pg.mouse.move(cx, cy)
    pg.mouse.down(button="left")
    pg.mouse.move(cx + 140, cy + 60, steps=12)
    pg.mouse.up(button="left")
    pg.wait_for_timeout(900)
    left_shot = SHOTS + "/54-left-drag.png"
    frame.screenshot(path=left_shot)
    dl = diff(before, left_shot)
    check("LEFT drag does nothing -- it is reserved, not an orbit", dl < 0.5,
          "mean pixel diff " + format(dl, ".2f"))

    pg.mouse.move(cx, cy)
    pg.mouse.down(button="right")
    pg.mouse.move(cx + 140, cy + 60, steps=12)
    pg.mouse.up(button="right")
    pg.wait_for_timeout(900)
    orbit_shot = SHOTS + "/55-orbit.png"
    frame.screenshot(path=orbit_shot)
    do = diff(before, orbit_shot)
    check("RIGHT drag orbits", do > 1.0, "mean pixel diff " + format(do, ".2f"))

    pg.mouse.move(cx, cy)
    pg.mouse.down(button="middle")
    pg.mouse.move(cx + 120, cy - 40, steps=12)
    pg.mouse.up(button="middle")
    pg.wait_for_timeout(900)
    pan_shot = SHOTS + "/56-pan.png"
    frame.screenshot(path=pan_shot)
    dp = diff(orbit_shot, pan_shot)
    check("MIDDLE drag pans", dp > 1.0, "mean pixel diff " + format(dp, ".2f"))

    pg.mouse.move(cx, cy)
    pg.mouse.wheel(0, -600)
    pg.wait_for_timeout(1200)
    zoom_shot = SHOTS + "/57-zoom.png"
    frame.screenshot(path=zoom_shot)
    dz = diff(pan_shot, zoom_shot)
    check("the wheel zooms", dz > 1.0, "mean pixel diff " + format(dz, ".2f"))

    print("")
    print("--- 4. save a file ---")
    # The Export buttons live on the host page now (components/reshape/
    # ReshapeStudio.tsx), one per mesh format. The JSCAD runner that used to
    # own Save, and its SVG button, are deleted; three formats, all meshes,
    # so there is no refusal case left to drive.
    saves = pg.get_by_role("button", name=re.compile(r"^Export (STL|OBJ|3MF)$"))
    check("the studio offers all three mesh formats", saves.count() == 3, saves.count())
    got = {}
    for fmt in ["stl", "obj", "3mf"]:
        try:
            btn = pg.get_by_role("button", name="Export " + fmt.upper())
            btn.wait_for(state="visible", timeout=5000)
            with pg.expect_download(timeout=25000) as info:
                btn.click()
            d = info.value
            path = os.path.join(SHOTS, d.suggested_filename)
            d.save_as(path)
            got[fmt] = (d.suggested_filename, os.path.getsize(path), path)
        except Exception as e:
            got[fmt] = ("(no download)", 0, str(e)[:140])
    for fmt in got:
        name, size, path = got[fmt]
        check("Export " + fmt.upper() + " produces a real file", size > 0,
              name + " " + str(size) + " bytes -- " + str(path))

    # An export must not be reported as a build that failed. The host's amber
    # panel says 'These numbers stopped the code before it produced a shape'
    # -- true for a build error, false after a save.
    panel = pg.inner_text(".reshape-pane-params")
    check("...and the host is NOT told the model failed to build",
          "stopped the code" not in panel,
          "the Dimensions panel claims a build failure after an export")

    if got["stl"][1] > 0:
        raw = open(got["stl"][2], "rb").read()
        text = raw.decode("latin-1")
        check("...and the STL is a real mesh, not an empty header",
              ("facet" in text and "vertex" in text) or len(raw) > 500,
              str(len(raw)) + " bytes, starts " + repr(text[:40]))
    if got["obj"][1] > 0:
        obj = open(got["obj"][2], "r", errors="replace").read()
        vs = sum(1 for line in obj.splitlines() if line.startswith("v "))
        fs = sum(1 for line in obj.splitlines() if line.startswith("f "))
        check("...and the OBJ has vertices and faces, not just a comment",
              vs >= 8 and fs >= 12, str(vs) + " vertices, " + str(fs) + " faces")

    print("")
    print("--- 5. nothing broke along the way ---")
    check("no uncaught page errors across the whole run", not errors, errors[:2])
    pg.screenshot(path=SHOTS + "/58-final.png")
    b.close()

print("")
print("FAIL: " + ", ".join(fails) if fails else "ALL PASS")
sys.exit(1 if fails else 0)
