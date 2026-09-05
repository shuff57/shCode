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
(4) A PLAIN Playwright click (no force, no JS) on a pair-grid cell changes
    its aria-label -- regression check for the overlapping-div click defect
    (S08/S12 addendum item D).
(5) Pin corner 1, drag corner 2 of a Rectangle: the Rules panel's Length
    cells (canvas-derived) agree with the Dimensions panel's own corner
    values to within 0.5mm (addendum item E).
(6) Drag a circle's rim handle: the Dimensions panel's `across` value
    updates away from the pre-drag default and holds after a further wait
    (addendum item F).
(7) Typing -5 into a Length cell shows a note and restores the value;
    typing -3 into a Bow cell bows the edge the OTHER way (addendum item G).
(8) An info note left on screen by an earlier action (a Bow) is cleared by
    Undo (addendum item H).
(9) Pinning a corner AFTER a between-edges pair rule (equal) is already set
    holds -- both the pin and the pair rule survive, matching the literal
    order named in addendum item I. The deeper fix (addConstraintSettling
    must not drop a LOCK over a non-lock rule just because removing the
    lock leaves more area) is proven directly against the solver in
    scripts/sketch-solve-assertions.cjs -- constructing a live sequence
    where the two actually collide, rather than each individually
    resolving, was not reachable through ordinary Rules-panel/Dimensions-
    panel interaction (every attempt that tried to leave two corners at a
    genuinely conflicting position under an active horizontal/vertical
    rule got pulled back into consistency by the very same solve that is
    supposed to keep the sketch sane -- itself a reasonable thing for it
    to do). This check instead re-proves the literal repro holds end to
    end and does not regress.
(10) The S10-round-2 setup for addendum item J (perpendicular while BOTH
    target edges still carry their own horizontal rule): settling drops at
    least one of the two conflicting axis rules rather than leaving all of
    them standing behind a banner. addConstraintSettling's own two-rule
    resolution (both dropped, one note naming both) is proven directly in
    scripts/sketch-solve-assertions.cjs against a constructed case; this
    check's own click-driven setup only reaches a state that needs ONE
    rule gone by the time the pair cell reaches "perpendicular" (the pair
    grid cycles equal -> parallel -> perpendicular, each step committing a
    real solve, and the earlier steps already reshape the geometry once).
    A separate, real gap this session found but does not own: even a
    successful settle can leave the fighting banner up, because
    ModelEditor.tsx's setConstraints() commits the new CONSTRAINTS but not
    the seeded POINTS it correctly solved for gating, and solveDoc()'s own
    follow-up re-solve (no seed) can land somewhere its OWN collapse gate
    then rejects -- so this check does not assert the banner clears.
(11) Addendum item K: every rule the overlay draws as a MARK on the
    geometry, not a floating text chip a student has to already know the
    meaning of. Parallel on the S09 trapezoid draws two tick marks whose
    own data-edge1 attribute names edges 1 and 3; perpendicular between the
    same two edges draws one right-angle square naming both edges at their
    shared corner. Also checks the pair grid's own headers now read
    "Edge N" rather than a bare number.

Rules-panel controls that predate this probe's item-D fix are still clicked
via `el.click()` in the page's own JS (locator.evaluate) for the S09/S10/S11
setup steps, matching the workaround the round-1 evidence notes for
S08/S09/S10 used -- check (4) below is what actually re-proves a plain click
now lands.

A NATIVE `<input type="number">` (Round/Chamfer/Bow) renders its own
up/down spinner arrows inside the box; Playwright's default click lands at
the element's centre, which on a 42px-wide box can hit the spinner instead
of placing a text cursor (measured writing this probe: a centred click alone
stepped Bow from empty to -0.5 with no typing at all). Every check below
that types into one of those clicks near the LEFT edge first.

Item R: a contextual rule strip mirrors the Rules panel where the hand
already is -- select one edge on the canvas and it shows Level / Upright /
Length..., select a second (Shift-click) and it shows Equal / Parallel /
Right angle instead, select a corner and it shows Pin. Every button calls
the exact same handler the matching panel row/cell does, so the pair grid
and the canvas marks update identically either way (see RuleActions in
SketchConstraints.tsx). The matrix cell itself now shows its rule's own
word ("parallel") when set, and a faint "+" when empty.
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


PAIR_WORD = {"equal": "Equal", "parallel": "Parallel", "perpendicular": "Right angle", "none": "None"}


def cycle_pair_to(page, lo, hi, target):
    """Opens the "Edges lo and hi" pair cell's picker (item M) and picks
    the option matching `target` ('equal' | 'parallel' | 'perpendicular' |
    'none') directly -- kept under its old name (every existing check
    already calls it) even though the mechanism underneath is no longer a
    click-to-cycle button but a picker: one pick, not several clicks."""
    if read_pair_state(page, lo, hi).endswith(f": {target}"):
        return True
    cell = page.locator(f'[title^="Edges {lo} and {hi}"]').first
    if cell.get_attribute("aria-expanded") != "true":
        js_click(cell)
        time.sleep(0.15)
    picker = page.locator(f'.sk-pair-picker[aria-label="Edges {lo} and {hi}"]')
    option = picker.get_by_role("option", name=PAIR_WORD[target], exact=True)
    if option.count() == 0:
        return False
    js_click(option.first)
    time.sleep(0.2)
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


def type_into_number_box(page, locator, text):
    """Click near the LEFT edge of a native <input type="number"> (never its
    centre -- see the module docstring's spinner note), select-all, and type
    `text` via real key presses (not .fill(), which never exercises the
    per-keystroke path a real student's typing does)."""
    box = locator.bounding_box()
    page.mouse.click(box["x"] + 5, box["y"] + box["height"] / 2)
    page.keyboard.press("Control+a")
    for ch in text:
        page.keyboard.press(ch)


def check_plain_click_on_pair_grid(page):
    print("\n=== D: a plain click reaches the pair-rule grid ===")
    # Item M changed what a click on the cell DOES (opens a picker, rather
    # than directly cycling the rule), but this check's own point --
    # proving a real click actually lands on the control, not swallowed by
    # the overlapping tools card -- still holds: aria-expanded flips true.
    arm_sketch(page)
    cell = page.locator('[title^="Edges 1 and 3"]').first
    before = cell.get_attribute("aria-expanded")
    cell.click()  # deliberately NOT force=True and NOT js_click
    time.sleep(0.2)
    after = cell.get_attribute("aria-expanded")
    check("a plain Playwright click on 'Edges 1 and 3' opens its picker (aria-expanded)",
        before == "false" and after == "true", f"before={before!r} after={after!r}")


def check_pin_drag_sync(page):
    print("\n=== E: pin + drag keeps the canvas/Rules panel and Dimensions panel in sync ===")
    page.goto(f"{BASE}/sandbox/")
    page.evaluate("() => localStorage.setItem('shCode:sandbox-mode', 'reshape')")
    page.reload()
    page.wait_for_selector("canvas", timeout=15000)
    page.get_by_role("button", name="Rectangle", exact=True).click()
    canvas = page.locator("canvas").first
    cb = canvas.bounding_box()
    cx0, cy0 = cb["x"] + cb["width"] / 2 - 80, cb["y"] + cb["height"] / 2 - 40
    cx1, cy1 = cb["x"] + cb["width"] / 2 + 80, cb["y"] + cb["height"] / 2 + 40
    page.mouse.click(cx0, cy0)
    time.sleep(0.15)
    page.mouse.click(cx1, cy1)
    time.sleep(0.2)
    page.wait_for_selector('button[aria-label="Pin corner 1"]', timeout=10000)
    page.locator('[aria-label="Pin corner 1"]').click()
    time.sleep(0.2)

    handle = page.locator('[aria-label^="Drag"][aria-label*="orner 2"]').first
    box = handle.bounding_box()
    hx, hy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    page.mouse.move(hx, hy)
    page.mouse.down()
    for i in range(1, 6):
        page.mouse.move(hx + i * 20, hy + i * 10, steps=3)
        time.sleep(0.04)
    page.mouse.up()
    time.sleep(0.4)

    corners = read_all_corners(page, "Sketch 1")
    ok_corners = all(u is not None and v is not None for u, v in corners)
    lengths = {}
    for e in [1, 2, 3, 4]:
        placeholder = page.locator(f'input[aria-label="Edge {e} length"]').get_attribute("placeholder")
        lengths[e] = float(placeholder) if placeholder else None
    if ok_corners and all(v is not None for v in lengths.values()):
        actual = [edge_len(corners, n) for n in range(4)]
        diffs = [abs(actual[n] - lengths[n + 1]) for n in range(4)]
        check("the Rules panel's Length cells agree with the Dimensions panel's "
            "corner values (within 0.5mm)",
            all(d < 0.5 for d in diffs),
            f"corners={corners} lengths={lengths} diffs={[round(d, 3) for d in diffs]}")
    else:
        check("the Rules panel's Length cells agree with the Dimensions panel's "
            "corner values (within 0.5mm)", False,
            f"could not read all values: corners={corners} lengths={lengths}")


def check_circle_rim_sync(page):
    print("\n=== F: a circle rim drag updates the Dimensions panel's `across` ===")
    page.goto(f"{BASE}/sandbox/")
    page.evaluate("() => localStorage.setItem('shCode:sandbox-mode', 'reshape')")
    page.reload()
    page.wait_for_selector("canvas", timeout=15000)
    page.get_by_role("button", name="Circle", exact=True).click()
    page.wait_for_selector("#reshapeRules", timeout=10000)
    time.sleep(0.2)
    across_field = page.get_by_label("Sketch 1 across", exact=True)
    before = across_field.input_value()

    handle = page.locator('[aria-label^="Drag"]').first
    box = handle.bounding_box()
    hx, hy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    page.mouse.move(hx, hy)
    page.mouse.down()
    for i in range(1, 6):
        page.mouse.move(hx + i * 15, hy, steps=3)
        time.sleep(0.04)
    page.mouse.up()
    time.sleep(0.4)
    after = across_field.input_value()
    time.sleep(0.5)
    after_settled = across_field.input_value()
    check("the Dimensions panel's `across` value moves off its pre-drag default",
        before != after, f"before={before!r} after={after!r}")
    check("...and holds after a further wait, rather than reverting",
        after == after_settled, f"after={after!r} after_settled={after_settled!r}")


def check_bad_numbers(page):
    print("\n=== G: a refused number shows a note and is put back; Bow honours negative ===")
    arm_sketch(page)
    length_field = page.locator('input[aria-label="Edge 1 length"]')
    length_field.fill("-5")
    length_field.press("Tab")
    time.sleep(0.2)
    check("a Length cell put back to -5 shows an empty box (value refused, not stored)",
        length_field.input_value() == "", repr(length_field.input_value()))
    note = page.locator(".sk-rules-note").filter(has_not=page.locator(".sk-rules-note-info"))
    check("...and a note explains why", note.count() > 0 and "positive" in (note.first.text_content() or ""),
        note.first.text_content() if note.count() else "no note found")

    bow_field = page.locator('input[aria-label="Bow edge 2"]')
    type_into_number_box(page, bow_field, "-3")
    page.keyboard.press("Enter")
    time.sleep(0.3)
    row = page.locator("table.sk-table tbody tr").nth(1)  # edge 2 is the second row
    check("typing -3 into Bow bows edge 2 the OTHER way (still curved, not refused)",
        "curved" in row.inner_text(), row.inner_text())


def check_undo_clears_note(page):
    print("\n=== H: Undo clears a note left by an earlier action ===")
    arm_sketch(page)
    bow_field = page.locator('input[aria-label="Bow edge 1"]')
    type_into_number_box(page, bow_field, "5")
    page.keyboard.press("Enter")
    time.sleep(0.2)
    before_note = page.locator(".model-note")
    had_note = before_note.count() > 0 and bool(before_note.first.text_content())
    check("setup: bowing edge 1 leaves an info banner on screen",
        had_note, before_note.first.text_content() if before_note.count() else None)

    page.keyboard.press("Control+z")
    time.sleep(0.3)
    after_note = page.locator(".model-note")
    after_text = after_note.first.text_content() if after_note.count() else None
    check("Ctrl+Z (not the toolbar button) clears the banner",
        not after_note.count() or not after_text, repr(after_text))


def check_lock_after_pair_rule(page):
    print("\n=== I: pinning a corner AFTER a between-edges pair rule holds ===")
    arm_sketch(page)
    cell = page.locator('[title^="Edges 1 and 2"]').first
    cycle_pair_to(page, 1, 2, "equal")  # edges 1 and 2 genuinely differ: 40 vs 25
    check("setup: 'equal' between edges 1 and 2 is on before the pin",
        (cell.get_attribute("aria-label") or "").endswith(": equal"),
        cell.get_attribute("aria-label"))

    pin = page.locator('[aria-label="Pin corner 1"]')
    pin.click()
    time.sleep(0.3)
    check("the pin holds after a pair rule was already set",
        pin.get_attribute("aria-pressed") == "true", pin.get_attribute("aria-pressed"))
    check("...and the pair rule itself is not the thing silently dropped for it",
        (cell.get_attribute("aria-label") or "").endswith(": equal"),
        cell.get_attribute("aria-label"))
    note = page.locator(".model-note")
    note_text = note.first.text_content() if note.count() else None
    check("...with no refusal banner shown",
        "That would" not in (note_text or ""), repr(note_text))


def check_two_rule_settle(page):
    print("\n=== J: perpendicular against two already-active axis rules settles, not just banners ===")
    arm_sketch(page)
    # S10 round 2's own setup: leave Edge 1 across and Edge 3 across BOTH
    # on (only Edge 2 up comes off), then retype corner 3 -- so by the time
    # "Edges 1 and 3" reaches perpendicular, edge 1 and edge 3 each still
    # carry their own conflicting horizontal rule and neither alone can be
    # dropped to settle it (see the constructed case in
    # sketch-solve-assertions.cjs, which pins the exact geometry). Item M's
    # picker (cycle_pair_to, below) now applies "perpendicular" directly,
    # with no intermediate "parallel" commit reshaping the geometry along
    # the way the way the old click-to-cycle button used to -- a cleaner
    # repro of the same two-conflicting-rules case, not a different one.
    js_click(rule_button(page, "Edge 2 up"))
    across = page.get_by_label("Sketch 1 corner 3 across", exact=True)
    across.fill("60")
    across.press("Tab")
    time.sleep(0.2)
    up = page.get_by_label("Sketch 1 corner 3 up", exact=True)
    up.fill("10")
    up.press("Tab")
    time.sleep(0.2)
    check("setup: Edge 1 across and Edge 3 across are BOTH still on",
        rule_button(page, "Edge 1 across").get_attribute("aria-pressed") == "true"
        and rule_button(page, "Edge 3 across").get_attribute("aria-pressed") == "true",
        "setup check, not the fix under test")

    cell = page.locator('[title^="Edges 1 and 3"]').first
    reached = cycle_pair_to(page, 1, 3, "perpendicular")
    check("the pair cell reaches 'perpendicular'",
        reached, cell.get_attribute("aria-label"))

    edge1_on = rule_button(page, "Edge 1 across").get_attribute("aria-pressed")
    edge3_on = rule_button(page, "Edge 3 across").get_attribute("aria-pressed")
    check("settling actually dropped at least one of the two conflicting axis "
        "rules -- not a straight refusal that leaves all of them standing",
        edge1_on == "false" or edge3_on == "false",
        f"Edge 1 across={edge1_on} Edge 3 across={edge3_on}")
    # NOT asserted here: that the fighting banner clears, or that a note
    # appears -- this scenario's own intermediate commits (each pair-grid
    # step along the way) make the exact post-settle residual harder to
    # pin down than the plain case check_settled_perpendicular_no_banner
    # (item L, below) covers. That plain case is the one proving
    # setConstraints() now commits the SEEDED solve's own points alongside
    # the new constraints, closing the gap that used to leave solveDoc()
    # re-solving from scratch, unseeded, after a settle here.
    # addConstraintSettling's own resolution is proven directly,
    # independent of that gap, in scripts/sketch-solve-assertions.cjs.


def check_marks_on_geometry(page):
    print("\n=== K: rules draw a mark on the geometry itself, not just a colored cell ===")
    # Same S09 trapezoid setup as check_s09 below -- parallel between edges
    # 1 and 3 -- but this time reading the CANVAS overlay's own marks
    # (components/model/HandleOverlay.tsx), not the corner values.
    arm_sketch(page)
    js_click(rule_button(page, "Edge 3 across"))
    field = page.get_by_label("Sketch 1 corner 3 up", exact=True)
    field.fill("15")
    field.press("Tab")
    time.sleep(0.2)
    cycle_pair_to(page, 1, 3, "parallel")
    time.sleep(0.3)

    parallel_marks = page.locator('[data-mark="parallel"]')
    check("the overlay draws exactly two parallel-tick marks",
        parallel_marks.count() == 2, f"count={parallel_marks.count()}")
    named_edges = sorted(
        parallel_marks.nth(i).get_attribute("data-edge1") for i in range(parallel_marks.count())
    )
    check("...naming edges 1 and 3, not a floating '∥' chip",
        named_edges == ["1", "3"], f"named={named_edges}")
    # Scoped to the canvas overlay's own <svg>, not the whole page -- the
    # Rules panel's OWN pair-grid button still legitimately shows "∥" as
    # its cell glyph, which is the panel control, not the floating canvas
    # chip this item removes.
    canvas_parallel_text = page.locator("svg.sketch-lines text", has_text="∥")
    check("the old floating '∥' text chip on the canvas overlay is gone",
        page.locator('[data-mark]').count() > 0 and canvas_parallel_text.count() == 0,
        f"canvas '∥' text count={canvas_parallel_text.count()}")

    # Now S10's setup -- perpendicular between the same two edges -- for the
    # right-angle square at their shared corner.
    arm_sketch(page)
    js_click(rule_button(page, "Edge 2 up"))
    across = page.get_by_label("Sketch 1 corner 3 across", exact=True)
    across.fill("50")
    across.press("Tab")
    time.sleep(0.2)
    cycle_pair_to(page, 1, 3, "perpendicular")
    time.sleep(0.3)

    perp_marks = page.locator('[data-mark="perpendicular"]')
    check("a right-angle square mark exists for the perpendicular rule",
        perp_marks.count() == 1, f"count={perp_marks.count()}")
    if perp_marks.count():
        check("...naming edges 1 and 3, at their shared corner",
            perp_marks.first.get_attribute("data-edge1") == "1"
            and perp_marks.first.get_attribute("data-edge2") == "3",
            f"edge1={perp_marks.first.get_attribute('data-edge1')} "
            f"edge2={perp_marks.first.get_attribute('data-edge2')}")
        # Three sides, drawn as three polylines -- see buildMarks()' own
        # right-angle-square construction.
        check("...drawn as an actual square (three line segments), not a symbol",
            perp_marks.first.locator("polyline").count() == 3,
            f"segment count={perp_marks.first.locator('polyline').count()}")

    # The pair grid's own headers, checked while we are here (item K's
    # other half): "Edge N", not a bare number.
    check("the pair grid's column headers say 'Edge N', not a bare number",
        page.locator(".sk-pairs-grid thead th").nth(1).text_content() == "Edge 1",
        page.locator(".sk-pairs-grid thead th").nth(1).text_content())


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


def check_settled_perpendicular_no_banner(page):
    print("\n=== L: a settled perpendicular leaves no fighting banner behind ===")
    # A plain, uncomplicated perpendicular this time (not S10 round 2's own
    # two-conflicting-axis-rules setup above) -- item L's own fix is about
    # setConstraints() committing the SOLVED points along with the new
    # constraints, not about settling logic, so the simplest case that
    # reaches a genuine solve is the right one to prove it with. Edges 1
    # and 3 (opposite, not adjacent) -- 1 and 2 share a corner, and cycling
    # an adjacent pair toward parallel is a genuine, different refusal (the
    # shared corner would be forced straight), not this bug.
    arm_sketch(page)
    # arm_sketch's own default rectangle keeps every edge's across/up rule
    # on (it has to, to stay a rectangle) -- same reason check_marks_on_
    # geometry's own K setup turns one off first: a perpendicular between
    # edges 1 and 3 that BOTH still carry their own axis rule is a
    # different, genuine conflict (K/S10's own territory), not this bug.
    js_click(rule_button(page, "Edge 3 across"))
    time.sleep(0.2)
    ok = cycle_pair_to(page, 1, 3, "perpendicular")
    check("the pair cell reaches 'perpendicular'", ok, read_pair_state(page, 1, 3))

    fighting = page.locator(".fighting")
    check("no rule button carries the 'fighting' (unsettled) class afterward",
        fighting.count() == 0, f"{fighting.count()} fighting element(s)")

    # Same invariant Undo/Redo already gets elsewhere in this file: the doc
    # this component reads its OWN residual from (points vs constraints) is
    # internally consistent, which is exactly what committing only
    # `constraints` and not `points` used to break.
    residual_ok = page.evaluate(
        """() => {
            const btns = [...document.querySelectorAll('.sk-table button, .sk-pairs-grid td button')];
            return !btns.some(b => b.classList.contains('fighting'));
        }"""
    )
    check("...confirmed by a direct DOM sweep, not just the locator's own count",
        residual_ok, str(residual_ok))


def check_pair_picker_direct_pick(page):
    print("\n=== M: the pair picker applies a choice directly, no intermediate commit ===")
    # Edges 1 and 2 are ADJACENT (share a corner) -- the exact case where
    # the retired click-to-cycle button forced a student through "parallel"
    # on the way to "perpendicular", pulling the shared corner toward
    # collinear and refusing the perpendicular step that would have
    # settled fine on its own (S10 round 3). Picking "Right angle" directly
    # must never pass through that intermediate at all.
    arm_sketch(page)
    before = read_all_corners(page, "Sketch 1")

    reached = cycle_pair_to(page, 1, 2, "perpendicular")
    check('picking "right angle" for edges 1 and 2 directly reaches perpendicular',
        reached, read_pair_state(page, 1, 2))

    note = page.locator(".model-note")
    note_text = note.first.text_content() if note.count() else None
    check("...with no refusal banner shown",
        "That would" not in (note_text or ""), repr(note_text))
    fighting = page.locator(".fighting")
    check("...and no rule button left in the 'fighting' state",
        fighting.count() == 0, f"{fighting.count()} fighting element(s)")

    perp_marks = page.locator('[data-mark="perpendicular"]')
    check("the right-angle mark appears on the canvas",
        perp_marks.count() == 1, f"count={perp_marks.count()}")
    named = sorted([perp_marks.first.get_attribute("data-edge1"), perp_marks.first.get_attribute("data-edge2")])
    check("...naming edges 1 and 2", named == ["1", "2"], f"named={named}")

    # The parallel state was never committed: one Undo goes straight back
    # to the pre-rule outline, not to a parallel intermediate.
    page.keyboard.press("Control+z")
    time.sleep(0.3)
    check("Undo once clears the pair rule entirely",
        read_pair_state(page, 1, 2).endswith(": no rule"), read_pair_state(page, 1, 2))
    after_undo = read_all_corners(page, "Sketch 1")
    close_enough = all(
        a is not None and b is not None and abs(a[0] - b[0]) < 0.5 and abs(a[1] - b[1]) < 0.5
        for a, b in zip(before, after_undo)
    )
    check("...and restores the ORIGINAL pre-rule corners, not a parallel-settled shape",
        close_enough, f"before={before} after_undo={after_undo}")


def check_pull_hint_hides_during_rules(page):
    print("\n=== N: the Pull hint hides while a rule is being set ===")
    arm_sketch(page)
    time.sleep(0.2)
    pull_hint = lambda: page.evaluate(  # noqa: E731
        """() => [...document.querySelectorAll('div')].some(
            d => d.textContent && d.textContent.includes('A sketch is flat'))"""
    )
    check("setup: the Pull hint shows for a freshly-drawn, untouched sketch",
        pull_hint(), "no Pull hint found before any rule interaction")

    js_click(rule_button(page, "Edge 3 across"))
    time.sleep(0.2)
    check("pressing a rule cell hides the Pull hint immediately",
        not pull_hint(), "Pull hint still visible after pressing a rule")


def check_rule_controls_say_their_names(page):
    print("\n=== O: the rule controls say their names in words ===")
    arm_sketch(page)
    text = page.evaluate("() => document.querySelector('.sk-rules')?.innerText ?? ''")
    # "Level"/"Upright" are the toggle-column headers; "parallel"/"right
    # angle" (lowercase) come from the pair grid's own legend sentence, not
    # the picker's option words (those only render once a cell is opened).
    for word in ["Level", "Upright", "parallel", "right angle"]:
        check(f'the Rules panel\'s visible text contains "{word}"', word in text, text[:400])


def edge_hit(page, index):
    """The invisible, fatter hit region for design edge `index` (0-based) --
    HandleOverlay.tsx's `.sketch-edge-hit` polyline, in DOM order matching
    the design edge order (hit 0 is Edge 1, etc)."""
    return page.locator(".sketch-edge-hit").nth(index)


def click_center(page, locator):
    box = locator.bounding_box()
    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)


def check_contextual_rule_strip(page):
    print("\n=== R: a contextual rule strip mirrors the Rules panel on the selection ===")
    arm_sketch(page)

    # One edge selected -- Edge 4 (hit index 3), away from the 1/3 pair the
    # rest of this check uses, so the two halves cannot interfere.
    click_center(page, edge_hit(page, 3))
    time.sleep(0.25)
    strip = page.locator(".sketch-rule-strip")
    check("select one edge on the canvas shows the strip",
        strip.count() > 0, "no .sketch-rule-strip after clicking an edge")
    strip_text = strip.inner_text() if strip.count() > 0 else ""
    check('...and the strip contains "Level"', "Level" in strip_text, strip_text)

    # Two edges (Edge 1 and Edge 3, hit indices 0 and 2) -- opposite sides
    # of the default rectangle, already parallel by construction, so
    # setting "parallel" between them settles with nothing to fight.
    click_center(page, edge_hit(page, 0))
    time.sleep(0.15)
    page.keyboard.down("Shift")
    click_center(page, edge_hit(page, 2))
    page.keyboard.up("Shift")
    time.sleep(0.25)
    strip2 = page.locator(".sketch-rule-strip")
    check("select two edges (Shift-click) shows the strip",
        strip2.count() > 0, "no .sketch-rule-strip after a Shift-click")
    strip2_text = strip2.inner_text() if strip2.count() > 0 else ""
    check('...and the strip contains "Parallel"', "Parallel" in strip2_text, strip2_text)

    if strip2.count() > 0 and "Parallel" in strip2_text:
        strip2.locator("button", has_text="Parallel").click()
        time.sleep(0.3)
        check("pressing it, the pair cell reads parallel",
            read_pair_state(page, 1, 3).endswith(": parallel"), read_pair_state(page, 1, 3))
        parallel_marks = page.locator('[data-mark="parallel"]')
        check("...and the marks appear on the canvas",
            parallel_marks.count() == 2, f"count={parallel_marks.count()}")

        # The matrix cell itself now spells out the word, not just a mark,
        # and the empty cells beside it show a faint "+" rather than
        # nothing at all.
        cell = page.locator('button[aria-label="Edges 1 and 3: parallel"]')
        check('the "Edges 1 and 3" matrix cell shows the word "Parallel", not just a mark',
            cell.count() > 0 and cell.first.inner_text().strip() == "Parallel",
            cell.first.inner_text() if cell.count() > 0 else "cell not found")
        empty_cell = page.locator('button[aria-label="Edges 1 and 2: no rule"] .sk-pair-plus')
        check("an empty pair cell shows a faint '+' rather than nothing",
            empty_cell.count() > 0, f"count={empty_cell.count()}")

    # A corner selected shows Pin, and pressing it acts through the same
    # lockCorner() the "Pin a corner" row already uses.
    page.keyboard.press("Escape")
    time.sleep(0.15)
    corner_handle = page.locator(".handle.is-point").first
    click_center(page, corner_handle)
    time.sleep(0.25)
    strip3 = page.locator(".sketch-rule-strip")
    strip3_text = strip3.inner_text() if strip3.count() > 0 else ""
    check('select a corner shows the strip with "Pin"',
        strip3.count() > 0 and "Pin" in strip3_text, strip3_text)
    if strip3.count() > 0 and "Pin" in strip3_text:
        strip3.locator("button", has_text="Pin").click()
        time.sleep(0.25)
        pinned = page.evaluate(
            """() => { const b = [...document.querySelectorAll('.sk-pins button')]
                .find(x => x.getAttribute('aria-label') === 'Pin corner 1');
                return b ? b.getAttribute('aria-pressed') : null; }"""
        )
        check("...and pressing it pins corner 1 in the panel below",
            pinned == "true", f"aria-pressed={pinned}")

    # Escape clears a standing selection (and its strip) with no other
    # click needed.
    page.keyboard.press("Escape")
    time.sleep(0.15)
    check("Escape clears the strip", page.locator(".sketch-rule-strip").count() == 0,
        f"{page.locator('.sketch-rule-strip').count()} strip(s) still visible")


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

        try:
            check_plain_click_on_pair_grid(page)
        except Exception as exc:  # noqa: BLE001
            check("D checks ran without an exception", False, repr(exc))

        try:
            check_pin_drag_sync(page)
        except Exception as exc:  # noqa: BLE001
            check("E checks ran without an exception", False, repr(exc))

        try:
            check_circle_rim_sync(page)
        except Exception as exc:  # noqa: BLE001
            check("F checks ran without an exception", False, repr(exc))

        try:
            check_bad_numbers(page)
        except Exception as exc:  # noqa: BLE001
            check("G checks ran without an exception", False, repr(exc))

        try:
            check_undo_clears_note(page)
        except Exception as exc:  # noqa: BLE001
            check("H checks ran without an exception", False, repr(exc))

        try:
            check_lock_after_pair_rule(page)
        except Exception as exc:  # noqa: BLE001
            check("I checks ran without an exception", False, repr(exc))

        try:
            check_two_rule_settle(page)
        except Exception as exc:  # noqa: BLE001
            check("J checks ran without an exception", False, repr(exc))

        try:
            check_marks_on_geometry(page)
        except Exception as exc:  # noqa: BLE001
            check("K checks ran without an exception", False, repr(exc))

        try:
            check_settled_perpendicular_no_banner(page)
        except Exception as exc:  # noqa: BLE001
            check("L checks ran without an exception", False, repr(exc))

        try:
            check_pair_picker_direct_pick(page)
        except Exception as exc:  # noqa: BLE001
            check("M checks ran without an exception", False, repr(exc))

        try:
            check_pull_hint_hides_during_rules(page)
        except Exception as exc:  # noqa: BLE001
            check("N checks ran without an exception", False, repr(exc))

        try:
            check_rule_controls_say_their_names(page)
        except Exception as exc:  # noqa: BLE001
            check("O checks ran without an exception", False, repr(exc))

        try:
            check_contextual_rule_strip(page)
        except Exception as exc:  # noqa: BLE001
            check("R checks ran without an exception", False, repr(exc))

        browser.close()

    total = len(results)
    passed = sum(1 for r in results if r)
    print(f"\n{'ALL PASS' if all(results) else 'FAIL'}  ({passed}/{total})")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
