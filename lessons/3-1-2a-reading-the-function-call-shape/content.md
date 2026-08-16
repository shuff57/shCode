## The Function-Call Shape

**What you'll learn:**
- The double-rail shape, and when to reach for it
- Why the function's body is *not* drawn hanging off it
- How to count what a function actually bought you

You have just written your first function. A new flowchart shape arrives with it — press **+ more shapes** in the toolbar to find it.

| Shape | Mermaid | Means |
|---|---|---|
| **Function call** (double rail) | `A[[greetUser()]]` | Run a whole sequence that is defined somewhere else, then come back |

It is a rectangle with a stripe down each side. The stripes are the point: an ordinary rectangle is *one step*, and this is *one step that is secretly many*.

### Flow goes in, and flow comes back

```flow readonly caption="Figure 3.1.1 — the double rail is one step in this chart. drawScore() has a whole chart of its own somewhere else, and this one does not care what is in it."
flowchart TD
  A([Start]) --> B[set score to 0]
  B --> C[[drawScore()]]
  C --> D[print "ready"]
  D --> E([End])
```

Read it: *start, set the score, draw the score, print ready, end.* The double-rail behaves like any other single step — one arrow in, one arrow out, and the chart carries straight on afterwards.

That "comes back" part is the whole idea of a function call, and it is the thing beginners are most often unsure about. Calling a function is not a detour you might not return from. It is a step that finishes, like every other step.

### The mistake to avoid

**Do not draw the function's body hanging off the double-rail.** The body is not part of this chart. It is either a separate chart of its own, or — most of the time — no chart at all, because it is short enough not to need one.

```
   WRONG                          RIGHT

   [[drawScore()]]                [[drawScore()]]
        │                              │
        ├── [clear the area]      [print "ready"]
        ├── [draw the number]
        └── [draw the label]
```

The version on the left has thrown away everything the function gained you. The whole reason to write `drawScore()` is so that the rest of the program can stop thinking about clearing areas and drawing labels.

### Count what it bought you

Here is the exercise worth doing in your head. Take a chart you drew before this module — one with a block of steps that appeared twice. Now redraw it with each repeated block collapsed into one `[[ ]]` shape.

**Count how many rectangles disappeared.** That number is the argument for functions, and it is more convincing than any explanation. Say it out loud.

This is also what makes a big chart manageable. The convention says stay under twenty shapes; from here on, the double-rail is how you get there. A chart that has grown to thirty boxes is usually a program that wants three functions.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **function call (double rail)** | A flowchart shape standing for a sequence defined elsewhere |
| **returns** | Flow comes back to the chart after the call finishes |
| **decomposition** | Breaking a problem into pieces — the double-rail is what it looks like drawn |
