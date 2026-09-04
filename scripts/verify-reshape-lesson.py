"""SPEC-A1 verification: reSHape inside the sandbox and inside a lesson.

Playwright, headless Chromium, 1440x900, against http://localhost:3002.
Prints one PASS/FAIL/SKIP line per check and exits non-zero on any FAIL.
A SKIP (the probe lesson not existing yet) counts as a failure to report,
per the spec -- it just isn't a fresh bug in this component.
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
LESSON_PATH = "/lesson/8-1-2-lab-your-first-box/"

results = []


def check(name, ok, detail=""):
    tag = "PASS" if ok else "FAIL"
    results.append(ok)
    print(f"{tag}  {name}" + (f" -- {detail}" if detail and not ok else ""))


def skip(name, detail=""):
    results.append(False)
    print(f"SKIP  {name}" + (f" -- {detail}" if detail else ""))


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("console", lambda m: None)

        # ---- 1: /sandbox/ reshape ------------------------------------
        page.goto(f"{BASE}/sandbox/", wait_until="load")
        try:
            page.get_by_role("button", name="reSHape", exact=True).click(timeout=5000)
        except Exception as e:
            check("sandbox: reSHape tab is clickable", False, str(e))
            browser.close()
            sys.exit(1)
        check("sandbox: reSHape tab is clickable", True)

        try:
            page.get_by_role("button", name="Box", exact=True).click(timeout=8000)
        except Exception as e:
            check("sandbox: Box tool is clickable", False, str(e))
        else:
            check("sandbox: Box tool is clickable", True)

        page.wait_for_timeout(600)
        dims_visible = page.locator(".reshape-pane-params").count() > 0
        check("sandbox: Dimensions panel appears after pressing Box", dims_visible)

        try:
            page.get_by_role("button", name="Code", exact=True).click(timeout=5000)
        except Exception as e:
            check("sandbox: Code tab is clickable", False, str(e))
        else:
            check("sandbox: Code tab is clickable", True)
        page.wait_for_timeout(500)
        code_text = page.evaluate(
            "() => document.querySelector('.cm-content')?.innerText || ''"
        )
        check("sandbox: switching to Code shows 'box(' in the script", "box(" in code_text, code_text[:200])

        # ---- 2: the lesson ---------------------------------------------
        resp = page.goto(f"{BASE}{LESSON_PATH}", wait_until="load")
        if resp is None or resp.status == 404:
            skip("lesson: page exists (8-1-2-lab-your-first-box not added yet)")
            skip("lesson: Build toolbar renders")
            skip("lesson: no legacy /reshape/runner.html iframe")
            skip("lesson: a script-runner.html iframe is present")
            skip("lesson: pressing Box writes box( into script.js")
            skip("lesson: reload keeps the model (reshape-doc rehydrated)")
        else:
            check("lesson: page exists", True)

            # ReshapeStudio is a next/dynamic(ssr:false) import -- give the
            # client-side chunk a moment to load before snapshotting the DOM.
            try:
                page.wait_for_selector(".reshape-studio-toolbar", timeout=10000)
                toolbar_ok = True
            except Exception:
                toolbar_ok = False
            check("lesson: Build toolbar renders", toolbar_ok)

            legacy_iframe = page.locator('iframe[src*="/reshape/runner.html"]').count()
            check("lesson: no legacy /reshape/runner.html iframe present", legacy_iframe == 0,
                  f"found {legacy_iframe}")

            script_runner_iframe = page.locator('iframe[src*="/reshape/script-runner.html"]').count()
            check("lesson: a script-runner.html iframe is present", script_runner_iframe > 0)

            try:
                page.get_by_role("button", name="Box", exact=True).click(timeout=8000)
                page.wait_for_timeout(800)
            except Exception as e:
                check("lesson: Box tool is clickable", False, str(e))
            else:
                check("lesson: Box tool is clickable", True)

            # ReshapeStudio's own Build -> script.js regen is debounced up to
            # 300ms, and LessonWorkspace's autosave-to-localStorage effect
            # (the only persistence a reload actually reads back) debounces a
            # further 2000ms on top of that -- wait for both before checking.
            page.wait_for_timeout(2800)
            script_js = page.evaluate(
                """() => {
                    try {
                        const raw = localStorage.getItem('shCode:progress');
                        if (!raw) return null;
                        const all = JSON.parse(raw);
                        return all?.['8-1-2-lab-your-first-box']?.fileContents?.['script.js'] ?? null;
                    } catch (e) { return 'ERR:' + e.message; }
                }"""
            )
            has_box_call = bool(script_js) and "box(" in script_js
            check("lesson: pressing Box writes box( into the store's script.js", has_box_call,
                  str(script_js)[:200])

            page.reload(wait_until="load")
            page.wait_for_timeout(1500)
            triangles_or_timeline = page.evaluate(
                """() => {
                    const timeline = document.querySelector('#reshapeTimeline');
                    const hasBoxChip = !!timeline && /Box\\s*1/.test(timeline.innerText || '');
                    const canvas = document.querySelector('.reshape-pane-view canvas');
                    return { hasBoxChip, hasCanvas: !!canvas };
                }"""
            )
            check(
                "lesson: reload rebuilds the model from script.js",
                triangles_or_timeline.get("hasBoxChip") or triangles_or_timeline.get("hasCanvas"),
                str(triangles_or_timeline),
            )

        browser.close()

    if all(results):
        print(f"\nALL PASS ({len(results)} checks)")
        sys.exit(0)
    else:
        failed = len(results) - sum(results)
        print(f"\n{failed} check(s) failed or skipped out of {len(results)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
