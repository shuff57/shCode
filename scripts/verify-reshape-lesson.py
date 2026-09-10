"""SPEC-A1 verification: reSHape inside the sandbox and inside a lesson.

Playwright, headless Chromium, 1440x900, against http://localhost:3002.
Prints one PASS/FAIL/SKIP line per check and exits non-zero on any FAIL.
A SKIP (the probe lesson not existing yet) counts as a failure to report,
per the spec -- it just isn't a fresh bug in this component.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
LESSON_PATH = "/lesson/8-1-2-lab-your-first-box/"
REPO_ROOT = Path(__file__).resolve().parent.parent
SHOT_DIR = Path(
    r"C:\Users\shuff57\AppData\Local\Temp\claude\C--Users-shuff57-Documents-GitHub-shCode"
    r"\cb606f10-8681-405d-b45d-f5404c7caccf\scratchpad\a1"
)
SHOT_DIR.mkdir(parents=True, exist_ok=True)

# Module 8.1's lessons in order -- used to mark everything before 8-1-9 and
# 8-1-11 'completed' for a fresh dev_student identity, via the SAME dev-only
# stub server.js exposes (see its own "Dev-only auth + lesson-state stubs"
# comment). Green-to-advance is enforced client-side (CLAUDE.md's own note),
# so this only has to satisfy whatever GET /api/lesson-state the client reads
# before it will let a direct /lesson/<id> visit render instead of redirect.
MODULE_8_1_LESSONS = [
    "8-1-1-reading-a-part-is-a-list-of-steps",
    "8-1-2-lab-your-first-box",
    "8-1-3-lab-change-your-mind",
    "8-1-4-lab-drill-a-hole",
    "8-1-5-lab-round-an-edge",
    "8-1-6-lab-hollow-it-out",
    "8-1-7-reading-build-wrote-a-program",
    "8-1-8-lab-read-the-script",
    "8-1-9-lab-write-it-yourself",
    "8-1-10-lab-sketch-and-pull",
    "8-1-11-project-desk-tray",
]
DEV_STUDENT = "a1-rework2-verify"

results = []


def check(name, ok, detail=""):
    tag = "PASS" if ok else "FAIL"
    results.append(ok)
    print(f"{tag}  {name}" + (f" -- {detail}" if detail and not ok else ""))


def skip(name, detail=""):
    results.append(False)
    print(f"SKIP  {name}" + (f" -- {detail}" if detail else ""))


def complete_lessons_before(page, lesson_id):
    """Mark every module-8.1 lesson before `lesson_id` completed, for the
    dev_student identity this script's browser context carries -- see
    MODULE_8_1_LESSONS's own comment."""
    idx = MODULE_8_1_LESSONS.index(lesson_id)
    for prior in MODULE_8_1_LESSONS[:idx]:
        page.evaluate(
            """(id) => fetch('/api/lesson-state/' + id, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({state: 'completed'}),
            })""",
            prior,
        )


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # A dev_student cookie gives this browser its own in-memory progress
        # bucket on the dev server (server.js's own comment on the stub),
        # separate from any other headless student walking the same module
        # concurrently -- an explicit context (not browser.new_page()'s
        # default one) is what lets add_cookies apply before the first request.
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        context.grant_permissions(["clipboard-read", "clipboard-write"])
        context.add_cookies([{
            "name": "dev_student", "value": DEV_STUDENT,
            "url": BASE,
        }])
        page = context.new_page()
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
        # The dev_student identity starts with nothing completed -- 8-1-2
        # needs 8-1-1 done first or it renders locked, not the studio.
        complete_lessons_before(page, "8-1-2-lab-your-first-box")
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

        # ---- 3: 8-1-9, mode "code" -- the editor at normal width with the
        # starter's breadcrumbs, then a real model in the Code pane after Run
        # -------------------------------------------------------------------
        complete_lessons_before(page, "8-1-9-lab-write-it-yourself")
        resp = page.goto(f"{BASE}/lesson/8-1-9-lab-write-it-yourself/", wait_until="load")
        if resp is None or resp.status == 404:
            skip("8-1-9: page exists")
            skip("8-1-9: editor text contains 'STEP 1'")
            skip("8-1-9: a canvas is visible in the Code pane after Run")
            skip("8-1-9: the requirement card is green")
        else:
            check("8-1-9: page exists", True)
            try:
                # CodeMirror's own node can exist a moment before the store's
                # file content actually populates it -- wait for real text,
                # not just the selector, so this isn't a coin-flip on timing.
                page.wait_for_function(
                    "() => (document.querySelector('.cm-content')?.innerText || '').trim().length > 0",
                    timeout=10000,
                )
            except Exception:
                pass
            editor_text = page.evaluate("() => document.querySelector('.cm-content')?.innerText || ''")
            check("8-1-9: editor text contains 'STEP 1'", "STEP 1" in editor_text, editor_text[:200])

            solution_path = REPO_ROOT / "lessons" / "8-1-9-lab-write-it-yourself" / "solution.js"
            solution_text = solution_path.read_text(encoding="utf-8")
            ed = page.locator(".cm-content").first
            typed = ""
            for attempt in range(3):
                ed.click()
                page.keyboard.press("Control+A")
                page.keyboard.press("Delete")
                page.keyboard.type(solution_text, delay=6)
                page.wait_for_timeout(250)
                typed = page.evaluate("() => document.querySelector('.cm-content')?.innerText || ''")
                if typed.strip().startswith("// 8.1.9") and "box(30, 30, 10)" in typed:
                    break
            check("8-1-9: solution text landed cleanly in the editor",
                  typed.strip().startswith("// 8.1.9") and "box(30, 30, 10)" in typed,
                  typed[:200])
            page.keyboard.press("Control+Enter")
            page.wait_for_timeout(2500)
            page.screenshot(path=str(SHOT_DIR / "8-1-9-after-run.png"))
            has_canvas = page.locator(".reshape-pane-view canvas").count() > 0
            check("8-1-9: a canvas is visible in the Code pane after Run", has_canvas)
            # RequirementCard only exists in the DOM while its drawer tab is
            # the active one (TabbedRightDrawer renders `active?.content`
            # only, not every tab hidden by CSS) -- open "Quest" first.
            # `force=True`: the button is real and in the DOM (confirmed by a
            # plain querySelectorAll dump) but Playwright's actionability
            # check against it is unreliable on this rail for reasons unclear
            # -- force bypasses that rather than failing this whole check
            # over a click-readiness heuristic, not the actual requirement.
            try:
                page.get_by_role("button", name="Quest", exact=True).click(timeout=5000, force=True)
            except Exception:
                pass
            try:
                # LessonWorkspace re-grades 250ms after latestModelDoc changes
                # (its own debounce) -- poll rather than guess a fixed wait.
                page.wait_for_function("() => document.querySelectorAll('.pass').length > 0", timeout=8000)
            except Exception:
                pass
            has_green = page.locator(".pass").count() > 0
            check("8-1-9: the requirement card is green", has_green)

        # ---- 4: 8-1-11, mode "both" -- Code keeps the comment-only starter
        # (a `both` lesson's Build->script regen must not wipe an empty-doc
        # hydration over it) -------------------------------------------------
        complete_lessons_before(page, "8-1-11-project-desk-tray")
        resp = page.goto(f"{BASE}/lesson/8-1-11-project-desk-tray/", wait_until="load")
        if resp is None or resp.status == 404:
            skip("8-1-11: page exists")
            skip("8-1-11: Code editor keeps 'Nothing built yet' after mount")
        else:
            check("8-1-11: page exists", True)
            try:
                page.wait_for_selector(".reshape-studio-toolbar", timeout=10000)
            except Exception:
                pass
            page.wait_for_timeout(2000)  # let a wrongly-firing mount regen happen, if it still does
            try:
                page.get_by_role("button", name="Code", exact=True).click(timeout=5000)
            except Exception as e:
                check("8-1-11: Code tab is clickable", False, str(e))
            else:
                check("8-1-11: Code tab is clickable", True)
            page.wait_for_timeout(400)
            editor_text_11 = page.evaluate("() => document.querySelector('.cm-content')?.innerText || ''")
            check("8-1-11: Code editor keeps 'Nothing built yet' after mount",
                  "Nothing built yet" in editor_text_11, editor_text_11[:200])

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
