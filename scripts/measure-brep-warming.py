# Can the B-rep kernel's download be moved OFF the student's critical path?
#
# The obvious answer is to prefetch the wasm from the page hosting the preview
# so it is cached before the frame asks. Measured here, it does not work -- and
# it is not neutral, it is exactly twice as slow.
#
#   npm run dev
#   node scripts/build-brep-kernel.mjs --occt <dir>
#   python scripts/measure-brep-warming.py
#
# MEASURED 2026-09-02, throttled to 1.5 Mbps, cache cleared before every run:
#
#   run                            prefetch   frame init   total   wasm reqs
#   cold, no warming (control)            -     39857 ms   41.8 s          1
#   warmed from parent page         39267 ms     39974 ms   81.3 s          2
#   parent hands bytes to frame     39333 ms       434 ms   41.8 s          1
#
# WHY WARMING FAILS. The preview iframe is sandboxed without
# allow-same-origin, so it is an OPAQUE origin, and the browser partitions its
# HTTP cache separately from the parent page's. The parent's copy is invisible
# to it. Two requests, 3.82 MB paid twice, and a student waits longer than if
# nobody had tried to help.
#
# WHAT WORKS. The parent fetches the kernel and POSTS THE BYTES into the frame,
# which hands them to emscripten as `wasmBinary`. The frame never touches the
# network, so the partition never enters into it. Frame init drops from 39.9 s
# to 434 ms -- ninety-two times faster -- and the file crosses the wire once.
#
# The total wall clock is unchanged HERE only because this harness fetches
# serially to keep the comparison honest. That fetch is the movable part: in
# the app it belongs behind whatever the student is already doing -- reading the
# lesson, or drawing in the 2D sketcher, which is first-party JS and needs no
# kernel at all. The preview then costs 434 ms whenever they reach it.
#
# NOTHING ABOUT THE SANDBOX CHANGES. These are the bytes of a public static
# asset, handed to a frame that still cannot reach /api as the student.
import json, time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002/reshape/kernel"
SLOW = (1_500_000 / 8, 750_000 / 8, 150)   # down, up bytes/s, latency ms

RUNS = [
    ("cold, no warming (control)", "/warm.html?warm=0"),
    ("warmed from parent page",    "/warm.html"),
    ("parent hands bytes to frame", "/warm.html?handoff=1"),
]

rows = []
with sync_playwright() as p:
    for label, path in RUNS:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                    "--enable-unsafe-swiftshader"])
        ctx = b.new_context(viewport={"width": 1000, "height": 560})
        pg = ctx.new_page()
        cdp = ctx.new_cdp_session(pg)
        cdp.send("Network.enable")
        cdp.send("Network.clearBrowserCache")
        down, up, lat = SLOW
        cdp.send("Network.emulateNetworkConditions", {
            "offline": False, "downloadThroughput": down,
            "uploadThroughput": up, "latency": lat,
        })
        # Count how many times the wasm actually crosses the wire. If warming
        # works there is exactly ONE request; if the cache is partitioned away
        # there are two, and the student paid twice.
        hits = []
        cdp.on("Network.responseReceived",
               lambda e: hits.append(e["response"]["url"]) if e["response"]["url"].endswith(".wasm") else None)
        served_from_cache = []
        cdp.on("Network.requestServedFromCache",
               lambda e: served_from_cache.append(e.get("requestId")))

        t0 = time.time()
        try:
            pg.goto(BASE + path, wait_until="load", timeout=120000)
            pg.wait_for_function("() => window.__warmReport !== undefined", timeout=600000)
            r = pg.evaluate("window.__warmReport")
            wall = round((time.time() - t0) * 1000)
            rows.append((label, r, wall, len(hits), len(served_from_cache)))
        except Exception as e:
            rows.append((label, {"error": str(e)[:70]}, None, len(hits), 0))
        b.close()

print()
print("throttled to 1.5 Mbps, cache cleared before every run")
print()
print("%-30s %10s %12s %12s %9s" % ("run", "prefetch", "frame init", "total wall", "wasm reqs"))
for label, r, wall, n, cached in rows:
    if "error" in r:
        print("%-30s  ERROR %s" % (label, r["error"]))
        continue
    fi = r.get("frame", {}).get("initMs")
    print("%-30s %9s %11s %11s %9d" % (
        label,
        (str(r.get("warmMs", 0)) + "ms") if r.get("warmMs") else "-",
        (str(fi) + "ms") if fi else "-",
        (str(wall) + "ms") if wall else "-",
        n))

warm = [r for l, r, w, n, c in rows if r.get("warmed")]
if warm and "frame" in warm[0]:
    print()
    print("cache reused by the sandboxed frame: "
          + ("YES" if warm[0].get("cacheHelped") else "NO - partitioned away"))
