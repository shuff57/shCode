**Goal:** Write a plan containing a decision, and notice everything the plan deliberately leaves unsaid.

## Step 1: The plan

```
ask the user for their age
if age is 18 or more
    print "You may vote"
otherwise
    print "Too young to vote"
```

Five lines. Read them aloud: they work as English, which is the test.

## Step 2: What this does *not* say

Nothing about **how** to ask. Nothing about what a variable is. Nothing about which language this will become. Nothing about whether the age arrives as text or as a number.

Those are all step-2 problems, and leaving them out is not sloppiness: it is the whole point. The plan is right or wrong on its own terms, and you can check it by reading it to somebody.

Notice the indentation is carrying the meaning again. The two `print` lines are indented because each one belongs to a branch. Un-indent them both and the plan says "print both messages, always", which is a different and wrong program.

## Step 3: Turn it into code

```js live plain
let age = 20;                        // ask the user for their age

if (age >= 18) {                     // if age is 18 or more
  console.log("You may vote");       //     print "You may vote"
} else {                             // otherwise
  console.log("Too young to vote");  //     print "Too young to vote"
}
```

Line for line. Change `20` to `15` and run it again: the other branch fires.

The translation had no thinking left in it, because the thinking was done in step 1. That is what "the plan is the hard part" means in practice.

## Step 4: Where the plan would have caught a bug

Suppose the plan had said:

```
ask the user for their age
if age is more than 18
    print "You may vote"
otherwise
    print "Too young to vote"
```

Read it aloud to somebody and they will stop you: *what happens to someone who is exactly 18?* They get told they are too young, which is wrong.

That question took four seconds and no computer. Found in code instead, it is a bug that only appears for one specific input, and it will survive every test that does not happen to use 18.

## Key takeaways

- A plan says what happens, not how it will be written.
- Indentation carries the branch structure before braces do.
- Translating a good plan into code is nearly mechanical.
- Reading a plan aloud finds boundary bugs: "what about exactly 18?", for free.
