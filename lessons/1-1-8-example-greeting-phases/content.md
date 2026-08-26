**Goal:** Walk a tiny greeting app through all four framework activities, and see that the code you run is only one phase of the four.

## Step 1: Inception sets the goal

Before any code, Amara decides what the app is *for*: it greets a user by name. Inception is the planning phase where goals and overall scope are defined. Here the whole scope fits in one sentence.

```js live plain
// Inception: the goal
console.log("Goal: greet a user by name.");
```

## Step 2: Elaboration writes the requirement and plans

Amara turns the goal into a requirement ("ask for a name, then say hello to it") and sketches the plan: get a name, combine it into a greeting, print it. Elaboration is where requirements are analyzed and the design takes shape.

```js live plain
// Elaboration: the requirement and the plan
console.log("Requirement: ask for a name, then greet it.");
console.log("Plan: get name -> build greeting -> print it.");
```

## Step 3: Construction is the actual code

Construction is where the software is coded and built from the design. For the greeting app this is two lines. The book's example asks the user for their name first:

```js
const name = prompt("What is your name?");
console.log("Hello, " + name + "!");
```

In this editor, `prompt` is not available, so give `name` a value directly and run the same greeting logic:

```js live plain
let name = "Sam";
console.log("Hello, " + name + "!");
```

## Step 4: Deployment is opening it and seeing it run

Deployment releases the software in a usable form to end users. For Amara, deployment is opening the finished page and watching the greeting appear. Notice: the code above is one phase out of four: students (and teams) tend to over-weight construction.

```js live plain
// Deployment: release it and see it run
console.log("The page is live. A user opens it and sees the greeting.");
```

## Key takeaways

- A project always passes through four phases: inception, elaboration, construction, deployment.
- Construction (writing code) is **one phase of four**: do not over-weight it.
- The same two lines of code are only a small part of the whole project story.
