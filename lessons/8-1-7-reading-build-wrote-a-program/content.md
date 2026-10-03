## Build wrote a program

You've been building parts by pressing buttons: Box, Hole, Round, Hollow. The whole time, something else was happening in the background. reSHape was writing a **script** for you — the same part, spelled out as text, one line per step.

The labs so far (8.1.2 to 8.1.6) only showed you the Build side, so here is what Code would have shown. From the next lab, 8.1.8, the Code side is in front of you, and in the lessons that offer both sides (like the 8.1.11 project) you can switch between Build and Code with the Build and Code buttons. A box you added shows up as `const box1 = box(40, 40, 20)`. Drill a hole in it, and a second line appears: `hole(box1, { across: 6 })`. The numbers in the text are exactly the numbers you typed into the Dimensions panel — not similar, not rounded. The same numbers.

Even the names line up, where a name is needed. The timeline chip that reads "Box 1" becomes the variable `box1` in the Code — a box gets a name because a later step needs to say which shape it's working on. A hole doesn't get a name of its own: it's written as one line that already names the shape it goes into, `hole(box1, { across: 6 })`. reSHape didn't invent a separate naming scheme for Code — it just wrote down the names the timeline was already using, and left unnamed the steps nothing later needs to point back to.

```js
const box1 = box(40, 40, 20)
hole(box1, { across: 6 })
```

That's the whole part you've been building this unit, in two lines. Nothing is hidden and nothing gets lost in translation, because Build and Code aren't two different parts — they're one document, shown two ways. Every step you click gets written down, in order, as a line of Code you can read right back.

Two more steps you have built by hand look like this in Code. **Hollow** is `hollow(box1, { wall: 3, open: 'top' })`: the shape, then the wall thickness, then which face is left open. **Round** is `round(box1.edge('top', 'front'), 3)`: it names one edge of the shape by the two faces that meet there, then the radius. You will not have to write these from memory in the next two labs; the project at the end of the unit lets you build them with buttons and then read the Code.

This matters starting with the next lesson, 8.1.8: once a part exists as text, you can fix it by editing the text — find the number you want to change, and change it, without touching a single button.

**What you'll learn from it:**
- Every Build step becomes one line of Code, in the same order it was built.
- The numbers in the Code are exactly the numbers from the Dimensions panel.
- A shape that later steps need to point back to gets a name (`box1`); a step like a hole just names the shape it acts on and needs no name of its own.
- Build and Code show the same part — not two parts, one part, two views.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **script** | The part's steps, written as text instead of clicked with a mouse |
| **variable** | A name that holds a shape so a later line can act on it, e.g. `box1` |
| **line** | One step of the script — one shape, or one change made to a shape |
