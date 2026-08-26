## Programs Implement Algorithms

**What you'll learn:**
- What a program is, and how it's different from an algorithm
- Why a computer needs every detail spelled out, where a person fills in the gaps automatically
- How the exact same decision reads as English, then as JS

An algorithm is the plan. A **program** is that plan written in a language a computer can actually run, in this course, JavaScript. A friend understands "wear a jacket if it's cold" without arguing about what counts as cold. A computer cannot guess. It needs an exact number and an exact comparison, or the plan does not run at all.

Here is a tiny algorithm:

1. Check the temperature.
2. If it is below 60 degrees, wear a jacket.
3. Otherwise, wear a t-shirt.

**Try it:** here is that exact algorithm as a program. Run it, then change `temperature` to `72` and run it again: same plan, different answer.

```js live plain
let temperature = 55;

if (temperature < 60) {
  console.log("Wear a jacket.");
} else {
  console.log("Wear a t-shirt.");
}
```

The three numbered steps above and the three lines of code below them are the same plan. The algorithm did not change, only the language it is written in did.

Try one more. Same idea, different task: `score` is `75`. If `score` is 70 or above, log `"Passing"`. Otherwise, log `"Failing"`.

```js live plain
let score = 75;

if (score >= 70) {
  console.log("Passing");
} else {
  console.log("Failing");
}
```

Change `score` to `65` and run it again to see the other branch.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **program** | An algorithm implemented in a formal language a computer can execute |
| **algorithm vs. program** | The algorithm is the plan; the program is that plan written in code |
