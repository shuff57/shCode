## The Class Flowchart Convention

**What you'll learn:**
- When you are required to draw a flowchart, and why it comes first
- The eight checks the editor runs, and what each one is complaining about
- What the checker cannot see, and how big a chart should get

This is the companion to the style guide, and it works the same way: a short set of rules, handed out once, applied to everything after. Keep it somewhere you can find it.

### The rule

**Every graded build opens with a flowchart, and the flowchart is submitted before the code is.** Not alongside. Before.

| What you're building | Where the chart goes |
|---|---|
| A challenge or lab | Its own lesson, right before the coding one. The coding lesson stays locked until the chart is green. |
| A paired project | The design third of design → build → demo, drawn together before either partner types. |
| A chapter test | The opening item of Part D — chart the solution, then write the code for it. |
| A synthesis project | A required deliverable, reviewed before build days start. |

Three reasons this is a rule and not a suggestion:

1. **It is the cheapest debugging you will ever do.** A missing `else` costs thirty seconds to spot on a diagram and forty minutes to spot in code you have already grown attached to.
2. **A finished program proves you can code. A chart dated before the code proves you can design.** Those are different skills and the course grades both.
3. **It cannot be faked afterwards.** A flowchart drawn after working code is a transcript, not a plan, and it reads exactly like one.

You will want to skip it. The first few times, the chart will feel slower than just starting. That feeling goes away around the third project, usually the one where the chart catches something.

### The eight checks

Press **Check my diagram** and the editor runs these in your browser. They are free, instant, and you can run them as often as you like — there is no penalty for being red.

| Check | Green when |
|---|---|
| `one-start` | Exactly one shape has no arrow coming into it, and it is an oval |
| `has-end` | At least one oval has arrows in and none out |
| `all-labeled` | No shape is blank |
| `no-orphans` | No shape floats with no arrows at all |
| `decision-two-exits` | Every diamond has exactly two arrows leaving it |
| `decision-labeled` | Every arrow out of a diamond carries a label — in this class, `yes` or `no` |
| `connector-pairs` | Every connector letter appears exactly twice |
| `reaches-end` | Following the arrows from Start actually gets you to an End |

An assignment may add a floor on top — "at least one diamond", "at least six shapes". Those are that assignment's requirements, not part of the convention.

**One mistake often lights up several checks.** A shape you forgot to connect is both an orphan *and* a second thing with no arrow into it, so `no-orphans` and `one-start` both go red, and `reaches-end` gives up because it no longer knows where to begin. Read all the red lines, look for the single idea behind them, and fix that.

### What the checker cannot see

All eight can be green on a chart that is wrong. The checker knows whether your drawing is a *legal flowchart*. It has no idea whether it solves the problem you were given.

Nobody is checking automatically that:

- the question in your diamond is the right question
- the `yes` path is the one that should do the thing
- your steps are in an order that works
- the chart matches the code you eventually write

Those are read by a person, or by the AI grader on assignments that have one. Green means "this is a flowchart." It does not mean "this is correct."

### How big

**Under twenty shapes.** If a chart needs more, that is the chart telling you the program should be broken into pieces — which is a real finding, not a nuisance. From module 3.1 you will have a shape for "call something defined elsewhere", and that is the tool for it.

Going the other way: a chart of four shapes in a row with no decision in it is not worth drawing. If the program does not branch or repeat, pseudocode says the same thing faster.

### Shapes you may use, and when

Only the ones that have been released. A shape you have not been taught yet may not appear on a test or a required deliverable.

| Shape | Released |
|---|---|
| Oval, rectangle, diamond | **now** — 1.5 |
| Parallelogram (input/output) | now, optional — the toolbar shows it, nothing requires it |
| Hexagon (loop setup) | 2.2, with `for` and `while` |
| Double-rail (function call) | 3.1, with functions |
| Circle (connector) and bracket (note) | 4.1, on the first chart too big for one page |

**Do not invent shapes.** Real flowchart notation has dozens more — documents, drums, manual input — and this course never uses them. Someone reaching for one has almost always mis-sized a rectangle.
