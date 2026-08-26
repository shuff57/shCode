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
RELABEL = "RELABELLED FOR THE STALE CHECK"

failures = []


def check(name, ok, detail=""):
    # Detail prints on FAIL only. Printing it next to a PASS reads as evidence
    # for the pass when it is just a static label, which is exactly how a
    # false pass slipped through here once.
    print(("  PASS " if ok else "  FAIL ") + name + (("" if ok else (" -- " + detail)) if detail else ""))
    if not ok:
        failures.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(base_url=BASE)

    r = ctx.request.post("/api/auth/login", data={"email": EMAIL, "password": PASSWORD})
    if not r.ok:
        print("login failed: %s %s" % (r.status, r.text()[:200]))
        sys.exit(1)

    # Start from a known state, and put it back afterwards. Without this the
    # run is not repeatable: the stale case below relabels the 1.5.30 chart, so
    # a second run seeds FROM the relabelled chart and the stale check can
    # never fire. A check that only works the first time is not a check.
    import json
    snap = ctx.request.get("/api/lesson-drafts/1-5-30-a1-5-1-flowchart-gate")
    original_chart = snap.json().get("response") if snap.ok else None
    if not original_chart:
        print("no 1.5.30 draft for %s -- nothing to carry into part two" % EMAIL)
        sys.exit(1)
    # Refuse to run against a chart a previous run already relabelled. That
    # exact contamination made this file report two failures against working
    # code: every run seeded FROM the relabelled chart, so the "comments were
    # not rewritten" check was comparing the residue of the last run to itself.
    # A dirty fixture cannot fail honestly, so stop rather than measure it.
    if RELABEL in original_chart:
        print("FIXTURE DIRTY: %s's 1.5.30 chart still contains %r from an earlier"
              " run. Restore it from a clean chart before re-running." % (EMAIL, RELABEL))
        sys.exit(1)
    ctx.request.delete("/api/lesson-drafts/%s" % LESSON)

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

    # Revise the chart AFTER part two has already seeded. The comments are the
    # student's now -- they may have built code around them -- so they are left
    # alone, and the page has to say the two no longer agree. Without the
    # notice the chart and the comments silently contradict each other, under a
    # Step 4 that tells the student to compare them.
    d = json.loads(original_chart)
    if True:
        renamed = False
        for node in d["nodes"]:
            if node["shape"] == "process":
                node["label"] = RELABEL
                renamed = True
                break
        check("found a task shape to relabel", renamed)
        ctx.request.post("/api/lesson-drafts/1-5-30-a1-5-1-flowchart-gate",
                         data={"response": json.dumps(d)})

        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".cm-content", timeout=30000)
        page.wait_for_timeout(5000)
        body2 = page.inner_text("body")
        editor2 = page.locator(".cm-content").first.inner_text()

        check("the chart shown is the revised one",
              RELABEL in body2)
        check("the student's existing comments are NOT rewritten",
              RELABEL not in editor2)
        check("the page says the chart and the comments disagree",
              "changed this chart after starting Part 2" in body2,
              "stale notice missing")

    # Put the chart back so the next run starts clean.
    ctx.request.post("/api/lesson-drafts/1-5-30-a1-5-1-flowchart-gate",
                     data={"response": original_chart})
    ctx.request.delete("/api/lesson-drafts/%s" % LESSON)
    browser.close()

if failures:
    print("\nverify_planfrom: %d failure(s)" % len(failures))
    sys.exit(1)
print("\nverify_planfrom: all checks passed")
