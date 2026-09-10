"""SPEC-d2-rules-in-script.md verification: a rule added in the Rules panel
must survive Build -> Code -> Run -> Build, not be dropped the moment the
Code side's script is Run (the D2 evidence's own reproduction: an `equal`
rule added in Build vanished from the panel after Run, with the exported
script's own comment admitting it -- "6 rules set in Build are not written
here").

Playwright, headless Chromium, against http://localhost:3002/sandbox/ in
reSHape/Build mode. Prints one PASS/FAIL line per check and exits non-zero on
any FAIL.

Steps:
  1. Arm the default Sketch (a 40x25 quad, all four edges' across/up rules
     already on -- same starting point scripts/verify-sketch-rules.py uses).
  2. Pin corner 1.
  3. Add an `equal` rule between edges 1 and 2 in the Rules panel.
     (Pin BEFORE equal, not the other way around: cycling edges 1-2 to
     equal FIRST and pinning corner 1 SECOND was measured, live, to leave
     the pin off the settled constraint list -- an order-dependent quirk in
     addConstraintSettling()/the live Rules panel, outside this spec's
     scope (lib/sketch-solve.ts and components/model/*.tsx are another
     builder's files this round) and unrelated to what this probe exists to
     check: the round trip through Code, not the settle order.)
  4. Switch to Code: script.js must contain `equal(` and `pin(`, and must
     NOT contain the word "dropped" (the old behaviour's own comment).
  5. Press Run, forcing the model to rebuild FROM the script.
  6. Switch back to Build: the Rules panel must still show both rules.

Rules-panel controls are clicked via `el.click()` in the page's own JS
(locator.evaluate), not a plain Playwright click -- see
scripts/verify-sketch-rules.py's own module docstring: an overlapping
`model-editor` div intercepts a real on-screen click there, so a plain
(or force=True) click silently does nothing.
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


def js_click(locator):
    """See the module docstring: a real Playwright click resolves to
    whatever DOM node is topmost at that pixel, and the Rules panel sits
    under an overlapping `model-editor` div that silently swallows it."""
    locator.evaluate("el => el.click()")


def arm_sketch(page):
    """Open a fresh reSHape/Build sandbox and place one default sketch,
    selected -- a 40x25 quad with all four edges' across/up rules already
    on (startSketch() in ModelEditor.tsx)."""
    page.goto(f"{BASE}/sandbox/")
    page.evaluate("() => localStorage.setItem('shCode:sandbox-mode', 'reshape')")
    page.reload()
    page.wait_for_selector("canvas", timeout=15000)
    page.get_by_role("button", name="Sketch", exact=True).click()
    page.wait_for_selector("#reshapeRules", timeout=10000)
    page.wait_for_selector('button[aria-label="Edge 1 across"]', timeout=10000)


def read_pair_state(page, lo, hi):
    time.sleep(0.15)
    label = page.locator(f'[title^="Edges {lo} and {hi}"]').first.get_attribute("aria-label")
    return label or ""


def cycle_pair_to(page, lo, hi, target):
    cell = page.locator(f'[title^="Edges {lo} and {hi}"]').first
    for _ in range(5):
        state = read_pair_state(page, lo, hi)
        if state.endswith(f": {target}"):
            return True
        js_click(cell)
    return read_pair_state(page, lo, hi).endswith(f": {target}")


def read_script_text(page):
    page.wait_for_function(
        "() => (document.querySelector('.cm-content')?.innerText || '').trim().length > 0",
        timeout=10000,
    )
    return page.evaluate("() => document.querySelector('.cm-content')?.innerText || ''")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        try:
            arm_sketch(page)

            pin1 = page.locator('[aria-label="Pin corner 1"]')
            check("the 'Pin corner 1' button exists", pin1.count() > 0, str(pin1.count()))
            js_click(pin1.first)
            time.sleep(0.3)
            pin_on_before_equal = pin1.first.get_attribute("aria-pressed")
            check("corner 1 is pinned", pin_on_before_equal == "true", str(pin_on_before_equal))

            cycled = cycle_pair_to(page, 1, 2, "equal")
            check("the pair-rule cell for edges 1 and 2 reaches 'equal'", cycled)

            pin_on_before_run = pin1.first.get_attribute("aria-pressed")
            check("corner 1 is still pinned after adding the equal rule",
                  pin_on_before_run == "true", str(pin_on_before_run))

            # ReshapeStudio's own Build -> script.js regen is debounced 300ms
            # AND cancelled outright if `build` flips (switching to Code) before
            # the timer fires -- its useEffect cleanup clears the pending
            # setTimeout, and the re-invocation with build=false is a no-op.
            # Switching too soon after the last rule click shows a STALE
            # script.js with nothing this probe just did. Measured live.
            time.sleep(0.8)

            page.get_by_role("button", name="Code", exact=True).click(timeout=5000)
            script_before_run = read_script_text(page)
            check("script.js names the equal rule (equal()) before Run",
                  "equal(" in script_before_run, script_before_run)
            check("script.js names the pin (pin()) before Run",
                  "pin(" in script_before_run, script_before_run)
            check("script.js does not say a rule was dropped",
                  "dropped" not in script_before_run, script_before_run)

            page.locator("button.btn-run").click(timeout=5000)
            time.sleep(1.8)

            page.get_by_role("button", name="Build", exact=True).click(timeout=5000)
            page.wait_for_selector("#reshapeRules", timeout=10000)
            time.sleep(0.3)

            pair_after_run = read_pair_state(page, 1, 2)
            check("after Run, the Rules panel still shows edges 1 and 2 as equal",
                  pair_after_run.endswith(": equal"), pair_after_run)

            pin_after_run = page.locator('[aria-label="Pin corner 1"]').first.get_attribute("aria-pressed")
            check("after Run, corner 1 is still pinned",
                  pin_after_run == "true", str(pin_after_run))

        except Exception as exc:  # noqa: BLE001 -- report, don't crash the run
            check("the round trip ran without an exception", False, repr(exc))

        browser.close()

    total = len(results)
    passed = sum(1 for r in results if r)
    print(f"\n{'ALL PASS' if all(results) else 'FAIL'}  ({passed}/{total})")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
