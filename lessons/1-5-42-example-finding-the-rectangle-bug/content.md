**Goal:** Find a bug by narrowing the possibilities rather than by re-reading the code hopefully.

## Step 1 — The symptom

This should print the area of a 4 by 5 rectangle, which is 20.

```js live plain
let width = 4;
let height = 5;
let area = width + height;

console.log("The area is " + area);
```

It prints `9`. No error. The program is perfectly happy.

## Step 2 — Do not guess. Narrow.

The temptation is to stare at the code until the mistake jumps out. Sometimes it does; often you read straight past it, because you read what you *meant* to write.

Instead, print what you believe is true:

```js live plain
let width = 4;
let height = 5;
let area = width + height;

console.log("width is " + width);
console.log("height is " + height);
console.log("area is " + area);
```

```
width is 4
height is 5
area is 9
```

## Step 3 — Read what that eliminated

`width` is 4 — correct. `height` is 5 — correct.

So both **inputs** are right, and the output is wrong. The mistake must be in the line that combines them. There is exactly one such line, and now you are looking at it rather than at the whole file.

The two prints that showed correct values were not wasted. **Ruling out the inputs is what left only one place for the mistake to be.** That is the entire method, and it scales: with thirty lines, halving the suspects twice beats reading all thirty.

## Step 4 — Fix and re-test

```js live plain
let width = 4;
let height = 5;
let area = width * height;

console.log("The area is " + area);
```

`20`.

And now re-check with a second case you know the answer to — a 3 by 3 should give 9, and if it does, the fix was real rather than a coincidence that happened to work for one input.

## Key takeaways

- A silent wrong answer is found by comparison, not by re-reading.
- Print your beliefs: the values you are sure about, as well as the suspect one.
- Confirming what is *correct* is what narrows where the bug can be.
- After fixing, re-test with a second case whose answer you already know.
