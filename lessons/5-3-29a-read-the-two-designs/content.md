## Read the Charts: Three Variables or Three Objects

**What you'll practise:**
- Reading two designs for the same feature side by side
- Judging a design by what happens when it grows
- Naming the moment procedural code stops scaling

Nothing to draw. Two charts, same feature, and one question that decides between them.

The feature: three enemies move down the screen, and each one that reaches the bottom costs the player a life.

### Design A: three variables

```flow readonly caption="Figure 5.3.1: the procedural version. Every enemy has its own variables and its own copy of the same three steps."
flowchart TD
  A([draw() runs]) --> B[enemy1Y = enemy1Y + speed]
  B --> C{enemy1Y > bottom}
  C -- yes --> D[lives = lives - 1]
  C -- no --> E[enemy2Y = enemy2Y + speed]
  D --> E
  E --> F{enemy2Y > bottom}
  F -- yes --> G[lives = lives - 1]
  F -- no --> H[enemy3Y = enemy3Y + speed]
  G --> H
  H --> I{enemy3Y > bottom}
  I -- yes --> J[lives = lives - 1]
  I -- no --> K([end of frame])
  J --> K
```

### Design B: an array of objects

```flow readonly caption="Figure 5.3.2: the object version. One loop, one copy of the steps, however many enemies there are."
flowchart TD
  A([draw() runs]) --> B{{for each enemy in enemies}}
  B --> C[[enemy.move()]]
  C --> D{enemy.y > bottom}
  D -- yes --> E[lives = lives - 1]
  D -- no --> B
  E --> B
  B --> F([end of frame])
```

### Read them and answer

1. **Count the shapes in each.** Write both numbers down.
2. **A fourth enemy arrives.** How many new shapes does Design A need? How many does Design B need?
3. **The speed changes.** In A, how many boxes mention `speed`? In B?
4. **A bug is found** in "reaching the bottom costs a life": the comparison should be `>=`, not `>`. How many places must be fixed in each design?
5. **Which chart is easier to read?** Be honest: this one does not go the way the others do.

### The answer to 5, and why it matters

**Design A is easier to read.** Every step is on the page in order, there is no loop to trace, and a beginner can follow it top to bottom without holding anything in their head.

Design B asks more of you. You have to understand that the hexagon repeats, that `enemy` means something different on each pass, and that the two arrows going back up are the same loop.

So the case for objects is not that they are clearer. **It is question 2.** A fourth enemy costs Design A three new shapes and three new variables; it costs Design B nothing at all: the array gets one more item and the chart is untouched. Question 4 is the same argument with sharper teeth: one fix versus three, and three is where somebody misses one.

That is the honest trade, and it is worth stating plainly because the usual pitch for OOP: "it's cleaner": is not what these two pictures show. Design B is harder to read once and easier to change forever.

### The moment it flips

Look at Design A again and imagine ten enemies. Thirty shapes, ten copies of the same three steps, and the chart runs off the page: which the convention would have told you at twenty.

**A chart that grows when the data grows is the signal.** When adding one more of a thing means adding more shapes, you have found the place where a class and an array earn their keep. Not before.
