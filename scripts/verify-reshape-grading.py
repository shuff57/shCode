# Lead-owned check: a Build-only reSHape lesson grades from the live model.
# Presses Box on 8.1.2 as a fresh student and expects the model requirement
# to turn green, Submit to enable, and a reload to keep it green.
# Needs the dev server on :3002 (DEV_ROLE=student), Playwright (Python).
import re, os, sys, time
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".gauntlet", "reshape-grading-probe")
os.makedirs(OUT, exist_ok=True)
fails = 0
def check(name, cond, detail=""):
    global fails
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond else "\n      " + str(detail)[:300]))
    if not cond: fails += 1
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_cookies([{"name": "dev_student", "value": "probe-grade-" + str(int(time.time())), "domain": "localhost", "path": "/"}])
    page = ctx.new_page(); page.on("dialog", lambda d: d.accept())
    # 8.1.1 must be complete for this identity or 8.1.2 is sequence-locked.
    r = ctx.request.post("http://localhost:3002/api/lesson-state/8-1-1-reading-a-part-is-a-list-of-steps", data={"state": "completed", "score": 1})
    print("      8.1.1 marked complete:", r.status)
    page.goto("http://localhost:3002/assignment/8-1-2-lab-your-first-box/", wait_until="load", timeout=120000)
    try:
        page.locator(".model-timeline, .reshape-pane-view").first.wait_for(timeout=60000)
    except Exception:
        page.screenshot(path=os.path.join(OUT, "no-studio.png"), full_page=True)
        print("      page text:", page.locator("body").inner_text()[:400].replace("\n", " | "))
        raise
    page.wait_for_timeout(1500)
    cards = page.locator(".requirement-card, [class*=requirement]")
    body0 = page.locator("body").inner_text()
    check("0 lesson page shows the Build toolbar", page.get_by_role("button", name=re.compile(r"^Box$", re.I)).count() > 0)
    red0 = page.locator(".fail").count(); green0 = page.locator(".pass").count()
    print("      before: pass cards", green0, "fail cards", red0)
    submit = page.get_by_role("button", name=re.compile(r"Submit", re.I)).first
    check("1 Submit disabled before building", submit.is_disabled())
    page.get_by_role("button", name=re.compile(r"^Box$", re.I)).first.click()
    page.wait_for_timeout(3500)
    chips = page.locator(".model-timeline .model-row .model-name").all_inner_texts()
    check("2 Box 1 is in the timeline", "Box 1" in chips, chips)
    ok = False
    for _ in range(20):
        if page.locator(".pass").count() >= 1 and not submit.is_disabled(): ok = True; break
        page.wait_for_timeout(500)
    print("      after: pass cards", page.locator(".pass").count(), "fail cards", page.locator(".fail").count(), "submit disabled", submit.is_disabled())
    check("3 the model requirement turns green and Submit enables after Box", ok)
    page.screenshot(path=os.path.join(OUT, "after-box.png"), full_page=True)
    # reload keeps it
    page.reload(wait_until="load"); page.locator(".model-timeline, .reshape-pane-view").first.wait_for(timeout=60000)
    ok2 = False
    for _ in range(30):
        if page.locator(".pass").count() >= 1 and not submit.is_disabled(): ok2 = True; break
        page.wait_for_timeout(500)
    check("4 after reload the requirement is green again (doc rebuilt from script.js)", ok2)
    b.close()
print(f"{'ALL PASS' if fails == 0 else str(fails) + ' FAIL'}")
sys.exit(1 if fails else 0)
