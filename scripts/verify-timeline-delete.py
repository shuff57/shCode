"""SPEC-3d-build item B / D4 verification: the toolbar Delete button.

Playwright, headless Chromium, 1440x900, against http://localhost:3002/sandbox/
in reSHape/Build mode. Prints one PASS/FAIL line per check and exits non-zero
on any FAIL.

(1) D4's exact repro: Box 1 with a Round 1 depending on it. Selecting Box 1
    and pressing the toolbar Delete must NOT remove anything immediately --
    an inline confirm appears first, named in the course's words ("Delete
    Box 1? Round 1 goes with it."), with Delete / Keep buttons. Keep leaves
    both features untouched. Pressing Delete again, then the confirm's own
    Delete button, removes both. Undo restores both.

(2) EXPLORE-2d.md's exact repro: a rectangle sketch with a pair rule (Edges
    1 and 2, cycled to "equal") set in the Rules panel. Pressing the
    toolbar Delete with that rule the last thing touched must remove ONLY
    the rule -- the sketch itself must still be on the timeline afterward,
    and the pair cell must read "no rule" again.
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
    # Every native window.confirm() (Clear model) auto-accepts -- this probe
    # exercises the toolbar Delete's OWN inline confirm, a completely
    # different, non-native mechanism (see item B's spec: the two are meant
    # to share one posture, not one implementation).
    page.on("dialog", lambda d: d.accept())
    time.sleep(0.3)


def click_vertical_edge(page, side):
    """Front view, left or right vertical silhouette edge of the default
    40x40x20 box -- the same coordinates verify-build-parity.py's edge-pick
    helper uses, re-derived by hand against a live session (explore-edge-
    pick2.py, kept only as this comment's own record, not committed)."""
    page.get_by_title("Look from the front").click()
    time.sleep(0.2)
    canvas = page.query_selector("canvas")
    box = canvas.bounding_box()
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2
    dx = -174 if side == "left" else 174
    page.mouse.click(cx + dx, cy + 60)
    time.sleep(0.2)


def check_delete_confirm(page):
    arm_build(page)
    page.get_by_title("Add a box").click()
    time.sleep(0.3)
    click_vertical_edge(page, "left")
    page.get_by_role("button", name="Round", exact=True).click()
    time.sleep(0.3)

    before = timeline(page)
    check("D4 setup: Box 1 and a dependent Round 1 both exist",
          before == ["1Box 1", "2Round 1"], str(before))

    # Select the EARLIER step (Box 1), the exact D4 scenario.
    chips = page.query_selector_all("ol li")
    chips[0].click()
    time.sleep(0.2)

    page.locator('[aria-label="Delete"]').click()
    time.sleep(0.3)
    confirm_text = page.evaluate(
        """() => {
            const el = document.querySelector('.model-confirm-delete, .model-confirm-delete-timeline');
            return el ? el.textContent : null;
        }"""
    )
    check("a confirm appears, naming what goes, before anything is deleted",
          confirm_text is not None and "Box 1" in confirm_text and "Round 1" in confirm_text
          and "Delete" in confirm_text and "Keep" in confirm_text,
          str(confirm_text))
    check("nothing is removed yet -- the confirm is the ONLY effect of the click so far",
          timeline(page) == before, str(timeline(page)))

    # Keep leaves both untouched.
    page.get_by_role("button", name="Keep", exact=True).click()
    time.sleep(0.3)
    check("Keep leaves both Box 1 and Round 1 in place", timeline(page) == before, str(timeline(page)))
    check("the confirm itself is gone after Keep",
          page.evaluate("() => !document.querySelector('.model-confirm-delete, .model-confirm-delete-timeline')"))

    # Delete, confirmed, removes both.
    chips = page.query_selector_all("ol li")
    chips[0].click()
    time.sleep(0.2)
    page.locator('[aria-label="Delete"]').click()
    time.sleep(0.3)
    page.locator(".model-confirm-delete-go").click()
    time.sleep(0.3)
    after_delete = timeline(page)
    check("confirmed Delete removes BOTH Box 1 and Round 1",
          after_delete is not None and len(after_delete) == 1 and "Nothing here yet" in after_delete[0],
          str(after_delete))
    after_note = page.evaluate(
        "() => { const n = document.querySelector('.model-note, .model-note-timeline'); return n ? n.textContent : null; }"
    )
    check('the after-state says what happened -- "Box 1 and Round 1 removed. Undo puts them back."',
          after_note is not None and "Box 1" in after_note and "Round 1" in after_note
          and "removed" in after_note and "Undo" in after_note,
          str(after_note))

    # Undo restores both.
    page.get_by_role("button", name="Undo", exact=True).click()
    time.sleep(0.3)
    check("Undo restores both Box 1 and Round 1", timeline(page) == before, str(timeline(page)))


def check_rule_focused_delete(page):
    arm_build(page)
    page.get_by_title("Draw a flat outline to pull or spin into a solid", exact=True).click()
    time.sleep(0.2)
    canvas = page.query_selector("canvas")
    box = canvas.bounding_box()
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2
    page.mouse.click(cx - 60, cy + 40)
    time.sleep(0.1)
    page.mouse.click(cx + 60, cy - 40)
    time.sleep(0.3)

    sketch_before = timeline(page)
    check("setup: one rectangle sketch on the timeline",
          sketch_before is not None and len(sketch_before) == 1 and "Sketch 1" in sketch_before[0],
          str(sketch_before))

    # Re-select the sketch chip so the Rules panel renders (drawing tool
    # finishing does not always leave the new sketch selected).
    chips = page.query_selector_all("ol li")
    if chips:
        chips[0].click()
        time.sleep(0.3)

    cell = page.locator('[title^="Edges 1 and 2"]').first
    check("the Rules panel's Edges 1 and 2 pair cell is present", cell.count() > 0)

    # Item M: the cell opens a picker rather than cycling on click -- open
    # it, then pick "Equal" directly (the exact EXPLORE-2d.md repro, just
    # via the picker instead of the retired click-to-cycle button).
    cell.evaluate("el => el.click()")
    time.sleep(0.2)
    option = page.locator('.sk-pair-picker[aria-label="Edges 1 and 2"]').get_by_role("option", name="Equal", exact=True)
    reached = option.count() > 0
    if reached:
        option.first.evaluate("el => el.click()")
        time.sleep(0.2)
        reached = (cell.get_attribute("aria-label") or "").endswith(": equal")
    check("Edges 1 and 2 is set to 'equal' via the pair picker", reached, cell.get_attribute("aria-label") or "")

    # The rule just touched is a rule row "focused" per item B -- press the
    # toolbar Delete now.
    page.locator('[aria-label="Delete"]').click()
    time.sleep(0.3)

    check("the sketch itself is still on the timeline -- Delete did not remove it",
          timeline(page) == sketch_before, str(timeline(page)))
    after_state = cell.get_attribute("aria-label") or ""
    check("...and the rule Delete DID act on is gone (back to 'no rule')",
          after_state.endswith(": no rule"), after_state)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        try:
            check_delete_confirm(page)
        except Exception as exc:  # noqa: BLE001
            check("delete-confirm checks ran without an exception", False, repr(exc))

        try:
            check_rule_focused_delete(page)
        except Exception as exc:  # noqa: BLE001
            check("rule-focused-delete checks ran without an exception", False, repr(exc))

        browser.close()

    total = len(results)
    passed = sum(1 for r in results if r)
    print(f"\n{'ALL PASS' if all(results) else 'FAIL'}  ({passed}/{total})")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
