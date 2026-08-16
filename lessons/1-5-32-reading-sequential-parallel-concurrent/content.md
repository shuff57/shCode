## Same instructions, different cost

Every plan in this module so far has been **sequential**: one step, then the next, in written order. That is the traditional execution model and the one you should assume unless told otherwise.

Two other models are worth knowing about, because they change what the same set of instructions costs to run.

### Parallel

**Parallel** execution runs parts of an algorithm at the same instant, on separate processors.

You and a friend are buying cinema tickets and there are three separate queues. Splitting up — you in one, your friend in another — is a parallel model, and you are guaranteed to get the tickets sooner as long as one queue moves faster than the other, which it usually does.

### Concurrent

Running the same algorithm truly simultaneously may not be possible if the machine has only one **central processing unit (CPU)**. In that case you can *simulate* parallelism: the operating system runs the two tasks **concurrently**, as separate tasks sharing one processor.

That is less efficient than true parallelism, because **nothing is actually happening at the same instant** — the processor is switching between tasks very quickly. One person, alternating between two queues, moving a step in each.

| Model | How many at once | Needs |
|---|---|---|
| **Sequential** | One step, in order | Nothing special |
| **Concurrent** | Tasks interleaved, one at a time | One CPU, switching fast |
| **Parallel** | Genuinely simultaneous | More than one CPU |

**What you'll learn from it:**
- Sequential is the default: one step, then the next.
- Parallel runs parts at the same instant, on separate processors.
- Concurrent interleaves tasks on one processor — fast switching, not simultaneous.
- Concurrency is less efficient than true parallelism, and often good enough.

**Try it:**

Sequential execution, made visible. Every line waits for the one above it.

```js live plain
console.log("queue A: person 1");
console.log("queue A: person 2");
console.log("queue A: person 3");

console.log("--- if two queues ran in parallel ---");
console.log("A:1 and B:1 at the same instant");
console.log("A:2 and B:2 at the same instant");
```

The first three lines are the model you have. The last two describe a model you do not have here — and could not observe from inside a single sequence anyway.

Chapter 4 goes into the difference properly. For now: **assume sequential**, and know that the other two exist and why someone would want them.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **sequential execution** | One step after another, in written order — the default |
| **parallel execution** | Parts running at the same instant on separate processors |
| **concurrent execution** | Tasks interleaved on one processor, progressing together |
| **CPU** | Central processing unit — the part that carries out instructions |
