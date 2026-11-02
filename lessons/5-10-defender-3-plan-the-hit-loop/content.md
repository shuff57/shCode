## Plan the hit loop

5.9.6 tested every shot against one drone. Now there are many enemies. Before any code, write the steps for one frame in plain words or pseudocode.

**What you already have.** In 5.9.6 one loop went through `bullets`, and each shot was asked one question: does it overlap the drone? Since 5.10.2 the enemies live in three arrays side by side: `enemies` (the sprites), `enemyHp` and `enemyWorth`. An enemy can take more than one hit: an orange one has 3 hp.

**What changes.** One drone was one question per shot. Many enemies means every shot has to be asked about every enemy. You have written that kind of job in plain English before, in Chapter 2's nested-loops plan, *Plain English to Pseudocode: Nested Loops*: one loop that picks something, and inside it a second loop that goes through everything else. Think about one shot meeting one enemy, then ask what has to happen when they overlap.

Write your response in the box below. Plain words, pseudocode or a numbered list all work; no code is needed. Aim to cover:

1. Which two lists the check goes through, and how every shot gets tested against every enemy.
2. What happens to a shot that hits.
3. What happens to the enemy it hit, including when it has no hp left.
4. Which lists change when an enemy is shot down.

---

## Rubric

| # | Criterion |
|---|-----------|
| 1 | Names the two lists and has every shot meet every enemy |
| 2 | Says what happens to a shot that hits |
| 3 | Says what happens to the enemy that was hit |
| 4 | Says which lists change when an enemy is shot down |
