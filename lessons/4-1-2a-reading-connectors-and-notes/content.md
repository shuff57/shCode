## Connectors and Notes

**What you'll learn:**
- The connector: a jump that replaces an arrow running right across the page
- The note: a remark for the reader that takes no arrows
- Why both of these only show up on charts this size

These are the last two shapes. They arrive now because the Print Shop is the first chart you will draw that is too big to be tidy without them — which is exactly the right reason for a tool to arrive.

### The connector

```flow readonly caption="Figure 4.1.1 — the two A circles are one point. Flow leaves the first and continues at the second; the long arrow across the page is what they replace."
flowchart TD
  S([Start]) --> B[work out the price]
  B --> C{is it over budget}
  C -- yes --> D((A))
  C -- no --> E[add it to the queue]
  E --> F([End])
  G((A)) --> H[reject the order]
  H --> F
```

A **connector** is a small circle with a letter in it. Two connectors sharing the same letter are **the same point**. Flow that arrives at one carries on from the other.

That is all it is: a way of saying "continues over there" without dragging an arrow across four inches of diagram and through three other shapes. On paper it is what lets a chart span two pages.

**Every letter must appear exactly twice** — once where flow leaves, once where it arrives. A lone connector is a jump to nowhere, and `connector-pairs` will tell you so. If you need a third landing point, that is a sign the chart wants a function instead.

Use them sparingly. A chart with eight connectors in it is harder to read than the long arrows were.

### The note

A **note** is a bracket-shaped box holding a remark for whoever reads the chart. It is not a step. It sits beside the diagram and **takes no arrows at all** — it is the one shape that is allowed to float, and the `no-orphans` check knows to ignore it.

Use it for the thing a reader would otherwise stop and question:

> *`>machine time is charged from the estimate, not the actual run]`*

Good notes explain a decision that is not obvious from the shapes: why a threshold is 20 and not 25, which of two plausible readings of the spec you went with, what you deliberately left out. Bad notes restate the shape next to them, which is just noise with a border on it.

### All eight, now

| Shape | Released | For |
|---|---|---|
| Oval, rectangle, diamond | 1.5 | start/end, a step, a question |
| Parallelogram | 1.5 | input and output |
| Hexagon | 2.2 | loop setup |
| Double rail | 3.1 | call a function |
| **Circle** | **now** | a jump |
| **Bracket** | **now** | a note |

That is the whole vocabulary for the rest of the course. There is no ninth shape coming — from here it is all in how you use these.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **connector** | A lettered circle; two with the same letter are one point |
| **note** | A remark for the reader; takes no arrows and is exempt from `no-orphans` |
| **`connector-pairs`** | The check that every connector letter appears exactly twice |
