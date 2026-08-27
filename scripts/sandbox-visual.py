#!/usr/bin/env python
"""Screenshot the sandbox Build mode for a blind visual parity check.

    python scripts/sandbox-visual.py [--url http://localhost:3002]

Writes:
    C:/Users/shuff/AppData/Local/Temp/opencode/sandbox-build.png   the app
    C:/Users/shuff/AppData/Local/Temp/opencode/onshape-ref.png     the reference
"""

import argparse
import sys

from playwright.sync_api import sync_playwright

OUT = r"C:/Users/shuff/AppData/Local/Temp/opencode"


def run(url):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1600, "height": 1000})
        page.goto(f"{url}/sandbox", wait_until="domcontentloaded", timeout=90_000)
        page.wait_for_selector(".sandbox-mode", timeout=90_000)
        page.wait_for_timeout(600)

        page.click(".sandbox-mode:has-text('reSHape')")
        page.wait_for_timeout(400)
        page.click(".sandbox-mode:has-text('Build')")
        page.wait_for_selector(".model-tools", timeout=20_000)
        page.wait_for_timeout(800)

        # Build a small model so the preview shows real geometry.
        page.on("dialog", lambda d: d.accept())
        page.click(".model-tools button:has-text('Box')")
        page.wait_for_timeout(2500)
        # Primitives live in the shape flyout; the face shows the last variant.
        page.click('.model-tools button[aria-label="More box tools"]')
        page.wait_for_timeout(300)
        page.click(".model-flyout-menu button:has-text('Cylinder')")
        page.wait_for_timeout(2500)
        # Select both shapes, then Cut from the boolean flyout.
        rows = page.query_selector_all(".model-row")
        rows[0].click()
        page.keyboard.down("Control"); rows[1].click(); page.keyboard.up("Control")
        page.wait_for_timeout(300)
        page.click('.model-tools button[aria-label="More join tools"]')
        page.wait_for_timeout(300)
        page.click(".model-flyout-menu button:has-text('Cut')")
        page.wait_for_timeout(3500)

        page.screenshot(path=f"{OUT}/sandbox-build.png", full_page=False)
        print(f"wrote {OUT}/sandbox-build.png")
        browser.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:3002")
    a = ap.parse_args()
    try:
        run(a.url.rstrip("/"))
    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        sys.exit(1)
