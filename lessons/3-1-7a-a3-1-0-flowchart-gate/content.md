## Plan Before You Refactor (A3.1.0)

**What you'll practise:**
- Planning a refactor in pseudocode before touching the code
- Deciding what becomes a function *before* you write one
- Making every function in the plan a real function in the code, and the other way round

This is the gate for the refactor lab. The plan comes first: a refactor is a plan about structure, and structure is exactly what a short plan shows.

### The task

Take the grade-advisor program you wrote earlier: it reads a score, decides a letter grade, and prints some advice. Right now it is one long run of statements. You are about to break it into at least two named functions. **Decide which two here, before you open the editor.**

### What to write

Under **FUNCTIONS**, one line per function: its name, a dash, what it does. Then the **main program** as numbered pseudocode: set up `score`, `attendance` and `lateAssignments`, then **call** each function by name. A call is one step. What is inside the function is not part of this plan.

The Flow Chart bar above the editor shows the same kind of plan for a different program, a pizza order. It is read-only.

### The rule that makes this real

Every function in your list is called in the main program, and every function the main program calls is in your list. One to one, both directions. When you finish 3.1.13, you should be able to hold the plan and the code side by side and point at each function by name. A design that was quietly abandoned is the problem; a design that was updated is just design.

### Two traps

**Do not write the function bodies.** If your main program has the else-if chain in it, you have undone the decomposition you were supposed to be planning.

**Do not make every step a function.** Two or three named functions is right. Ten is a plan where nothing happens in the main program.

### Before you submit

Press **Grade**. Green does not mean your decomposition is good: whether `decideGrade` is the right seam to cut along is what you find out the moment you start writing the code.
