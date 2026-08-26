"""Does an infinite loop in a reading's editable live block freeze the tab?

NOT part of `npm test` -- it needs a running server and a logged-in student, and
the suite is hermetic. Run it by hand after touching LiveCodeBlock:

    npm run build
    npx wrangler pages dev out --port 8788          # in another shell
    # sign up a student (any email), then log in and keep the cookie
    POST /api/auth/signup  {"email": "...", "password": "..."}
    # 1.1.2 is gated behind 1.1.1, so mark that complete first:
    #   POST /api/lesson-state/1-1-1-slides  {"state":"completed"}   (with the session cookie)
    python scripts/verify-livecodeblock.py

Measured non-degenerate: with the pre-Worker LiveCodeBlock in place, the first
check fails with a Playwright TimeoutError on the Run click -- the tab really is
frozen -- and the rest never get to run.
"""

import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8788"
URL = BASE + "/lesson/1-1-2-reading-console-log/"
EMAIL = "lcb.verify@shcode.local"
PASSWORD = "VerifyPass123!"
EVIL = "while (true) {}"

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

    # Log in through the API and hand the session cookie to the browser.
    r = ctx.request.post("/api/auth/login", data={"email": EMAIL, "password": PASSWORD})
    if not r.ok:
        print("login failed: %s %s" % (r.status, r.text()[:200]))
        sys.exit(1)

    page = ctx.new_page()
    page.goto(URL, wait_until="domcontentloaded")
    try:
        page.wait_for_selector(".livecodeblock", timeout=30000)
    except Exception:
        print("no .livecodeblock on %s" % URL)
        print("buttons: %s" % [t.strip()[:30] for t in page.locator("button").all_inner_texts()][:12])
        sys.exit(1)

    block = page.locator(".livecodeblock").first
    editor = block.locator(".cm-content").first
    editor.click()
    page.keyboard.press("Control+A")
    page.keyboard.type(EVIL)

    run = block.locator("button.btn-run")

    # This is the old failure mode: the click never completed.
    try:
        run.click(timeout=8000)
        check("Run click returns (tab not frozen)", True)
    except Exception as e:
        check("Run click returns (tab not frozen)", False, type(e).__name__)
        browser.close()
        sys.exit(1)

    # Kill timer is 3s. Confirm the run actually ends rather than spinning.
    try:
        page.wait_for_function(
            "() => { const b = document.querySelector('.livecodeblock button.btn-run');"
            " return b && !b.disabled; }",
            timeout=15000,
        )
        check("run ends on its own (kill timer fired)", True)
    except Exception:
        check("run ends on its own (kill timer fired)", False, "Run still disabled after 15s")

    body = block.inner_text().lower()
    check("student is told what happened", "still running" in body, block.inner_text()[-140:].replace("\n", " "))

    # The page must still be interactive. This was dead before.
    try:
        block.locator("button.btn-secondary").click(timeout=5000)
        check("Reset still responds after a runaway loop", True)
    except Exception as e:
        check("Reset still responds after a runaway loop", False, type(e).__name__)

    # And ordinary code must still work -- a fix that kills everything is no fix.
    editor.click()
    page.keyboard.press("Control+A")
    page.keyboard.type('console.log("still alive " + (6 * 7));')
    run.click(timeout=8000)
    try:
        page.wait_for_function(
            "() => document.querySelector('.livecodeblock').innerText.includes('still alive 42')",
            timeout=15000,
        )
        check("ordinary code still runs and prints", True)
    except Exception:
        check("ordinary code still runs and prints", False, block.inner_text()[-140:].replace("\n", " "))

    browser.close()

if failures:
    print("\nverify_livecodeblock: %d failure(s)" % len(failures))
    sys.exit(1)
print("\nverify_livecodeblock: all checks passed")
