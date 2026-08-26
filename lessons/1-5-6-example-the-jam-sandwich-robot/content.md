**Goal:** Discover that ordinary instructions rely on an enormous amount of unstated knowledge, and that a computer has none of it.

## Step 1: Write five instructions

Before reading on, actually do this. List five instructions you would give a robot to make a jam sandwich. Write them down.

Then read your list back **as if you were the robot**, taking every instruction completely literally. Which one breaks first?

## Step 2: Where lists usually break

Answers vary, and nearly every list breaks in the same three places:

| Instruction | What the robot does not know |
|---|---|
| "Get the bread" | From where? The robot has no idea where bread lives |
| "Spread the jam" | With what? The knife was never picked up, and the jar was never opened |
| "Put the bread on the plate" | Which bread, and which side up? |

The point is not that your list was bad. It is that **ordinary instructions rely on unstated knowledge**, and writing the plan down is what makes those gaps visible.

## Step 3: The same thing, in code

A computer is exactly this literal, and here is the version of it you will meet all year.

```js live plain
// "Add the scores together": obvious to a person.
let firstScore = "8";     // came from somewhere as text
let secondScore = 9;

let total = firstScore + secondScore;
console.log("total is " + total);
```

`89`. The instruction "add them together" was carried out literally, and `+` on a piece of text means *join*, not *add*. Nothing was skipped and nothing errored: an unstated assumption (that both were numbers) simply was not true.

That is the jam sandwich, in JavaScript.

## Step 4: What the exercise is really teaching

The robot cannot ask you a question. Neither can a program. Every assumption you did not write down is one the machine will resolve on its own, in the least helpful way available.

So the value of writing a plan is not neatness. It is that **a written plan can be read back literally**, by you, before a computer does it for you.

## Key takeaways

- Ordinary instructions depend on knowledge the reader is assumed to have.
- A computer has none of that knowledge and will not ask.
- Reading your own plan back literally is how you find the gaps.
- The same failure appears in code as an assumption about types or order.
