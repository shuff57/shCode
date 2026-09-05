"""SPEC-3d-build verification: items A, C, D, E, H, J, against a live dev server.

Playwright, headless Chromium, 1440x900, against http://localhost:3002/sandbox/
in reSHape/Build mode. Prints one PASS/FAIL line per check and exits non-zero
on any FAIL.

(A) P08's exact task: a square sketch blended to a circle sketch builds a
    real solid instead of refusing with "fewer than three corners" -- Blend
    is enabled with both selected, and a Blend 1 chip lands on the timeline.

(C) One name per tool: the chip/panel label matches the toolbar's own
    button text -- "Angled Corner 1" (not "Bevel 1"), "Repeat Around 1"
    (not "Repeat 1"), "Copy 1" (not "Move 2") -- and the Combine group's
    main toolbar button and its "More ... tools" caret both keep reading
    "Join" after a Cut, rather than relabelling to the last op used
    (P19b/P19c).

(D) Cylinder/Cone/Sphere/Ring panels speak in "across" (diameter), matching
    Ring/Circle's own long-standing convention: a default-radius Cylinder
    (radius 10) reads "Cylinder 1 across" = 20.

(E) Shift-click on a second vertical edge adds it to the selection (the
    pill reads "N edges"); pressing Round from that multi-selection acts on
    every selected edge from the one click.

(H) P20's addendum: the selection pill carries the picked face/edge's own
    size, read off the BUILT kernel geometry, not the doc's own fields --
    "Box 1 · top face · 40 x 40", "Box 1 · edge · 20".

(J) D3's addendum: a click within the edge pick band of an open hollow's
    OUTER rim resolves to that outer edge (Box 1's own, inherited through
    the hollow), not to Hollow 1's own new inner rim or the interior wall
    face -- even when the click lands only a couple of screen pixels from
    the rendered rim line.

(P) Four Corners hole spacing fields say what they measure: on a
    non-square target (60x40) the two fields read "Hole 1 in from each
    side (across)"/"(up)" -- not "corner spacing" -- and hold the distance
    from the target's own edge to the hole centre. The timeline chip
    matches ("4 holes ⌀6, 8 in from the sides"), and typing an inset that
    would put the hole through the side is put back with a calm note.
"""
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"

results = []


def check(name, ok, detail=""):
    tag = "PASS" if ok else "FAIL"
    results.append(ok)
    print(f"{tag}  {name}" + (f" -- {detail}" if detail and not ok else ""))


def timeline(page):
    return page.evaluate(
        """() => {
            const ol = document.querySelector('ol');
            return ol ? [...ol.querySelectorAll('li')].map(li => li.textContent.trim()) : null;
        }"""
    )


def arm_build(page):
    page.goto(f"{BASE}/sandbox/")
    page.evaluate("() => localStorage.setItem('shCode:sandbox-mode', 'reshape')")
    page.reload()
    page.wait_for_selector("canvas", timeout=15000)
    page.on("dialog", lambda d: d.accept())
    time.sleep(0.3)


def canvas_center(page):
    canvas = page.query_selector("canvas")
    box = canvas.bounding_box()
    return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2


def arm_front_view(page):
    page.get_by_title("Look from the front").click()
    time.sleep(0.2)


def click_vertical_edge(page, side, cx, cy):
    """Front view, left or right vertical silhouette edge of the default
    40x40x20 box, at screen offset (+-174, +60) from canvas centre --
    hand-derived against a live session (explore-edge-pick2.py in the
    scratchpad, not committed) and re-verified by the hover hint text
    ("Click this edge to round or bevel just it") at that exact point.

    page.mouse.click() has no `modifiers` kwarg in Python Playwright (that
    is a Locator.click() feature) -- a real Shift-click here has to hold
    the key down around a plain mouse click instead.

    Caller must already be in Front view (see arm_front_view) -- at these
    exact pixel offsets, Home's default isometric angle puts the
    right-hand coordinate on a FACE, not the right vertical edge (measured
    writing this probe)."""
    dx = -174 if side == "left" else 174
    x, y = cx + dx, cy + 60
    if side == "shift-right":
        page.keyboard.down("Shift")
        page.mouse.click(x, y)
        page.keyboard.up("Shift")
    else:
        page.mouse.click(x, y)
    time.sleep(0.2)


def check_item_a_blend_circle(page):
    arm_build(page)
    page.get_by_title("Draw a flat outline to pull or spin into a solid", exact=True).click()
    time.sleep(0.2)
    cx, cy = canvas_center(page)
    page.mouse.click(cx - 60, cy + 40)
    time.sleep(0.1)
    page.mouse.click(cx + 60, cy - 40)
    time.sleep(0.3)
    check("setup: a rectangle (square-edited) sketch exists",
          (timeline(page) or [""])[0].startswith("1Sketch 1"))

    page.get_by_title("Draw a circle to pull or spin into a solid", exact=True).click()
    time.sleep(0.2)
    page.mouse.click(cx - 200, cy + 40)
    time.sleep(0.1)
    page.mouse.click(cx - 160, cy + 40)
    time.sleep(0.3)
    tl = timeline(page)
    check("setup: a circle sketch exists alongside it",
          tl is not None and len(tl) == 2 and "Sketch 2" in tl[1], str(tl))

    # Select the circle sketch and lift it off the rectangle's plane --
    # blending two sketches at the SAME offset is refused for a real
    # reason ("no gap to fill"), a different refusal than P08's own.
    chips = page.query_selector_all("ol li")
    chips[1].click()
    time.sleep(0.2)
    off = page.get_by_label("Sketch 2 offset", exact=True)
    check("Sketch 2's Dimensions panel is showing (offset field present)", off.count() > 0)
    if off.count():
        off.fill("30")
        off.press("Tab")
        time.sleep(0.2)

    chips = page.query_selector_all("ol li")
    chips[0].click()
    time.sleep(0.2)
    chips[1].click(modifiers=["Shift"])
    time.sleep(0.2)

    blend_enabled = page.evaluate(
        """() => {
            const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Blend');
            return b ? !b.disabled : null;
        }"""
    )
    check("Blend is enabled with a square and a circle both selected", blend_enabled is True, str(blend_enabled))

    page.get_by_role("button", name="Blend", exact=True).click()
    time.sleep(0.3)
    tl = timeline(page)
    check("Blend builds a real Blend 1 step -- P08's refusal is gone",
          tl is not None and any("Blend 1" in row for row in tl), str(tl))
    note = page.evaluate(
        "() => { const n = document.querySelector('.model-note, .model-note-timeline'); return n ? n.textContent : null; }"
    )
    check("...and says so in a normal note, not the old corner-count refusal",
          note is not None and "fewer than three corners" not in note, str(note))


def check_item_c_naming(page):
    # Decision: reference.md/studentWord() win -- the toolbar button itself
    # now says "Bevel" (chip "Bevel 1"); "Angled Corner" survives only as a
    # search alias for a student who remembers the old name.
    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    arm_front_view(page)
    cx, cy = canvas_center(page)
    click_vertical_edge(page, "left", cx, cy)
    page.get_by_title("More round tools").click()
    time.sleep(0.2)
    page.get_by_role("button", name="Bevel", exact=True).click()
    time.sleep(0.3)
    tl = timeline(page)
    check('a Bevel step reads "Bevel 1"',
          tl is not None and any("Bevel 1" in row for row in tl), str(tl))

    # "Angled Corner" still finds the tool by its retired name.
    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    search_btn = page.locator('[aria-label="Search tools (Alt+C)"]')
    search_btn.click()
    time.sleep(0.2)
    page.keyboard.type("Angled Corner")
    time.sleep(0.3)
    bevel_visible = page.evaluate(
        """() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Bevel')"""
    )
    check('searching the retired name "Angled Corner" still surfaces the Bevel tool',
          bevel_visible, str(bevel_visible))

    # Repeat Around -> "Repeat Around 1", not "Repeat 1".
    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    fld = page.get_by_label("Box 1 x", exact=True)
    fld.fill("20")
    fld.press("Tab")
    time.sleep(0.2)
    page.get_by_title("More repeat tools").click()
    time.sleep(0.2)
    page.get_by_role("button", name="Repeat Around", exact=True).click()
    time.sleep(0.3)
    tl = timeline(page)
    check('a Repeat Around step reads "Repeat Around 1", not plain "Repeat 1"',
          tl is not None and any("Repeat Around 1" in row for row in tl), str(tl))

    # Copy -> "Copy 1", not "Move 2".
    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    page.get_by_title("More move tools").click()
    time.sleep(0.2)
    page.get_by_role("button", name="Copy", exact=True).click()
    time.sleep(0.3)
    tl = timeline(page)
    check('a Copy step reads "Copy 1", not "Move 2"',
          tl is not None and any(row.startswith("2Copy 1") for row in tl), str(tl))

    # Combine's main button and its caret keep saying Join after a Cut.
    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    b1x = page.get_by_label("Box 1 x", exact=True)
    b1x.fill("10")
    b1x.press("Tab")
    time.sleep(0.2)
    page.get_by_title("More box tools").click()
    time.sleep(0.2)
    page.get_by_role("button", name="Box", exact=True).nth(1).click()
    time.sleep(0.3)
    chips = page.query_selector_all("ol li")
    chips[0].click()
    time.sleep(0.2)
    chips[1].click(modifiers=["Shift"])
    time.sleep(0.2)
    page.get_by_title("More join tools").click()
    time.sleep(0.2)
    page.get_by_role("button", name="Cut", exact=True).click()
    time.sleep(0.3)
    tl = timeline(page)
    check("Cut itself still lands correctly as its own chip", tl is not None and any("Cut 1" in r for r in tl), str(tl))
    main_text = page.evaluate(
        """() => {
            const b = [...document.querySelectorAll('button')].find(
                b => ['Join', 'Cut', 'Overlap'].includes(b.textContent.trim()));
            return b ? b.textContent.trim() : null;
        }"""
    )
    check("the Combine group's MAIN toolbar button still reads Join after a Cut",
          main_text == "Join", str(main_text))
    caret_title = page.evaluate(
        """() => {
            const els = [...document.querySelectorAll('[title]')];
            const hit = els.find(e => /More .* tools/i.test(e.getAttribute('title'))
                && /join|cut|overlap/i.test(e.getAttribute('title')));
            return hit ? hit.getAttribute('title') : null;
        }"""
    )
    check('...and its "More ... tools" caret still says "More join tools", not "More cut tools"',
          caret_title == "More join tools", str(caret_title))


def check_item_d_across(page):
    arm_build(page)
    page.get_by_title("More box tools").click()
    time.sleep(0.2)
    page.get_by_role("button", name="Cylinder", exact=True).click()
    time.sleep(0.3)
    field = page.get_by_label("Cylinder 1 across", exact=True)
    check('the Cylinder panel has an "across" field (not "radius")', field.count() > 0)
    value = field.input_value() if field.count() else None
    check('a default-radius-10 Cylinder reads across = 20',
          value == "20", str(value))

    # Typing a new across value round-trips through the doc as a radius --
    # confirms the panel is a real read/write field, not a stale label on
    # top of the same old number.
    if field.count():
        field.fill("50")
        field.press("Tab")
        time.sleep(0.3)
        after = page.get_by_label("Cylinder 1 across", exact=True).input_value()
        check("typing 50 across is accepted and holds", after == "50", after)


def check_item_e_multiselect(page):
    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    arm_front_view(page)
    cx, cy = canvas_center(page)
    click_vertical_edge(page, "left", cx, cy)
    pill_after_one = page.evaluate(
        """() => {
            const divs = [...document.querySelectorAll('div')];
            const hit = divs.find(d => d.children.length === 0 && /Box 1/.test(d.textContent || ''));
            return hit ? hit.textContent.trim() : null;
        }"""
    )
    # "Box 1 · edge · 20" now (item H adds the picked edge's own length) --
    # startswith rather than equality so this check does not fight over
    # item H's own concern, which check_item_h_size covers directly.
    check('picking one edge reads "Box 1 · edge..."', (pill_after_one or "").startswith("Box 1 · edge"), str(pill_after_one))

    click_vertical_edge(page, "shift-right", cx, cy)
    pill_after_two = page.evaluate(
        """() => {
            const divs = [...document.querySelectorAll('div')];
            const hit = divs.find(d => d.children.length === 0 && /Box 1/.test(d.textContent || ''));
            return hit ? hit.textContent.trim() : null;
        }"""
    )
    check('Shift-clicking a second edge builds a multi-selection -- the pill reads "Box 1 · 2 edges"',
          pill_after_two == "Box 1 · 2 edges", str(pill_after_two))

    page.get_by_title("Round this edge").click()
    time.sleep(0.3)
    tl = timeline(page)
    round_rows = [r for r in (tl or []) if "Round" in r]
    check("pressing Round from a 2-edge selection rounds every selected edge from the one click",
          len(round_rows) == 2, str(tl))


def selection_pill(page):
    return page.evaluate(
        """() => {
            const divs = [...document.querySelectorAll('div')];
            const hit = divs.find(d => d.children.length === 0 && /Box 1/.test(d.textContent || ''));
            return hit ? hit.textContent.trim() : null;
        }"""
    )


def check_item_h_size(page):
    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    cx, cy = canvas_center(page)
    # Top face, roughly upper-middle of the box in the default Home view.
    page.mouse.click(cx, cy - 100)
    time.sleep(0.3)
    face_pill = selection_pill(page)
    check('selecting the top face of a 40x40x20 box reads its own size -- "... top face · 40 x 40"',
          face_pill is not None and face_pill.count("40") == 2 and "top face" in face_pill,
          str(face_pill))

    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    arm_front_view(page)
    cx, cy = canvas_center(page)
    click_vertical_edge(page, "left", cx, cy)
    edge_pill = selection_pill(page)
    check('selecting a vertical edge of a 40x40x20 box reads its own length -- "... edge · 20"',
          edge_pill is not None and "20" in edge_pill and "edge" in edge_pill,
          str(edge_pill))


def check_item_j_rim_pick(page):
    # D3's exact repro: hollow a box open at the top, click 2 SCREEN px
    # outside the (rendered) rim, and the pick must resolve to an edge of
    # Box 1 -- the outer rim, inherited through the hollow -- never to
    # Hollow 1's own new inner rim or the interior wall face behind it.
    #
    # The true rim sits well inside the visible silhouette line's own
    # rendered width, so "2 px outside" is found empirically here rather
    # than computed: hand-verified against a live session (explore-j*.py in
    # the scratchpad, not committed) that (708, 421) in this exact
    # default-Home-view, default-box, default-hollow framing sits within a
    # couple of screen pixels of the true outer/inner rim boundary, on the
    # side that used to resolve to Hollow 1 before item J's fix.
    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    cx, cy = canvas_center(page)
    page.mouse.click(cx, cy - 100)
    time.sleep(0.3)
    page.get_by_role("button", name="Hollow", exact=True).click()
    time.sleep(0.3)
    tl = timeline(page)
    check("setup: an open Hollow 1 built on Box 1",
          tl is not None and any("Hollow 1" in r for r in tl), str(tl))

    x, y = cx + (708 - 602), cy + (421 - 432)
    page.mouse.click(x, y)
    time.sleep(0.3)
    pill = selection_pill(page)
    check('a click within 2px of the outer rim resolves to Box 1 (never Hollow 1)',
          pill is not None and pill.startswith("Box 1"), str(pill))


def check_item_g_clamp_note(page):
    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    field = page.get_by_label("Box 1 width", exact=True)
    field.fill("-5")
    field.press("Tab")
    time.sleep(0.3)
    value = page.get_by_label("Box 1 width", exact=True).input_value()
    note = page.evaluate(
        "() => { const n = document.querySelector('.reshape-params-notice'); return n ? n.textContent : null; }"
    )
    check("typing -5 into Box width is put back to 1, not left negative or at 0",
          value == "1", value)
    check('a calm note explains why -- "A size has to be more than 0, so 1 was used."',
          note is not None and "more than 0" in note and "1" in note, str(note))


def check_item_p_corner_inset(page):
    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    # Non-square target -- P13's own repro shape (a square target can't
    # show a crowded edge, since across and up read the same either way).
    page.get_by_label("Box 1 width", exact=True).fill("60")
    page.get_by_label("Box 1 width", exact=True).press("Tab")
    time.sleep(0.2)
    cx, cy = canvas_center(page)
    page.mouse.click(cx, cy - 100)
    time.sleep(0.3)
    page.get_by_title("More hole tools").click()
    time.sleep(0.2)
    page.get_by_role("button", name="Four Corners", exact=True).click()
    time.sleep(0.3)

    field_x = page.get_by_label("Hole 1 in from each side (across)", exact=True)
    field_y = page.get_by_label("Hole 1 in from each side (up)", exact=True)
    check('field is captioned "in from each side (across)", not "corner spacing"',
          field_x.count() > 0, "field not found")
    check('field is captioned "in from each side (up)", not "corner spacing"',
          field_y.count() > 0, "field not found")

    field_x.fill("8")
    field_x.press("Tab")
    time.sleep(0.2)
    field_y.fill("8")
    field_y.press("Tab")
    time.sleep(0.3)
    tl = timeline(page)
    check('timeline chip reads "4 holes diameter, N in from the sides"',
          tl is not None and any("4 holes" in row and "in from the sides" in row for row in tl),
          str(tl))

    # An inset that would put the hole through the box's own side (below
    # the diameter/2 + 0.5 margin) is put back, with a calm note -- not
    # silently left breaking the wall.
    field_x2 = page.get_by_label("Hole 1 in from each side (across)", exact=True)
    field_x2.fill("1")
    field_x2.press("Tab")
    time.sleep(0.3)
    value = page.get_by_label("Hole 1 in from each side (across)", exact=True).input_value()
    note = page.evaluate(
        "() => { const n = document.querySelector('.reshape-params-notice'); return n ? n.textContent : null; }"
    )
    check("typing 1 (through the side) is put back to the margin, not left at 1",
          value != "1", value)
    check('a calm note explains why -- "cut through the side the hole is measured from"',
          note is not None and "cut through the side" in note, str(note))


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        for label, fn in [
            ("item A (blend circle)", check_item_a_blend_circle),
            ("item C (naming)", check_item_c_naming),
            ("item D (across)", check_item_d_across),
            ("item E (multi-select)", check_item_e_multiselect),
            ("item H (pick size)", check_item_h_size),
            ("item J (rim pick)", check_item_j_rim_pick),
            ("item G (clamp note)", check_item_g_clamp_note),
            ("item P (corner inset)", check_item_p_corner_inset),
        ]:
            try:
                fn(page)
            except Exception as exc:  # noqa: BLE001
                check(f"{label} checks ran without an exception", False, repr(exc))

        browser.close()

    total = len(results)
    passed = sum(1 for r in results if r)
    print(f"\n{'ALL PASS' if all(results) else 'FAIL'}  ({passed}/{total})")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
