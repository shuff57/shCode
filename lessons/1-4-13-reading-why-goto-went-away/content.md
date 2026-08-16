## A restriction that turned out to be a feature

Definition 1.4.3 has a second half people skim: **no arbitrary jumps between parts of the program.**

Early languages let a program jump to any line at any time, with an instruction usually called `goto`. It worked. It also produced programs nobody could follow — because reading one line told you nothing about how you had arrived there. To understand line 200 you had to find every `goto 200` in the whole file first. Programs like that got the nickname **spaghetti code**.

Structured programming was the argument that giving up that freedom made programs *possible to reason about*. It was controversial at the time and it is not controversial now: the freedom is rarely missed.

This is the first example in this course of a restriction being a feature, and it will not be the last. The class flowchart convention in §1.5 is the same trade in a different costume — fewer things you are allowed to draw, in exchange for charts anyone can read.

**What you'll learn from it:**
- `goto` let a program jump to any line from any line.
- That made it impossible to tell how execution reached a given line.
- Structured programming gave up that freedom deliberately, and gained readability.
- A restriction can be a feature — the idea returns in §1.5's flowchart rules.

**Try it:**

Run this, then change `temperature` to `95` and run it again.

```js live plain
let temperature = 71;

console.log("step 1: read the temperature");

if (temperature > 80) {
  console.log("step 2: too hot");
} else {
  console.log("step 2: comfortable");
}

console.log("step 3: done");
```

Whichever value you use, "step 3" is reached from exactly one place — the end of the `if`. You can point at that line and know how you got there without reading anything else in the program.

With `goto`, "step 3" could be reached from anywhere in the file, including a line you have never looked at. That is the difference the restriction buys.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`goto`** | An old instruction that jumps to any line from any line |
| **arbitrary jump** | Moving to a line from a place with no structural relationship to it |
| **spaghetti code** | Tangled flow you cannot follow by reading — what `goto` produced |
| **reason about** | Work out what a program does by reading it, without running it |
