## The bridge between a problem and its solution

> **Definition 1.5.1 — Computational thinking.** A problem-solving process, rooted in principles from computer science, that breaks a **complex problem** into smaller, more manageable parts and devises systematic approaches to solve them. A *complex problem* is one that is difficult because it involves many interrelated parts — the kind that is hard to understand and rarely has a simple solution.

The phrase is still argued over and there is no single agreed definition. Its value is practical rather than theoretical: it gives you separate strategies for a problem too big to hold in your head all at once.

Computers are central to solving these problems, and a computer is only as useful as **your** prior understanding of the problem. A computer will do exactly what you tell it, at enormous speed, including the wrong thing. Everything that decides whether the answer is right happens before the first line of code.

So computational thinking is not "thinking like a computer" — computers do not think at all. Programming is the craft of telling a computer what to do. Computational thinking is how you decide what those instructions should be.

### Where the idea came from

Al Aho of Columbia University describes it as "the thought processes involved in formulating problems so their solutions can be represented as computational steps and algorithms." Jeannette Wing brought the idea to prominence in a 2006 paper written at Carnegie Mellon; her view is that it describes the mental acts needed to compute a solution, **whether a person or a machine carries it out.**

It sits close to mathematical thinking — both use abstraction, generalisation, modelling and measurement. It differs in being explicitly concerned with computation: what a machine can actually carry out, and what that buys you.

**What you'll learn from it:**
- Computational thinking breaks a complex problem into manageable parts.
- A complex problem has many interrelated parts and no simple solution.
- It is not "thinking like a computer" — computers do not think.
- It is the bridge between the problem and a solution someone can carry out.

**Try it:**

A plan has no language. Here is the same plan expressed twice — once as ordinary English, once as JavaScript — to make the point that the thinking came first.

```js live plain
// The plan, in English:
//   start a total at zero
//   add each score to the total
//   divide the total by how many scores there were
//   print the answer

let scores = [6, 9, 3];
let total = 0;

for (let i = 0; i < scores.length; i = i + 1) {
  total = total + scores[i];
}

console.log("average is " + total / scores.length);
```

Cover the code and read only the comment. That plan is complete, checkable, and could be handed to a person, a different language, or a spreadsheet. Section 2.2 makes this explicit: an algorithm is a plan that exists *before* any code does.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **computational thinking** | A problem-solving process that breaks a complex problem into parts and finds systematic approaches |
| **complex problem** | One with many interrelated parts, hard to understand, rarely simply solved |
| **critical thinking** | Understanding concepts rather than memorising steps — the human half |
| **generalisation** | Carrying the same problem-solving process across different problems |
