## The Class Plan Convention

**What you'll learn:**
- When you are required to plan before you code, and why the plan comes first
- What a plan looks like in this course, and which flowchart shapes you will meet
- What the checks on a plan can and cannot see

This is the companion to the style guide, and it works the same way: a short set of rules, handed out once, applied to everything after. Keep it somewhere you can find it.

### The rule

**Every graded build opens with a plan, and the plan is submitted before the code is.** Not alongside. Before.

| What you're building | Where the plan goes |
|---|---|
| A challenge or lab | Its own lesson, right before the coding one. You write the plan in pseudocode, and the coding lesson is where it gets built. |
| A paired project | The design third of design → build → demo, written together before either partner types. |
| A chapter test | The opening items of the test: outline the solution, write the steps, then write the code for it. |
| A synthesis project | A required deliverable, reviewed before build days start. |

Three reasons this is a rule and not a suggestion:

1. **It is the cheapest debugging you will ever do.** A missing `else` costs thirty seconds to spot in a plan and forty minutes to spot in code you have already grown attached to.
2. **A finished program proves you can code. A plan dated before the code proves you can design.** Those are different skills and the course grades both.
3. **It cannot be faked afterwards.** A plan written after working code is a transcript, not a plan, and it reads exactly like one.

You will want to skip it. The first few times, the plan will feel slower than just starting. That feeling goes away around the third project, usually the one where the plan catches something.

### What a plan looks like

You write plans as **pseudocode**: plain English arranged like code, one instruction per line, indentation showing what sits inside what (1.5.19 and 1.5.20). On a plan lab the editor is a plain text box, and a card for each thing the plan must show turns green as your plan covers it. On a graded part, an AI reads your plan and tells you, criterion by criterion, whether it solves the problem you picked.

Many plan labs also show a **Flow Chart** bar above the editor. It is a read-only picture of the plan for a *different* problem, so you can see the shape before you write yours. You never draw one; you read it. Reading it uses the same three shapes you met in 1.5.25.

### Shapes you may meet, and when

Only the ones that have been released. A shape you have not been taught yet will not appear in a worked example before its lesson.

| Shape | Released |
|---|---|
| Oval, rectangle, diamond | **now**: 1.5 |
| Parallelogram (input/output) | now: this course adds it to the book's three, so a picture can show where a value comes in or goes out |
| Hexagon (loop setup) | 2.2, with `for` and `while` |
| Double-rail (function call) | 3.1, with functions |
| Circle (connector) and bracket (note) | 4.1, on the first chart too big for one page |

**Do not invent shapes.** Real flowchart notation has dozens more: documents, drums, manual input, and this course never uses them. Someone reaching for one has almost always mis-sized a rectangle.

### What the checks can and cannot see

A card that turns green means your plan *mentions* the right kind of thing: a number taken in, a question with a limit, a different report on each side. It can be fooled by a plan that says the right words in the wrong order.

Nobody is checking automatically that:

- the question in your `IF` is the right question
- the `yes` path is the one that should do the thing
- your steps are in an order that works
- the plan matches the code you eventually write

Those are read by a person, or by the AI grader on the parts that have one. Green means "this plan has the right pieces." It does not mean "this plan is correct," so walk one set of real numbers through it, and then a second set that goes the other way.

### How big

**Short.** If a plan needs more than about twenty lines, that is the plan telling you the program should be broken into pieces: which is a real finding, not a nuisance. From module 3.1 you will have functions for exactly that.

Going the other way: a plan of four lines in a row with no question in it is not worth a lab of its own. If the program does not branch or repeat, a few comments say the same thing faster.
