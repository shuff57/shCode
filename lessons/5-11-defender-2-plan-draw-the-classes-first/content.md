## Draw the classes first

A refactor gets a plan too, and this one is a drawing in words. Before any code moves, decide what each class remembers and what it can do, so that every line you move in the labs already has a place to go.

**The three classes.** 7.6.1 (Reading: Count the cost) named them and ran the checklist on them:

- **`Bullet`**: one shot from the ship.
- **`Enemy`**: one falling enemy, crimson or orange.
- **`Spawner`**: the one thing that decides when the next wave comes and builds it.

**Where to look.** Your Part B game already does everything. Each function in it is a job, and most jobs belong to one of the three classes: a shot climbing, an enemy falling, a hit taking 1 hp, a wave being built, the pause before the next one. For each class ask the two questions 7.2.18 asked of every thing: what does it have of its own (that is what it *remembers*: its properties), and what does it do with it (that is what it *can do or answer*: its methods)?

Write your response in the box below. Short sentences or a list per class both work. Aim to cover:

1. For at least two of the three classes, one thing each one remembers.
2. For at least two of them, one thing each one can do or answer.
3. One job that leaves `draw()` or a Part B function and moves into a class.
4. Which class answers "no" to the checklist's first question, and why it might still be a class.

---

## Rubric

| # | Criterion |
|---|-----------|
| 1 | Names something two of the classes remember |
| 2 | Names something two of the classes can do or answer |
| 3 | Names one job that moves into a class |
| 4 | Names the class that fails the first checklist question, or why one might still be a class |
