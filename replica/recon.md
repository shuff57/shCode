# Recon map: MyOpenMath gradebook (web, instructor view)

Scope: the instructor gradebook only (grid, student detail, attempt detail, settings, export). Not authoring, the question engine, or the student view.
For: ideas and UX patterns for shCode's own teacher gradebook.
Date: 2026-10-05
Method: read-only click-through of the author's own course (IM3-Huff-25-26, a finished 2025-26 class), no edits, no downloads, no network inspection. Screenshots are in `replica/screens/` (local only, git-excluded, they show real student names).

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | in-app help | https://www.myopenmath.com/help.php?section=usingimas | student topics only, nothing on the instructor gradebook |
| 2 | third-party summary | https://new.ccum.net/myopenmath-for-instructors.html | topic names only (gradebook use, changing grades, offline grades, totals) |
| 3 | own account walkthrough | course cid 285887 | the main source for this map |
| 4 | terms of use | not found | `/info/termsofuse.php` and `/info/privacy.php` are 404. Footer links a Privacy Policy and Accessibility page. **Terms check still open.** |

## Core loop

An instructor opens one page, sees every student against every assignment with totals, and can drill into any student or attempt to read work, override a score, or grant an exception.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Gradebook grid | `/course/gradebook.php?cid=` | whole class vs every item | control bar, filters, sortable table, category-colored columns, check boxes, With Selected menu | filled; collapsed/expanded categories; empty cell "-"; excused/not-counted marks |
| S02 | Offline Grades menu | grid control bar | add or manage scores recorded outside the system | menu: Add, Manage | open |
| S03 | Grade Book Settings | grid "Settings" | scoring mode and categories | radio (points earned/possible vs category weights), category table | filled |
| S04 | Student detail | click a name: `gradebook.php?cid=&stu=` | one student, all items | student switcher, Email, Message, Change Info, Login Log, Activity Log, Edit Offline Scores, gradebook comment, instructor note, item table, LatePass count | filled |
| S05 | Assessment detail | click a score: `/assess2/gbviewassess.php?stu=&cid=&aid=&uid=` | read an attempt and fix it | start/last-changed/time-on-screen, due date + Make Exception, Override score, Delete all attempts, per-attempt list, per-question score box, Full credit, Add feedback, Save Changes | filled |
| S06 | Export | grid "Export": `/course/gb-export.php?cid=&export=true` | download grades | 8 option selects, CSV and Excel buttons | default |
| S07 | Comments | grid "Comments": `gbcomments.php?cid=&stu=0` | gradebook comments for all students | not opened | not seen |
| S08 | Make Exception / Message / Print Report | With Selected menu | bulk actions on checked students | menu items | menu only, dialogs not opened |

## Flows

```
F01 See how the class is doing
    S01 (read totals, % and category columns)
    happy path clicks: 1 (from the course nav)
    edge: locked students, not-counted items hidden by default

F02 Check one student
    S01 -> click name -> S04
    happy path clicks: 1

F03 Read or fix one attempt
    S01 -> click a score -> S05 -> Override score or edit a question score -> Save Changes
    happy path clicks: 1 to read, about 4 to override

F04 Give someone more time
    S01 check boxes -> With Selected -> Make Exception
    or S05 -> Make Exception
    happy path clicks: 3 to 4

F05 Excuse a grade
    S04 check items -> Excuse Grade
    happy path clicks: 2 to 3

F06 Change how scores are counted
    S01 -> Settings (S03) -> edit categories or switch to category weights -> save
    happy path clicks: 2 plus form edits

F07 Export grades
    S01 -> Export (S06) -> pick options -> Download CSV
    happy path clicks: 3
```

## Layout notes (S01)

- One dense table. Name column with a count (N=26) and a "Show Locked / Hide Locked" select in the header.
- Then Total (points earned/possible) and %.
- Then category total columns, each tinted with the category's color, with a Collapse/Expand toggle that hides that category's items.
- Then one column per item: title, points, due date, and [Settings] / [Isolate] links. Cell value is the score, a link into S05.
- Cell marks: `-` no score, `x` excused, `(NS)` not counted, `e` exception, `(IP)` in progress. Color coding comes from the Color select.
- Control bar: Offline Grades, Export, Settings, Comments, Color, Toggles. Filters: Category, Not Counted (Show all / stu view / Hide all), Show (Past due / Past & Attempted / Available Only / Past & Available / All). Changing a filter reloads the page.
- Color select presets: none, pairs of cutoff percents (50/60 ... 85/95), "Active", "NC".
- Every header sorts on click.

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Data table | dense, sticky header, tinted columns | sorted, filtered | S01, S04 |
| Control link bar | links plus drop-down menus | open | S01, S04 |
| Filter select | Category, Not Counted, Show, Color | reload on change | S01, S04 |
| Row check box with With Selected menu | Message, Copy E-mails, Make Exception, Print Report | none, some, all checked | S01, S04 |
| Score cell | plain, linked, excused, exception, not counted, in progress | by suffix mark | S01, S04 |
| Category toggle | Collapse / Expand | collapsed, expanded | S01 |
| Inline button group | Override score, Delete, Full credit, Add feedback | default | S05 |
| Student switcher | drop-down on the name | | S04 |
| Settings form | radios, selects, numeric text, check boxes | | S03, S06 |

## Inferred data model

```
Course       id, name, gradebook mode (points | category weights)
             evidence: S03    confidence: high
Student      id, name, login info, locked flag, picture, last login
             evidence: S01 (Locked select), S04 header    confidence: high
Category     id, course_id, name, color, display (expanded|collapsed), scale (percent|points, target),
             max total %, calc (averaged percents), drop lowest n | keep highest n, fixed point total
             evidence: S03    confidence: high
Item         id, course_id, category_id, title, points, due date, counted flag
             evidence: S01 headers, S04 table    confidence: high
Attempt      id, student_id, item_id, started, last_changed, time_on_screen, score, submitted
             evidence: S05    confidence: high
QuestionScore attempt_id, question n, score, max, feedback
             evidence: S05    confidence: high
Override     student/item, score    evidence: S05 "Override score"    confidence: medium
Exception    student/item, new due date or extra attempt    evidence: Make Exception    confidence: medium
Excusal      student/item    evidence: S04 Excuse Grade    confidence: high
OfflineScore item-like entry with manual scores    evidence: S02, S04    confidence: medium
Comment      student_id, public comment + instructor note    evidence: S04, S07    confidence: high
LatePass     student_id, count    evidence: S04 "10 LatePasses available"    confidence: high
```

Relationships: Course 1-n Category, Category 1-n Item, Student n-n Course, Item 1-n Attempt, Attempt 1-n QuestionScore, Student 1-n Comment.

## Feature matrix

See `features.csv`.

## Out of scope (cannot or should not be cloned)

- MyOpenMath's question bank and the math engine that grades answers.
- LTI pass-back to other LMSs (the original's integrations).
- Its branding, copy and visual identity.
- Copying its source: the code is public GPL, and this project stays clean-room.

## Size

Screens 8 (6 seen in depth), flows 7, entities 11. Hard parts: category scoring rules (drops, scaling, caps, weighted vs points), a fast dense grid with filters and sorting at 26+ students by 60+ columns, exceptions and late passes affecting due dates, the per-attempt review page. Size: M for the grid, student detail and settings; L with attempt review and exceptions.

## Honest take for shCode

What it does well: one screen, no hidden state, color-tinted categories, 1-click drill-down to student or attempt, and plain-word cell marks. What is weak: unlabeled marks (`x`, `e`, `NS`) need a legend, filters reload the page, the Color setting is a cryptic list of number pairs, and settings sit on a separate page with a wall of per-category fields.

---

# Part 2: Aeries SIS Gradebook (web, teacher view)

Date: 2026-10-05. Method: read-only walkthrough of the author's own live section (3 - Int Statistics - Fall, 2026-27). No scores entered or changed, nothing saved. Screenshots `A01` to `A05` in `replica/screens/` (local only, show real names).
Terms: not checked. This is the district's system of record, used through the author's own teacher login. Check the district acceptable-use policy before relying on this.
Not reached: Manage > Options, Rules, Assignments, Final Marks tabs (tab clicks did not switch), the Reports menu, the assignment-header caret menu, cell editing.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | own account walkthrough | chicousd.aeries.net/teacher/gradebook/ | main source |
| 2 | Aeries knowledge base (linked from the Help icon) | https://support.aeries.com/support/solutions/articles/14000067732-gradebook-scores-by-class- | not read yet |

## Screens

| ID | screen | route | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| A01 | Scores by Class | `/teacher/gradebook/<id>/F/scoresByClass` | whole class vs all assignments | frozen name and grade columns, header per assignment, filter sets, legend | filled; green over-max; missing; comment flag; grading-complete |
| A02 | Top nav menus | Dashboard / Scores by Class / Assignments / Students / Reports / Manage | switching task | Assignments: searchable list plus Add Assignment, newest first. Students: picker of active students | open |
| A03 | Gradebook dashboard | `/teacher/gradebook` | pick a class | Tiles / List / Table view toggle; Add Gradebook, Mass Add Gradebooks, Add/Drop Students, Link Gradebooks, Copy Gradebook, Import Assignments From Google; list of current-term classes | filled |
| A04 | Scores by Student | `.../ScoresByStudent/<student>/<n>` | one student's every assignment | photo, name, letter grade and percent badge, next-student arrow, "Only show assignments missing scores", item table (category, due, correct/possible, %, points, comment, date completed, status, attendance on assigned/due date) | filled |
| A05 | Manage > Categories | `.../manage?optionTab=2` | category weights | tab bar: Edit Gradebook, Options, Categories, Assignments, Manage Students, Final Marks, Narrative Grades, Rules, Backups, Restore; "Doing Weighted Scoring" check; Name / Color / % of Grade table that must total 100 | filled |

## What Aeries does that MyOpenMath does not

- **Weighted categories as the main model.** Three categories (GROUP 10, HW 15, IND 75) that must add to 100. No per-category drop or scale here (not seen), unlike MyOpenMath.
- **Final grade as a letter plus percent** next to each name (Grd, %, Mark columns), which is what ends up on the report card.
- **Scores over 100%.** Cells above max turn green ("# Correct > Max").
- **Legend row** for every cell color or mark: Att Info, Comment/Status Info, Missing, # Correct > Max, Max = 0, Inactive Student, Grading Complete, Transfer Grade. MyOpenMath has no legend.
- **Attendance on the assigned and due date** per assignment (A04), tying the gradebook to attendance.
- **Filter Sets**: save a named combination of category filters and reuse it.
- **Sort controls** (student name, assignment due date) and toggles: Show Filters, Show Trend, Show Formative/Summative Indicator, "Override Not Applicable / Transfer Grades".
- **Per-student letter-grade badge** and a next-student arrow on the student page.
- **Housekeeping at class level**: Link Gradebooks (one gradebook across sections), Copy Gradebook, Mass Add, Import Assignments From Google, Backups and Restore.
- **Narrative Grades and Final Marks** tabs (district reporting; not seen open).

## What MyOpenMath does better

- Cell marks sit in the cell (`x`, `e`, `(NS)`) instead of corner flags, and the category tint is clearer.
- One click from a score into the attempt, with per-question scores. Aeries scores are manual, with no work behind them.
- Export is a visible one-click page.
- Faster to scan: smaller, simpler grid.

## Aeries weak spots (opportunities)

- The grid is very wide; assignment titles truncate in headers ("Definitions of S...").
- Tiny corner triangles carry meaning with no label until you hover.
- Settings are in a separate tabbed page with ten tabs.
- Menus are click-to-open, with no hover preview.
- Missing work is colored but there's no quick "who is missing what" summary on the grid itself (it lives in the per-student checkbox).

## Entities Aeries adds

```
FinalMark      student, term, mark, percent   evidence: A01 Grd/%/Mark   confidence: high
AttendanceInfo student, assignment date       evidence: A04 "Att on Assigned/Due Date"   confidence: medium
FilterSet      name, category filters         evidence: A01   confidence: medium
LinkedGradebook gradebook group across sections   evidence: A03, A05 note   confidence: medium
```

## Merged takeaway for shCode

Take from MyOpenMath: cell-level states in plain marks, category tints with collapse, one-click drill into the work, page-level filters.
Take from Aeries: a legend, a letter-and-percent per student, saved filter sets, over-max shown clearly, a next-student arrow on the student page, class-level copy/link tools.
Avoid from both: wide truncated headers, unlabeled corner marks, color settings that need a manual, settings split from the grid.
