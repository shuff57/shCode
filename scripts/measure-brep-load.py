# What the B-rep kernel costs a student on a real connection, from cold.
#
# WHY THIS EXISTS. Every timing taken during the conversion was localhost with a
# warm cache -- 1.3 s to initialise, which says nothing at all about a Chromebook
# on school wifi. The wasm is 6.87 MB gzipped and it is downloaded before the
# first frame can be drawn, so the honest question is not "does it work" but
# "how long does a student stare at nothing".
#
# The cache is cleared before every run, so each row is a FIRST VISIT. Repeat
# visits are the localhost row, because the wasm is then cached.
#
#   npm run dev
#   python scripts/measure-brep-load.py
#
# Requires the kernel bundle: node scripts/build-brep-kernel.mjs --occt <dir>
#
# MEASURED 2026-09-02 (see .msgbox/FUTURE.md for what was decided):
#
#   profile                    kernel init   kernel->pixels   wall clock
#   no throttling (localhost)      1285 ms         1589 ms      1794 ms
#   fast 4G      20 Mbps           3387 ms         3931 ms      4137 ms
#   slow 4G       4 Mbps          15274 ms        16103 ms     16609 ms
#   shared wifi   1.5 Mbps        39928 ms        41092 ms     42062 ms
#
# Per student, and a classroom shares one pipe: twenty-five first visits at once
# move 172 MB, so the shared-wifi row is a floor rather than a worst case.
import json, sys, time
from playwright.sync_api import sync_playwright

URL = "http://localhost:3002/reshape/kernel/brep-check.html"

# Down/up in bytes/sec, latency in ms. Named for what a school actually has.
PROFILES = [
    ("no throttling (localhost)", None),
    ("fast 4G      20 Mbps",  (20_000_000 / 8, 5_000_000 / 8, 30)),
    ("slow 4G       4 Mbps",  (4_000_000 / 8, 1_000_000 / 8, 100)),
    ("shared wifi   1.5 Mbps", (1_500_000 / 8, 750_000 / 8, 150)),
]

rows = []
with sync_playwright() as p:
    for label, prof in PROFILES:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                    "--enable-unsafe-swiftshader"])
        ctx = b.new_context(viewport={"width": 1100, "height": 620})
        pg = ctx.new_page()
        cdp = ctx.new_cdp_session(pg)
        cdp.send("Network.enable")
        cdp.send("Network.clearBrowserCache")
        if prof:
            down, up, lat = prof
            cdp.send("Network.emulateNetworkConditions", {
                "offline": False, "downloadThroughput": down,
                "uploadThroughput": up, "latency": lat,
            })
        t0 = time.time()
        try:
            pg.goto(URL, wait_until="load", timeout=180000)
            pg.wait_for_function("() => window.__brepReport !== undefined", timeout=600000)
            r = pg.evaluate("window.__brepReport")
            wall = time.time() - t0
            rows.append((label, r.get("ok"), r.get("initMs"), r.get("totalMs"), round(wall * 1000)))
        except Exception as e:
            rows.append((label, False, None, None, str(e)[:60]))
        b.close()

print()
print("profile                    ok    kernel init   kernel->pixels   wall clock")
for label, ok, init, total, wall in rows:
    print("%-26s %-5s %10s %14s %12s" % (
        label, "yes" if ok else "NO",
        (str(init) + " ms") if init else "-",
        (str(total) + " ms") if total else "-",
        (str(wall) + " ms") if isinstance(wall, int) else wall))
print()
print("wasm is 22.97 MB on the wire uncompressed, 6.87 MB gzipped.")
print("Cache was cleared before every run, so each is a first visit.")
