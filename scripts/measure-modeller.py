#!/usr/bin/env python
# Comparable timing/quality harness across four 3D-modelling web apps, built
# for the gauntlet loop that is replacing shCode's geometry engine (JSCAD ->
# B-rep). Every critic in that loop reads this script's numbers, so the same
# four measurements have to mean the same thing on four unrelated apps:
#
#   1. cold load -> first geometry on screen (cache cleared, real pixels)
#   2. edit -> redraw (one dimension/line changed, timed from real WebGL
#      activity, gated by real pixels -- see below, this is NOT the same
#      instrument as #1 and the difference is deliberate)
#   3. orbit smoothness (rAF deltas during a 2s drag: median fps, worst frame)
#   4. triangle count, IF the app exposes it -- never guessed
#
# WHY PIXELS FOR COLD LOAD, NOT EVENTS. Every one of these apps finishes its
# own "loaded" event long before it finishes drawing (JSCAD compiles+meshes
# after Run; Three.js apps mount a canvas before the first frame lands). So
# "loaded" means nothing here. Cold load polls actual canvas pixel content
# instead, via ElementHandle.screenshot() -- that reads the compositor's
# front buffer, which works even for a cross-origin iframe or a WebGL
# context with preserveDrawingBuffer=false, where canvas.toDataURL() would
# come back blank or throw. See scripts/sandbox-visual.py for the same
# technique used against this repo's own reSHape preview. Cold load's
# multi-second magnitude dwarfs the screenshot cost (~100-350ms mean per
# capture, measured -- see _poll_gap_stats()), so that cost doesn't matter
# much here. It matters a great deal for #2, which is why that one is timed
# differently -- see measure_redraw_via_gpu_upload()'s docstring for the
# full story: screenshots were tried first, measured too coarse against a
# ~180ms target difference, and replaced with real WebGL bufferData/
# bufferSubData timestamps, with pixels demoted to a correctness gate.
#
# WHY A GENERIC WEBGL TRIANGLE COUNTER. None of these four apps expose a
# triangle count on window. Rather than reading each app's internals (three
# of which are unfamiliar UIs we cannot instrument by hand), this script
# monkey-patches HTMLCanvasElement.getContext BEFORE any app script runs
# (page/context.add_init_script, which Playwright injects into every frame
# including cross-origin ones) and counts vertices actually passed to
# drawElements/drawArrays under TRIANGLES/STRIP/FAN each frame. That is a
# real number read off the GPU call stream, not an app-reported one -- it
# will not match an app's own "N faces" label exactly (a strip vs. a fan vs.
# instancing count differently), but it is comparable across all four apps
# by construction, which nothing else here is.
#
# THE SILENT NO-OP RISK. A prior Playwright session against this repo's own
# canvas app produced four green, fully-silent no-ops (see repo memory:
# project_driving_diagram_editor_headless). So every interaction meant to
# change something is followed by an assertion that it did -- an input's
# read-back value for edits, a pixel diff for the canvas -- and a run that
# cannot confirm the change reports FAILED for that measurement, never a
# number. See wait_for_canvas_change_from() and the *_edit() functions below.
#
#   npm run dev                          (already running for this harness)
#   python scripts/measure-modeller.py [--only jscad,brep] [--runs 3] [--slow] [--out PATH]
import argparse
import json
import re
import statistics
import sys
import time
import io
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
from PIL import Image
import numpy as np

CHROME_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]

# Down/up in bytes/sec, latency in ms -- the "shared wifi" profile this repo
# already uses in scripts/measure-brep-load.py and measure-brep-warming.py,
# reused here so a --slow run means the same thing everywhere in the repo.
SLOW_PROFILE = (1_500_000 / 8, 750_000 / 8, 150)

DEFAULT_OUT = (
    r"C:\Users\shuff57\AppData\Local\Temp\claude\C--Users-shuff57-Documents-GitHub-shCode"
    r"\cb606f10-8681-405d-b45d-f5404c7caccf\scratchpad\modeller-measurements.json"
)

# Injected before any app script runs, into every frame (Playwright's
# add_init_script applies to child frames too, including cross-origin ones --
# this is what lets it see into the sandboxed reSHape runner iframe).
TRICOUNT_INIT_JS = """
(() => {
  window.__triCounts = { lastFrame: 0, _acc: 0 };
  // __drawTimes: a timestamp for every drawElements/drawArrays call, ANY
  // geometry, changed or not. NOT used for edit-to-redraw timing -- confirmed
  // 2026-09-02 that JSCAD's own public/reshape/runner.html calls its renderer
  // unconditionally on every requestAnimationFrame forever (a genuine
  // continuous render loop: "window.requestAnimationFrame(updateAndRender)"
  // called every tick regardless of whether anything changed), so "first draw
  // call after the edit" on that subject would just measure time-to-next-
  // frame (~16ms), not the actual rebuild. Kept only as raw diagnostic data.
  // __uploadTimes: a timestamp for every bufferData/bufferSubData call --
  // this is when NEW vertex/index data actually reaches the GPU, which only
  // happens when geometry changes, never on a repaint of an unchanged buffer.
  // That makes it immune to the continuous-loop problem above AND to a
  // topology-preserving edit (e.g. moving a width with the same corner-round/
  // hole segment counts, so triangle COUNT is unchanged but vertex POSITIONS
  // still have to be re-uploaded) -- this is the real edit-to-redraw signal.
  window.__drawTimes = [];
  window.__uploadTimes = [];
  const cap = (arr) => { if (arr.length > 20000) arr.splice(0, arr.length - 20000); };
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const ctx = origGetContext.call(this, type, ...args);
    if (ctx && /webgl/i.test(type) && !ctx.__triPatched) {
      ctx.__triPatched = true;
      const TR = ctx.TRIANGLES, TS = ctx.TRIANGLE_STRIP, TF = ctx.TRIANGLE_FAN;
      const addTri = (mode, count) => {
        if (mode === TR) window.__triCounts._acc += count / 3;
        else if (mode === TS || mode === TF) window.__triCounts._acc += Math.max(0, count - 2);
      };
      const pushDraw = () => { window.__drawTimes.push(performance.now()); cap(window.__drawTimes); };
      const odE = ctx.drawElements.bind(ctx);
      ctx.drawElements = function (mode, count, type2, offset) {
        addTri(mode, count); pushDraw();
        return odE(mode, count, type2, offset);
      };
      const odA = ctx.drawArrays.bind(ctx);
      ctx.drawArrays = function (mode, first, count) {
        addTri(mode, count); pushDraw();
        return odA(mode, first, count);
      };
      const pushUpload = () => { window.__uploadTimes.push(performance.now()); cap(window.__uploadTimes); };
      const obD = ctx.bufferData.bind(ctx);
      ctx.bufferData = function (...a) { pushUpload(); return obD(...a); };
      const obSD = ctx.bufferSubData.bind(ctx);
      ctx.bufferSubData = function (...a) { pushUpload(); return obSD(...a); };
      // Only overwrite lastFrame when this frame actually drew something.
      // BUG, found 2026-09-02 measuring jsketcher: unconditionally copying
      // _acc every tick works for a CONTINUOUSLY rendering app (jscad,
      // replicad bar -- _acc is non-zero basically every frame) but zeroes
      // lastFrame out on the very next tick for an ON-DEMAND renderer
      // (jsketcher, BrepViewport) -- by the time anything reads it, several
      // empty frames have already reset it to 0. Never caught earlier
      // because brep's triangle count is read from its own onStats instead
      // of this generic path. Persisting the last non-zero value is the
      // honest semantic: "triangles in the most recent frame that drew
      // anything," not "triangles in the immediately preceding tick."
      const tick = () => {
        if (window.__triCounts._acc > 0) window.__triCounts.lastFrame = window.__triCounts._acc;
        window.__triCounts._acc = 0;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    return ctx;
  };
})();
"""

RAF_START_JS = """
() => {
  window.__rafSamples = [];
  window.__rafRunning = true;
  function loop(now) {
    window.__rafSamples.push(now);
    if (window.__rafRunning) requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
"""


def log(msg):
    print(msg, file=sys.stderr)


# ---------------------------------------------------------------- pixels ---

def png_to_array(png_bytes):
    im = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    return np.asarray(im)


def frame_diff_score(a, b, per_pixel_threshold=24):
    """Count of pixels that changed by more than per_pixel_threshold (summed
    across R+G+B). A whole-frame MEAN diff was tried first and missed a real,
    confirmed (app-reported rebuild + triangle count both moved) edit on
    /brep-test/: a localized shape change on a mostly-white/blank canvas
    only moves the global mean by ~1.2, well under any threshold that also
    tolerates rendering noise. A pixel-count of "meaningfully changed"
    pixels catches that (10k+ pixels changed in the confirmed case) while
    two identical back-to-back captures of the same frame measured a noise
    floor of exactly 0 -- so this threshold has enormous margin on both
    sides. Confirmed 2026-09-02."""
    if a is None or b is None or a.shape != b.shape:
        return 1e9
    diff = np.abs(a.astype(np.int16) - b.astype(np.int16)).sum(axis=2)
    return int(np.count_nonzero(diff > per_pixel_threshold))


def is_blank(arr, tol=2.0):
    return float(arr.std()) < tol


def biggest_canvas(page):
    """The largest on-screen <canvas>, in this page OR any of its frames --
    external apps we don't control may render inside an iframe of their own."""
    best, best_area = None, 0
    frames = [page] + list(page.frames)
    seen = set()
    for f in frames:
        fid = id(f)
        if fid in seen:
            continue
        seen.add(fid)
        try:
            canvases = f.query_selector_all("canvas")
        except Exception:
            continue
        for c in canvases:
            try:
                if not c.is_visible():
                    continue
                box = c.bounding_box()
            except Exception:
                continue
            if not box:
                continue
            area = box["width"] * box["height"]
            if area > best_area:
                best_area, best = area, c
    return best


# Sampling floor bookkeeping. Every wait loop below screenshots the canvas,
# sleeps, and screenshots again -- the real gap between two samples is the
# sleep PLUS however long the screenshot+decode itself took, and that second
# part is not free: measured against /brep-test/ on this machine it was
# ~125-275ms per capture on its own (mean ~148ms), well above the 150ms
# `poll` sleep parameter's face value. Any redraw faster than the ACTUAL
# achieved cadence is invisible to this harness -- it will read as instant or
# be rounded up to the next sample, not measured precisely. run_once() resets
# this list and reports {mean, max, samples} per run so that limit is stated
# with real numbers instead of assumed from the `poll=` constant.
_POLL_GAPS_MS = []


def _reset_poll_gaps():
    _POLL_GAPS_MS.clear()


def _poll_gap_stats():
    if not _POLL_GAPS_MS:
        return None
    return {
        "meanMs": round(sum(_POLL_GAPS_MS) / len(_POLL_GAPS_MS), 1),
        "maxMs": round(max(_POLL_GAPS_MS), 1),
        "samples": len(_POLL_GAPS_MS),
    }


def capture_canvas(page):
    el = biggest_canvas(page)
    if el is None:
        return None, None
    try:
        png = el.screenshot(timeout=5000)
    except Exception:
        return None, None
    try:
        return el, png_to_array(png)
    except Exception:
        return None, None


def _capture_canvas_timed(page):
    """Same as capture_canvas(), but records how long THIS call took into
    _POLL_GAPS_MS -- the screenshot+decode cost, which is the part of the
    sampling floor that isn't just the `poll` sleep."""
    t0 = time.time()
    result = capture_canvas(page)
    _POLL_GAPS_MS.append((time.time() - t0) * 1000.0)
    return result


def wait_for_canvas_change_from(page, baseline_arr, t0, timeout=30.0, poll=0.15, diff_threshold=40):
    deadline = time.time() + timeout
    while time.time() < deadline:
        _, arr = _capture_canvas_timed(page)
        if arr is not None and frame_diff_score(arr, baseline_arr) > diff_threshold:
            return time.time() - t0, True
        time.sleep(poll)
    return time.time() - t0, False


def _poll_new_uploads(evaluator, since_n, timeout=15.0, poll=0.01):
    """Poll window.__uploadTimes (see TRICOUNT_INIT_JS) for entries past
    index `since_n`. `evaluator` is anything with .evaluate() in the right
    JS realm -- a Frame (jscad's sandboxed runner) or a Page (occt/replicad,
    neither of which uses an iframe)."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            new_times = evaluator.evaluate("(n) => (window.__uploadTimes || []).slice(n)", since_n)
        except Exception:
            new_times = []
        if new_times:
            return new_times
        time.sleep(poll)
    return []


def measure_kernel_ready_to_first_build(evaluator, ready_js_fn, t0, timeout_ready=20.0, timeout_build=15.0, poll=0.05):
    """For a wasm-kernel subject whose first build fires AUTOMATICALLY the
    instant the kernel finishes loading -- no click, no external "commit" to
    time from the way edit-to-redraw has one. Both occt (play.html's `run()`
    called unconditionally at module end) and the replicad bar
    (`ocInit.then(() => runCode(...))`) work this way.

    Anchors on the SAME instant the ready predicate first turns true,
    reading __uploadTimes.length in that identical evaluate() call so there
    is no gap between "observed ready" and "snapshotted the upload count" --
    the two would otherwise race, since the app's own auto-triggered build
    could complete between two separate round-trips. Verified live
    2026-09-02 that this race is not actually tight: the auto-triggered
    build itself takes ~75-110ms of real synchronous work (OC boolean +
    tessellation) before its first buffer upload, which is comfortably
    longer than one polling round-trip -- but anchoring atomically removes
    the assumption entirely rather than relying on that margin.

    `ready_js_fn` is JS source for a zero-arg function returning true/false,
    e.g. "() => document.getElementById('x').textContent.includes('ready')".

    Returns {navToKernelReadyMs, kernelReadyToFirstSolidMs, ok, error}."""
    combined = ("() => { const readyFn = " + ready_js_fn + "; "
                "return { ready: readyFn(), t: performance.now(), n: (window.__uploadTimes||[]).length }; }")
    deadline = time.time() + timeout_ready
    anchor = None
    while time.time() < deadline:
        try:
            state = evaluator.evaluate(combined)
        except Exception:
            state = None
        if state and state.get("ready"):
            anchor = state
            break
        time.sleep(poll)
    nav_ms = round((time.time() - t0) * 1000, 1)
    if anchor is None:
        return {"navToKernelReadyMs": None, "kernelReadyToFirstSolidMs": None, "ok": False,
                "error": f"kernel-ready predicate never became true within {timeout_ready}s"}

    new_times = _poll_new_uploads(evaluator, anchor["n"], timeout=timeout_build)
    if not new_times:
        return {"navToKernelReadyMs": nav_ms, "kernelReadyToFirstSolidMs": None, "ok": False,
                "error": "kernel became ready, but no WebGL buffer upload followed within timeout -- "
                         "the auto-triggered first build/render never happened"}
    build_ms = new_times[0] - anchor["t"]

    # Gate on non-blank pixels rather than a diff-from-baseline: the canvas
    # may not have existed at all before this first build (occt's is created
    # on first draw), so there is often no earlier frame to diff against --
    # but "a real canvas with real content now exists" is exactly as strong
    # a correctness check for a FIRST build as a diff is for a later edit.
    # NOTE: capture_canvas() expects a Page (it walks page.frames looking for
    # the biggest visible canvas) -- callers of this function always pass the
    # Page itself as `evaluator` (occt/replicad use no iframe), never a Frame.
    _, arr_now = capture_canvas(evaluator)
    if arr_now is None or is_blank(arr_now):
        return {"navToKernelReadyMs": nav_ms, "kernelReadyToFirstSolidMs": None, "ok": False,
                "error": f"a GPU buffer upload fired {build_ms:.2f}ms after kernel-ready, but the canvas is "
                         f"missing or blank afterward -- treating as a no-op rather than trusting the upload alone"}

    return {"navToKernelReadyMs": nav_ms, "kernelReadyToFirstSolidMs": round(build_ms, 2), "ok": True, "error": None}


def measure_redraw_via_gpu_upload(page, canvas_el, commit_fn, pixel_baseline, timeout=15.0, pixel_timeout=20.0):
    """Edit-to-redraw, timed from real WebGL activity instead of screenshots.

    WHY NOT SCREENSHOTS: measured screenshot+decode cost alone was 210-360ms
    mean (up to 1238ms worst) against a 180ms difference the whole engine
    swap turns on -- the ruler was bigger than the thing being measured.

    WHY NOT RAW DRAW-CALL TIMESTAMPS EITHER: the obvious next instrument --
    time to the first drawElements/drawArrays call after the edit -- is
    wrong on a subject that renders continuously. Confirmed 2026-09-02:
    JSCAD's public/reshape/runner.html calls its renderer unconditionally on
    every requestAnimationFrame forever, so "first draw call after commit"
    would just measure time-to-next-frame (~16ms) regardless of whether the
    model had actually rebuilt. BrepViewport, by contrast, renders only on
    demand (its own source comment: "a rebuild or a drag ... never in a
    continuous animation loop") -- so the two subjects are not comparable on
    that instrument even though they use the identical renderer library
    (jscad-regl-renderer) underneath.

    THE FIX: time to the first bufferData/bufferSubData call after the edit
    instead. That is when NEW vertex/index data reaches the GPU, which only
    happens when geometry actually changes -- a continuous loop repainting
    an unchanged buffer never calls it, and a topology-preserving edit (same
    triangle count, moved vertex positions) still has to call it. Comparable
    across both subjects regardless of which render-loop style either uses.

    Still gated on pixels, not derived from them: a buffer upload proves new
    data reached the GPU, not that it was drawn where the user can see it.
    wait_for_canvas_change_from() must also confirm the canvas actually
    changed, or this reports failed rather than trusting the upload alone."""
    frame = canvas_el.owner_frame()
    if frame is None:
        return {"ok": False, "ms": None, "method": None, "error": "canvas has no owner frame"}
    try:
        before = frame.evaluate("() => ({ t: performance.now(), n: (window.__uploadTimes || []).length })")
    except Exception as e:
        return {"ok": False, "ms": None, "method": None, "error": f"could not read the GPU-upload clock before commit: {e}"}

    commit_fn()  # may raise -- caller decides how to report that

    new_times = _poll_new_uploads(frame, before["n"], timeout=timeout)

    if not new_times:
        return {"ok": False, "ms": None, "method": "gpu-upload",
                "error": "no new WebGL bufferData/bufferSubData call observed within timeout after the edit -- "
                         "either the app never rebuilt, or its renderer doesn't reach this frame's WebGL context"}

    delta_ms = new_times[0] - before["t"]

    _, ok_pixels = wait_for_canvas_change_from(page, pixel_baseline, time.time(), timeout=pixel_timeout)
    if not ok_pixels:
        return {"ok": False, "ms": None, "method": "gpu-upload",
                "error": f"a GPU buffer upload fired {delta_ms:.2f}ms after the edit, but canvas pixels never "
                         f"changed afterward -- treating this as a no-op rather than trusting the upload alone"}

    return {"ok": True, "ms": round(delta_ms, 2), "method": "gpu-upload",
            "note": "timed from the first WebGL bufferData/bufferSubData call after the edit (sub-ms precision, "
                    "no screenshot cost), gated by a pixel-diff confirming the redraw was actually visible. Two "
                    "caveats: (1) this does not include the compositor's PRESENT step after the draw call that "
                    "consumes the new buffer -- typically ~1 frame, ~16ms at 60fps -- so the true on-screen delay "
                    "is this number plus roughly a frame, equally for both subjects; (2) it cannot distinguish "
                    "this upload from an unrelated one landing in the same window (e.g. a hover/overlay buffer) "
                    "if the app has any -- not observed on either jscad or brep, but not exhaustively ruled out."}


def wait_for_first_geometry(page, t0, trigger, timeout=45.0, poll=0.15, diff_threshold=40, blank_tol=2.0):
    """Cold-load detector, one continuous loop so a fast-rendering app can't
    be missed. On each poll: if we don't have a baseline yet and the canvas
    already shows non-blank content, geometry is visible RIGHT NOW -- return
    immediately (this is the only correct answer for an app like /brep-test/
    that mounts its canvas and finishes its first real build+draw between two
    polls, with no blank frame ever observed). Otherwise the first blank
    frame becomes the baseline, trigger() (if any -- e.g. JSCAD's Run button)
    fires exactly once right after that, and every following frame is diffed
    against it.
    An earlier version of this used a separate 3s "grab whatever's there"
    pre-loop to seed the baseline; against /brep-test/ that pre-loop
    sometimes captured the ALREADY-RENDERED frame as "baseline" (mount to
    first draw was well under 3s), so the diff against itself never fired
    and cold-load timed out on a subject that was, in fact, drawing fine --
    a silent false negative. Confirmed and fixed 2026-09-02."""
    baseline = None
    triggered = trigger is None  # nothing to fire, so "already triggered"
    deadline = time.time() + timeout
    while time.time() < deadline:
        _, arr = _capture_canvas_timed(page)
        if arr is not None:
            if baseline is None:
                if not is_blank(arr, blank_tol):
                    return time.time() - t0, True
                baseline = arr
            elif frame_diff_score(arr, baseline) > diff_threshold:
                return time.time() - t0, True
        if not triggered:
            trigger()
            triggered = True
        time.sleep(poll)
    return time.time() - t0, False


# ----------------------------------------------------------------- orbit ---

def measure_orbit(page, cx, cy, seconds=2.0, button="left"):
    """rAF-timed orbit drag. Also verifies the camera actually moved (a
    pixel diff between a pre-drag and post-drag canvas capture) -- an fps
    number from a viewport that never rotated has nothing behind it, so
    `cameraMoved` is checked here and callers must gate on it rather than
    trust fps alone. This does not affect the fps timing itself (it is
    rAF-based, not screenshot-based, so still exempt from the sampling
    floor) -- the two screenshots are only taken immediately before/after
    the drag, not during it.

    `button` defaults to "left" (Three.js OrbitControls' default, used by
    BrepViewport and the replicad bar). JSCAD's own runner.html is the one
    exception: confirmed live 2026-09-02 that it implements deliberate
    Fusion-360-style navigation -- right-drag orbits, middle-drag pans,
    left-drag is reserved as a no-op (public/reshape/runner.html:895-903,
    "container.onpointermove": `if (ev.buttons === 2) rotate... else if
    (ev.buttons === 4) pan...`). A left-button drag there produced a
    measured ZERO-pixel change; passing button="right" for that subject is
    what the cameraMoved gate below is catching the difference between."""
    import math
    _, pre_arr = capture_canvas(page)
    try:
        page.evaluate(RAF_START_JS)
    except Exception:
        return None
    try:
        page.mouse.move(cx - 80, cy)
        page.mouse.down(button=button)
        t0 = time.time()
        t_end = t0 + seconds
        while time.time() < t_end:
            t = time.time() - t0
            x = cx + 80 * math.sin(t * 3)
            y = cy + 40 * math.cos(t * 2)
            page.mouse.move(x, y)
            time.sleep(0.016)
        page.mouse.up(button=button)
    finally:
        try:
            page.evaluate("() => { window.__rafRunning = false; }")
        except Exception:
            pass
    page.wait_for_timeout(50)
    try:
        samples = page.evaluate("() => window.__rafSamples")
    except Exception:
        samples = None
    if not samples or len(samples) < 3:
        return None
    deltas = [b - a for a, b in zip(samples, samples[1:]) if b > a]
    if not deltas:
        return None
    fps_series = [1000.0 / d for d in deltas]
    _, post_arr = capture_canvas(page)
    camera_moved = (frame_diff_score(pre_arr, post_arr) > 40) if (pre_arr is not None and post_arr is not None) else None
    return {
        "medianFps": round(statistics.median(fps_series), 1),
        "worstFrameMs": round(max(deltas), 1),
        "frames": len(samples),
        "cameraMoved": camera_moved,
    }


# ------------------------------------------------------- generic drivers ---

def generic_triangle_count(page):
    """Fallback: read it off the generic WebGL draw-call instrumentation
    (TRICOUNT_INIT_JS), from whichever frame owns the biggest canvas."""
    tri_canvas, _ = capture_canvas(page)
    if tri_canvas is None:
        return None
    try:
        tri_frame = tri_canvas.owner_frame()
        tri = tri_frame.evaluate("() => (window.__triCounts && window.__triCounts.lastFrame) || null")
    except Exception:
        tri = None
    return int(tri) if tri else None


def generic_edit(page):
    """Best-effort edit gesture for an app whose DOM we have not verified
    live: drive the first visible numeric input[type=range|number] it has,
    and assert the read-back value actually moved before trusting the
    commit. Times the redraw via measure_redraw_via_gpu_upload() (real
    bufferData/bufferSubData activity, not screenshots) for the same reason
    jscad/brep do -- see that function's docstring.
    Returns {"ok", "ms", "gesture", "error"} -- never fabricates a number.

    NOTE ON CANDIDATE SELECTION: only the FIRST visible numeric input is
    tried. The original version of this function probed candidates by
    actually committing a value to each and checking the read-back, falling
    through to the next on a no-op -- but that means the value (and any
    redraw it triggers) may already have changed by the time a candidate is
    confirmed usable, which would corrupt the GPU-upload "before" timestamp
    for that same commit. Only reading the DOM to pick a candidate (never
    writing) is required to keep the timing clean, so multi-candidate
    fallback was traded away here. Acceptable for now: this driver is only
    used by replicad, which is untested end-to-end anyway (network to
    studio.replicad.xyz is blocked from this sandbox)."""
    canvas_el, baseline = capture_canvas(page)
    if canvas_el is None or baseline is None:
        return {"ok": False, "ms": None, "gesture": None, "error": "no canvas present before edit"}

    candidates = []
    for f in [page] + list(page.frames):
        try:
            candidates.extend(f.query_selector_all("input[type=range], input[type=number]"))
        except Exception:
            continue
    el = None
    beforef = None
    for c in candidates:
        try:
            if not c.is_visible():
                continue
            beforef = float(c.input_value())
        except Exception:
            continue
        el = c
        break
    if el is None:
        return {"ok": False, "ms": None, "gesture": None,
                "error": "no visible numeric input[type=range|number] control found -- "
                         "no generic edit gesture available for this app"}

    step_attr = el.get_attribute("step")
    try:
        stepf = float(step_attr) if step_attr else 1.0
    except ValueError:
        stepf = 1.0
    newf = beforef + stepf * 5
    maxattr = el.get_attribute("max")
    if maxattr:
        try:
            if newf > float(maxattr):
                newf = beforef - stepf * 5
        except ValueError:
            pass
    newval = str(newf)
    ident = el.get_attribute("id") or el.get_attribute("name") or "(unnamed)"
    gesture = f"generic drive on input[{ident}]: {beforef} -> {newval} (fill + input/change events)"

    def commit():
        el.fill(newval)
        el.dispatch_event("input")
        el.dispatch_event("change")
        try:
            afterf = float(el.input_value())
        except Exception:
            raise RuntimeError(f"input[{ident}] read back a non-numeric value after fill -- edit did not register")
        if abs(afterf - beforef) < 1e-9:
            raise RuntimeError(f"input[{ident}] value unchanged after fill ({beforef} -> {afterf}) -- no-op")

    try:
        result = measure_redraw_via_gpu_upload(page, canvas_el, commit, baseline)
    except RuntimeError as e:
        return {"ok": False, "ms": None, "gesture": gesture, "error": str(e)}
    result["gesture"] = gesture
    return result


# ------------------------------------------------------- jscad (/sandbox/) --
# Our own app -- selectors verified live against components/SandboxWorkspace.tsx,
# lib/sandbox-modes.ts and components/model/ModelEditor.tsx, and against the
# working pattern in scripts/sandbox-checks.py (#p-width, .reshape-params,
# .run-toolbar .btn-run, .cm-content).

def jscad_prepare(page):
    page.wait_for_selector(".sandbox-mode", timeout=30000)
    # HYDRATION RACE, confirmed live: the mode tabs paint from the static
    # export before React finishes hydrating, so a click the instant the
    # selector resolves lands on a button with no listener wired up yet --
    # no error, no exception, the click just does nothing (aria-pressed never
    # moves). scripts/sandbox-visual.py already guards this with a settle
    # wait; this one skipped it and produced exactly that silent no-op on
    # first measurement. Settle, click, then ASSERT the mode actually
    # switched (retrying once) rather than trusting the click.
    page.wait_for_timeout(600)
    reshape_tab = page.wait_for_selector(".sandbox-mode:has-text('reSHape')", timeout=15000)
    # Under --slow the JS bundle is still arriving over a throttled
    # connection well after the static markup (and this selector) is
    # visible, so a single short retry isn't enough -- keep re-clicking
    # until hydration catches up, capped generously since this cost is real
    # and belongs to the app being measured, not to us guessing wrong.
    hydrate_deadline = time.time() + 30.0
    while reshape_tab.get_attribute("aria-pressed") != "true" and time.time() < hydrate_deadline:
        reshape_tab.click()
        page.wait_for_timeout(400)
    if reshape_tab.get_attribute("aria-pressed") != "true":
        raise RuntimeError("clicking the 'reSHape' mode tab did not switch modes (aria-pressed never became true) within 30s -- silent no-op, not a real measurement")
    page.wait_for_selector(".cm-content", timeout=15000)
    src = page.inner_text(".cm-content")
    if "getParameterDefinitions" not in src:
        raise RuntimeError("reSHape starter text not found in editor after switching modes -- aborting rather than measuring the wrong app state")
    run_btn = page.wait_for_selector(".run-toolbar .btn-run", timeout=15000)

    def trigger():
        run_btn.click()

    return trigger, "clicked 'reSHape' mode tab, then clicked \u25b6 Run on the reSHape starter (cuboid minus cylinder)"


def jscad_edit(page):
    try:
        page.wait_for_selector(".reshape-params", timeout=30000)
        box = page.wait_for_selector("#p-width", timeout=15000)
    except PWTimeout:
        return {"ok": False, "ms": None, "gesture": None,
                "error": "dimension panel (#p-width) never appeared after Run"}
    before_val = box.input_value()
    new_val = "95" if before_val != "95" else "60"
    gesture = f"click #p-width, Ctrl+A, type '{new_val}', Enter (was '{before_val}')"

    canvas_el, baseline = capture_canvas(page)
    if canvas_el is None or baseline is None:
        return {"ok": False, "ms": None, "gesture": gesture, "error": "no canvas present before edit"}

    def commit():
        box.click()
        box.press("Control+a")
        box.type(new_val, delay=30)
        box.press("Enter")
        after = box.input_value()
        if after != new_val:
            raise RuntimeError(f"#p-width read back {after!r} after typing -- edit did not register (no-op)")

    try:
        result = measure_redraw_via_gpu_upload(page, canvas_el, commit, baseline)
    except RuntimeError as e:
        return {"ok": False, "ms": None, "gesture": gesture, "error": str(e)}
    result["gesture"] = gesture
    return result


# ------------------------------------------------------ brep-test spike ---
# app/brep-test/page.tsx (read live 2026-09-02): a temporary hand-verification
# page for BrepViewport. Auto-builds and renders on load -- no click needed
# for cold load. It exposes two "+5"/"-5" button pairs and, crucially, an
# onStats panel with an authoritative "triangles: N" line straight from the
# kernel, plus a "manual rebuilds triggered: N" counter we can use as a
# non-pixel assertion that a click actually landed before trusting the timer.

def brep_prepare(page):
    return None, "no gesture needed -- BrepViewport builds and draws automatically on mount"


def _brep_rebuild_count(page):
    try:
        body_text = page.inner_text("body")
    except Exception:
        return None
    m = re.search(r"manual rebuilds triggered:\s*(\d+)", body_text)
    return int(m.group(1)) if m else None


def brep_edit(page):
    canvas_el, baseline = capture_canvas(page)
    if canvas_el is None or baseline is None:
        return {"ok": False, "ms": None, "gesture": None, "error": "no canvas present before edit"}

    plus5 = None
    for b in page.query_selector_all("button"):
        try:
            if b.inner_text().strip() == "+5":
                plus5 = b
                break
        except Exception:
            continue
    if plus5 is None:
        return {"ok": False, "ms": None, "gesture": None,
                "error": "could not find the '+5' pull-height button on /brep-test/ -- page shape may have changed"}

    rebuild_before = _brep_rebuild_count(page)
    gesture = "clicked '+5' under 'Pull height (extrude)'"

    def commit():
        plus5.click()
        if rebuild_before is not None:
            try:
                page.wait_for_function(
                    "(before) => { const m = document.body.innerText.match(/manual rebuilds triggered:\\s*(\\d+)/); "
                    "return m && parseInt(m[1], 10) > before; }",
                    arg=rebuild_before, timeout=5000,
                )
            except PWTimeout:
                raise RuntimeError(f"'manual rebuilds triggered' counter never advanced past {rebuild_before} -- click did not register (no-op)")

    try:
        result = measure_redraw_via_gpu_upload(page, canvas_el, commit, baseline)
    except RuntimeError as e:
        return {"ok": False, "ms": None, "gesture": gesture, "error": str(e)}
    result["gesture"] = gesture
    return result


def brep_triangle_count(page):
    """This one really is app-exposed -- BrepViewport's onStats callback
    prints 'triangles: N' straight from the kernel, no instrumentation
    needed. Read directly rather than falling back to the generic counter."""
    try:
        body_text = page.inner_text("body")
    except Exception:
        return None
    m = re.search(r"triangles:\s*(\d+)", body_text)
    return int(m.group(1)) if m else None


# ------------------------------------------------- occt (play.html) -------
# scripts/brep-probe/play.html, served at /reshape/kernel/play.html. Loads
# ./replicad_single.js -- confirmed by the team lead to be the SAME wasm
# bytes as the replicad bar's kernel (21.91 MB, byte-identical) -- so THIS
# pairing, not jscad/brep, is the fair same-kernel comparison against the
# replicad bar. jscad/brep stays a separate, unrelated pairing (JSCAD's own
# pure-JS CSG, no wasm at all).
#
# Read live 2026-09-02: `run()` fires unconditionally at the end of the
# module script, the instant the kernel finishes loading -- no click, same
# shape as the replicad bar's `ocInit.then(() => runCode(...))`.
#
# DOCUMENT MISMATCH, and how this driver closes it: play.html's own default
# example ("Round ONE edge (impossible on a mesh)") is a 60x40x16 plate
# minus a r9 cylinder, THEN filleted -- not the same document as the
# replicad bar's model-1 (same plate/cylinder, no fillet). So after that
# natural auto-run settles, this driver ALSO builds the plain (no-fillet)
# plate-minus-cylinder by setting #code directly, using this file's own
# already-established primitive names (cuboid/cylinder/subtract) -- not a
# guess at unfamiliar vocabulary. That second build is explicitly NOT a
# cold measurement (JS is JIT-warm, the WebGL context already exists); see
# occt_edit()'s docstring and how run_once/print_markdown label it.
OCCT_READY_JS = "() => !(document.getElementById('status').textContent||'').includes('loading')"
OCCT_MATCHED_CODE = "function main() {\n  return subtract(cuboid(60, 40, 16), cylinder(9, 40))\n}"
OCCT_MATCHED_EDIT_CODE = "function main() {\n  return subtract(cuboid(60, 40, 16), cylinder(12, 40))\n}"


def occt_cold_load(page, t0):
    """FALLBACK NEEDED HERE, unlike replicad: measure_kernel_ready_to_first_
    build() assumes there is some real gap between "kernel ready" and "first
    upload" for external polling to land in. Confirmed live 2026-09-02 that
    play.html has NO such gap -- the status-text update and the auto `run()`
    call (including its full synchronous build+mesh+draw) are back-to-back
    statements in the SAME script, no `await`/rAF/setTimeout between them,
    so from outside, the kernel is never observably "ready but not yet
    built": by the time any external poll can even execute, both have
    already happened. (replicad bar has real yield points here --
    `ocInit.then()` plus an internal `await rAF x2` -- which is why the
    identical method works cleanly there; see replicad_cold_load().)
    When that produces "no upload followed" for exactly that reason, the
    build has, in fact, already completed -- fall back to the app's own
    self-reported build+mesh time from #out, which is the only place a
    real "before" measurement point ever existed for this transition."""
    result = measure_kernel_ready_to_first_build(page, OCCT_READY_JS, t0)
    try:
        out_text = page.inner_text("#out")
    except Exception:
        out_text = ""
    result["document"] = ("native default, auto-run: 'Round ONE edge (impossible on a mesh)' -- plate minus "
                           "cylinder, THEN filleted. NOT the same document as replicad bar's model-1.")
    m = re.search(r"built (\d+) ms.*?meshed (\d+) ms.*?(\d+) triangles.*?volume ([\d.]+)", out_text, re.S)
    if m:
        result["selfReported"] = {"buildMs": float(m.group(1)), "meshMs": float(m.group(2)),
                                   "triangles": int(m.group(3)), "volume": float(m.group(4))}
        if not result["ok"] and result.get("error", "").startswith("kernel became ready, but no WebGL"):
            result["ok"] = True
            result["kernelReadyToFirstSolidMs"] = round(result["selfReported"]["buildMs"] + result["selfReported"]["meshMs"], 2)
            result["kernelReadyToFirstSolidMethod"] = (
                "self-reported (buildMs+meshMs from #out) -- NOT externally timed. This app's kernel-ready-to-"
                "auto-run transition has no yield point an external poll can land in (see this function's "
                "docstring), so the app's own instrumentation is the only real 'before' measurement that ever "
                "existed for it. Every OTHER timing number in this report (including this subject's own "
                "edit-to-redraw) is still externally timed via real WebGL activity."
            )
            result["error"] = None
    else:
        result["selfReportedText"] = out_text.strip()[:200]
    return result


def occt_edit(page):
    """NOT edit-to-redraw in the ordinary sense -- see the module comment
    above. Step 1 (untimed) gets the SAME document onto screen that the
    replicad bar's model-1 auto-run produces (parity for the comparison
    that matters). Step 2 (timed, via measure_redraw_via_gpu_upload -- the
    same instrument every other subject's edit uses) is a real dimensional
    edit on that now-shared document: hole radius 9 -> 12, matching the
    identical change replicad_edit() makes to model-1."""
    code_el = page.query_selector("#code")
    run_btn = page.query_selector("#run")
    if code_el is None or run_btn is None:
        return {"ok": False, "ms": None, "gesture": None, "error": "#code textarea or #run button not found"}

    code_el.fill(OCCT_MATCHED_CODE)
    pre_out = page.inner_text("#out")
    run_btn.click()
    try:
        page.wait_for_function(
            "(prev) => document.getElementById('out').innerText !== prev",
            arg=pre_out, timeout=10000,
        )
    except PWTimeout:
        return {"ok": False, "ms": None, "gesture": None,
                "error": "building the matched (no-fillet) parity document never completed -- cannot proceed to the timed edit"}

    canvas_el, baseline = capture_canvas(page)
    if canvas_el is None or baseline is None:
        return {"ok": False, "ms": None, "gesture": None, "error": "no canvas present after the parity build"}

    gesture = ("[untimed] built the parity document (plate minus r9 cylinder, no fillet) to match replicad bar's "
               "model-1, then [timed] edited cylinder(9,...) -> cylinder(12,...) and re-ran #run")

    def commit():
        code_el.fill(OCCT_MATCHED_EDIT_CODE)
        pre = page.inner_text("#out")
        run_btn.click()
        try:
            page.wait_for_function(
                "(prev) => document.getElementById('out').innerText !== prev",
                arg=pre, timeout=10000,
            )
        except PWTimeout:
            raise RuntimeError("#out text never changed after editing + re-running -- edit did not register (no-op)")

    try:
        result = measure_redraw_via_gpu_upload(page, canvas_el, commit, baseline)
    except RuntimeError as e:
        return {"ok": False, "ms": None, "gesture": gesture, "error": str(e)}
    result["gesture"] = gesture
    try:
        out_text = page.inner_text("#out")
        m = re.search(r"built (\d+) ms.*?meshed (\d+) ms.*?(\d+) triangles.*?volume ([\d.]+)", out_text, re.S)
        if m:
            result["selfReported"] = {"buildMs": float(m.group(1)), "meshMs": float(m.group(2)),
                                       "triangles": int(m.group(3)), "volume": float(m.group(4))}
    except Exception:
        pass
    return result


def occt_triangle_count(page):
    try:
        out_text = page.inner_text("#out")
    except Exception:
        return None
    m = re.search(r"(\d+)\s*triangles", out_text)
    return int(m.group(1)) if m else None


# --------------------------------------------------- replicad bar (:5175) --
# Verified live 2026-09-02 against the bar's own src/main.js and
# src/models.js (this repo's scratchpad\bars\replicad -- a local Vite dev
# server, not the network-blocked studio.replicad.xyz). Byte-identical
# replicad_single.wasm to occt's kernel (21.91 MB both, confirmed by the
# team lead) -- pairs with occt for the same-kernel comparison.
#
# DOCUMENT: `codeEl.value = MODELS[0].code` is set synchronously at module
# load (model-1: a 60x40x16 plate, r9 cylinder cut clean through, no
# fillet -- see src/models.js), and `ocInit.then(() => runCode(...))`
# auto-runs it the instant OpenCascade reports ready. No click needed, and
# this already IS the same document occt's parity build targets above.
#
# Also confirmed live: this bar runs a continuous rAF render loop
# (`function animate(){ requestAnimationFrame(animate); controls.update();
# renderer.render(...); }` in main.js) exactly like JSCAD's runner.html --
# so the GPU-upload timing instrument (not raw draw-call timestamps) is
# just as necessary here as it was for jscad.
# Status text ONLY, deliberately -- checking #run-btn's disabled attribute
# here was tried and BROKE this (2026-09-02): ocInit sets disabled=false,
# but the very next microtask is `ocInit.then(() => runCode(...))`'s
# auto-run, whose first line sets disabled=true again for the whole build.
# That is a single-microtask-wide true window followed by a long false
# stretch -- a 50ms poll almost always lands in the "disabled again, build
# in progress" period and never sees kernel-ready at all, so the anchor's
# upload count silently included the entire completed build (the same
# "no upload followed" failure mode as occt, for a different reason: not
# "no yield point exists" but "the yield point is too narrow to poll for").
# #oc-status's text, by contrast, is set once and never reverted, so it is
# the stable half of the two conditions and the correct one to poll. The
# disabled check still matters before a MANUAL click (see replicad_edit) --
# it just does not belong in this automatic-anchor's ready predicate.
REPLICAD_READY_JS = "() => (document.getElementById('oc-status').textContent||'').includes('ready')"


def replicad_cold_load(page, t0):
    result = measure_kernel_ready_to_first_build(page, REPLICAD_READY_JS, t0)
    try:
        stats = page.evaluate("() => (window.__replicadBar||{}).lastStats")
    except Exception:
        stats = None
    result["selfReported"] = stats
    result["document"] = ("native default, auto-run: model-1 (60x40x16 plate, r9 cylinder through, no fillet) -- "
                           "the same document occt's matched-parity build targets")
    return result


def replicad_triangle_count(page):
    try:
        stats = page.evaluate("() => (window.__replicadBar||{}).lastStats")
    except Exception:
        return None
    return int(stats["triangles"]) if stats and stats.get("triangles") is not None else None


def replicad_edit(page):
    canvas_el, baseline = capture_canvas(page)
    if canvas_el is None or baseline is None:
        return {"ok": False, "ms": None, "gesture": None, "error": "no canvas present before edit"}

    code_el = page.query_selector("#code")
    run_btn = page.query_selector("#run-btn")
    if code_el is None or run_btn is None:
        return {"ok": False, "ms": None, "gesture": None, "error": "#code textarea or #run-btn not found"}
    # Guard against clicking a dead button -- by the time an edit runs, the
    # bar's own natural auto-run has already completed and re-enabled it,
    # but check anyway rather than assume.
    try:
        if run_btn.get_attribute("disabled") is not None:
            return {"ok": False, "ms": None, "gesture": None,
                    "error": "#run-btn is disabled -- a build is still in progress, refusing to click a dead button"}
    except Exception:
        pass

    before_src = code_el.input_value()
    if "makeCylinder(9," not in before_src:
        return {"ok": False, "ms": None, "gesture": None,
                "error": "expected 'makeCylinder(9,' in the current #code (model-1) to edit -- "
                         "current source did not contain it, refusing to guess at a different edit"}
    new_src = before_src.replace("makeCylinder(9,", "makeCylinder(12,", 1)
    gesture = "edited #code: makeCylinder(9, ...) -> makeCylinder(12, ...) (hole radius 9 -> 12 on model-1), clicked #run-btn"

    try:
        before_count = page.evaluate("() => (window.__replicadBar||{}).runCount")
    except Exception:
        before_count = None

    def commit():
        code_el.fill(new_src)
        run_btn.click()
        if before_count is not None:
            try:
                page.wait_for_function(
                    "(before) => (window.__replicadBar||{}).runCount > before",
                    arg=before_count, timeout=10000,
                )
            except PWTimeout:
                raise RuntimeError(f"runCount never advanced past {before_count} -- click did not register (no-op)")

    try:
        result = measure_redraw_via_gpu_upload(page, canvas_el, commit, baseline)
    except RuntimeError as e:
        return {"ok": False, "ms": None, "gesture": gesture, "error": str(e)}
    result["gesture"] = gesture
    try:
        result["selfReported"] = page.evaluate("() => (window.__replicadBar||{}).lastStats")
    except Exception:
        pass
    return result


# --------------------------------------------------- jsketcher (:5180) ----
# Verified live 2026-09-02 by driving the actual page (not read off source --
# this checkout wasn't inspected, only exercised through the DOM). All in
# one page, no iframe -- the easiest of the four to instrument.
#
# GESTURE CHOSEN: the Box primitive wizard (ribbon icon, dimension fields,
# OK), not the multi-step Plane/Sketch/Rectangle/dimension/Extrude workflow
# -- that flow is real but seven-plus steps through three panel states with
# an unverified numeric-entry sub-step, exactly the kind of thing that
# breaks a timing harness constantly. Box is one dialog, comparable in kind
# to jscad/brep/occt/replicad's "create/edit a primitive" gestures, and
# confirmed live to exercise the same kernel-to-pixels path (console log
# shows a real 'CALLING: box' -> OCCT command -> 'EXCHANGE VALUE: {faces:
# Array(6), ...}' round trip).
#
# TWO REAL GAPS FOUND WHILE VERIFYING, both worth carrying forward rather
# than papering over:
#   1. No in-place edit gesture was found for an existing feature. Tested:
#      selecting the created box then reinvoking the Box toolbar button
#      does NOT reopen it for editing -- it creates a SECOND, separate box
#      (object-tree count 1 -> 2, console logs a fresh 'CALLING: box').
#      Double-click and right-click on the tree item did nothing useful
#      either (no context menu appeared). So "edit-to-redraw" here is a
#      second Box commit with a different dimension, not a true edit of
#      the first -- same KIND of measurement (small change, real redraw,
#      timed the same way), different MECHANISM. See jsketcher_edit().
#   2. The camera's default framing makes a freshly created 50-unit box
#      nearly invisible: confirmed by screenshot that a fresh box reads as
#      a few dark pixels at the origin until scrolled in on, and the
#      default view looks straight down an axis (a box can read as a flat
#      square). _jsketcher_zoom_and_iso() does a fixed scroll-in + presses
#      "7" for isometric before any pixel-based gate that needs the object
#      to actually be legible (the edit's pixel-diff gate, and orbit).
JSKETCHER_EXPECTED_TITLE = "Web CAD / Part Designer"
JSKETCHER_RESTART_HINT = ('cd ".../scratchpad/bars/jsketcher" && node ./node_modules/webpack-dev-server/bin/'
                            'webpack-dev-server.js --config webpack.config.js --port 5180 --host 0.0.0.0')


def _jsketcher_zoom_and_iso(page):
    canvas_el = biggest_canvas(page)
    box = canvas_el.bounding_box() if canvas_el else None
    if not box:
        return
    cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    page.mouse.move(cx, cy)
    for _ in range(15):
        page.mouse.wheel(0, -200)
        page.wait_for_timeout(20)
    page.keyboard.press("7")
    page.wait_for_timeout(300)


def jsketcher_prepare(page):
    btn = page.wait_for_selector('.x-Toolbar-button[data-action-id="BOX"]', timeout=15000)
    btn.click()
    page.wait_for_selector('.x-Window[data-operation-id="BOX"]', timeout=10000)
    ok_btn = page.wait_for_selector(".dialog-ok", timeout=10000)

    def trigger():
        ok_btn.click()
        try:
            page.wait_for_selector(".x-GenericExplorer-objectItem", timeout=10000)
        except PWTimeout:
            raise RuntimeError("clicking OK on the Box wizard never produced an object in the tree panel -- silent no-op")

    return trigger, "clicked the Box primitive toolbar button, then OK on its dimension wizard (default 50x50x50)"


def jsketcher_edit(page):
    canvas_el, baseline = capture_canvas(page)
    if canvas_el is None or baseline is None:
        return {"ok": False, "ms": None, "gesture": None, "error": "no canvas present before edit"}
    _jsketcher_zoom_and_iso(page)
    canvas_el, baseline = capture_canvas(page)  # re-baseline after the camera move

    before_items = len(page.query_selector_all(".x-GenericExplorer-objectItem"))
    btn = page.query_selector('.x-Toolbar-button[data-action-id="BOX"]')
    if btn is None:
        return {"ok": False, "ms": None, "gesture": None, "error": "Box toolbar button not found"}
    gesture = ("NOT a true edit of the existing box -- no in-place edit gesture was found (see module comment). "
               "Opened a second Box wizard with X changed 50 -> 80 and clicked OK.")

    def commit():
        btn.click()
        page.wait_for_selector('.x-Window[data-operation-id="BOX"]', timeout=10000)
        xfield = page.wait_for_selector('.x-Field[data-field-name="x"] input', timeout=5000)
        xfield.fill("80")
        xfield.dispatch_event("change")
        ok_btn = page.wait_for_selector(".dialog-ok", timeout=5000)
        ok_btn.click()
        try:
            page.wait_for_function(
                "(before) => document.querySelectorAll('.x-GenericExplorer-objectItem').length > before",
                arg=before_items, timeout=10000,
            )
        except PWTimeout:
            raise RuntimeError(f"object-tree count never advanced past {before_items} -- the second Box commit did not register (no-op)")

    try:
        result = measure_redraw_via_gpu_upload(page, canvas_el, commit, baseline)
    except RuntimeError as e:
        return {"ok": False, "ms": None, "gesture": gesture, "error": str(e)}
    result["gesture"] = gesture
    return result


# ------------------------------------------------------------- subjects ---

SUBJECTS = {
    "jscad": {
        "label": "JSCAD (current, /sandbox/)",
        "url": "http://localhost:3002/sandbox/",
        "prepare": jscad_prepare,
        "edit": jscad_edit,
        "triangles": generic_triangle_count,
        "triangleCountSource": "generic WebGL draw-call instrumentation (TRIANGLES/STRIP/FAN "
                                "vertices actually passed to drawElements/drawArrays) -- not "
                                "necessarily identical to the app's own topology count",
        # Fusion-360-style navigation (public/reshape/runner.html:895-903):
        # right-drag orbits, left-drag is a reserved no-op. See measure_orbit()'s docstring.
        "orbitButton": "right",
    },
    "brep": {
        "label": "B-rep viewport (/brep-test/)",
        "url": "http://localhost:3002/brep-test/",
        # DOM read live from app/brep-test/page.tsx 2026-09-02 (a temporary
        # hand-verification spike for BrepViewport, per its own header
        # comment -- expect this route to disappear once Build mode wires
        # to the kernel for real). It auto-renders on load and exposes an
        # authoritative onStats "triangles: N" line, so this subject gets
        # real app-specific drivers instead of the generic fallback.
        "prepare": brep_prepare,
        "edit": brep_edit,
        "triangles": brep_triangle_count,
        "triangleCountSource": "app-reported: BrepViewport's onStats callback ('triangles: N' in the spike page's own panel)",
    },
    "brep-three": {
        "label": "B-rep viewport, three.js renderer (/brep-three/)",
        "url": "http://localhost:3002/brep-three/",
        # app/brep-three/page.tsx is a deliberate one-variable twin of
        # brep-test/page.tsx (confirmed by reading it: byte-identical
        # buildInitialDoc(), same "+5/-5" buttons, same "manual rebuilds
        # triggered: N" counter, same onStats shape) -- only the renderer
        # differs, per its own header comment (OCCT -> THREE.BufferGeometry
        # -> three.js, vs. brep's OCCT -> JSCAD geom3 -> @jscad/regl-renderer
        # on the identical kernel). That is exactly why brep's own drivers
        # transfer here unchanged -- confirmed live 2026-09-02, not assumed:
        # same button text, same regexes, same DOM shape.
        "prepare": brep_prepare,
        "edit": brep_edit,
        "triangles": brep_triangle_count,
        "triangleCountSource": "app-reported: BrepViewportThree's onStats callback ('triangles: N' in the spike page's own panel) "
                                "-- cross-checked live: 28 after one '+5' click, matching both the builder's and the team lead's independent runs",
        # GPU-UPLOAD SEMANTICS, verified live rather than assumed (this was
        # the team lead's explicit ask, and the concrete risk: three.js
        # COULD upload geometry once and then only touch uniforms on camera
        # moves, which would make the upload clock read "instant" for every
        # edit regardless of real cost). Confirmed instead: BrepViewportThree
        # renders on demand (idle 1.5s: __drawTimes flat at 6, matching the
        # builder's own report) and a real "+5" rebuild produces +4 draw
        # calls AND +4 buffer uploads -- a full geometry buffer replacement,
        # not a uniform-only update. So measure_redraw_via_gpu_upload() is
        # exactly as valid here as it is for brep, and the two are fair to
        # compare on it. Orbit (real OrbitControls, confirmed via a genuine
        # before/after rotation, not just a pixel-diff number) needed no
        # button override -- default left-drag orbits correctly, unlike
        # jscad's Fusion-360 navigation and unlike JSketcher's unknown-until-
        # tested gesture.
    },
    "occt": {
        "label": "OCCT kernel (play.html, same wasm as replicad bar)",
        "url": "http://localhost:3002/reshape/kernel/play.html",
        "cold_load": occt_cold_load,
        "edit": occt_edit,
        "triangles": occt_triangle_count,
        "triangleCountSource": "app-reported: play.html's own #out line ('N triangles')",
        # Confirmed by reading the file: no onpointerdown/onpointermove/
        # onwheel or any other input listener exists anywhere in play.html's
        # script -- it is a fixed-camera probe page, not a defect in this
        # harness's drag technique (unlike jscad's runner.html, which DOES
        # have orbit controls, just gated to the right mouse button).
        "noOrbit": "play.html wires no pointer/mouse event listeners at all (confirmed by reading its source) -- "
                   "there is no orbit/pan/zoom control on this page to drive, not a driving failure",
    },
    "replicad": {
        "label": "replicad bar (local Vite, :5175)",
        # studio.replicad.xyz stays blocked from this sandbox (confirmed:
        # example.com/github.com load fine from the same environment, this
        # host alone returns a proxy "Web Page Blocked" page). This points at
        # a local Vite bar built specifically for this comparison instead --
        # verified live 2026-09-02 against its own source, not guessed at.
        "url": "http://localhost:5175/",
        "cold_load": replicad_cold_load,
        "edit": replicad_edit,
        "triangles": replicad_triangle_count,
        "triangleCountSource": "app-reported: window.__replicadBar.lastStats.triangles",
    },
    "jsketcher": {
        "label": "JSketcher bar (local webpack-dev-server, :5180)",
        # studio-hosted web-cad.org stays a dead end (see git history of this
        # file: that domain now serves an unrelated app, "WebCAD Workbench").
        # This points at a local bar built for this comparison instead,
        # verified live 2026-09-02 by driving it.
        "url": "http://localhost:5180/",
        "expectedTitle": JSKETCHER_EXPECTED_TITLE,
        "restartHint": JSKETCHER_RESTART_HINT,
        "prepare": jsketcher_prepare,
        "edit": jsketcher_edit,
        "orbitPrepare": _jsketcher_zoom_and_iso,
        # No app-exposed triangle count found -- falls back to the generic
        # WebGL instrumentation (see jscad's triangleCountSource).
        "triangleCountSource": "generic WebGL draw-call instrumentation (see jscad) -- no app-reported count found",
    },
}


# ------------------------------------------------------------- harness ----

def probe_reachable(pw, url, slow, timeout=15000, expected_title=None):
    browser = pw.chromium.launch(args=CHROME_ARGS)
    ctx = browser.new_context(ignore_https_errors=True)
    page = ctx.new_page()
    try:
        if slow:
            cdp = ctx.new_cdp_session(page)
            cdp.send("Network.enable")
            down, up, lat = SLOW_PROFILE
            cdp.send("Network.emulateNetworkConditions", {
                "offline": False, "downloadThroughput": down,
                "uploadThroughput": up, "latency": lat,
            })
        resp = page.goto(url, wait_until="commit", timeout=timeout)
        status = resp.status if resp else None
        title = None
        try:
            page.wait_for_timeout(300)
            title = page.title()
        except Exception:
            pass
        if status is None:
            return False, "navigation returned no response"
        if status >= 400:
            extra = f" (page title: {title!r})" if title else ""
            return False, f"HTTP {status} at {url}{extra}"
        # A 200 proves something is listening, not that it's the app meant --
        # confirmed necessary live: an unrelated app was already answering on
        # a port initially guessed for one of these bars, with a sign-in page
        # that would otherwise have been silently timed as a CAD comparison.
        if expected_title and expected_title not in (title or ""):
            return False, f"HTTP {status} at {url}, but title was {title!r}, not {expected_title!r} -- wrong app is listening on this port"
        return True, f"HTTP {status}" + (f", title {title!r} confirmed" if expected_title else "")
    except Exception as e:
        return False, f"{type(e).__name__}: {str(e)[:200]}"
    finally:
        try:
            ctx.close()
        except Exception:
            pass
        try:
            browser.close()
        except Exception:
            pass


def run_once(pw, subject, slow, timeout_load=45.0):
    browser = pw.chromium.launch(args=CHROME_ARGS)
    ctx = browser.new_context(viewport={"width": 1400, "height": 900}, ignore_https_errors=True)
    ctx.add_init_script(TRICOUNT_INIT_JS)
    page = ctx.new_page()
    # Tracked for every subject, not just the one that prompted it -- "count
    # console errors separately so the comparison of console health stays
    # fair" applies as well to our own subjects as to anyone else's.
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    cdp = ctx.new_cdp_session(page)
    cdp.send("Network.enable")
    cdp.send("Network.clearBrowserCache")
    if slow:
        down, up, lat = SLOW_PROFILE
        cdp.send("Network.emulateNetworkConditions", {
            "offline": False, "downloadThroughput": down,
            "uploadThroughput": up, "latency": lat,
        })

    _reset_poll_gaps()
    result = {"error": None}
    try:
        t0 = time.time()
        resp = page.goto(subject["url"], wait_until="commit", timeout=30000)
        status = resp.status if resp else None
        result["httpStatus"] = status
        if status is not None and status >= 400:
            result["error"] = f"HTTP {status} on goto"
            return result

        cold_load_fn = subject.get("cold_load")
        if cold_load_fn:
            # occt/replicad: a wasm-kernel subject with a document-and-two-
            # phase cold load (nav->kernel-ready, kernel-ready->first solid),
            # timed via measure_kernel_ready_to_first_build() rather than the
            # pixel-polling path below. See that function's docstring.
            cl = cold_load_fn(page, t0)
            ok = bool(cl.get("ok"))
            result["coldLoadOk"] = ok
            result["navToKernelReadyMs"] = cl.get("navToKernelReadyMs")
            result["kernelReadyToFirstSolidMs"] = cl.get("kernelReadyToFirstSolidMs")
            if cl.get("navToKernelReadyMs") is not None and cl.get("kernelReadyToFirstSolidMs") is not None:
                result["coldLoadMs"] = round(cl["navToKernelReadyMs"] + cl["kernelReadyToFirstSolidMs"], 1)
            else:
                result["coldLoadMs"] = None
            result["coldLoadGesture"] = cl.get("document")
            result["coldLoadSelfReported"] = cl.get("selfReported") or cl.get("selfReportedText")
            result["kernelReadyToFirstSolidMethod"] = cl.get("kernelReadyToFirstSolidMethod", "gpu-upload (externally timed)" if ok else None)
            if not ok:
                result["error"] = cl.get("error")
        else:
            trigger, gesture = (None, None)
            if subject.get("prepare"):
                trigger, gesture = subject["prepare"](page)
            result["coldLoadGesture"] = gesture
            result["navToKernelReadyMs"] = None
            result["kernelReadyToFirstSolidMs"] = None

            ms, ok = wait_for_first_geometry(page, t0, trigger, timeout=timeout_load)
            result["coldLoadMs"] = round(ms * 1000, 1) if ok else None
            result["coldLoadOk"] = ok
            if not ok:
                result["error"] = "geometry never appeared within timeout for cold-load"

        page.wait_for_timeout(250)
        tri_fn = subject.get("triangles", generic_triangle_count)
        try:
            result["triangleCount"] = tri_fn(page)
        except Exception:
            result["triangleCount"] = None

        edit_fn = subject.get("edit")
        if ok and edit_fn:
            edit_res = edit_fn(page)
            result["editToRedrawMs"] = edit_res.get("ms")
            result["editOk"] = edit_res.get("ok")
            result["editGesture"] = edit_res.get("gesture")
            result["editError"] = edit_res.get("error")
            result["editMethod"] = edit_res.get("method")  # "gpu-upload" or None (failed before a method applied)
            result["editNote"] = edit_res.get("note")
            result["editSelfReported"] = edit_res.get("selfReported")  # cross-check only, never the clock
        elif not ok:
            result["editToRedrawMs"] = None
            result["editOk"] = False
            result["editError"] = "skipped: cold-load geometry never appeared"
        else:
            result["editToRedrawMs"] = None
            result["editOk"] = False
            result["editError"] = "no edit driver defined for this subject"

        no_orbit_reason = subject.get("noOrbit")
        if ok and no_orbit_reason:
            result["orbit"] = None
            result["orbitError"] = no_orbit_reason
        elif ok:
            orbit_prepare_fn = subject.get("orbitPrepare")
            if orbit_prepare_fn:
                try:
                    orbit_prepare_fn(page)
                except Exception:
                    pass  # best-effort framing; the cameraMoved gate still catches a bad drag either way
            canvas_el = biggest_canvas(page)
            box = canvas_el.bounding_box() if canvas_el else None
            if box:
                cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
                orbit = measure_orbit(page, cx, cy, seconds=2.0, button=subject.get("orbitButton", "left"))
                if orbit is not None and orbit.get("cameraMoved") is False:
                    # Real drag, real rAF samples -- but the canvas pixels
                    # never changed, so the camera did not actually rotate.
                    # An fps number from a viewport that never moved has
                    # nothing behind it -- withhold it rather than report it.
                    result["orbit"] = None
                    result["orbitError"] = (f"drag executed ({orbit['frames']} rAF samples collected, "
                                             f"{orbit['medianFps']:.1f} fps measured) but canvas pixels never "
                                             f"changed -- camera did not actually rotate, fps withheld")
                else:
                    result["orbit"] = orbit
                    if orbit is None:
                        result["orbitError"] = "rAF sample collection failed or produced too few frames"
            else:
                result["orbit"] = None
                result["orbitError"] = "no canvas bounding box found for orbit drag"
        else:
            result["orbit"] = None
            result["orbitError"] = "skipped: cold-load geometry never appeared"

        # The sampling floor for coldLoadMs/editToRedrawMs: real measured
        # screenshot+decode cost during THIS run, not the poll= constant.
        # Orbit is exempt -- measure_orbit() never screenshots the canvas,
        # it only reads requestAnimationFrame timestamps, so orbit fps is
        # not depressed by this polling and needs no such caveat.
        result["pollCadence"] = _poll_gap_stats()
        result["consoleErrorCount"] = len(console_errors)
        result["consoleErrorSample"] = console_errors[:5]
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"
    finally:
        try:
            ctx.close()
        except Exception:
            pass
        try:
            browser.close()
        except Exception:
            pass
    return result


def summarize(runs):
    def med(vals):
        vals = [v for v in vals if v is not None]
        return round(statistics.median(vals), 1) if vals else None

    cold = med([r.get("coldLoadMs") for r in runs])
    nav_ready = med([r.get("navToKernelReadyMs") for r in runs])
    ready_solid = med([r.get("kernelReadyToFirstSolidMs") for r in runs])
    edit = med([r.get("editToRedrawMs") for r in runs])
    fps = med([r["orbit"]["medianFps"] for r in runs if r.get("orbit")])
    worst = med([r["orbit"]["worstFrameMs"] for r in runs if r.get("orbit")])
    tri = med([r.get("triangleCount") for r in runs])
    poll_means = [r["pollCadence"]["meanMs"] for r in runs if r.get("pollCadence")]
    poll_maxes = [r["pollCadence"]["maxMs"] for r in runs if r.get("pollCadence")]
    edit_methods = sorted({r.get("editMethod") for r in runs if r.get("editMethod")})
    edit_notes = sorted({r.get("editNote") for r in runs if r.get("editNote")})
    ready_methods = sorted({r.get("kernelReadyToFirstSolidMethod") for r in runs if r.get("kernelReadyToFirstSolidMethod")})
    documents = sorted({r.get("coldLoadGesture") for r in runs if r.get("coldLoadGesture")})
    return {
        "coldLoadMs": cold,
        # None/None for jscad/brep -- no separate wasm-kernel phase exists to
        # split out (JSCAD's CSG is pure JS); coldLoadMs there IS the whole
        # nav-to-first-solid number, unchanged from before this split existed.
        "navToKernelReadyMs": nav_ready,
        "kernelReadyToFirstSolidMs": ready_solid,
        "kernelReadyToFirstSolidMethods": ready_methods,
        "coldLoadDocuments": documents,   # what was actually built -- see run's coldLoadGesture
        "editToRedrawMs": edit,
        "orbitMedianFps": fps,
        "orbitWorstFrameMs": worst,
        "triangleCount": int(tri) if tri is not None else None,
        # This is COLD LOAD's sampling floor only: how fine a "first geometry
        # visible" moment this harness can resolve, from measured screenshot+
        # decode cost (not the poll= sleep constant). Cold load's own
        # magnitude (multi-second) dwarfs this, so it's a minor caveat there.
        # editToRedrawMs is NOT built from this poll loop any more -- it's
        # timed via measure_redraw_via_gpu_upload() (real WebGL activity,
        # sub-ms), with its own separate caveats in "editMethodNotes" below.
        "samplingFloorMs": {
            "meanCaptureMs": round(statistics.median(poll_means), 1) if poll_means else None,
            "maxCaptureMs": round(max(poll_maxes), 1) if poll_maxes else None,
        },
        "editMethods": edit_methods,       # e.g. ["gpu-upload"] once any run succeeded
        "editMethodNotes": edit_notes,     # the caveats attached by that method, deduped
        "consoleErrorCount": med([r.get("consoleErrorCount") for r in runs]),
        "runsOk": {
            "coldLoad": sum(1 for r in runs if r.get("coldLoadOk")),
            "edit": sum(1 for r in runs if r.get("editOk")),
            "orbit": sum(1 for r in runs if r.get("orbit")),
        },
        "totalRuns": len(runs),
    }


def print_markdown(report):
    print()
    print("| subject | cold load (median) | edit -> redraw (median) | orbit fps (median / worst frame) | triangles |")
    print("|---|---|---|---|---|")
    for key, s in report["subjects"].items():
        label = s.get("label", key)
        if not s.get("available"):
            print(f"| {label} | not measured | not measured | not measured | not measured |")
            continue
        m = s["median"]
        n = m["totalRuns"]
        cold = f"{m['coldLoadMs']:.0f} ms ({m['runsOk']['coldLoad']}/{n} runs)" if m["coldLoadMs"] is not None else "FAILED"
        edit = f"{m['editToRedrawMs']:.2f} ms ({m['runsOk']['edit']}/{n} runs)" if m["editToRedrawMs"] is not None else "FAILED"
        if m["orbitMedianFps"] is not None:
            orbit = f"{m['orbitMedianFps']:.1f} fps / {m['orbitWorstFrameMs']:.0f} ms worst"
        elif s.get("noOrbitReason"):
            orbit = "n/a (no orbit control on this page)"
        else:
            orbit = "FAILED"
        tri = str(m["triangleCount"]) if m["triangleCount"] is not None else "n/a"
        print(f"| {label} | {cold} | {edit} | {orbit} | {tri} |")
    print()

    if "brep-three" in report["subjects"]:
        print("**SOFTWARE RASTERIZATION CAVEAT.** Every timing in this report runs on SwiftShader "
              "(`--use-gl=angle --use-angle=swiftshader`), a CPU-side software rasterizer, because this harness "
              "runs headless. Draw-call counts and triangle counts above are exact regardless of rasterizer -- "
              "they come from the WebGL call stream and the app's own mesh output, not from pixel rendering "
              "speed. But brep vs. brep-three is specifically a RENDERER comparison, and the draw column is "
              "exactly the number a software rasterizer represents least faithfully: real GPU driver behavior, "
              "shader compilation, and draw-call batching for @jscad/regl-renderer vs. three.js can differ from "
              "what SwiftShader shows. Read the brep/brep-three edit->redraw gap directionally, not as an "
              "absolute a student's real GPU would reproduce.")
        print()

    have_split = any(s.get("available") and s.get("median", {}).get("navToKernelReadyMs") is not None
                      for s in report["subjects"].values())
    if have_split:
        print("Cold-load split (nav->kernel-ready, kernel-ready->first solid) -- wasm-kernel subjects only.")
        print("jscad/brep have no separate kernel phase (JSCAD's CSG is pure JS, no wasm) -- their single")
        print("cold-load number above already covers the same span end to end:")
        print("| subject | nav -> kernel-ready | kernel-ready -> first solid | method |")
        print("|---|---|---|---|")
        for key, s in report["subjects"].items():
            if not s.get("available"):
                continue
            m = s["median"]
            if m.get("navToKernelReadyMs") is None and m.get("kernelReadyToFirstSolidMs") is None:
                continue
            nav = f"{m['navToKernelReadyMs']:.0f} ms" if m.get("navToKernelReadyMs") is not None else "n/a"
            rs = f"{m['kernelReadyToFirstSolidMs']:.2f} ms" if m.get("kernelReadyToFirstSolidMs") is not None else "FAILED"
            meth = ", ".join(m.get("kernelReadyToFirstSolidMethods") or []) or "n/a"
            print(f"| {s.get('label', key)} | {nav} | {rs} | {meth} |")
        print()
        print("Document each subject actually built for its cold-load number (parity matters here -- see team")
        print("lead's note that different documents measure the geometry, not the engine):")
        for key, s in report["subjects"].items():
            if not s.get("available"):
                continue
            docs = s.get("median", {}).get("coldLoadDocuments") or []
            for d in docs:
                print(f"- {s.get('label', key)}: {d}")
        print()

    print("Triangle count source per subject:")
    for key, s in report["subjects"].items():
        src = s.get("triangleCountSource")
        if src:
            print(f"- {s.get('label', key)}: {src}")
    print()
    print("Cold-load sampling floor (screenshot+decode cost per capture, measured this run, not the poll sleep constant --")
    print("this applies to cold-load ONLY; edit->redraw is timed differently, see below):")
    for key, s in report["subjects"].items():
        if not s.get("available"):
            continue
        sf = s.get("median", {}).get("samplingFloorMs")
        if sf and sf.get("meanCaptureMs") is not None:
            print(f"- {s.get('label', key)}: ~{sf['meanCaptureMs']:.0f} ms mean per capture (worst seen {sf['maxCaptureMs']:.0f} ms) "
                  f"-- a cold load faster than this is real but reads as instant or gets rounded up to the next sample")
    print("Orbit fps is exempt from any of this: it samples requestAnimationFrame timestamps in-page, never a canvas screenshot, "
          "so it is not depressed by screenshot-polling load.")
    print()
    print("Edit->redraw method and caveats per subject (see measure_redraw_via_gpu_upload() in the script for the full reasoning):")
    for key, s in report["subjects"].items():
        if not s.get("available"):
            continue
        m = s.get("median", {})
        methods = m.get("editMethods") or []
        notes = m.get("editMethodNotes") or []
        label = s.get("label", key)
        if methods:
            print(f"- {label}: timed via {', '.join(methods)}")
        for note in notes:
            print(f"  - {note}")
        if not methods:
            print(f"- {label}: edit-to-redraw never succeeded in any run -- no method to report")
    print()
    if report.get("unmeasuredNotes"):
        print("**Could not measure:**")
        for note in report["unmeasuredNotes"]:
            print(f"- {note}")
        print()

    print("Browser console error count per subject (median, cosmetic or not -- counted separately so the")
    print("comparison of console health stays fair rather than silently penalizing or excusing any one subject):")
    for key, s in report["subjects"].items():
        if not s.get("available"):
            continue
        n = s.get("median", {}).get("consoleErrorCount")
        if n is not None:
            print(f"- {s.get('label', key)}: {n:.0f} errors/run")
    print()

    if "occt" in report["subjects"] or "replicad" in report["subjects"]:
        print("FYI, not a measurement: occt and replicad bar both currently load the shipped "
              "public/reshape/kernel/replicad_single.wasm / node_modules copy, 21.91 MB uncompressed, byte-"
              "identical between them (confirmed by the team lead). This repo's own custom OpenCascade build "
              "sits UNSHIPPED at 11.35 MB -- roughly half -- which is a lever available to our side and not to "
              "replicad if a throttled download ever turns out to matter.")
        print()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None, help="comma-separated subject keys: " + ",".join(SUBJECTS))
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--slow", action="store_true", help="throttle to the shared-wifi profile (1.5 Mbps / 750 kbps / 150ms)")
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args()

    keys = list(SUBJECTS.keys())
    if args.only:
        wanted = [k.strip() for k in args.only.split(",") if k.strip()]
        unknown = [k for k in wanted if k not in SUBJECTS]
        if unknown:
            print(f"unknown subject(s): {unknown}. known: {keys}", file=sys.stderr)
            sys.exit(2)
        keys = wanted

    report = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "options": {"runs": args.runs, "slow": args.slow, "only": keys},
        "subjects": {},
    }
    unmeasured_notes = []

    with sync_playwright() as pw:
        for key in keys:
            subj = SUBJECTS[key]
            log(f"\n=== {key} :: {subj['label']} ===")

            if subj.get("url") is None:
                reason = subj.get("unavailableReason", "no URL configured")
                log(f"  SKIPPED -- {reason}")
                report["subjects"][key] = {"label": subj["label"], "available": False, "reason": reason}
                unmeasured_notes.append(f"{key}: {reason}")
                continue

            reach_ok, reach_info = probe_reachable(pw, subj["url"], args.slow, expected_title=subj.get("expectedTitle"))
            if not reach_ok:
                restart_hint = subj.get("restartHint")
                log(f"  UNREACHABLE -- {reach_info}")
                if restart_hint:
                    log(f"    (not persistent -- restart with: {restart_hint})")
                report["subjects"][key] = {
                    "label": subj["label"], "url": subj["url"],
                    "available": False, "reason": reach_info,
                }
                note = f"{key}: unreachable ({reach_info})"
                if restart_hint:
                    note += f" -- this server is not persistent; restart with: {restart_hint}"
                unmeasured_notes.append(note)
                continue
            log(f"  reachable: {reach_info}")

            runs = []
            for i in range(args.runs):
                log(f"  run {i + 1}/{args.runs}...")
                r = run_once(pw, subj, args.slow)
                runs.append(r)
                log(f"    coldLoad={r.get('coldLoadMs')}ms ok={r.get('coldLoadOk')} gesture={r.get('coldLoadGesture')!r}")
                log(f"    editRedraw={r.get('editToRedrawMs')}ms ok={r.get('editOk')} "
                    f"gesture={r.get('editGesture')!r} err={r.get('editError')}")
                log(f"    orbit={r.get('orbit')} err={r.get('orbitError')}")
                if r.get("triangleCount") is not None:
                    log(f"    triangleCount={r.get('triangleCount')}")
                if r.get("error"):
                    log(f"    ERROR: {r['error']}")

            report["subjects"][key] = {
                "label": subj["label"], "url": subj["url"],
                "triangleCountSource": subj.get("triangleCountSource"),
                "noOrbitReason": subj.get("noOrbit"),
                "available": True, "runs": runs, "median": summarize(runs),
            }

            if all(not r.get("coldLoadOk") for r in runs):
                unmeasured_notes.append(f"{key}: cold-load-to-geometry never confirmed in any of {args.runs} runs")
            if all(not r.get("editOk") for r in runs):
                errs = sorted({r.get("editError") for r in runs if r.get("editError")})
                unmeasured_notes.append(f"{key}: edit-to-redraw not measured -- {'; '.join(errs) if errs else 'unknown reason'}")
            if all(r.get("orbit") is None for r in runs):
                errs = sorted({r.get("orbitError") for r in runs if r.get("orbitError")})
                unmeasured_notes.append(f"{key}: orbit smoothness not measured -- {'; '.join(errs) if errs else 'unknown reason'}")

    report["unmeasuredNotes"] = unmeasured_notes

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    log(f"\nwrote {out_path}")

    print_markdown(report)


if __name__ == "__main__":
    main()
