**Goal:** See the same three lines written twice and confirm that renaming changes nothing about how the program runs, only about how quickly a person understands it.

## Step 1: Hard to read

```js live plain
let a = "John";
let b = 90;
let c = a + " scored " + b + "%";
console.log(c);
```

It works. It prints `John scored 90%`. And to know that, you had to read all four lines and assemble the meaning yourself.

Ask what `b` is. A score, apparently, but you only learned that from the *string literal in line three*, not from the name. The information was in the program by accident.

## Step 2: The same thing, self-explaining

```js live plain
let studentName = "John";
let examScore = 90;
let result = studentName + " scored " + examScore + "%";
console.log(result);
```

Identical output. Identical speed. Identical everything, as far as the computer is concerned: it never sees the names at all; they are gone by the time the code runs.

What changed is that you can read line two on its own and know what it is. You do not have to hold three lines in your head simultaneously to work out what the program is about.

## Step 3: One name still to fix

`result` is the weak link, for the reason 1.3.8 gave: every calculation has a result. Name it for what it *is*:

```js live plain
let studentName = "John";
let examScore = 90;
let scoreReport = studentName + " scored " + examScore + "%";
console.log(scoreReport);
```

Now all three names survive being read in isolation, which is the actual test. Cover the other lines with your hand; does the line you can still see explain itself?

## Step 4: Why this counts as documentation

Comments can go stale: someone changes the code and forgets the comment above it, and now the comment is actively lying. A name cannot drift that way: rename the variable and every use of it changes with it, because the program will not run otherwise.

That makes a good name the most reliable documentation there is. Comments explain *why*; names explain *what*, and they never rot.

## Key takeaways

- Renaming changes nothing about how a program runs.
- A good name survives being read in isolation: cover the other lines and check.
- `result`, `data` and `value` feel descriptive and are not.
- Names are documentation that cannot go stale, unlike comments.
