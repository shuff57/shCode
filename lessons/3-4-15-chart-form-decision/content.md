## Chart the Code: Decision Tree for Form Choice

**What you'll practise:**
- Charting a rule you already know as a decision tree
- Asking one question per diamond, never two
- Sending every path to the same End
- Reading your chart back to find the case you forgot

So far you have charted code. This time you chart a **rule**: the choice between a function declaration and an arrow function. A rule that branches is a decision tree, and a decision tree is just a flowchart with words in the shapes.

### The rule

The book's advice is short. Use a **declaration** for the main, named operations of a program — the ones called from several places, where being callable from anywhere in the file is convenient. Use an **arrow function** for short helpers and for anything passed as a callback, where its brevity pays for itself.

Two questions settle it: *is this a main operation called from several places?* and, if not, *is its body a single expression?*

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each |
| **Decision** (diamond) | "Called from several places?" then "Is the body a single expression?" |
| **Task** (rectangle) | Write a function declaration / write a one-line arrow with implicit return / write an arrow with a block body and an explicit `return` |
| **Input / Output** (parallelogram) | Reading in the function's job before the first question |

At least six shapes, at least two decision diamonds, at least two task rectangles.

### The three things that decide whether this is right

1. **One question per diamond.** "Is it a main operation?" and "is the body one expression?" are two diamonds, not one. A diamond with a compound question has no clean `yes`/`no`.
2. **Every label says which answer it follows.** The exits are `yes` and `no`, written on the arrow.
3. **All paths reach the same End.** The forms are different choices, not different programs — every one finishes at a single oval.

### The point of the lesson

A decision tree is only as good as the branch you forgot. Read your chart back with a concrete case: *"a helper that needs an `if` before it returns"* — the first question sends it away from the declaration, the second sends it to the block-body form, because its body is more than one expression. That case must not be trapped under a diamond it can never leave.

### Before you submit

Press **Check my diagram**, then walk three cases through it by hand: a named `main()` called from five places; a one-expression callback; a helper that needs several statements. Every case must reach an End and must land on exactly one form. If any case dead-ends, the chart is wrong even if every check is green.

That hand-walk is the actual test here. The checker cannot do it for you.
