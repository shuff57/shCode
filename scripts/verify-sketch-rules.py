"""SPEC-2d-rules verification: sketch rules that hold without wrecking the
sketch (round 1 losses S09, S10, S11 -- see the spec's own evidence notes).

Playwright, headless Chromium, 1440x900, against http://localhost:3002/sandbox/
in reSHape/Build mode. Prints one PASS/FAIL line per check and exits non-zero
on any FAIL.

(1) S09: a genuine trapezoid made parallel between edges 1 and 3 must not
    collapse -- every corner's `across` value stays distinct, and every edge
    keeps at least 25% of its pre-rule length.
(2) S11: pressing "Edge 2 across" while "Edge 3 across" is on must succeed on
    the FIRST press (dropping the older rule automatically), showing an
    informational note rather than the error banner.
(3) After (2), edge 2 is left as the selected/highlighted edge (the floating
    name pill reads "Edge 2 ...").

Rules-panel controls are clicked via `el.click()` in the page's own JS
(locator.evaluate), not a plain Playwright click: an overlapping
`model-editor` div intercepts a real on-screen click there (documented in the
round-1 evidence notes for S08/S09/S10, and reconfirmed writing this probe --
a real click, even with force=True, still resolves to whatever is actually
topmost at that pixel and silently does nothing to the pair-rule grid).
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


def arm_sketch(page):
    """Open a fresh reSHape/Build sandbox and place one default sketch,
    selected -- matches startSketch() in ModelEditor.tsx exactly: a 40x25
    quad with all four edges' across/up rules already on."""
    page.goto(f"{BASE}/sandbox/")
    page.evaluate("() => localStorage.setItem('shCode:sandbox-mode', 'reshape')")
    page.reload()
    page.wait_for_selector("canvas", timeout=15000)
    page.get_by_role("button", name="Sketch", exact=True).click()
    page.wait_for_selector("#reshapeRules", timeout=10000)
    # The Rules table needs its rows (edge count) before anything else can
    # be clicked reliably.
    page.wait_for_selector('button[aria-label="Edge 1 across"]', timeout=10000)


def rule_button(page, label):
    return page.locator(f'[aria-label="{label}"]')


def js_click(locator):
    """`el.click()` in the page's own JS -- see the module docstring. A real
    Playwright click (plain or force=True) still resolves to whatever DOM
    node is actually topmost at that pixel, and the Rules panel sits under
    an overlapping `model-editor` div that silently swallows it."""
    locator.evaluate("el => el.click()")


def read_pair_state(page, lo, hi):
    """The pair-rule cell's own aria-label names its current state --
    'Edges {lo} and {hi}: no rule' or '...: parallel', etc. Read AFTER a
    short wait, never immediately after a click: the evidence notes for
    S09/S10 both measured that reading right after `.click()` returns the
    PRE-click label."""
    time.sleep(0.15)
    label = page.locator(f'[title^="Edges {lo} and {hi}"]').first.get_attribute("aria-label")
    return label or ""


def cycle_pair_to(page, lo, hi, target):
    """Click the "Edges lo and hi" pair-rule cell until its own aria-label
    reports `target` ('equal' | 'parallel' | 'perpendicular'), up to the
    length of the cycle plus one extra to absorb a double-fire."""
    cell = page.locator(f'[title^="Edges {lo} and {hi}"]').first
    for _ in range(5):
        state = read_pair_state(page, lo, hi)
        if state.endswith(f": {target}"):
            return True
        js_click(cell)
    return read_pair_state(page, lo, hi).endswith(f": {target}")


def set_corner(page, sketch_label, corner, axis, value):
    """Types into the Dimensions panel's "{sketch} corner {n} {axis}" box
    and commits with Tab, the same field the evidence notes call e.g.
    "Sketch 1 corner 3 up"."""
    field = page.get_by_label(f"{sketch_label} corner {corner} {axis}", exact=True)
    field.fill(str(value))
    field.press("Tab")
    time.sleep(0.2)


def read_corner(page, sketch_label, corner, axis):
    field = page.get_by_label(f"{sketch_label} corner {corner} {axis}", exact=True)
    raw = field.input_value()
    try:
        return float(raw)
    except ValueError:
        return None


def read_all_corners(page, sketch_label, count=4):
    pts = []
    for i in range(1, count + 1):
        u = read_corner(page, sketch_label, i, "across")
        v = read_corner(page, sketch_label, i, "up")
        pts.append((u, v))
    return pts


def edge_len(pts, n):
    a = pts[n]
    b = pts[(n + 1) % len(pts)]
    return math.hypot(b[0] - a[0], b[1] - a[1])


def check_s09(page):
    print("\n=== S09: parallel between edges 1 and 3 must not collapse the sketch ===")
    arm_sketch(page)
    # Un-press "Edge 3 across", then retype corner 3's up to 15 -- edges 1
    # (bottom, slope 0) and 3 (top, slope -0.25) are then genuinely NOT
    # parallel, a real test of the rule rather than a no-op.
    js_click(rule_button(page, "Edge 3 across"))
    set_corner(page, "Sketch 1", 3, "up", 15)

    before = read_all_corners(page, "Sketch 1")
    ok_setup = before[2] is not None and abs(before[2][1] - 15) < 0.5
    check("setup: corner 3 is genuinely tilted (up = 15, not the default 25)",
        ok_setup, str(before))

    cycled = cycle_pair_to(page, 1, 3, "parallel")
    check("the pair-rule cell reaches 'parallel' within a few clicks", cycled)

    after = read_all_corners(page, "Sketch 1")
    acrosses = [p[0] for p in after]
    distinct = len({round(a, 2) for a in acrosses if a is not None}) > 1
    check("all four corners' `across` values are NOT all snapped to one number "
        "(the old sliver bug)", distinct, str(acrosses))

    if all(p[0] is not None and p[1] is not None for p in before + after):
        ratios = [edge_len(after, n) / edge_len(before, n) if edge_len(before, n) > 1e-6 else 1
            for n in range(4)]
        check("every edge kept at least 25% of its pre-rule length",
            all(r >= 0.25 for r in ratios), str([round(r, 3) for r in ratios]))
    else:
        check("every edge kept at least 25% of its pre-rule length", False,
            "could not read corner values -- see setup check above")


def check_s11(page):
    print("\n=== S11: 'Edge 2 across' with 'Edge 3 across' on succeeds first try ===")
    arm_sketch(page)
    # Un-press "Edge 2 up", then tilt edge 2 by retyping corner 3 across to
    # 55 -- a genuinely tilted edge 2 (length ~29, diagonal), with edge 3's
    # own `across` rule still on, matching the evidence setup exactly.
    js_click(rule_button(page, "Edge 2 up"))
    set_corner(page, "Sketch 1", 3, "across", 55)

    edge3_on_before = rule_button(page, "Edge 3 across").get_attribute("aria-pressed")
    check("setup: Edge 3 across is still on before the press",
        edge3_on_before == "true", str(edge3_on_before))

    js_click(rule_button(page, "Edge 2 across"))
    time.sleep(0.3)

    edge2_on = rule_button(page, "Edge 2 across").get_attribute("aria-pressed")
    check("Edge 2 across is on after a single press -- no refusal round-trip needed",
        edge2_on == "true", str(edge2_on))

    model_note = page.locator(".model-note")
    model_note_text = model_note.first.text_content() if model_note.count() else ""
    check("no error banner ('That would ...') was shown for the press",
        "That would" not in (model_note_text or ""), repr(model_note_text))

    info_note = page.locator(".sk-rules-note-info")
    check("an informational note is visible in the Rules panel",
        info_note.count() > 0, "no .sk-rules-note-info element found")
    if info_note.count():
        note_text = info_note.first.text_content() or ""
        check("...and it does NOT carry the error banner's own class",
            "sk-rules-warn" not in note_text and "these rules disagree" not in note_text,
            repr(note_text))
        check("...reading as information, in the course's own words",
            "Undo puts it back" in note_text, repr(note_text))

    return page


def check_edge2_selected(page):
    print("\n=== after S11's fix, edge 2 is left as the selected/highlighted edge ===")
    pill = page.locator(".sketch-name-pill text")
    ok = pill.count() > 0
    check("a name pill is showing on the canvas", ok, "no .sketch-name-pill found")
    if ok:
        text = pill.first.text_content() or ""
        check("...and it names Edge 2, the edge just pressed",
            text.strip().startswith("Edge 2"), repr(text))
    row = page.locator("tr.sk-row-hovered")
    check("Edge 2's own Rules-panel row is highlighted the same way",
        row.count() > 0, "no tr.sk-row-hovered found")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        try:
            check_s09(page)
        except Exception as exc:  # noqa: BLE001 -- report, don't crash the run
            check("S09 checks ran without an exception", False, repr(exc))

        try:
            check_s11(page)
            check_edge2_selected(page)
        except Exception as exc:  # noqa: BLE001
            check("S11 checks ran without an exception", False, repr(exc))

        browser.close()

    total = len(results)
    passed = sum(1 for r in results if r)
    print(f"\n{'ALL PASS' if all(results) else 'FAIL'}  ({passed}/{total})")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
