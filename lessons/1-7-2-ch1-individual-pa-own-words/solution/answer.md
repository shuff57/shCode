# Reference answer — Part 2: In Your Own Words

A model answer, not the only correct one. A student's own wording earns full
marks as long as it hits the same ideas — the grader is told not to require
exact phrasing. See lesson.json → aiGrader.prompt for the actual rubric.

## 1. Umbrella activities

An umbrella activity runs alongside the whole project instead of happening at
one point in it, the way the framework activities (inception, elaboration,
construction, deployment) do. Configuration management is one — it tracks
every version of the code from the first day to the last. Skip it and nobody
can say which version is actually running, or roll back to one that worked.

## 2. What is still wrong with this?

The comments are worse than useless — `// set x` just restates the line it
sits above, so a future reader who wanted to know *why* z is computed learns
nothing they could not already see. And the calculation itself is wrong: it
multiplies x by x instead of x by y, so it prints 156.25 instead of the
correct 37.5 — whoever reads that output trusts a number that was never the
answer to the problem.

(Two other real faults would also earn full marks paired with the comments
one: the names x, y and z say nothing about what they hold, or the printed
number has no label saying what it is. Any two of the four, as long as one is
the comments, is a complete answer — see lesson.json → aiGrader.prompt.)

## 3. High and low

A high-level language reads close to English and hides what the machine is
actually doing underneath; a low-level language sits close to what the
processor executes, and the programmer has to manage more of it by hand. A
team writing a device driver might choose the low-level language anyway,
because it gives them tight control over memory and speed that a high-level
language would abstract away.
