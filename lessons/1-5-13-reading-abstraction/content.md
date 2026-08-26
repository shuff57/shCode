## Leaving things out, on purpose

**Abstraction** means pulling out the important details and identifying the principles that carry over to other problems.

> **Definition 1.5.3: Abstraction.** A simplified representation of a complex system or phenomenon that keeps the details relevant to the problem at hand and **discards the rest.**

Beginners usually describe abstraction as "making things simpler", which is true and tells you nothing. The useful version is sharper: abstraction is **leaving something out on purpose**, and you should be able to name what you left out.

In the jam sandwich example, abstraction means forming an idea of what the sandwich should look like: a sketch of the finished thing, with details simplified away. The sketch does not show the brand of bread or whether the knife is metal, because neither changes what the robot has to do.

### The test

There is one question that settles every case:

> **Does dropping this detail change the action the reader has to take?**

If not, drop it. If yes, keep it.

Describing a bus route to a stranger: **keep** the stop where they get on and the stop where they get off, without those the description is useless. **Leave out** the colour of the bus and the name of every street it turns down. Both of those are true, and neither changes what the person has to do.

Being true is not the standard. Being *load-bearing* is.

**What you'll learn from it:**
- Abstraction keeps relevant detail and discards the rest.
- It is leaving something out *on purpose*: you should be able to name what.
- The test: does dropping this change what the reader has to do?
- A detail can be perfectly true and still worth discarding.

**Try it:**

The same student, twice, once with everything known about them, once with what a grade report actually needs.

```js live plain
// Everything we know
let name = "Maya";
let score = 88;
let favouriteColour = "green";
let busRoute = 14;
let heightCm = 162;
let hasSiblings = true;

// The abstraction: a grade report needs two of those six.
console.log(name + " scored " + score);
```

Four facts dropped, and all four are true. None of them changes what a grade report says, so keeping them would add work and no information.

Now notice the risk. If the task changed to "who can I seat together on the bus?", `busRoute` stops being irrelevant. **Abstraction is relative to the problem**: there is no permanently unimportant detail, which is why the test is phrased around the reader's action rather than the detail itself.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **abstraction** | A simplified representation keeping only the details relevant to the problem |
| **relevant detail** | One that changes what the reader or program has to do |
| **model** | A stand-in for a real system, simplified on purpose: a simulation, a sketch |
| **oversimplification** | Dropping a detail that turned out to be load-bearing |
