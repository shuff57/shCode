# Drives the Point rules section of the sketch Rules panel -- the four
# constraint kinds the solver has always honoured but the panel never offered
# (distanceX, distanceY, symmetric, angle), shipped in reshape-cad 3a3be70.
#
# NOT part of `npm test` -- it needs a dev server on :3002 and Playwright,
# which is installed under Python here, not node. Run it by hand:
#
#   npm run dev &
#   python scripts/drive-point-rules.py
#
# WHAT THIS ADDS OVER THE CHECKS THAT ALREADY EXIST, because two of them look
# like they cover this and do not:
#
#   * scripts/check-constraint-ui.mjs is a GREP TRIPWIRE. It asks whether the
#     panel source contains the string 'symmetric'. A dead array of string
#     literals satisfies it completely. It is necessary and nowhere near
#     sufficient.
#   * reshape-cad's packages/studio/test/point-rules.test.mjs covers the
#     exported WRITERS (normalisation, replacement, purity, non-finite
#     refusal). It never renders anything, because that repo has no React test
#     harness.
#
# So the JSX between them -- the selects, the disabled states, the commit path,
# the rules list, the remove control -- was covered by nothing but a person
# looking at it once, on 2026-09-09. This is that person's session, written
# down.
#
# AND IT ASSERTS THE SOLVER, NOT THE LIST. A rule appearing in the panel's own
# list only proves the panel wrote to its own state. Every rule below is
# followed by a measurement of what the SKETCH did, read off the Dimensions
# sliders: a distance rule must actually put the two corners that far apart, a
# symmetric rule must actually land the third corner on the midpoint. "It ran"
# is not the assertion anywhere in this repo.
#
# RELATIVE, NOT ABSOLUTE. The solver is a relaxation loop from wherever the
# sketch currently is, so the absolute corner positions after a solve are not
# a contract -- the RELATIONSHIP the rule asked for is. Every geometric check
# below is a difference or a midpoint, never a coordinate. Tolerance is 0.6
# because the Dimensions sliders report rounded values; the exact arithmetic
# is unit-tested in reshape-cad, and what is being checked here is that the
# solver moved the sketch at all and moved it the right way.
# SELECT BY LABEL, NEVER BY VALUE. Measured on this panel 2026-09-09:
# select_option(value="2") leaves the select reading "1", while
# select_option(label="3") and select_option(index=3) both correctly leave it
# reading "2". The options are <option value={i}>{i+1}</option>, so the values
# are 0-based indices and the labels are the 1-based corner numbers a student
# actually sees -- and Playwright's value matching does not do what it says
# here. The app is FINE; this bit the test twice before it was measured, and
# the first time it produced a rule between the wrong corners that a geometric
# check still passed by coincidence (see the note further down).
import os
import sys
import tempfile

from playwright.sync_api import sync_playwright

SCRATCH = os.environ.get("SHOTS") or tempfile.mkdtemp(prefix="point-rules-")
print("screenshots ->", SCRATCH)

TOL = 0.6
fails = []


def check(name, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + name + ("" if ok else " -- " + str(detail)))
    if not ok:
        fails.append(name)


def row(pg, name):
    """One Point rules row, addressed by its visible name."""
    return pg.locator(".sk-point-row").filter(
        has=pg.locator(".sk-point-row-name", has_text=name)
    )


def corner(pg, index, axis):
    """A corner coordinate as the Dimensions panel reports it. `index` is
    1-based, matching what the panel shows a student."""
    label = "Sketch 1 corner %d %s slider" % (index, axis)
    return float(pg.get_by_label(label).input_value())


def rules(pg):
    """The rules list as a student reads it. inner_text puts a newline before
    the remove control, so whitespace is collapsed -- the assertion is about
    the wording, not about where the x sits."""
    return [" ".join(li.inner_text().split())
            for li in pg.locator(".sk-point-list li").all()]


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1500, "height": 950})
    # Land straight in reSHape Build mode. Clicking through the mode buttons
    # works but races the chunk load -- the same init-script shortcut
    # drive-sketch-conflict.py uses, and for the same reason.
    ctx.add_init_script(
        "try{localStorage.setItem('shCode:sandbox-mode','reshape');"
        "localStorage.setItem('shCode:sandbox-reshape-build','1');}catch(e){}"
    )
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text[:200]) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)[:200]))
    pg.goto("http://localhost:3002/sandbox", wait_until="domcontentloaded", timeout=90000)
    pg.wait_for_timeout(2500)

    sketch = pg.locator('button[title="Draw a flat outline to pull or spin into a solid"]')
    check("the Sketch tool is on the bar", sketch.count() == 1, sketch.count())
    sketch.first.click()
    pg.wait_for_selector(".sk-rules", timeout=20000)
    pg.wait_for_timeout(2000)

    # ---- the section exists, with all four rows ---------------------------
    check("the Point rules section is rendered", pg.locator(".sk-point-rows").count() == 1)
    names = [n.inner_text().strip() for n in pg.locator(".sk-point-row-name").all()]
    check("all four rows are present, in order",
          names == ["Dist X", "Dist Y", "Symmetric", "Angle"], names)
    check("no rules exist yet", rules(pg) == [], rules(pg))

    # A disabled control that does not say why is a dead end. This is the
    # bargain the Length box's own tooltip already strikes.
    dx = row(pg, "Dist X")
    btn = dx.locator("button")
    check("Set starts disabled", btn.is_disabled())
    check("...and its tooltip says what is missing",
          "Pick the two corners" in (btn.get_attribute("title") or ""),
          btn.get_attribute("title"))
    pg.screenshot(path=SCRATCH + "/01-empty.png")

    # ---- Dist X: create, see, and CHECK THE SKETCH MOVED ------------------
    dx.locator("select").nth(0).select_option(label="1")   # corner 1
    dx.locator("select").nth(1).select_option(label="3")   # corner 3
    dx.locator("input").fill("12")
    pg.wait_for_timeout(500)
    check("Set enables once the row is complete", btn.is_enabled())
    check("...and the tooltip switches from why-not to what-it-does",
          "distance" in (btn.get_attribute("title") or "").lower(),
          btn.get_attribute("title"))

    btn.click()
    pg.wait_for_timeout(1500)
    check("the rule is listed in the student's own words",
          rules(pg) == ["corner 1→3 across = 12 ×"], rules(pg))
    check("the draft clears after committing", dx.locator("input").input_value() == "")
    check("...and Set goes back to disabled", btn.is_disabled())

    # This check CANNOT tell corner 3 from corner 2 on its own, and that is
    # not a flaw to fix here -- it is why the listed-text check above is not
    # decoration. The starting outline is a rectangle, so corners 2 and 3
    # share an `across`, and a rule accidentally written between 1 and 2 gives
    # exactly the same 12. Measured, the first time this ran: a select_option
    # ambiguity picked corner 2, the list said `corner 1→2`, and this
    # geometric check passed anyway.
    gap = corner(pg, 3, "across") - corner(pg, 1, "across")
    check("THE SOLVER MOVED THE SKETCH: corners 1 and 3 are 12 apart across",
          abs(gap - 12) <= TOL, gap)
    pg.screenshot(path=SCRATCH + "/02-distx.png")

    # ---- Symmetric: the degenerate case must refuse IN THE UI -------------
    sym = row(pg, "Symmetric")
    sym.locator("select").nth(0).select_option(label="1")   # corner 1
    sym.locator("select").nth(1).select_option(label="3")   # corner 3
    sym.locator("select").nth(2).select_option(label="1")   # about corner 1 -- illegal
    pg.wait_for_timeout(400)
    check("a symmetric about one of its own endpoints is refused",
          sym.locator("button").is_disabled())
    check("...and says why, naming the third corner",
          "third corner" in (sym.locator("button").get_attribute("title") or ""),
          sym.locator("button").get_attribute("title"))

    sym.locator("select").nth(2).select_option(label="2")   # about corner 2 -- legal
    pg.wait_for_timeout(400)
    check("picking a real third corner enables it", sym.locator("button").is_enabled())
    sym.locator("button").click()
    pg.wait_for_timeout(1500)
    check("the symmetric rule is listed", "corner 2 centred between 1 and 3 ×" in rules(pg), rules(pg))

    mid_x = (corner(pg, 1, "across") + corner(pg, 3, "across")) / 2
    mid_y = (corner(pg, 1, "up") + corner(pg, 3, "up")) / 2
    check("THE SOLVER CENTRED IT: corner 2 sits on the midpoint across",
          abs(corner(pg, 2, "across") - mid_x) <= TOL, (corner(pg, 2, "across"), mid_x))
    check("...and on the midpoint up -- both axes, not just the obvious one",
          abs(corner(pg, 2, "up") - mid_y) <= TOL, (corner(pg, 2, "up"), mid_y))
    pg.screenshot(path=SCRATCH + "/03-symmetric.png")

    # ---- Angle, and the conflict it provokes ------------------------------
    # This is not contrived: an angle between edges 1 and 2 genuinely cannot
    # hold while corner 2 is pinned to the midpoint of 1 and 3. settle() is
    # supposed to drop the loser and SAY SO, and that machinery predates these
    # four kinds -- so this is the check that they were wired into it rather
    # than written past it.
    ang = row(pg, "Angle")
    ang.locator("select").nth(0).select_option(label="Edge 1")   # edge 1
    ang.locator("select").nth(1).select_option(label="Edge 2")   # edge 2
    ang.locator("input").fill("30")
    pg.wait_for_timeout(400)
    check("the Angle row enables on two edges and a number", ang.locator("button").is_enabled())
    ang.locator("button").click()
    pg.wait_for_timeout(1800)

    check("the angle rule is listed", "edge 1 ∠ edge 2 = 30° ×" in rules(pg), rules(pg))
    note = pg.locator(".sk-rules-note")
    check("settle() explains what it dropped", note.count() == 1, note.count())
    note_text = note.inner_text() if note.count() else ""
    check("...naming BOTH rules, not just the survivor",
          "centred" in note_text and "30" in note_text, note_text)
    check("...and offering the way back",
          "Undo" in note_text, note_text)
    check("the dropped symmetric really is gone from the list",
          not any("centred" in r for r in rules(pg)), rules(pg))
    print("   note:", repr(note_text))
    pg.screenshot(path=SCRATCH + "/04-conflict.png")

    # ---- remove: the third verb the gate's failure message demands --------
    # "A student cannot create, see, or remove one" -- all three, so removal
    # is not an afterthought here.
    before = rules(pg)
    angle_li = pg.locator(".sk-point-list li").filter(has_text="∠")
    angle_li.locator("button").click()
    pg.wait_for_timeout(1200)
    after = rules(pg)
    check("the x removes exactly that rule", len(after) == len(before) - 1, (before, after))
    check("...and it is the angle that went, not a neighbour",
          not any("∠" in r for r in after) and any("across" in r for r in after), after)

    # Re-adding the symmetric now that the angle is gone proves the earlier
    # disappearance was a real conflict resolution and not a failed write.
    sym.locator("select").nth(0).select_option(label="1")
    sym.locator("select").nth(1).select_option(label="3")
    sym.locator("select").nth(2).select_option(label="2")
    sym.locator("button").click()
    pg.wait_for_timeout(1500)
    check("the symmetric can be re-added once its rival is gone",
          any("centred" in r for r in rules(pg)), rules(pg))

    while pg.locator(".sk-point-list li").count():
        pg.locator(".sk-point-list li").first.locator("button").click()
        pg.wait_for_timeout(900)
    check("removing every rule empties the list", rules(pg) == [], rules(pg))
    check("...and the section itself is still there to add more",
          pg.locator(".sk-point-rows").count() == 1)
    pg.screenshot(path=SCRATCH + "/05-emptied.png")

    # THIS USED TO BE AN ALLOWANCE, AND IS NOW A WALL. Between 2026-09-09 and
    # 2026-09-10 this block permitted a specific throw:
    #
    #   toScript(): no reSHape Script word for 'distanceX' yet
    #   -- P1d added the solver rule but not the DSL syntax.
    #
    # This script found it on its first complete run -- six pageerrors from one
    # short session, because toScript() ran on every render of the Code view
    # and a distanceX/distanceY/symmetric rule had no word to emit. reshape-cad
    # answered it by adding .distX()/.distY()/.symmetric()/.angle() to
    # SketchHandle rather than by skipping the constraint, since skipping would
    # have dropped a student's rule on Build -> Code without saying so.
    #
    # Measured after that landed: zero throws. So the allowance is gone and any
    # page error fails the run. If this ever goes red naming a reSHape Script
    # word again, a fifth constraint kind reached the panel without one.
    check("no console or page errors at all", errors == [], errors)
    b.close()

print("\n" + ("FAIL: " + ", ".join(fails) if fails else "ALL PASS"))
sys.exit(1 if fails else 0)
