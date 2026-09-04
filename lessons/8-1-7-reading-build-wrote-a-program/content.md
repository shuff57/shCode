## Build wrote a program

You've been building parts by pressing buttons: Box, Hole, Round, Hollow. The whole time, something else was happening in the background. reSHape was writing a **script** for you — the same part, spelled out as text, one line per step.

Switch to Code on any part you've built and you'll see it. A box you added shows up as `const box1 = box(40, 40, 20)`. Drill a hole in it, and a second line appears: `hole(box1, { across: 6 })`. The numbers in the text are exactly the numbers you typed into the Dimensions panel — not similar, not rounded. The same numbers.

Even the names line up. The timeline chip that reads "Box 1" becomes the variable `box1` in the Code. "Hole 1" becomes `hole1` if a later step needs to grab it again. reSHape didn't invent a separate naming scheme for Code — it just wrote down the names the timeline was already using.

```js
const box1 = box(40, 40, 20)
hole(box1, { across: 6 })
```

That's the whole part you've been building this unit, in two lines. Nothing is hidden and nothing gets lost in translation, because Build and Code aren't two different parts — they're one document, shown two ways. Every step you click gets written down, in order, as a line of Code you can read right back.

This matters starting with the next lesson: once a part exists as text, you can fix it by editing the text — find the number you want to change, and change it, without touching a single button.

**What you'll learn from it:**
- Every Build step becomes one line of Code, in the same order it was built.
- The numbers in the Code are exactly the numbers from the Dimensions panel.
- The names in the Code (`box1`, `hole1`) match the timeline chip names (Box 1, Hole 1).
- Build and Code show the same part — not two parts, one part, two views.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **script** | The part's steps, written as text instead of clicked with a mouse |
| **variable** | A name that holds a shape so a later line can act on it, e.g. `box1` |
| **line** | One step of the script — one shape, or one change made to a shape |
