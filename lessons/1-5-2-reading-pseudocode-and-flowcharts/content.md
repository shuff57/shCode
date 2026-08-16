## Pseudocode and Flowcharts

**What you'll learn:**
- How to write an algorithm in structured English before writing any code
- The three flowchart shapes and what each one means
- Why the diamond is the shape worth studying

An **algorithm** is a precise sequence of steps. You have one in your head the moment you understand a problem — the difficulty is getting it out of your head accurately enough that somebody else, or a computer, can follow it.

There are two standard ways to write one down, and neither is code. Both come before code.

### Pseudocode

**Pseudocode** is the algorithm written as ordinary language, arranged in the shape a program has. It borrows a few keywords — `START`, `INPUT`, `OUTPUT`, `IF`, `THEN`, `ELSE`, `END` — and uses indenting to show what belongs inside what. Nothing else about it is fussy. It does not run, no compiler checks it, and there is no punctuation to get wrong.

Here is a rule about voting age, written as pseudocode:

```
START
INPUT age
IF age >= 18 THEN
    OUTPUT "You may vote"
ELSE
    OUTPUT "Too young to vote"
END IF
END
```

Read it aloud and it is just English with the shape showing. That shape is the point: the indent under `IF` is doing the same job that curly braces will do later.

### Flowcharts

A **flowchart** is the same plan drawn as a picture — boxes for steps, arrows for the order they happen in. Where pseudocode is quicker to write, a flowchart is easier to *see*, which matters as soon as a program starts making choices.

**Three shapes carry nearly every flowchart:**

| Shape | Name | Means |
|---|---|---|
| Oval | **Terminal** | Start or end |
| Rectangle | **Process** | A step — do this |
| Diamond | **Decision** | A question with two exits, labelled `yes` and `no` |

That is the whole vocabulary for now. Your toolbar shows a fourth — a parallelogram for input and output — and hides four more behind **+ more shapes**. They arrive in later sections, and nothing you are assessed on this chapter needs them.

Here is the voting pseudocode above, drawn:

```flow readonly caption="Figure 1.5.1 — the voting rule as a flowchart. Same algorithm as the pseudocode, same order, drawn instead of written."
flowchart TD
  A([Start]) --> B[get the age]
  B --> C{age >= 18}
  C -- yes --> D[print "You may vote"]
  C -- no --> E[print "Too young to vote"]
  D --> F([End])
  E --> F
```

### The diamond is the shape worth studying

It has **one way in and two ways out**, and the two paths **join up again afterwards**. That is the whole idea of a choice, drawn.

Two rules follow from it, and almost every broken flowchart breaks one of them:

**Both exits must be labelled.** A question has two answers, so say which arrow is which. An unlabelled branch is the fastest way to make a chart unreadable — every shape is correct and a reader still cannot tell which way `true` goes.

**Both branches must come back together.** A flowchart whose paths never meet again has two endings, and two endings almost always means a step was forgotten. In the figure above, both prints lead to the same End oval.

### Which one should you use?

Either. Most programmers reach for pseudocode by default and draw a flowchart when a piece of logic gets tangled enough that they cannot hold it in their head.

| | Better at |
|---|---|
| **Pseudocode** | Writing quickly; sitting right next to the code it becomes |
| **Flowchart** | Showing branching and looping at a glance; explaining a program to someone else |

### Try it

Nothing here is graded or saved. Drag the shapes, add one from the toolbar, double-click anything to retype it.

```flow height=420
flowchart TD
  A([Start]) --> B[get the temperature]
  B --> C{is it above 30}
```

**Worth trying:** the chart above is unfinished — the diamond has one exit and no labels. Give it both answers and an End, and notice how much of the work is deciding what happens on the `no` path.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **algorithm** | A precise sequence of steps for solving a problem |
| **pseudocode** | An algorithm written in structured English, using keywords and indenting |
| **flowchart** | A diagram of a program's steps: shapes for kinds of step, arrows for order |
| **terminal (oval)** | The shape that starts or ends the chart |
| **process (rectangle)** | A step the program carries out |
| **decision (diamond)** | A question with one way in and two labelled ways out |
