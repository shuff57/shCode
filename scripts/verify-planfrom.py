"""Does 1.5.31 actually show the student the chart they drew in 1.5.30?

A1.5.1 is split: 1.5.30 draws the flowchart, 1.5.31 implements it. Part 2's
starter was the same generic scaffold for every student, with no sight of their
own chart -- while its Step 4 told them to read code and chart side by side.

The point of this check is that `planFrom` REACHES A STUDENT. This repo has a
history of authored lesson.json fields that render nowhere (`steps`,
`aiGrader.prompt` both sat unused for months), so compiling proves nothing.

Every assertion here must be one the UNSEEDED starter fails. An earlier version
of this file passed while the feature was broken, because its assertions
("STEP 1" in editor, editor.count("// ") > 8) were already true of the bare
starter. Do not reintroduce a fallback clause into a check.

NOT part of `npm test`: needs a server, a logged-in student, and that student's
own 1.5.30 draft. Setup:

    npm run build
    npx wrangler pages dev out --port 8788            # another shell
    # sign up a student, give them a 1.5.30 draft (a DiagramDoc) and enough
    # lesson_state rows that green-to-advance unlocks 1.5.31
    python scripts/verify-planfrom.py
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8788"
EMAIL = "plan.verify@shcode.local"
PASSWORD = "PlanVerify123!"
LESSON = "1-5-31-a1-5-1-implement-your-plan"
MARKER = "--- your chart from 1.5.30 ---"

failures = []


def check(name, ok, detail=""):
    print(("  PASS " if ok else "  FAIL ") + name + ((" -- " + detail) if detail else ""))
    if not ok:
        failures.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(base_url=BASE)

    r = ctx.request.post("/api/auth/login", data={"email": EMAIL, "password": PASSWORD})
    if not r.ok:
        print("login failed: %s %s" % (r.status, r.text()[:200]))
        sys.exit(1)

    page = ctx.new_page()
    page.goto("%s/lesson/%s/" % (BASE, LESSON), wait_until="domcontentloaded")
    page.wait_for_selector(".cm-content", timeout=30000)
    page.wait_for_timeout(5000)

    body = page.inner_text("body")
    editor = page.locator(".cm-content").first.inner_text()

    check("the chart from 1.5.30 is captioned on the page",
          "Your chart from 1.5.30" in body)
    check("the chart is actually drawn, not an empty frame",
          len(page.query_selector_all(".react-flow__node")) >= 4,
          "%d nodes" % len(page.query_selector_all(".react-flow__node")))

    check("the starter was seeded with the student's own plan", MARKER in editor,
          editor[:100].replace("\n", " / "))
    check("the decision became IF / ELSE / END IF",
          "// IF" in editor and "// ELSE" in editor and "// END IF" in editor)
    check("the seed sits under STEP 1, not appended at the end",
          MARKER in editor and editor.index(MARKER) < editor.index("STEP 2"))

    # Seeding must never destroy work.
    page.locator(".cm-content").first.click()
    page.keyboard.press("Control+End")
    page.keyboard.type("\nlet pagesRequested = 25; // mine\n")
    page.wait_for_timeout(2500)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".cm-content", timeout=30000)
    page.wait_for_timeout(5000)
    # CodeMirror virtualizes: inner_text returns only the lines currently
    # rendered, so the end of the document has to be scrolled into view before
    # it can be read. Without this the check fails on a document that is fine.
    page.locator(".cm-content").first.click()
    page.keyboard.press("Control+End")
    page.wait_for_timeout(1000)
    after = page.locator(".cm-content").first.inner_text()

    check("a student's own edit survives a reload", "mine" in after,
          after[-90:].replace("\n", " / "))
    check("the scaffold is not duplicated on reload", after.count(MARKER) == 1,
          "count=%d" % after.count(MARKER))

    browser.close()

if failures:
    print("\nverify_planfrom: %d failure(s)" % len(failures))
    sys.exit(1)
print("\nverify_planfrom: all checks passed")
