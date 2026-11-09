# Hill climb stop note — 2026-11-09

Stopped at the owner's request after climb 3, round 5. Merge the six UI commits
6082be53 through 5ea2c010 into cs-3d, preserving its newer library, sharing,
texture, and drawer-resizing work. No further UI rounds or deployment are part
of this stop.

## Result and measurement limits

The final paired desktop review (Sol + Kimi, high effort, 21 screens) preferred
the revised layout 27 times, the prior layout 6 times, with 9 ties: 13/21 screens
won. Mean score rose from 6.80 to 7.25 on that two-judge scale; 12/21 screens
reached 7.5. Controls had zero score error and both mirrored pairs were consistent.
Opus could not start because of MCP registration timeouts. The all-three-judge
7.5 target has not been achieved. Do not compare the two-judge 7.25 directly with
the earlier three-judge desktop mean of 6.56. The earlier phone mean was 6.68;
the final desktop system pass did not remeasure phone screens.

The video viewport cap was added after the paired review and has not been
rejudged. The reported video score of 5.62 describes the earlier overflowing
version, not the final cap.

## Kept improvements

- Shared desktop frame, aligned headers and account columns, useful lesson
  outlines, readable prose, wider embedded runners/slides, and capped video.
- Teacher class grid, aligned tabs, schedule wrapping, and clearer gradebook
  headers, state chips, scrolling cue, and edge treatment.
- Lab task-comment folding without changing lesson requirements, content-sized
  console panes, phone toolbar groups and visible Output, readable editor
  comments, and a clearer tool rail with a desktop gutter.
- Grading-weight saves compare against the last server-confirmed value and
  expose Saving / Saved / Not saved states. The earlier round verified a PUT
  and reload in a browser; this is a functional fix as well as presentation.

## Lessons and remaining gaps

The first desktop layout attempt lost 32–11. A redundant Lesson details card
pushed the main content down; replacing it with a useful outline and correcting
home search, account alignment, and schedule clipping improved the result.
Side content must earn its space and must not delay the main task. Phone Output
must contain visible content above the dock; a prior task-collapse attempt was
reverted after it pushed Output below it. Do not bulk-rewrite starter comments:
they can contain requirements absent from task cards.

Future work, if explicitly resumed: cramped gradebook columns (6.38), wrapped
schedule names/counts and uneven rows (6.62), rejudge the capped video, restore
the third judge, and include light-theme coverage. These are recorded gaps,
not authorization to continue the climb.

## Merge validation

The earlier round reported a passing TypeScript check and git diff --check.
The merged tree passed TypeScript (tsc --noEmit --incremental false -p .),
git diff --cached --check, editor-task-fold,
teacher-views (43 checks), gradebook-cell, lesson-view, library-share (32 checks),
and share-choice (63 checks). CSS additions from both branches were retained;
the drawer keeps drag-time transition suppression while adopting the climb's
rail width and state styling. The test command retains cs-3d's newer coverage
and adds the task-fold test.
