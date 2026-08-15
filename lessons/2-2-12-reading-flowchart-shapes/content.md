## Flowchart Shapes

**What you'll learn:**
- What each of the four flowchart shapes means
- Why a decision diamond always has exactly two labelled exits
- How to read a flowchart from Start to End without guessing

You have written algorithms as numbered steps, and you have seen one drawn as a picture. Before you draw your own, you need the vocabulary — because in a flowchart, **the shape is the meaning**. A reader who knows the shapes can follow your plan without you standing next to them explaining it.

### The four shapes

| Shape | Name | Use it for |
|---|---|---|
| Oval | **Start / End** | The single place the program begins, and the place it finishes. |
| Rectangle | **Task** | Something the program *does*: set a value, calculate, print. |
| Diamond | **Decision** | A yes/no question. Exactly two arrows leave it. |
| Parallelogram | **Input / Output** | Optional. Getting something in, or sending something out. |

Arrows carry the order. Every arrow points from the step that just happened to the step that happens next.

These four cover almost everything you will draw this year. The toolbar hides four more behind **+ more shapes** — a *function call*, a *loop setup*, a *connector*, and a *note* — and you will meet each one in the unit that needs it. Ignore them until then.

### The two rules that matter

**One Start, one End.** A flowchart has exactly one shape with no arrow coming into it — that is where a reader begins. Every path eventually arrives at an End oval. If you can start in two places, nobody knows which is the real beginning.

**Every diamond has two labelled exits.** A question has two answers, so exactly two arrows leave a diamond, and each one says which answer it follows: `yes` and `no`. An unlabelled branch is the single most common way a flowchart becomes unreadable — the shapes are all correct, but a reader cannot tell which way "true" goes.

Here is the same voting example the book uses, drawn with all four rules applied:

```flow readonly caption="Figure 2.2.2 — the voting check. One Start, one End, and both exits of the diamond say which answer they follow."
flowchart TD
  A([Start]) --> B[/get the age/]
  B --> C{age >= 18}
  C -- yes --> D[print "You may vote"]
  C -- no --> E[print "Too young"]
  D --> F([End])
  E --> F
```

Read it out loud, following the arrows: *start, get the age, is the age 18 or more? If yes, print "You may vote". If no, print "Too young". Either way, end.* That sentence is the algorithm — the picture just makes the branch visible at a glance.

### Try it

The canvas below is yours to play with. Nothing here is graded and nothing is saved to your teacher — drag the shapes around, add a few from the toolbar, draw an arrow between two of them, and double-click anything to type on it.

```flow height=440
flowchart TD
  A([Start]) --> B[wake up]
  B --> C{is it a school day?}
  C -- yes --> D[get dressed]
  C -- no --> E[go back to sleep]
```

**Things worth trying:**
- Drag a new **Task** from the toolbar and drop it *on an arrow* — it inserts itself into the path.
- Click an arrow, then drag the pink dot on its end onto a different shape to re-point it.
- Delete the `no` label and notice how much harder the chart is to read without it.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **flowchart** | A diagram of a program's steps, using shapes for kinds of step and arrows for order |
| **terminal** | The oval that starts or ends the chart |
| **decision** | The diamond holding a yes/no question |
| **branch** | One of the two paths leaving a decision |
| **path** | The route a reader follows from Start to End |
