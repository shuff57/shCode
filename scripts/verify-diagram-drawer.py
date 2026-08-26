"""Can a teacher see what a student actually drew on a diagram assignment?

Before: the drawer showed a date, a score, and a blank " / pts" line. No list of
which structural checks ran, and no way to see the chart at all -- the DiagramDoc
was in lesson_submissions.response, which the per-student route never selected.

Uses the REAL submission student-1-5's run wrote for 1-5-28 via the actual
DiagramAssignmentView, not a hand-made row.
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8788"
CLASS_ID = "f0feda62-d8d4-4328-a87c-56ccf58abbce"
STUDENT = "student15test@example.com"
LESSON = "1-5-28-chart-the-even-or-odd-test"
EMAIL = "dv.teacher@shcode.local"
PASSWORD = "VerifyPass123!"

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

    # The API must carry the response now -- that was the missing half.
    detail = ctx.request.get("/api/classes/%s/students/%s" % (CLASS_ID, STUDENT))
    if not detail.ok:
        print("detail fetch failed: %s %s" % (detail.status, detail.text()[:200]))
        sys.exit(1)
    subs = detail.json().get("latestSubmissions", {})
    entry = subs.get(LESSON)
    check("route returns the diagram submission", entry is not None)
    if entry:
        check("route now includes the student's response", bool(entry.get("response")),
              "keys: " + ",".join(sorted(entry.keys())))
        check("response is a DiagramDoc", '"nodes"' in (entry.get("response") or ""))

    page = ctx.new_page()
    page.goto("%s/teacher?class=%s" % (BASE, CLASS_ID), wait_until="domcontentloaded")
    page.wait_for_selector("text=%s" % STUDENT, timeout=30000)

    # Roster is listed in order; this student is first. A has_text filter over
    # divs matches an ancestor holding BOTH rows and opens the wrong student.
    page.locator("button", has_text="Open").first.click(timeout=10000)
    page.wait_for_timeout(3000)

    # The drawer is the fixed-position panel. Nested divs make CSS/text
    # locators ambiguous here (a has_text filter matches an ancestor holding
    # every row), so find the panel and the right row in JS instead.
    def drawer_text():
        return page.evaluate("""() => {
          const d = [...document.querySelectorAll('div')]
            .find(e => getComputedStyle(e).position === 'fixed'
                    && (e.innerText || '').includes('Student Progress'));
          return d ? d.innerText : '';
        }""")

    check("drawer opened for the right student", STUDENT in drawer_text(),
          drawer_text()[:70].replace("\n", " "))

    clicked = page.evaluate("""() => {
      const rows = [...document.querySelectorAll('div')].filter(e =>
        (e.innerText || '').includes('Chart the Even-or-Odd Test'));
      // innermost row carrying the title AND its own View submission button
      for (const r of rows.reverse()) {
        const b = [...r.querySelectorAll('button')]
          .find(x => (x.innerText || '').includes('View submission'));
        if (b) { b.click(); return true; }
      }
      return false;
    }""")
    check("found the 1.5.28 submission to expand", clicked)
    page.wait_for_timeout(1500)

    body = drawer_text()

    check("structural checks are listed", "Exactly one Start oval" in body,
          "looked for a check title")
    check("pass/fail shown per check", "9 of 9 checks passed" in body,
          " / ".join(ln for ln in body.split("\n") if "check" in ln.lower())[:120])
    check("the chart itself is rendered", "flowchart TD" in body,
          "looked for the Mermaid projection")
    check("labelled as a chart, not prose", "Their chart" in body)
    check("raw DiagramDoc JSON is NOT shown", '"version":1' not in body and '"shape"' not in body)

    browser.close()

if failures:
    print("\nverify_diagram_drawer: %d failure(s)" % len(failures))
    sys.exit(1)
print("\nverify_diagram_drawer: all checks passed")
