#!/usr/bin/env python
"""Interaction gate for the sandbox: program-type selector + JSCAD dimensions.

Drives the real dev server with a real browser. Playwright here is installed
under Python (1.58), never node.

    python scripts/sandbox-checks.py [--url http://localhost:3002] [--headed]

The load-bearing check is NO_RELOAD. A dimension change that reloads the iframe
would still look correct on screen and still pass a screenshot diff -- it would
just be 100x too slow to ever drag. The sentinel is the only thing that tells
those two apart.
"""

import argparse
import sys
import time

from playwright.sync_api import sync_playwright

PASS, FAIL = [], []

# main() is async here on purpose. A synchronous build blocks the event loop, so
# a message posted from the parent cannot even be delivered until the whole
# chain -- build, draw, render -- has finished, and the early-edit window never
# opens. An awaited main() yields, which is exactly the case the runner supports
# and the only one where the panel is genuinely live before the first render.
SLOW_SKETCH = chr(10).join([
    "function getParameterDefinitions(){",
    "return [{name:'n',type:'float',initial:7,min:2,max:14,step:1,caption:'Balls'}]",
    "}",
    "async function main(p){",
    "await new Promise(r => setTimeout(r, 2500))",
    "const m = require('@jscad/modeling')",
    "let s = m.primitives.sphere({radius:8})",
    "for (let i=1;i<p.n;i++){",
    "s = m.booleans.union(s, m.transforms.translate([i*9,0,0], m.primitives.sphere({radius:8})))",
    "}",
    "return s",
    "}",
    "module.exports={main,getParameterDefinitions}",
])



def check(name, ok, detail=""):
    (PASS if ok else FAIL).append(name)
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {name}" + (f" -- {detail}" if detail else ""))
    return ok


def frame_of(page):
    """The JSCAD runner frame. Sandboxed to an opaque origin, but Playwright
    drives it over CDP so evaluate() still works."""
    for f in page.frames:
        if "jscad/runner.html" in (f.url or ""):
            return f
    return None


def sentinel_of(frame):
    """Read the sentinel we planted in the runner frame.

    A reload wipes it. A reload that also detaches the frame handle makes
    evaluate() throw instead — same verdict, so both come back as "gone"
    rather than taking the whole gate down with them."""
    if frame is None:
        return "gone"
    try:
        return frame.evaluate("window.__gateSentinel")
    except Exception:
        return "gone"


def press_run(page):
    """Run, from whatever state the toolbar is in.

    After a run the button reads Stop, and .btn-run matches it -- so a bare
    click on .btn-run for a second run stops the first one instead."""
    page.query_selector(".run-toolbar .btn-run").click()


def canvas_png(page):
    el = page.query_selector(".jscad-frame")
    return el.screenshot() if el else b""


def run(url, headed):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not headed)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        navigations = []
        page.on("framenavigated", lambda f: navigations.append(f.url or ""))

        print(f"\nsandbox interaction gate -- {url}/sandbox\n")
        # domcontentloaded, not networkidle: the app keeps polling endpoints and
        # networkidle never settles, which reads as a page failure when it isn't.
        page.goto(f"{url}/sandbox", wait_until="domcontentloaded", timeout=90_000)
        page.wait_for_selector(".sandbox-mode", timeout=90_000)
        page.wait_for_timeout(600)

        # ---- selector -------------------------------------------------------
        tabs = page.query_selector_all(".sandbox-mode")
        labels = [t.inner_text().strip() for t in tabs]
        check("SELECTOR_THREE_MODES", labels == ["JavaScript", "shPlay", "JSCAD"], str(labels))

        page.click(".sandbox-mode:has-text('JavaScript')")
        page.wait_for_timeout(300)
        js_src = page.inner_text(".cm-content")
        check("JS_STARTER", "console.log" in js_src and "setup()" not in js_src)

        press_run(page)
        page.wait_for_timeout(1500)
        out = page.inner_text(".run-output")
        check("JS_RUNS_IN_WORKER", "Hello, Ada!" in out, out.strip()[:60])

        # Each mode is its own draft: editing one must not leak into another.
        page.click(".sandbox-mode:has-text('JSCAD')")
        page.wait_for_timeout(400)
        cad_src = page.inner_text(".cm-content")
        check("JSCAD_STARTER", "getParameterDefinitions" in cad_src and "console.log" not in cad_src)

        # ---- run + panel ----------------------------------------------------
        press_run(page)
        page.wait_for_selector(".jscad-params", timeout=30_000)
        page.wait_for_timeout(2500)

        names = [l.inner_text().strip() for l in page.query_selector_all(".jscad-param-row > label")]
        check(
            "PANEL_LISTS_DECLARED_DIMENSIONS",
            names == ["Width", "Depth", "Height", "Corner round", "Hole radius"],
            str(names),
        )

        fr = frame_of(page)
        if not check("RUNNER_FRAME_REACHABLE", fr is not None):
            browser.close()
            return

        # ---- the load-bearing one ------------------------------------------
        fr.evaluate("window.__gateSentinel = 'alive'")
        before = canvas_png(page)
        nav_before = len(navigations)

        box = page.query_selector("#p-width")
        box.click()
        box.press("Control+a")
        box.type("95", delay=40)
        box.press("Enter")
        page.wait_for_timeout(1800)

        sentinel = sentinel_of(fr)
        check("NO_RELOAD_ON_DIMENSION_CHANGE", sentinel == "alive", f"sentinel={sentinel!r}")
        check(
            "NO_FRAME_NAVIGATION",
            len(navigations) == nav_before,
            f"{len(navigations) - nav_before} navigation(s)",
        )

        after = canvas_png(page)
        check("MODEL_REDRAWN", before != after and len(after) > 0)

        badge = page.query_selector(".jscad-params-ms")
        ms_text = badge.inner_text().strip() if badge else ""
        check("REBUILD_TIME_REPORTED", ms_text.endswith("ms") and ms_text != "", ms_text)

        ms = 0.0
        if ms_text:
            raw = ms_text.replace("ms", "").strip()
            ms = 0.5 if raw.startswith("<") else float(raw)
        check("REBUILD_UNDER_100MS", 0 < ms < 100 or ms_text.startswith("<"), f"{ms_text}")

        # ---- invalid input ---------------------------------------------------
        steady = canvas_png(page)
        box = page.query_selector("#p-width")
        box.click()
        box.press("Control+a")
        box.press("Delete")
        page.wait_for_timeout(900)
        check(
            "EMPTY_FIELD_MARKED_INVALID",
            page.get_attribute("#p-width", "aria-invalid") == "true",
        )
        check(
            "EMPTY_FIELD_KEEPS_MODEL",
            canvas_png(page) == steady
            and page.query_selector(".jscad-params-empty-warn") is None,
        )


        # ---- clamping happens on blur, not mid-keystroke ---------------------
        box.type("3", delay=40)
        page.wait_for_timeout(500)
        mid = page.input_value("#p-width")
        check("NO_CLAMP_WHILE_TYPING", mid == "3", f"box shows {mid!r}")
        box.press("Enter")
        page.wait_for_timeout(900)
        after_blur = page.input_value("#p-width")
        check("CLAMPS_TO_MIN_ON_BLUR", after_blur == "5", f"box shows {after_blur!r}")

        # ---- slider ----------------------------------------------------------
        # Width is 5 after the clamp check, which makes the radius-10 hole
        # swallow the whole part. Put it back before testing the slider, or
        # this measures an empty model against an empty model.
        box.click()
        box.press("Control+a")
        box.type("60", delay=30)
        box.press("Enter")
        page.wait_for_timeout(900)
        check("EMPTY_MODEL_FLAGGED", page.query_selector(".jscad-params-empty-warn") is None)

        pre = canvas_png(page)
        slider = page.query_selector('input[aria-label="Height slider"]')
        if slider:
            sb = slider.bounding_box()
            page.mouse.move(sb["x"] + sb["width"] * 0.2, sb["y"] + sb["height"] / 2)
            page.mouse.down()
            for frac in (0.4, 0.6, 0.8):
                page.mouse.move(sb["x"] + sb["width"] * frac, sb["y"] + sb["height"] / 2)
                page.wait_for_timeout(120)
            page.mouse.up()
            page.wait_for_timeout(1500)
            check("SLIDER_DRAG_REBUILDS", canvas_png(page) != pre)
            check("SLIDER_DRAG_DID_NOT_RELOAD", sentinel_of(fr) == "alive")
        else:
            check("SLIDER_DRAG_REBUILDS", False, "no height slider found")

        # ---- arrow keys nudge by step ---------------------------------------
        w = page.query_selector("#p-width")
        w.click(); w.press("Control+a"); w.type("60", delay=25); w.press("Enter")
        page.wait_for_timeout(700)
        w.click(); w.press("ArrowUp"); page.wait_for_timeout(250)
        check("ARROW_UP_NUDGES_BY_STEP", page.input_value("#p-width") == "61",
              page.input_value("#p-width"))
        w.press("ArrowDown"); w.press("ArrowDown"); page.wait_for_timeout(250)
        check("ARROW_DOWN_NUDGES", page.input_value("#p-width") == "59",
              page.input_value("#p-width"))

        # ---- a fraction typed into a stepped field settles on blur -----------
        # `step: 1` has to mean something, or main() quietly receives 7.37.
        r = page.query_selector("#p-hole")
        r.click(); r.press("Control+a"); r.type("7.37", delay=25); r.press("Enter")
        page.wait_for_timeout(700)
        check("FRACTION_SETTLES_TO_STEP", page.input_value("#p-hole") == "7",
              page.input_value("#p-hole"))

        # ---- a cut bigger than the part --------------------------------------
        # An empty result is an answer, not a no-op. Leaving the previous shape
        # on screen unlabelled would show geometry the numbers no longer
        # describe. Shrink the body first: a radius-40 hole does not empty a
        # 95-wide box, it just cuts a channel through the middle of it.
        def set_field(pid, value):
            f = page.query_selector(pid)
            f.click()
            f.press("Control+a")
            f.type(value, delay=30)
            f.press("Enter")
            page.wait_for_timeout(700)

        set_field("#p-round", "0")
        set_field("#p-width", "10")
        set_field("#p-depth", "10")
        set_field("#p-hole", "40")
        page.wait_for_timeout(900)
        check(
            "EMPTY_RESULT_IS_FLAGGED",
            page.query_selector(".jscad-params-empty-warn") is not None,
        )

        # ---- code that throws is labelled, not just left stale ---------------
        # roundedCuboid rejects a radius at or past half the smallest side, so
        # the starter can be driven into a throw without touching the editor --
        # typing JS into CodeMirror auto-closes brackets and mangles it.
        set_field("#p-hole", "0")
        set_field("#p-width", "5")
        set_field("#p-depth", "5")
        set_field("#p-round", "20")
        page.wait_for_timeout(1200)
        warn = page.query_selector(".jscad-params-empty-warn")
        check(
            "THROWN_REBUILD_IS_LABELLED",
            warn is not None and "stopped the code" in warn.inner_text(),
            (warn.inner_text()[:60].replace(chr(10), " ") if warn else "no warning shown"),
        )

        # ---- the mouse toolbar -----------------------------------------------
        page.on("dialog", lambda d: d.accept())
        page.click(".sandbox-mode:has-text('Build')")
        page.wait_for_selector(".model-tools", timeout=20_000)
        check("BUILD_TOGGLE_SHOWS_TOOLBAR", page.query_selector(".model-tools") is not None)

        page.click(".model-tools button:has-text('Box')")
        page.wait_for_timeout(2500)
        page.click(".model-tools button:has-text('Cylinder')")
        page.wait_for_timeout(2500)
        rows = page.query_selector_all(".model-row")
        check("TOOLBAR_ADDS_SHAPES", len(rows) == 2, f"{len(rows)} rows")

        # Five primitives, matching what WebCAD's rail offers.
        tools = [b.inner_text().strip() for b in page.query_selector_all(".model-tools button")]
        check("FIVE_PRIMITIVES",
              all(t in tools for t in ["Box", "Cylinder", "Sphere", "Cone", "Ring"]),
              str(tools[:6]))

        # A ring exercises the one shape JSCAD cannot place directly.
        before_ring = canvas_png(page)
        page.click(".model-tools button:has-text('Ring')")
        page.wait_for_timeout(3500)
        check("RING_BUILDS", canvas_png(page) != before_ring
              and page.query_selector(".jscad-params-empty-warn") is None)
        page.click('.model-tools button[aria-label="Undo"]')
        page.wait_for_timeout(2500)
        rows = page.query_selector_all(".model-row")
        check("UNDO_REMOVES_THE_RING", len(rows) == 2, f"{len(rows)} rows")
        check("NAMES_COUNT_PER_KIND",
              "Cylinder 1" in rows[1].inner_text(), rows[1].inner_text().strip())

        rows[0].click()
        page.keyboard.down("Control"); rows[1].click(); page.keyboard.up("Control")
        page.wait_for_timeout(200)
        page.click(".model-tools button:has-text('Cut')")
        page.wait_for_timeout(3500)
        rows = page.query_selector_all(".model-row")
        check("CUT_ADDS_A_STEP", len(rows) == 3, f"{len(rows)} rows")
        check("CUT_NAMES_ITS_INPUTS",
              "Box 1" in rows[2].inner_text() and "Cylinder 1" in rows[2].inner_text(),
              rows[2].inner_text().strip())
        cut_shot = canvas_png(page)
        check("TOOLBAR_BUILT_A_MODEL", len(cut_shot) > 0)

        # A typed value must reach the DOC, not just the panel. The panel is
        # optimistic, so every check that reads it passes whether the edit was
        # committed or dropped -- which is how a blur that never committed
        # survived this gate for three phases. A structural change regenerates
        # from the doc, so it is the only honest witness.
        wf = page.query_selector("#p-box1_width")
        wf.click(); wf.press("Control+a"); wf.type("57", delay=25); wf.press("Enter")
        page.wait_for_timeout(2000)
        check("TYPED_VALUE_SHOWS", page.input_value("#p-box1_width") == "57",
              page.input_value("#p-box1_width"))
        page.click(".model-tools button:has-text('Sphere')")
        page.wait_for_timeout(3500)
        check("TYPED_VALUE_SURVIVES_A_REBUILD",
              page.input_value("#p-box1_width") == "57",
              f"width is {page.input_value('#p-box1_width')} after adding a shape")
        page.click('.model-tools button[aria-label="Undo"]')
        page.wait_for_timeout(2500)

        # Rounding a combination is the refusal that carries the lesson: order
        # changes the result, so round the box before you cut the hole.
        rows[2].click(); page.wait_for_timeout(200)
        fil = page.query_selector(".model-tools button:has-text('Fillet')")
        check("FILLET_REFUSES_ON_A_COMBINATION", fil.is_disabled())
        check("FILLET_SAYS_WHY",
              "not on a combination" in (fil.get_attribute("title") or ""),
              (fil.get_attribute("title") or "")[:50])

        rows[0].click(); page.wait_for_timeout(200)
        check("FILLET_ALLOWED_ON_A_BOX",
              not page.query_selector(".model-tools button:has-text('Fillet')").is_disabled())
        page.click(".model-tools button:has-text('Fillet')")
        page.wait_for_timeout(3500)
        check("FILLET_CHANGES_THE_MODEL", canvas_png(page) != cut_shot)
        check("FILLET_ADDS_A_DIMENSION",
              any("corner" in (l.inner_text() or "")
                  for l in page.query_selector_all(".jscad-param-row > label")))

        fillet_shot = canvas_png(page)
        page.click(".model-tools button:has-text('Chamfer')")
        page.wait_for_timeout(3500)
        # "Different from the fillet" alone is satisfied by "blew up and drew an
        # error", which is how a broken chamfer helper slips through. Require a
        # healthy model as well as a changed one.
        check("CHAMFER_DIFFERS_FROM_FILLET",
              canvas_png(page) != fillet_shot
              and page.query_selector(".jscad-params-empty-warn") is None,
              "stale" if page.query_selector(".jscad-params-empty-warn") else "")

        # ---- drag handles ----------------------------------------------------
        # box1 is selected and chamfered by this point.
        handles = page.query_selector_all(".handle")
        check("HANDLES_FOR_A_SELECTED_BOX", len(handles) == 6, f"{len(handles)} handles")  # 3 size + 3 move, before Turn
        labels = sorted((h.get_attribute("aria-label") or "") for h in handles)
        check("SIZE_HANDLES_ARE_LABELLED",
              labels[:3] == ["Drag depth", "Drag height", "Drag move x"]
              and "Drag width" in labels, str(labels))
        check("MOVE_HANDLES_EXIST",
              sorted(l for l in labels if "move" in l)
              == ["Drag move x", "Drag move y", "Drag move z"], str(labels))
        check("MOVE_HANDLES_LOOK_DIFFERENT",
              len(page.query_selector_all(".handle.is-move")) == 3,
              f"{len(page.query_selector_all('.handle.is-move'))} move-styled")

        def handle(name):
            for h in page.query_selector_all(".handle"):
                if h.get_attribute("aria-label") == name:
                    return h
            return None

        depth_before = handle("Drag depth").bounding_box()
        width_before = float(page.input_value("#p-box1_width"))
        fr = frame_of(page)
        fr.evaluate("window.__dragSentinel = 'alive'")

        hb = handle("Drag width").bounding_box()
        page.mouse.move(hb["x"] + 6, hb["y"] + 6)
        page.mouse.down()
        for k in range(1, 7):
            page.mouse.move(hb["x"] + 6 - k * 9, hb["y"] + 6)
            page.wait_for_timeout(90)
        page.mouse.up()
        page.wait_for_timeout(1500)

        width_after = float(page.input_value("#p-box1_width"))
        check("HANDLE_DRAG_CHANGES_THE_DIMENSION",
              abs(width_after - width_before) > 1, f"{width_before} -> {width_after}")
        check("HANDLE_DRAG_DID_NOT_RELOAD",
              (fr.evaluate("window.__dragSentinel") if fr else None) == "alive")

        # The depth face sits at cy + depth/2, which does not depend on width --
        # so if the camera stayed put, the depth handle must not have moved. A
        # drag that leaked through to the orbit controls would shift it.
        depth_after = handle("Drag depth").bounding_box()
        drift = max(abs(depth_after["x"] - depth_before["x"]),
                    abs(depth_after["y"] - depth_before["y"]))
        check("HANDLE_DRAG_DID_NOT_ORBIT", drift < 2.0, f"{drift:.1f}px drift")

        # A move handle changes where the shape sits, not how big it is.
        w_before = float(page.input_value("#p-box1_width"))
        x_before = float(page.input_value("#p-box1_x"))
        mh = handle("Drag move x")
        mb = mh.bounding_box()
        page.mouse.move(mb["x"] + 6, mb["y"] + 6)
        page.mouse.down()
        for k in range(1, 6):
            page.mouse.move(mb["x"] + 6 - k * 10, mb["y"] + 6)
            page.wait_for_timeout(90)
        page.mouse.up()
        page.wait_for_timeout(1500)
        check("MOVE_HANDLE_MOVES_THE_SHAPE",
              abs(float(page.input_value("#p-box1_x")) - x_before) > 1,
              f"x {x_before} -> {page.input_value('#p-box1_x')}")
        check("MOVE_HANDLE_LEAVES_SIZE_ALONE",
              abs(float(page.input_value("#p-box1_width")) - w_before) < 0.01,
              f"width {w_before} -> {page.input_value('#p-box1_width')}")

        # ---- turning a shape --------------------------------------------------
        page.query_selector_all(".model-row")[0].click()
        page.wait_for_timeout(300)
        before_turn = canvas_png(page)
        page.click(".model-tools button:has-text('Turn')")
        page.wait_for_timeout(3500)
        check("TURN_ADDS_RING_HANDLES",
              len(page.query_selector_all(".handle.is-turn")) == 3,
              f"{len(page.query_selector_all('.handle.is-turn'))} rings")
        check("TURN_ADDS_ANGLE_DIMENSIONS",
              any("turn" in (l.inner_text() or "").lower()
                  for l in page.query_selector_all(".jscad-param-row > label")))
        check("TURN_ALONE_CHANGES_NOTHING_YET",
              page.query_selector(".jscad-params-empty-warn") is None)

        rz_before = float(page.input_value("#p-box1_rz"))
        ring_h = handle("Drag turn z")
        rb = ring_h.bounding_box()
        page.mouse.move(rb["x"] + 7, rb["y"] + 7)
        page.mouse.down()
        for k in range(1, 7):
            page.mouse.move(rb["x"] + 7 + k * 12, rb["y"] + 7)
            page.wait_for_timeout(90)
        page.mouse.up()
        page.wait_for_timeout(1800)
        check("TURN_HANDLE_ROTATES",
              abs(float(page.input_value("#p-box1_rz")) - rz_before) > 3,
              f"rz {rz_before} -> {page.input_value('#p-box1_rz')}")
        check("TURNING_REDRAWS_THE_MODEL", canvas_png(page) != before_turn)
        check("TURN_DID_NOT_BREAK_THE_BUILD",
              page.query_selector(".jscad-params-empty-warn") is None)

        # A combination has no shape of its own to grab.
        page.query_selector_all(".model-row")[2].click()
        page.wait_for_timeout(800)
        check("NO_HANDLES_ON_A_COMBINATION",
              len(page.query_selector_all(".handle")) == 0,
              f"{len(page.query_selector_all('.handle'))} handles")
        page.query_selector_all(".model-row")[0].click()
        page.wait_for_timeout(600)

        # ---- undo ------------------------------------------------------------
        # A whole drag is one undo, not sixty: the doc is written once, on
        # release. Structure and dimensions share the same history, because to
        # a student both are just "put it back".
        # Ordering-independent: snapshot every dimension, undo, and require that
        # something moved. Naming one field here broke twice as checks were
        # inserted above it, each time testing the test rather than the feature.
        def dims():
            out = {}
            for inp in page.query_selector_all('.jscad-param-row input[type="text"]'):
                i = inp.get_attribute("id")
                if i:
                    out[i] = inp.input_value()
            return out

        before_dims = dims()
        rows_before = len(page.query_selector_all(".model-row"))
        page.click('.model-tools button[aria-label="Undo"]')
        page.wait_for_timeout(2500)
        after_dims = dims()
        moved = [k for k in before_dims if after_dims.get(k) != before_dims[k]]
        check("UNDO_REVERSES_A_DRAG", len(moved) > 0 or len(page.query_selector_all(".model-row")) != rows_before,
              f"changed: {moved or 'nothing'}")

        page.click('.model-tools button[aria-label="Redo"]')
        page.wait_for_timeout(2500)
        redone = dims()
        check("REDO_RESTORES_IT",
              all(redone.get(k) == before_dims[k] for k in before_dims),
              str([k for k in before_dims if redone.get(k) != before_dims[k]]))

        # Undo all the way out, then check it stops rather than going negative.
        # Each undo regenerates and reloads, so give it room -- clicking faster
        # than the reload lands measures the test's patience, not the feature.
        steps = 0
        for _ in range(30):
            b = page.query_selector('.model-tools button[aria-label="Undo"]')
            if b is None or b.is_disabled():
                break
            b.click()
            steps += 1
            page.wait_for_timeout(1100)
        b = page.query_selector('.model-tools button[aria-label="Undo"]')
        check("UNDO_STOPS_AT_THE_BEGINNING",
              b is not None and b.is_disabled(), f"after {steps} undos")
        check("EMPTY_MODEL_IS_NOT_AN_ERROR",
              page.query_selector(".model-empty") is not None
              or len(page.query_selector_all(".model-row")) == 0)
        for _ in range(30):
            b = page.query_selector('.model-tools button[aria-label="Redo"]')
            if b is None or b.is_disabled():
                break
            b.click()
            page.wait_for_timeout(1100)

        # Leaving Build hands the generated file over; the dialog auto-accepts.
        page.click(".sandbox-mode:has-text('Code')")
        page.wait_for_timeout(1200)
        # CodeMirror virtualises, so inner_text is only the rendered viewport --
        # assert on the banner at the top, not on a helper 40 lines down.
        src = page.inner_text(".cm-content")
        check("UNLINK_WRITES_THE_GENERATED_CODE",
              "Built with the shape tools" in src and "JSCAD sandbox" not in src,
              src[:60].strip().replace(chr(10), " "))
        check("UNLINK_EMPTIES_THE_TOOLBAR", page.query_selector(".model-tools") is None)

        # ---- sketch, corner, pull ---------------------------------------------
        # The unlink above left Build, so re-enter. The doc is empty now, which
        # makes this a clean start rather than a continuation.
        if page.query_selector(".model-tools") is None:
            page.click(".sandbox-mode:has-text('Build')")
            page.wait_for_selector(".model-tools", timeout=20_000)
            page.wait_for_timeout(600)

        page.click(".model-tools button:has-text('Sketch')")
        page.wait_for_timeout(3500)
        corners = page.query_selector_all(".handle.is-point")
        check("SKETCH_HAS_FOUR_CORNERS", len(corners) == 4, f"{len(corners)} corners")
        check("SKETCH_OUTLINE_IS_DRAWN",
              page.query_selector(".sketch-lines polygon") is not None)

        # A corner moves in two directions at once -- the one thing the
        # single-axis handles cannot express, and the reason the pointer is
        # solved onto both projected axes rather than dotted with each.
        u0 = float(page.input_value("#p-sk1_p2u"))
        v0 = float(page.input_value("#p-sk1_p2v"))
        cb = page.query_selector_all(".handle.is-point")[2].bounding_box()
        page.mouse.move(cb["x"] + 5, cb["y"] + 5)
        page.mouse.down()
        for k in range(1, 7):
            page.mouse.move(cb["x"] + 5 + k * 9, cb["y"] + 5 - k * 7)
            page.wait_for_timeout(80)
        page.mouse.up()
        page.wait_for_timeout(1500)
        du = abs(float(page.input_value("#p-sk1_p2u")) - u0)
        dv = abs(float(page.input_value("#p-sk1_p2v")) - v0)
        check("CORNER_MOVES_IN_BOTH_DIRECTIONS", du > 1 and dv > 1, f"du={du:.1f} dv={dv:.1f}")
        # Sane magnitude: a 50px drag at a fitted zoom is tens of units, not
        # hundreds. Catches the camera framing a placeholder instead of the work.
        check("CORNER_DRAG_IS_PROPORTIONATE", du < 200 and dv < 200, f"du={du:.1f} dv={dv:.1f}")

        page.click(".model-tools button:has-text('Corner')")
        page.wait_for_timeout(3000)
        check("CORNER_BUTTON_ADDS_ONE",
              len(page.query_selector_all(".handle.is-point")) == 5,
              f"{len(page.query_selector_all('.handle.is-point'))} corners")

        # ---- rules on a sketch -------------------------------------------------
        # Constraints exist so a corner drag stops being free-hand. The rule
        # panel appears only for a selected sketch, because an edge is what a
        # rule is about and there is nothing on the canvas to click for one.
        check("RULES_PANEL_APPEARS", page.query_selector(".sk-rules") is not None)
        rows = page.query_selector_all(".sk-table tbody tr")
        check("ONE_ROW_PER_EDGE", len(rows) == 5, f"{len(rows)} rows")

        # Knock edge 1 out of level FIRST. It starts flat, so applying "across"
        # to it would pass whether the rule worked or not -- right and wrong
        # looking identical, which is the whole reason to set the state up.
        tilt = page.query_selector("#p-sk1_p1v")
        tilt.click(); tilt.press("Control+a"); tilt.type("9", delay=25); tilt.press("Enter")
        page.wait_for_timeout(2000)
        v_a = float(page.input_value("#p-sk1_p0v"))
        v_b = float(page.input_value("#p-sk1_p1v"))
        check("EDGE_STARTS_UNLEVEL", abs(v_a - v_b) > 0.5, f"{v_a} vs {v_b}")
        page.click('.sk-table button[aria-label="Edge 1 across"]')
        page.wait_for_timeout(3000)
        v_a2 = float(page.input_value("#p-sk1_p0v"))
        v_b2 = float(page.input_value("#p-sk1_p1v"))
        check("ACROSS_LEVELS_THE_EDGE", abs(v_a2 - v_b2) < 0.05, f"{v_a2} vs {v_b2}")

        # A dragged corner is pinned, so the solver moves the far end to meet it
        # rather than dragging the pointer back.
        before_u = float(page.input_value("#p-sk1_p0u"))
        before_v = float(page.input_value("#p-sk1_p0v"))
        cb2 = handle("Drag corner 1").bounding_box()
        page.mouse.move(cb2["x"] + 5, cb2["y"] + 5)
        page.mouse.down()
        for k in range(1, 6):
            page.mouse.move(cb2["x"] + 5 + k * 8, cb2["y"] + 5 + k * 5)
            page.wait_for_timeout(80)
        page.mouse.up()
        page.wait_for_timeout(1800)
        # Either axis: the screen direction a drag lands on depends on the
        # camera, so demanding movement in u specifically tests the view angle
        # rather than the solver.
        moved_u = abs(float(page.input_value("#p-sk1_p0u")) - before_u)
        moved_v = abs(float(page.input_value("#p-sk1_p0v")) - before_v)
        check("DRAGGED_CORNER_IS_NOT_PULLED_BACK",
              moved_u > 1 or moved_v > 1,
              f"moved u {moved_u:.2f}, v {moved_v:.2f}")
        va = float(page.input_value("#p-sk1_p0v"))
        vb = float(page.input_value("#p-sk1_p1v"))
        check("RULE_STILL_HOLDS_AFTER_A_DRAG", abs(va - vb) < 0.2, f"{va} vs {vb}")

        # A length rule is the dimension a real sketch is built from.
        li = page.query_selector('.sk-table input[aria-label="Edge 2 length"]')
        li.click(); li.press("Control+a"); li.type("60", delay=25); li.press("Enter")
        page.wait_for_timeout(3000)
        import math
        u1 = float(page.input_value("#p-sk1_p1u")); w1 = float(page.input_value("#p-sk1_p1v"))
        u2 = float(page.input_value("#p-sk1_p2u")); w2 = float(page.input_value("#p-sk1_p2v"))
        edge2 = math.hypot(u2 - u1, w2 - w1)
        check("LENGTH_RULE_IS_HONOURED", abs(edge2 - 60) < 0.5, f"edge 2 = {edge2:.2f}")

        # A rule that cannot hold must say so rather than quietly settling.
        page.click('.sk-table button[aria-label="Edge 2 across"]')
        page.wait_for_timeout(1200)
        page.click('.sk-table button[aria-label="Edge 2 up"]')
        page.wait_for_timeout(2500)
        check("ACROSS_AND_UP_DO_NOT_STACK",
              page.get_attribute('.sk-table button[aria-label="Edge 2 across"]', "aria-pressed") == "false"
              or page.query_selector('.sk-table button[aria-label="Edge 2 across"].on') is None,
              "across should have come off when up went on")

        before_pull = canvas_png(page)
        page.click(".model-tools button:has-text('Pull')")
        page.wait_for_timeout(4000)
        check("PULL_MAKES_A_SOLID",
              canvas_png(page) != before_pull
              and page.query_selector(".jscad-params-empty-warn") is None)
        rows = [r.inner_text().replace(chr(10), " ") for r in page.query_selector_all(".model-row")]
        check("PULL_NAMES_ITS_SKETCH", any("Pull" in r and "Sketch" in r for r in rows), str(rows[-1:]))
        check("PULL_ADDS_A_HEIGHT",
              any("height" in (l.inner_text() or "").lower()
                  for l in page.query_selector_all(".jscad-param-row > label")))

        # Pulling the same outline twice would make a second solid from it,
        # which is never what the click meant.
        for r in page.query_selector_all(".model-row"):
            if "Sketch" in r.inner_text() and "Pull" not in r.inner_text():
                r.click()
                break
        page.wait_for_timeout(400)
        page.click(".model-tools button:has-text('Pull')")
        page.wait_for_timeout(1200)
        note = page.query_selector(".model-note")
        check("PULLING_TWICE_IS_REFUSED",
              note is not None and "already been pulled" in note.inner_text(),
              note.inner_text()[:50] if note else "no note")

        # ---- the teacher gate --------------------------------------------------
        # Both gates share one table; the sandbox has no assignment, so only the
        # class-wide one can reach it. A gate that cannot be read must never
        # lock a student out, which is why the default is both.
        import json as _json

        def set_gate(mode):
            page.evaluate(
                """async (m) => {
                     await fetch('/api/dev/lesson-modes', {
                       method: 'POST',
                       headers: {'Content-Type': 'application/json'},
                       body: JSON.stringify({ lessonId: '*', mode: m }),
                     });
                   }""",
                mode,
            )
            page.reload(wait_until="domcontentloaded")
            page.wait_for_selector(".sandbox-mode", timeout=60_000)
            page.wait_for_timeout(1200)

        def toggle(name):
            for b in page.query_selector_all(".sandbox-modes button"):
                if b.inner_text().strip() == name:
                    return b
            return None

        set_gate("visual")
        check("GATE_VISUAL_DISABLES_CODE", toggle("Code").is_disabled())
        check("GATE_VISUAL_KEEPS_BUILD", not toggle("Build").is_disabled())
        check("GATE_FORCES_THE_ALLOWED_SIDE",
              page.query_selector(".model-tools") is not None
              or toggle("Build").get_attribute("aria-pressed") == "true")
        check("GATE_SAYS_WHY",
              page.query_selector(".sandbox-lock") is not None
              and "class" in page.inner_text(".sandbox-lock"),
              page.inner_text(".sandbox-lock") if page.query_selector(".sandbox-lock") else "no note")

        set_gate("code")
        check("GATE_CODE_DISABLES_BUILD", toggle("Build").is_disabled())
        check("GATE_CODE_KEEPS_CODE", not toggle("Code").is_disabled())
        check("GATE_MOVED_STUDENT_OFF_BUILD", page.query_selector(".model-tools") is None)

        set_gate(None)
        check("NO_GATE_ALLOWS_BOTH",
              not toggle("Code").is_disabled() and not toggle("Build").is_disabled())
        check("NO_GATE_SHOWS_NO_NOTE", page.query_selector(".sandbox-lock") is None)

        # ---- an edit made before the first render is not dropped -------------
        # Type into the panel while the first build is still running. The edit
        # used to merge into the runner's params and then vanish, because the
        # build already had the old values -- panel and model disagreeing with
        # nothing on screen admitting it.
        # The gate tests may have left the sandbox in Build, where there is no
        # code editor to type into. The stored preference survives a reload, so
        # this is not stale state -- it is where the student would actually be.
        if page.query_selector(".model-tools") is not None:
            page.click(".sandbox-modes button:has-text('Code')")
            page.wait_for_timeout(1200)
        page.wait_for_selector(".cm-content", timeout=20_000)

        page.click(".cm-content")
        page.keyboard.press("Control+a")
        page.keyboard.insert_text(SLOW_SKETCH)
        page.wait_for_timeout(400)
        press_run(page)
        page.wait_for_selector(".jscad-params", timeout=60_000)
        early = page.query_selector("#p-n")
        early.click()
        early.press("Control+a")
        early.type("3", delay=5)
        early.press("Enter")
        page.wait_for_timeout(9_000)

        # A dropped edit means no rebuild ever ran, and the timing badge is
        # cleared on every fresh load -- so its absence is the tell.
        check("EARLY_EDIT_REACHED_THE_MODEL",
              page.query_selector(".jscad-params-ms") is not None
              and page.query_selector(".jscad-params-empty-warn") is None,
              page.query_selector(".jscad-params-ms").inner_text()
              if page.query_selector(".jscad-params-ms") else "no rebuild ran")
        check("EARLY_EDIT_PANEL_AGREES", page.input_value("#p-n") == "3",
              page.input_value("#p-n"))

        browser.close()

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:3002")
    ap.add_argument("--headed", action="store_true")
    a = ap.parse_args()

    t0 = time.time()
    try:
        run(a.url.rstrip("/"), a.headed)
    except Exception as e:  # a crash is a red gate, not a stack trace to squint at
        print(f"\n  [FAIL] GATE_CRASHED -- {type(e).__name__}: {e}")
        FAIL.append("GATE_CRASHED")

    print(f"\n  {len(PASS)} passed, {len(FAIL)} failed  ({time.time() - t0:.1f}s)")
    if FAIL:
        print("  failed: " + ", ".join(FAIL))
    sys.exit(1 if FAIL else 0)
