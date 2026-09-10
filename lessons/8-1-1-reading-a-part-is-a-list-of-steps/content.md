## A part is a list of steps

Meet **reSHape**, the tool you'll use to design solid 3D parts — the kind you could send to a 3D printer. Every part starts the same way: pick a shape, then add steps to it.

Start with a box: step one. Drill a hole in it: step two. Round off a sharp edge: step three. Each step lands on a **timeline** at the bottom of the screen, in order, so a part is really a list: Box 1, Hole 1, Round 1.

Here's the surprising part: that list isn't frozen. Click any earlier step in the timeline and you can change its numbers. Box too narrow? Click "Box 1" and widen it. Everything built after it updates to match, because it was all measured relative to that step. You never have to start over.

Every number in reSHape is in **millimetres (mm)** — width, depth, hole size, all of it. A box that is `40, 40, 20` is 40 mm wide, 40 mm deep, 20 mm tall: about the size of a deck of cards.

reSHape shows this list two ways. **Build** is buttons: a toolbar (Box, Hole, Round, Hollow...) and a Dimensions panel where you type numbers for the selected step. **Code** shows the same list as text, one line per step:

```js
const b = box(40, 40, 20)
hole(b, { across: 6 })
```

A 40×40×20 box with a 6 mm hole through it — the same part, spelled out in words instead of clicked with a mouse. Nothing is hidden: whatever you build shows up as a line of Code, because it's the same document underneath.

**What you'll learn from it:**
- A part is a timeline of steps, built one at a time.
- Any earlier step can be reselected and changed — later steps update to match.
- Every measurement in reSHape is in millimetres (mm).
- Build (buttons) and Code (text) are two views of the same part, not two different things.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **part** | The 3D object you are building, made of one or more steps |
| **step** | One action in the timeline: adding a shape, drilling a hole, and so on |
| **timeline** | The ordered list of steps at the bottom of the screen |
| **Dimensions panel** | Where you type the numbers for the selected step |
| **mm** | Millimetres — the unit for every number in reSHape |
