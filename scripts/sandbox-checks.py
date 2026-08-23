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
    btn = page.query_selector(".run-toolbar .btn-run")
    if btn and "Stop" in btn.inner_text():
        btn.click()
        page.wait_for_timeout(400)
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

        # ---- an edit made before the first render is not dropped -------------
        # Type into the panel while the first build is still running. The edit
        # used to merge into the runner's params and then vanish, because the
        # build already had the old values -- panel and model disagreeing with
        # nothing on screen admitting it.
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
