"""Generate curriculum-plan.md's PART B assignment calendar.

Maps CSCI 4 (Intro to Programming Concepts and Methodologies) content onto CUSD
2026-27 ODD-day rotation days only -- CS meets on odd days, a single track,
unlike Intro Stats' odd/even dual-track.

    PYTHONUTF8=1 python scripts/cs_schedule.py

Prints the capacity summary, writes scripts/cs_schedule_output.md (the raw table
for curriculum-plan.md's PART B "Full calendar" section -- re-add its four marker
rows for recesses and the finals windows) and cs_course_schedule.md (the
standalone, human-facing schedule, complete as generated).

WHY THIS EXISTS: Part B used to be hand-typed, which is how it drifted onto a
third numbering scheme and a set of dates that had never been checked against
the real district calendar. Any change to the section list, per-section day
counts, or the pairing decisions MUST be made here and regenerated -- adopting
one more pairing shifts the date of every meeting after it, so hand-patching a
few rows silently corrupts the rest of the table.

CALENDAR DATA -- VERIFIED 2026-08-14 against the primary source:
`bookSHelf/cusd academic calendar 26-27.pdf` (Chico Unified School District
2026-2027 Student Calendar, last updated 5/20/26). Every closure, recess range
and finals window below matches that PDF. Keep in sync if CUSD revises it.

THE FIRST INSTRUCTIONAL DAY AND THE FIRST ROTATION DAY ARE DIFFERENT DAYS.
  - Thu Aug 13, 2026 is the first INSTRUCTIONAL day. The PDF boxes it white
    ("8/13/26 Minimum Day for Middle Schools"), not yellow like the summer days
    around it, so school is in session. It is a first-day minimum day that runs
    all periods rather than entering the A/B rotation.
  - Fri Aug 14, 2026 is rotation day 1 (odd), and is therefore FIRST_DAY here.
    This script walks the ROTATION, so Aug 13 is deliberately outside it.

That reading is the only one consistent with all three primary facts:
  1. Day counts. The PDF's SECONDARY GRADING PERIODS state 83 days for first
     semester and 97 for second, 180 total. Instructional days Aug 13 -> Dec 18
     give exactly 83 and Jan 4 -> Jun 3 give exactly 97 -- but ONLY with Oct 5
     closed. Drop Oct 5 and it is 181; keep Oct 5 closed but start the count at
     Aug 14 and it is 179.
  2. Grey cells. Mon Oct 5 is shaded the same grey as Mon Apr 26 -- the legend's
     "No School for Students" colour. Both are closures. Oct 5 had been missing
     from the ported data; Apr 26 was present.
  3. Rotation parity. shCode/course_schedule.md (the Intro Stats calendar, same
     district and year) places Aug 18 on the odd track and Aug 17 on the even
     track. With Aug 14 as rotation day 1: Aug 17 = 2 (even), Aug 18 = 3 (odd).

  HISTORY: an earlier revision of this file had neither Aug 13 nor Oct 5, and
  "verified" against the PDF's 83/97 totals because the two omissions cancelled
  exactly. They do not cancel anywhere else -- dropping Oct 5 from the rotation
  flips odd/even for every meeting after it. If these numbers are ever re-checked,
  check the SEQUENCE, not just the totals.

Deliberately NOT closures, though the PDF colours them:
  - Nov 13 -- "Elementary Pupil Free Day (Full day for secondary schools)".
  - Nov 16-20 -- Elementary Minimum Days (parent-teacher conferences).
  - The three District-wide Staff Development Days and Jun 3: see MINIMUM_DAYS.

The walk is deliberately allowed to overflow past the real last day of school
rather than truncating -- if a future section list stops fitting, the overflow
IS the finding and should be reported, not hidden. See Part B's capacity section.

CURRENT STATE (2026-08-14): 87 meetings needed, 90 available, 3 spare. The year
ends Tue Jun 1, 2027 with the Semester 2 final. Both semester closes (review
project + final exam) are scheduled and ANCHORED to their district finals window;
Ch 11 and Ch 12 share one assessment block; 2 of the 3 spare meetings sit as
catch-up buffer immediately before the Semester 2 close.

Group PAs and chapter Tests are ONE meeting each. If either is ever made
multi-day, note that the minimum-day rule below relaxes for it automatically:
a multi-day assessment may start or end on a minimum day, only its interior
days need a full period.

OUTPUTS (both regenerated on every run):
  scripts/cs_schedule_output.md  -- the raw table for curriculum-plan.md PART B
  cs_course_schedule.md          -- the standalone at-a-glance course schedule
"""

import re
from datetime import date, timedelta
from pathlib import Path

FIRST_DAY = date(2026, 8, 14)  # Friday, rotation day 1 (odd)
LAST_DAY = date(2027, 6, 3)
SEM1_END = date(2026, 12, 18)

CLOSURES = {
    date(2026, 9, 7): "Labor Day",
    date(2026, 10, 5): "No School for Students",   # grey on the PDF, same category as Apr 26
    date(2026, 11, 11): "Veterans Day",
    date(2026, 12, 18): "Secondary Pupil Free Day",
    date(2027, 1, 18): "Martin Luther King, Jr. Day",
    date(2027, 2, 12): "Lincoln's Birthday",
    date(2027, 2, 15): "Presidents' Day",
    date(2027, 3, 26): "Spring Travel Day",
    date(2027, 3, 29): "In Lieu Admission Day",
    date(2027, 4, 26): "Nonwork day for employees under 12 months",
    date(2027, 5, 31): "Memorial Day",
}
CLOSURE_RANGES = [
    (date(2026, 11, 23), date(2026, 11, 27), "Thanksgiving Recess"),
    (date(2026, 12, 21), date(2027, 1, 1), "Winter Recess"),
    (date(2027, 3, 15), date(2027, 3, 19), "Spring Recess"),
]
HOLIDAYS = {
    date(2026, 11, 26): "Thanksgiving Day",
    date(2026, 11, 27): "Day after Thanksgiving",
    date(2026, 12, 24): "Christmas Eve (observed)",
    date(2026, 12, 25): "Christmas Day",
    date(2026, 12, 31): "New Year's Eve (observed)",
    date(2027, 1, 1): "New Year's Day",
}

FINALS_WINDOW = [
    (date(2026, 12, 14), date(2026, 12, 17)),
    (date(2027, 5, 27), date(2027, 5, 28)),
    (date(2027, 6, 1), date(2027, 6, 2)),
]

# Assessments that need a whole, unshortened period.
NEEDS_FULL_PERIOD = {"test", "group_pa", "review_project", "synthesis"}

# NOT closures -- school IS in session, but every period is SHORTENED, so a
# meeting landing here cannot carry a full 1.75-hour block. These are never
# skipped; instead any assessment landing on one is STRETCHED across two
# meetings (see stretch_over_minimum_days) and the day is flagged in both
# generated calendars, so the situation is visible rather than silent.
MINIMUM_DAYS = {
    date(2026, 10, 27): "District-wide Staff Development Day (minimum day)",
    date(2027, 1, 26): "District-wide Staff Development Day (minimum day)",
    date(2027, 3, 2): "District-wide Staff Development Day (minimum day)",
    date(2027, 6, 3): "Minimum Day for All schools (last day of school)",
}

# ---------------------------------------------------------------------------
# Content plan. Each chapter: (book_chapter_id, title, [(label, days, kind)]),
# where kind in {"section","pair","synthesis"}.
#
# SIZING MODEL (operator decision 2026-08-14): **1 meeting per book section by
# default.** Three kinds of exception, and nothing else:
#
#   (a) DENSE -- 5 sections get 2 meetings (was 7; 2.3 and 6.3 were cut back
#       to 1 to fund the semester-close blocks). Marked `# DENSE` with their line
#       count and the reason. Chosen from REAL line counts of every section
#       file in the book repo (base .md at the highest available tier:
#       Solutions > Numbered > Remastered; _Solutions/_MathVerify files are
#       teacher-side keys and are NOT student contact content), blended with
#       the pedagogical flags already recorded in curriculum-plan.md.
#   (b) PAIR -- 4 pre-existing pairs share a block, because each is one
#       continuous lesson in the book or already ships as one in-app module.
#       These predate and are independent of the retired "Tier 3" pairings.
#       NOTE: a pair gets 2 meetings, i.e. still 1 meeting per section -- the
#       pairing means "teach these as one continuous block" and NOT "fit two
#       sections into one period." Under this model no section is ever
#       compressed below a meeting. (1.2+1.3 was the one exception, at 1
#       meeting for two sections; raised to 2 on 2026-08-14 for consistency.)
#   (c) SYNTHESIS -- project chapters are sized by the activity, not by prose
#       length (their section files are only 100-160 lines).
#
# HISTORY: an earlier revision defaulted to 2 days/section, derived from
# BOOK-TO-MODULE.md's ~590-lines-per-day proxy for Ch1-4 and extrapolated by
# guess for Ch5-13. BOOK-TO-MODULE.md labels its own column "a provisional
# estimate" to be replaced by atomic-concept counts; that never happened, so a
# proxy was carrying the whole calendar. The extrapolation was measurably
# wrong -- Ch11 (165/206/580 lines) and Ch12 (251/214) had been given 2 days
# per section. That model produced a phantom 21-meeting shortfall and drove a
# compression pass ("Tiers 1-3") that has since been reverted in full.
#
# ASSESSMENT ORDER: paired Group PA first, then the individual Test -- see
# build_work_list(). Same order the Intro Stats calendar uses.
# ---------------------------------------------------------------------------

CHAPTERS = [
    ("1", "Foundations", [
        ("1.1 Software Lifecycle", 1, "section"),                            # 253
        ("1.2 Variables and Data Types + 1.3 Documentation and Coding Conventions", 2, "pair"),  # 568+229
        ("1.4 Programming Paradigms and Languages", 1, "section"),           # 368
        ("1.5 Program Design Tools and Environments", 2, "section"),         # DENSE 980: pseudocode + flowcharts + first-week tooling setup
    ]),
    ("2", "Control Flow", [
        ("2.1 Conditionals", 2, "section"),                                  # DENSE 1110: largest section in the book; first real logic
        ("2.2 Algorithms and Loops", 1, "section"),                          # 534
        ("2.3 The switch Statement", 1, "section"),                          # 1024 -- see NOTE below; dropped 2->1 to fund the finals blocks
        ("2.4 Loop Control and Nested Loops", 2, "section"),                 # DENSE 1054: the documented beginner wall
        ("2.5 Handling Errors with try/catch", 1, "section"),                # 794
    ]),
    ("3", "Functions and Data", [
        ("3.1 Functions: Definition and Calls", 1, "section"),               # 591
        ("3.2 Parameters and Return Values", 2, "section"),                  # DENSE 748: split from 3.1 precisely because combined moved too fast
        ("3.3 Arrays", 2, "section"),                                        # DENSE 844: flagged highest-leverage section in Q1
        ("3.4 Function Expressions and Arrow Functions", 1, "section"),      # 622
        ("3.5 Objects and Properties", 1, "section"),                        # 796
        ("3.6 Functions: Pass by Value/Reference", 1, "section"),            # 384
        ("3.7 Array Methods", 1, "section"),                                 # 628
        ("3.8 Saving and Loading Data", 1, "section"),                       # 600
    ]),
    ("4", "Synthesis -- Print Shop", [
        ("4.1 Print Shop -- Q1 Synthesis", 3, "synthesis"),
    ]),
    ("5", "shPlay Foundations", [
        ("5.1 Hello Sprite and Movement", 1, "section"),                     # 184
        ("5.2 Physics Feel", 1, "section"),                                  # 453
        ("5.3 Classes and Instances + 5.4 Writing Your Own Classes", 2, "pair"),  # 165+504, one continuous book lesson
    ]),
    # --- SEMESTER 1 CLOSE ----------------------------------------------------
    # Placed after Ch 5 so the semester breaks on a clean chapter boundary and
    # the three meetings land on the last three odd days before the Dec 18
    # pupil-free day: Dec 11, Dec 15, Dec 17. The final therefore sits INSIDE
    # the district's Dec 14-17 finals window, which also resolves the old
    # collision (content used to be scheduled on top of that window).
    ("S1", "Semester 1 Close", [
        ("Semester 1 Review Project (covers Ch 1-5)", 2, "review_project"),
        ("SEMESTER 1 FINAL EXAM (Ch 1-5 cumulative)", 1, "final"),
    ]),
    ("6", "Game Mechanics", [
        ("6.1 Groups + 6.2 Overlaps and Collisions", 2, "pair"),             # 256+611, ships as one in-app module
        ("6.3 Physics Applications", 1, "section"),                          # 812 -- largest in Ch 6, but pure APPLICATION of 5.2 + 6.2 with no new API; dropped 2->1 to fund the finals blocks
        ("6.4 Animated Sprites and Camera", 1, "section"),                   # 608
        ("6.5 Save and Load", 1, "section"),                                 # 559
        ("6.6 Game State Machines", 1, "section"),                           # 415
        ("6.7 Advanced Input + 6.8 Joints", 2, "pair"),                      # 292+424, ships as one in-app module
        ("6.9 Timing and Async", 1, "section"),                              # 335
    ]),
    ("7", "Synthesis -- Arcade Cabinet", [
        ("7.1 Arcade Cabinet -- Q2 Synthesis", 3, "synthesis"),
    ]),
    ("8", "JSCAD Foundations", [
        ("8.1 Libraries and JSCAD Introduction", 1, "section"),              # 685
        ("8.2 2D Shapes and Transforms", 1, "section"),                      # 622
        ("8.3 Boolean Operations in 2D", 1, "section"),                      # 388
        ("8.4 Parameters and getParameterDefinitions", 1, "section"),        # 369
        ("8.5 Arrays in JSCAD / Loops", 1, "section"),                       # 461
    ]),
    ("9", "3D Modeling", [
        ("9.1 First Extrusion: 2D to 3D", 1, "section"),                     # 298
        ("9.2 3D Primitives and Transforms", 1, "section"),                  # 700
        ("9.3 Error Handling and Debugging", 1, "section"),                  # 699
        ("9.4 Testing Principles", 1, "section"),                            # 507
    ]),
    ("10", "Synthesis -- Fits-My-Stuff", [
        ("10.1 Fits-My-Stuff -- Q3 Synthesis", 3, "synthesis"),
    ]),
    # Ch 11 and Ch 12 share ONE assessment block (2026-08-14). Book section IDs
    # are unchanged -- this is a scheduling/assessment merge, not a renumber.
    # Ch 12 is the smallest content chapter in the book (465 lines across two
    # sections) and Ch 11 is the second smallest (951); separately each carried
    # a Group PA + Test, i.e. 4 assessment meetings for 1416 lines of content.
    # Merged they are 5 sections / 1416 lines -- still smaller than Ch 8 (5
    # sections, 2525) and Ch 9 (4, 2204), both of which carry a single block.
    # Saves 2 meetings, which is the whole of the schedule's safety margin.
    ("11-12", "Advanced Modeling and Production", [
        ("11.1 Hulls and Advanced Extrusions", 1, "section"),                # 165
        ("11.2 Measurements and Printability", 1, "section"),                # 206
        ("11.3 Sorting and Searching on Geometry", 1, "section"),            # 580
        ("12.1 Multi-File Projects and File I/O", 1, "section"),             # 251
        ("12.2 Colors, Text, and Export Formats", 1, "section"),             # 214
    ]),
    ("13", "Synthesis -- Mechanism", [
        ("13.1 Capstone Design Phase", 2, "synthesis"),
        ("13.2 Capstone Build and Iterate", 4, "synthesis"),
        ("13.3 Presentations and Reflection", 2, "synthesis"),
    ]),
    # --- SEMESTER 2 CLOSE ----------------------------------------------------
    # Semester 2 needs no separate review project: 13.3 Presentations and
    # Reflection IS the semester demonstration, it already runs 2 meetings, and
    # it already falls the week before the May 27 - Jun 2 finals window. It is
    # reframed in curriculum-plan.md so the final exam draws directly on the
    # capstone each student just built and presented.
    ("S2", "Semester 2 Close", [
        ("SEMESTER 2 FINAL EXAM (Ch 6-13 cumulative)", 1, "final"),
    ]),
]

# NOTE on 2.3: 1024 lines puts it in DENSE range, but conceptually `switch` is a
# syntactic variant of the if/else-if chain already taught in 2.1 -- much of the
# section is repeated worked examples. It is the single best candidate to drop to
# 1 meeting if a meeting is ever needed. Left at 2 deliberately: after a round of
# over-compression this errs generous, and the slack is small.

# Every content chapter gets BOTH an individual Test and a paired Group PA.
# (An earlier "Tier 1" dropped the Group PA on Ch 3/6/9/12 on the theory that the
# following synthesis chapter was itself a group PA. That was WRONG on the facts:
# the Group PA is a PAIRED assessment and the synthesis project is INDIVIDUAL, so
# they measure different things and neither substitutes for the other.)
TEST_CHAPTERS = {"1", "2", "3", "5", "6", "8", "9", "11-12"}
FINALS_CHAPTERS = {"S1", "S2"}  # pseudo-chapters: no Test/PA of their own
GROUP_PA_CHAPTERS = set(TEST_CHAPTERS)
SYNTH_CHAPTERS = {"4", "7", "10", "13"}  # synthesis chapters get no separate test/PA


def school_days():
    closed = dict(CLOSURES)
    for a, b, label in CLOSURE_RANGES:
        d = a
        while d <= b:
            closed[d] = label
            d += timedelta(1)
    days, d = [], FIRST_DAY
    while d <= date(2028, 6, 30):  # walk well past LAST_DAY -- we WANT to see overflow
        if d.weekday() < 5 and d not in closed:
            days.append(d)
        d += timedelta(1)
    return days, closed


def week_index(all_days):
    weeks = {}
    for d in all_days:
        weeks.setdefault(d - timedelta(days=d.weekday()), []).append(d)
    order = {mon: i for i, mon in enumerate(sorted(weeks), 1)}
    return {d: order[d - timedelta(days=d.weekday())] for d in all_days}, order


def build_work_list(stretched=frozenset()):
    """Flatten CHAPTERS into (chapter, title, label, kind) meeting slots.

    `stretched` holds labels of normally-single-day assessments that must run
    over TWO meetings instead of one -- see stretch_over_minimum_days().
    """
    out = []

    def emit(ch, title, label, days, kind):
        if label in stretched:
            days = 2
        for k in range(days):
            suffix = f" (day {k+1}/{days})" if days > 1 else ""
            out.append((ch, title, f"{label}{suffix}", kind))

    for ch, title, items in CHAPTERS:
        for label, days, kind in items:
            emit(ch, title, label, days, kind)
        # ORDER MATTERS: the paired Group PA comes FIRST, then the individual
        # Test -- same pattern as the Intro Stats calendar. Students work the
        # material collaboratively before being assessed on it alone, so the
        # group assessment doubles as the review for the individual one.
        if ch in GROUP_PA_CHAPTERS:
            emit(ch, title, f"Ch {ch} Group PA", 1, "group_pa")
        if ch in TEST_CHAPTERS:
            emit(ch, title, f"Ch {ch} Test", 1, "test")
    return out


def stretch_over_minimum_days(odd_days):
    """Resolve minimum-day collisions by STRETCHING, not by shuffling.

    Assessments are one meeting by default. When one lands on a minimum day --
    school in session but every period shortened -- it cannot be done justice in
    the time available. Rather than swapping it with a neighbouring lesson (which
    reorders content to work around a calendar quirk), that single assessment is
    given TWO meetings: the shortened day becomes its briefing/kickoff half and
    the following full meeting carries the build and demo. Only that one
    assessment grows, and only in the years the collision actually occurs.

    Costs one meeting per collision, so it draws down the schedule's slack.

    Iterates because stretching shifts every later meeting and can create a new
    collision further down the calendar.
    """
    stretched = set()
    for _ in range(8):
        work = build_work_list(stretched)
        assigned = place(work, odd_days, quiet=True)
        new = set()
        for d, (ch, _t, label, kind) in assigned:
            if (d in MINIMUM_DAYS and kind in NEEDS_FULL_PERIOD
                    and "(day " not in label):
                new.add(label)
        if not new:
            return stretched, work, assigned
        stretched |= new
    raise SystemExit("minimum-day resolution did not converge -- check "
                     "MINIMUM_DAYS against the schedule by hand")


def last_slot_in_windows(odd_days, windows):
    """Index of the LAST odd-track meeting falling inside any of `windows`."""
    hits = [i for i, d in enumerate(odd_days)
            if any(a <= d <= b for a, b in windows)]
    if not hits:
        raise SystemExit(f"no odd-track meeting falls inside {windows} -- "
                         "the finals cannot be anchored; check the calendar data")
    return hits[-1]


def place(work, odd_days, quiet=False):
    """Map work items onto meeting dates, ANCHORING each semester's final exam
    to its district finals window instead of letting sequence position decide.

    Why this exists: the S1 close used to be placed purely by its position in
    CHAPTERS, so it landed correctly only as long as Chapters 1-5 happened to
    total the right number of meetings. Adding one closure (Oct 5) shifted the
    whole rotation and silently pushed the Semester 1 final to Jan 4 -- AFTER
    winter break. Anchoring makes that class of failure impossible: the finals
    are pinned first and content flows around them.

    Any meetings left over between the end of a semester's content and the
    start of its review project become explicit BUFFER slots -- catch-up days,
    which a real classroom always needs anyway.
    """
    s1 = [i for i, w in enumerate(work) if w[0] == "S1"]
    s2 = [i for i, w in enumerate(work) if w[0] == "S2"]
    s1_end = last_slot_in_windows(odd_days, FINALS_WINDOW[:1])
    s2_end = last_slot_in_windows(odd_days, FINALS_WINDOW[1:])

    slots = {}                                   # slot index -> work item
    for off, i in enumerate(reversed(s1)):       # S1 block ends on its final
        slots[s1_end - off] = work[i]
    for off, i in enumerate(reversed(s2)):
        slots[s2_end - off] = work[i]

    def fill(items, lo, hi, label):
        """Place `items` into the EARLIEST free slots in [lo, hi).

        Left-aligning puts any surplus at the END of the range -- i.e. as
        catch-up meetings immediately before that semester's review project.
        That is where buffer is worth having: it absorbs a semester's
        accumulated slippage right where the deadline is. Right-aligning would
        bank the buffer at the start of the semester and leave content running
        flush into the final, which is the opposite of useful.
        """
        free = [s for s in range(lo, hi) if s not in slots]
        if len(items) > len(free):
            raise SystemExit(
                f"{label}: needs {len(items)} meetings, only {len(free)} "
                f"available before its finals window. Cut content or move the "
                f"semester boundary.")
        for slot, item in zip(free, items):
            slots[slot] = item
        return len(free) - len(items)

    pre = [w for w in work[:s1[0]]]
    mid = [w for w in work[s1[-1] + 1:s2[0]]]
    buf1 = fill(pre, 0, min(slots), "Semester 1 content (Ch 1-5)")
    buf2 = fill(mid, s1_end + 1, s2_end - len(s2) + 1, "Semester 2 content (Ch 6-13)")
    if (buf1 or buf2) and not quiet:
        print(f"Buffer/catch-up meetings: {buf1} in Semester 1, {buf2} in Semester 2")

    # --- keep whole-period work off minimum days -------------------------
    # Minimum-day handling lives in stretch_over_minimum_days(); by the time
    # place() is called with the final work list, any single-day assessment that
    # would have collided has already been given a second meeting. All that is
    # left to do here is report what remains on a minimum day, so the situation
    # is never silent.
    if not quiet:
        for s in sorted(slots):
            if odd_days[s] not in MINIMUM_DAYS:
                continue
            ch, _t, label, kind = slots[s]
            note = ("first/last day of a multi-day block, fine on a short period"
                    if kind in NEEDS_FULL_PERIOD else "ordinary lesson")
            print(f"  minimum day {odd_days[s]:%b %d, %Y}: {label} ({note})")

    out = []
    for s in range(max(slots) + 1):
        d = odd_days[s]
        out.append((d, slots.get(s, ("--", "Buffer", "— buffer / catch-up —", "buffer"))))
    return out


def main():
    all_days, closed = school_days()
    # ODD track only: every other school day, starting day 1 = odd.
    odd_days = [d for i, d in enumerate(all_days, 1) if i % 2 == 1]

    real_odd_before_last_day = [d for d in odd_days if d <= LAST_DAY]
    stretched, work, _ = stretch_over_minimum_days(odd_days)
    for label in sorted(stretched):
        print(f"  STRETCHED to 2 meetings (lands on a minimum day): {label}")

    slack = len(real_odd_before_last_day) - len(work)
    print(f"Real odd-day meetings, FIRST_DAY..LAST_DAY (the actual school year): {len(real_odd_before_last_day)}")
    print(f"Content meetings needed (all chapters, incl. tests/PAs): {len(work)}")
    print(f"{'SLACK' if slack >= 0 else 'OVERFLOW'}: {abs(slack)} meetings "
          f"{'spare' if slack >= 0 else 'beyond the real last day of school'}")

    wk, order = week_index(odd_days)
    assigned = place(work, odd_days)
    last_item_date = assigned[-1][0]
    delta = (last_item_date - LAST_DAY).days
    print(f"Last content meeting (Ch 13): {last_item_date:%A, %B %d, %Y}")
    print(f"That is {abs(delta)} calendar days {'AFTER' if delta > 0 else 'BEFORE'} "
          f"the real last day of school ({LAST_DAY:%B %d, %Y}).")

    # Emit the full markdown calendar (overflowing rows clearly marked).
    out_lines = []
    a = out_lines.append
    a("# CSCI 4 - 2026-27 Assignment Calendar (odd-day schedule)")
    a("")
    a(f"**Modeled meetings needed: {len(work)}. Real odd-day meetings available through the actual last day of school ({LAST_DAY:%b %d, %Y}): {len(real_odd_before_last_day)}. Overflow: {len(work) - len(real_odd_before_last_day)} meetings ({(last_item_date - LAST_DAY).days} calendar days past the real last day of school, finishing {last_item_date:%A, %B %d, %Y}).**")
    a("")
    a("Rows past the real last day of school are marked **(PAST LAST DAY)** -- they represent content that does not fit in the current calendar as scheduled, not a proposal to extend the school year.")
    a("")
    a("| # | Ch | Title | Assignment | Wk | Date | |")
    a("|---:|---:|---|---|---:|---|---|")
    for i, (d, (ch, title, label, kind)) in enumerate(assigned, 1):
        past = " **(PAST LAST DAY)**" if d > LAST_DAY else ""
        m = "**" if kind in ("test", "group_pa", "synthesis", "review_project", "final") else ""
        mind = " ⚠ MIN DAY" if d in MINIMUM_DAYS else ""
        a(f"| {i} | {ch} | {title} | {m}{label}{m} | {wk[d]} | {d:%a %b %d, %Y}{mind} |{past}")
    out_path = Path(__file__).resolve().parent / "cs_schedule_output.md"
    out_path.write_text("\n".join(out_lines), encoding="utf-8")
    print(f"wrote {out_path}")

    write_course_schedule(assigned, wk, slack, last_item_date, len(real_odd_before_last_day))


def write_course_schedule(assigned, wk, slack, last_item_date, n_available):
    """Emit the standalone, human-facing cs_course_schedule.md at the repo root.

    Same data as the Part B table, but grouped by chapter with semester breaks,
    closures and finals windows called out -- the at-a-glance view.
    """
    sem1 = [(d, w) for d, w in assigned if d <= SEM1_END]
    closed = dict(CLOSURES)
    for a, b, label in CLOSURE_RANGES:
        d = a
        while d <= b:
            closed.setdefault(d, label)
            d += timedelta(1)

    L = []
    a = L.append
    a("# Introduction to Computer Science — 2026-27 Assignment Calendar")
    a("")
    a("## CSCI 4 — Introduction to Programming Concepts and Methodologies")
    a("")
    a("_JavaScript + shPlay + JSCAD. **CS meets on odd days only** (single track). Book-native "
      "numbering: Unit N = book Chapter N, module N.S = Chapter N §N.S._")
    a("")
    a("> **GENERATED FILE — do not hand-edit.** Produced by `scripts/cs_schedule.py`; run "
      "`PYTHONUTF8=1 python scripts/cs_schedule.py` to regenerate. Any change to the section list, a "
      "day count or a pairing shifts every later date, so hand-patching rows corrupts the rest. The "
      "same data drives PART B of `curriculum-plan.md`.")
    a("")
    a(f"**{len(assigned)} meetings needed · {n_available} "
      f"available · {abs(slack)} spare.** Content ends **{last_item_date:%a %b %d, %Y}**, "
      f"{abs((last_item_date - LAST_DAY).days)} days before the last day of school "
      f"({LAST_DAY:%b %d, %Y}).")
    a("")
    a("**Assessment types**")
    a("")
    a("- **Ch N Test** — 1-day *individual* chapter test (in-class, closed book). Every content "
      "chapter; none on the synthesis chapters.")
    a("- **Ch N Group PA** — 1-day *paired* performance assessment (design + build + demo). Every "
      "content chapter.")
    a("- **Synthesis project** — Chapters 4, 7, 10 and 13. Assessed **individually**, and therefore "
      "not a substitute for a chapter's Group PA.")
    a("- **Semester finals** are not rows below — S1 falls in the Dec 14–17 window (which collides "
      "with meetings 41–42); S2 goes in the spare meetings after the capstone.")
    a("")
    a(f"## Semester 1 — through {SEM1_END:%b %d, %Y} ({len(sem1)} meetings)")
    a("")

    cur_ch, in_sem2 = None, False
    prev_date = None
    for i, (d, (ch, title, label, kind)) in enumerate(assigned, 1):
        if not in_sem2 and d > SEM1_END:
            in_sem2 = True
            a("")
            a(f"## Semester 2 — from {d:%b %d, %Y} ({len(assigned) - len(sem1)} meetings)")
            a("")
            cur_ch = None
        if ch != cur_ch:
            cur_ch = ch
            a("")
            a(f"### Chapter {ch}: {title.replace(' -- ', ' — ')}")
            a("")
            a("| # | Meeting | Wk | Date |")
            a("|---:|---|---:|---|")
        # surface any closure that fell between the previous meeting and this one
        if prev_date:
            gap = prev_date + timedelta(1)
            seen = []
            while gap < d:
                if gap in closed and closed[gap] not in seen:
                    seen.append(closed[gap])
                gap += timedelta(1)
            for lbl in seen:
                a(f"| | _{lbl} — no school_ | | |")
        prev_date = d
        mark = "**" if kind in ("test", "group_pa", "synthesis", "review_project", "final") else ""
        shown = label if kind in ("test", "group_pa", "review_project", "final") else (
            "§" + label if label[0].isdigit() else label)
        shown = shown.replace(" + ", " + §") if (kind == "pair") else shown
        mind = " — ⚠ **minimum day, shortened period**" if d in MINIMUM_DAYS else ""
        a(f"| {i} | {mark}{shown}{mark} | {wk[d]} | {d:%a %b %d, %Y}{mind} |")

    a("")
    a("---")
    a("")
    a(f"_Generated {len(assigned)} meetings. Assignment-level detail (A#.#.# labs, quizzes, written "
      f"pieces) lives in `curriculum-plan.md`; this file is meeting-by-meeting pacing only._")

    p = Path(__file__).resolve().parent.parent / "cs_course_schedule.md"
    p.write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"wrote {p}")


if __name__ == "__main__":
    main()
