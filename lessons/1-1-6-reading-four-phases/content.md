## What a process model is

**Read before attempting `1.1.7 Classify the Task`.**

What you'll learn from it:

- A process model is a plan for what happens when in a software project.
- Teams do not build in random order; models give the project its shape.
- Every model uses the same four phases, but the amount of work in each phase changes.
- The book calls these phases framework activities because they form the skeleton every project shares.

**Try it:** Run the block below to print the four phase names in order, one per line.

```js live plain
console.log("inception");
console.log("elaboration");
console.log("construction");
console.log("deployment");
```

## The four phases named

**Read before attempting `1.1.7 Classify the Task`.**

What you'll learn from it:

- Inception is the planning phase where goals and overall scope are defined.
- Elaboration is the phase where requirements are analyzed and architecture is designed.
- Construction is the phase where the software is coded and built from the design.
- Deployment is the phase where the software is released in a usable form to end users.

**Try it:** The book uses `console.log("Hello, " + name + "!")` as a tiny construction example. First log your guess for which phase that line belongs to, then reveal the answer.

```js live plain
var guess = "construction";
var answer = "construction";
console.log("My guess: " + guess);
console.log("Answer: " + answer);
console.log("Why: that line is the actual code being written, which is the construction phase.");
```

---

## Four phases here, five in the video: same idea, different labels

You will see the lifecycle cut two ways this unit, and they do not contradict each other.

- **Four framework activities**: inception, elaboration, construction, deployment. This is the
  book's naming, and it is what the rest of this module uses.
- **Five SDLC phases**: design, development, testing, deployment, maintenance. This is the
  common industry naming, and it is what the `1.1.5` video uses.

Line them up and the overlap is obvious: inception and elaboration are both **design** work,
construction is **development**, deployment is **deployment** in both. The five-phase version
just pulls two jobs out into names of their own: **testing**, which the four-phase version
treats as an umbrella activity running throughout (see `1.1.10`), and **maintenance**, the work
that keeps going after release.

Know both names. `1.1.22` asks you for the four, then asks you to line them up against the five.

---

## Short glossary (quick reference)

| Term | Definition |
|---|---|
| process model | A plan for what happens when in a software project. |
| framework activities | The four generic activities every process model includes: inception, elaboration, construction, and deployment. |
| inception | The planning phase where project goals and overall scope are defined. |
| elaboration | The phase where requirements are analyzed and a detailed architecture model is designed. |
| construction | The phase where the software is coded and built from the design. |
| deployment | The phase where the software is released in a usable form to end users. |
