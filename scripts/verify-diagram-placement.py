"""Palette shapes no longer stack: click-add shapes in the real editor, read the
node boxes, assert no overlaps and all in view; reload and confirm positions kept.

Needs the student dev server (DEV_ROLE=student npm run dev) on :3002.
Usage: python3 scripts/verify-diagram-placement.py [shot_dir]
"""
import os, sys, json, urllib.request
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
LESSON = "3-2-8-chart-parameter-trace"
SHOTS = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
fails = []


def check(name, ok, detail=""):
    print(("  PASS " if ok else "  FAIL ") + name + ("" if ok else " -- " + detail))
    if not ok:
        fails.append(name)


def unlock():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lessons")
    for l in sorted(os.listdir(root)):
        if l.startswith("3-"):
            req = urllib.request.Request(BASE + "/api/lesson-state/" + l, data=b'{"state":"completed"}',
                                         method="POST", headers={"Cookie": "dev_student=place", "content-type": "application/json"})
            urllib.request.urlopen(req).read()
    try:  # start each run from the starter chart, not a draft an earlier run saved
        urllib.request.urlopen(urllib.request.Request(BASE + "/api/lesson-drafts/" + LESSON, method="DELETE",
                                                      headers={"Cookie": "dev_student=place"})).read()
    except Exception:
        pass
    # leave the target lesson open but not completed
    urllib.request.urlopen(urllib.request.Request(BASE + "/api/lesson-state/" + LESSON, method="DELETE",
                                                  headers={"Cookie": "dev_student=place"})).read()


def boxes(pg):
    return pg.evaluate("""() => {
      const fl = document.querySelector('.react-flow').getBoundingClientRect();
      return { view: [fl.left, fl.top, fl.right, fl.bottom],
        nodes: [...document.querySelectorAll('.react-flow__node')].map(n => {
          const r = n.getBoundingClientRect(); return [n.getAttribute('data-id'), r.left, r.top, r.right, r.bottom]; }) };
    }""")


def pairs_overlap(ns):
    bad = []
    for i in range(len(ns)):
        for j in range(i + 1, len(ns)):
            a, b = ns[i], ns[j]
            if a[1] < b[3] and a[3] > b[1] and a[2] < b[4] and a[4] > b[2]:
                bad.append((a[0], b[0]))
    return bad


def run(width, height, tag, p):
    unlock()
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": width, "height": height})
    ctx.add_cookies([{"name": "dev_student", "value": "place", "url": BASE}])
    pg = ctx.new_page()
    pg.goto("%s/lesson/%s/" % (BASE, LESSON), wait_until="domcontentloaded")
    pg.wait_for_selector(".react-flow__renderer", timeout=60000)
    pg.wait_for_timeout(1500)
    before = len(pg.query_selector_all(".react-flow__node"))
    # Start from a blank canvas so the count is exact.
    seq = ["Process"] * 5 + ["Decision", "Terminal", "Input / Output", "Process", "Decision"]
    palette = pg.locator("button[draggable=true]")
    names = [palette.nth(i).inner_text().strip() for i in range(palette.count())]
    print("[%s] palette: %s, existing nodes: %d" % (tag, names, before))
    for want in seq:
        idx = next((i for i, n in enumerate(names) if want.lower() in n.lower()), 0)
        palette.nth(idx).click()
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(450)
    pg.wait_for_timeout(500)
    info = boxes(pg)
    ns = info["nodes"]
    check("[%s] %d nodes now on canvas" % (tag, len(seq) + before), len(ns) == len(seq) + before, str(len(ns)))
    check("[%s] no node overlaps another" % tag, not pairs_overlap(ns), str(pairs_overlap(ns)))
    new = [n for n in ns if n[0].startswith("s") and n[0][1:].isdigit()]
    v = info["view"]
    # Only the newly added shapes are held to "in view" (starter nodes are not ours).
    added = ns[before:] if before else ns
    out = [n[0] for n in added if not (n[1] >= v[0] - 1 and n[2] >= v[1] - 1 and n[3] <= v[2] + 1 and n[4] <= v[3] + 1)]
    check("[%s] new shapes inside the visible canvas" % tag, not out, "outside: %s view %s" % (out, v))
    pg.screenshot(path=os.path.join(SHOTS, "placement_%s_after.png" % tag))
    # Positions as the flow stores them (transform-independent): style translate.
    pos = lambda: pg.evaluate("() => Object.fromEntries([...document.querySelectorAll('.react-flow__node')].map(n => [n.getAttribute('data-id'), n.style.transform]))")
    p1 = pos()
    near = lambda a, b: all(abs(float(x) - float(y)) <= 1 for x, y in zip(__import__('re').findall(r'-?[0-9.]+', a), __import__('re').findall(r'-?[0-9.]+', b)))
    pg.wait_for_timeout(2500)  # autosave
    pg.reload(wait_until="domcontentloaded")
    pg.wait_for_selector(".react-flow__node", timeout=60000)
    pg.wait_for_timeout(1500)
    p2 = pos()
    check("[%s] reloaded draft keeps every position" % tag, set(p1) == set(p2) and all(near(p1[k], p2[k]) for k in p1),
          "before %d nodes, after %d; diff %s" % (len(p1), len(p2), {k: (p1.get(k), p2.get(k)) for k in set(p1) | set(p2) if p1.get(k) != p2.get(k)}))
    pg.screenshot(path=os.path.join(SHOTS, "placement_%s_reload.png" % tag))
    ctx.close(); b.close()


with sync_playwright() as p:
    run(1280, 900, "desktop", p)
    run(390, 844, "phone", p)

print("\n" + ("ALL PASS" if not fails else "%d FAILURE(S)" % len(fails)))
sys.exit(1 if fails else 0)
