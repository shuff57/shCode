## Fix the Broken Plan

**What you'll practise:**
- Reading the Quest cards to find the one idea that is missing
- Seeing that a check needs both answers written
- Repairing a plan instead of starting over

### The broken plan

Somebody planned a rollercoaster height rule: get the rider's height, and if it is at least 48 inches print `You may ride`, otherwise print `Too short`. Their plan arrives in `README.md` already written, and already wrong. The finished plan is drawn as a flow chart above the editor. You **read** it, you do not draw it.

### The code it describes

```js
const height = 52;

if (height >= 48) {
  console.log("You may ride");
} else {
  console.log("Too short");
}
```

### One missing idea

Press **Grade** before you change anything. Some cards are red, but there is not a red card for every mistake: there is **one** missing idea, and it turns several cards red. The broken plan stops after the happy path (tall enough, you may ride). Nobody wrote the `ELSE`, so no rider can ever be told `Too short`.

So the red cards point at one thing: **the other answer was never written.** Read the cards, find the single idea they share, and fix that.

### Your job

Repair the plan; do not start over:

1. Add an `ELSE` line after `PRINT "You may ride"`.
2. Under it, print `Too short`.
3. Keep `END IF` after both answers.

### Why this lesson exists

The next time you write a plan and several cards go red, your instinct will be that you made several mistakes. Usually you made one. Read the cards and find the idea they all point at.

### Before you submit

Press **Grade**, then trace your steps by hand with `52` and with `40`. Each should print exactly one message.
