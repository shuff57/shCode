## A3.1.0: Chart Before You Refactor

**What you'll practise:**
- Planning a refactor as a picture before touching the code
- Deciding what becomes a function *before* you write one
- Making every shape on the chart something that will exist in the code

This is the gate for the refactor lab. The chart comes first: that is the whole convention, and this is the run where it pays for itself most obviously, because a refactor is a plan about structure and structure is exactly what a chart shows.

### The task

Take the grade-advisor program you wrote earlier: it reads a score, decides a letter grade, and prints some advice.

Right now it is one long run of statements. You are about to break it into at least two named functions. **Decide which two here, on the chart, before you open the editor.**

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Function call** (double rail) | Each function you plan to write: press **+ more shapes** |
| **Task** (rectangle) | Steps that stay in the main program |
| **Decision** (diamond) | Any choice the main program still makes itself |
| **Input / Output** (parallelogram) | Reading the score, printing the advice |

The chart needs at least seven shapes and at least one decision.

### The rule that makes this real

**Every `[[ ]]` on your chart must exist as a real function in your code, and every function in your code must appear as a `[[ ]]` on your chart.** One to one, both directions.

That is what makes this a plan rather than a drawing. When you finish the lab, you should be able to hold the two side by side and point at each shape's function by name.

If you change your mind while coding, and you might, that is normal: come back and change the chart. A design that was quietly abandoned is the actual problem; a design that was updated is just design.

### Two traps

**Do not draw the function bodies.** A double-rail is one step. What is inside it is a different chart, or no chart. If you find yourself drawing three rectangles hanging off a `[[ ]]`, you have undone the decomposition you were supposed to be planning.

**Do not make every step a function.** Two or three named functions on this program is right. Ten is a chart where nothing happens in the main program, which is its own kind of unreadable. A function is worth naming when it does something you can name: `decideGrade`, `printAdvice`, not merely when a line exists.

### Before you submit

Press **Check my diagram**. Ten checks run here: the usual eight, plus at least one decision and at least seven shapes.

Green does not mean your decomposition is good. It means the chart is a legal flowchart. Whether `decideGrade` is the right seam to cut along is the thing your teacher will actually read it for, and the thing you will find out for yourself the moment you start writing the code.
