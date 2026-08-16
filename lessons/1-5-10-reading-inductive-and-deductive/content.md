## Two directions

Finding patterns usually takes one of two kinds of logical thinking, and they run in opposite directions.

**Inductive reasoning** goes from **specific examples to a general principle**. Notice that dividing any number by 1 gives the original number back, and you have a rule covering every number. Notice that the sum of two odd numbers is even, and you have another. Induction turns an observation into a pattern, which becomes a tentative hypothesis, which can become a theory.

Induction is powerful and it is not a guarantee. Three examples agreeing does not prove a rule — it suggests one worth testing.

**Deductive reasoning** goes the other way: drawing a valid conclusion from premises, where it is impossible for the premises to be true and the conclusion false. The traditional example: "all men are mortal", "Socrates is a man", therefore "Socrates is mortal". If the premises hold, the conclusion is forced.

Programmers use both constantly, and it is worth being able to tell which one you are doing:

| | You use it when | Example |
|---|---|---|
| **Induction** | Several separate observations turn out to share a cause | Three different bugs all involve the same function — maybe that function is wrong |
| **Deduction** | You know the rules and work out what must follow | Input is 4, the code multiplies by 5, so the output must be 20 |

That deduction is exactly how you catch a program printing `9`. You did not observe the bug; you observed a *disagreement* between what must be true and what happened, and that gap is where the bug is.

**What you'll learn from it:**
- Induction: specific examples → a general principle. Suggestive, not proof.
- Deduction: premises → a conclusion that must follow.
- Induction spots a shared cause across several bugs.
- Deduction tells you what the output *should* be, so you can notice when it isn't.

**Try it:**

```js live plain
// INDUCTION — three observations, one suspected rule
console.log(3 + 5);      // even
console.log(7 + 1);      // even
console.log(9 + 11);     // even
// suspected rule: odd + odd is always even

// DEDUCTION — the rules force an answer before you run it
let input = 4;
let output = input * 5;
console.log("must be 20, and is: " + output);
```

The top block observed three cases and proposed a rule. The bottom block knew the rule and predicted the answer. **Predicting before running is deduction**, and it is the habit that makes a wrong answer visible — if you never formed an expectation, there is nothing for the output to disagree with.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **inductive reasoning** | Going from specific examples to a general principle |
| **deductive reasoning** | Drawing a conclusion that must be true if the premises are |
| **hypothesis** | A tentative rule suggested by observation, not yet tested |
| **premise** | A statement taken as true, from which a conclusion follows |
