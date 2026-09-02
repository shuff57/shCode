# Does deleting a sketch still break the preview, or does it now explain itself?
#
# Before this change the timeline kept a Pull pointing at nothing and the
# preview died with "ReferenceError: sk1 is not defined".
#
# The first version of this driver passed the headline check for the wrong
# reason: if the click on "Sketch 1" fails to select it, the delete removes the
# PULL instead, and "Pull 1 is gone" is then true while nothing was proven. So
# the selection is verified before the delete, and the sketch is asserted gone
# alongside it.
import sys
import tempfile
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
S = tempfile.mkdtemp(prefix="delete2-")
print("shots ->", S)
fails = []


def check(name, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + name + ("" if ok else " -- " + str(detail)))
    if not ok:
        fails.append(name)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1500, "height": 950})
    ctx.add_init_script(
        "try{localStorage.setItem('shCode:sandbox-mode','reshape');"
        "localStorage.setItem('shCode:sandbox-reshape-build','1');}catch(e){}"
    )
    pg = ctx.new_page()
    errors = []
    console = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: console.append(m.type + ": " + m.text))

    pg.goto(BASE + "/sandbox/", wait_until="domcontentloaded", timeout=90000)
    pg.wait_for_timeout(6000)
    pg.locator('button[title="Draw a flat outline to pull or spin into a solid"]').first.click()
    pg.wait_for_selector(".sk-rules", timeout=30000)
    pg.wait_for_timeout(2000)
    pg.locator('button[title="Pull the selected sketch straight up into a solid"]').first.click()
    pg.wait_for_timeout(4000)

    rows = pg.locator(".model-timeline li")
    def row_texts():
        return [rows.nth(i).inner_text().replace("\n", " ") for i in range(rows.count())]

    before = row_texts()
    check("CONTROL: the timeline holds a sketch and a pull to begin with",
          any("Sketch 1" in t for t in before) and any("Pull 1" in t for t in before),
          str(before))
    pg.screenshot(path=S + "/01-built.png")

    # Select the SKETCH row, and prove it took.
    sketch_row = rows.filter(has_text="Sketch 1").first
    sketch_row.click()
    pg.wait_for_timeout(1000)
    # A selected row is `model-row is-on` -- read off ModelEditor.tsx rather
    # than guessed. The first version of this probe guessed `is-selected`,
    # went red against a correct app, and cost a round of investigation.
    sel = [t.replace(chr(10), ' ') for t in
           pg.locator('.model-row.is-on').all_inner_texts()]
    check("CONTROL: clicking the sketch row actually selects the sketch",
          len(sel) == 1 and "Sketch 1" in sel[0],
          "selected rows: " + str(sel))
    pg.screenshot(path=S + "/02-selected.png")

    pg.locator('button[aria-label="Delete"]').first.click()
    pg.wait_for_timeout(4000)
    pg.screenshot(path=S + "/03-deleted.png")

    after = row_texts()
    note = pg.locator(".model-note")
    note_text = note.first.inner_text() if note.count() else "(no note)"
    body = pg.locator("body").inner_text()

    check("the sketch is gone, which is what was asked for",
          not any("Sketch 1" in t for t in after), str(after))
    check("...and the Pull built from it went too",
          not any("Pull 1" in t for t in after), str(after))
    check("...and the student is told why, in words",
          "built from" in note_text and "Sketch 1" in note_text, note_text)
    check("...with no ReferenceError on the page",
          not any("ReferenceError" in e for e in errors) and "ReferenceError" not in body,
          str(errors[:3]))
    bad = [c for c in console if "ReferenceError" in c or "is not defined" in c]
    check("...and none in the console either", not bad, str(bad[:3]))

    print("\n  timeline after: " + str(after))
    print("  note said: " + note_text)
    ctx.close()
    b.close()

print("\n" + ("FAIL  (" + ", ".join(fails) + ")" if fails else "ALL PASS"))
sys.exit(1 if fails else 0)
