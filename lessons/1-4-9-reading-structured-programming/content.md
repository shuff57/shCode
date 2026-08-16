## A discipline, and a very strong claim

**Structured programming** is procedural programming with a discipline attached — and it is the subject of this course's second learning outcome, so it is worth more than a passing look.

Its claim is surprisingly strong: **every program can be built from just three structures.**

> **Definition 1.4.3 — Structured programming.** A discipline in which programs are built only from **sequence**, **selection** and **repetition**, with no arbitrary jumps between parts of the program. Any computation can be expressed with these three structures.

Read that last sentence again, because it is easy to skim past how big a claim it is. Every program on your computer — the browser you are reading this in, the operating system under it, a video game, the software that flies an aircraft — is built from those three ideas and nothing more exotic. There is no fourth structure waiting in a later chapter.

The three get their own lesson next (1.4.10). What matters here is the shape of the promise: **a small fixed set of building blocks, and no arbitrary jumps.** The second half is the part people forget, and it is what 1.4.13 is about.

**What you'll learn from it:**
- Structured programming = procedural programming plus a discipline.
- The discipline: only sequence, selection and repetition, and no arbitrary jumps.
- The claim: any computation at all can be expressed with those three.
- This is SLO-2, and the reason your flowcharts have exactly one start and one end.

**Try it:**

This program uses exactly one of the three structures. Run it, then decide which — and check whether you could name the other two if asked.

```js live plain
let subtotal = 25;
let tax = subtotal * 0.08;
let total = subtotal + tax;
console.log(total);
```

Three assignments and a print, each running once, top to bottom. Nothing chooses a path and nothing repeats — so this is **sequence** only. Chapter 2 introduces the other two.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **structured programming** | Building programs only from sequence, selection and repetition, with no arbitrary jumps |
| **sequence** | Do this, then this, then this |
| **selection** | Choose between paths depending on a condition |
| **repetition** | Do something more than once |
| **arbitrary jump** | Moving to any line from any line — what the discipline forbids (see 1.4.13) |
