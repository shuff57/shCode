## Two ends of the same scale

A **low-level** language makes you describe the work in terms the hardware handles directly — where each value sits in memory, exactly how each calculation happens. Programs written this way can run extremely fast. They also take much longer to write and are much easier to get wrong.

A **high-level** language hides those details. You say what you want; the language works out how. Writing is faster, whole categories of mistake become impossible, and you give up some control and a little speed.

> **Definition 1.4.1 — High-level language.** A language with a high level of abstraction: it hides hardware details such as memory addresses, so the programmer describes *what* should happen rather than exactly *how* the hardware should do it. **JavaScript is a high-level language.**

| | Low-level | High-level |
|---|---|---|
| You describe | how the hardware does it | what should happen |
| Fast to **run** | usually yes | usually a little slower |
| Fast to **write** | no | yes |
| Mistakes | more of them, and harder to find | whole categories become impossible |
| Examples | assembly, C (lower than most) | JavaScript, Python |

Neither end wins. The right choice depends on what is scarce. A team shipping a web app quickly needs *programmer* time more than the last few percent of machine speed, so high-level wins. A team writing the code that drives a hard disk needs the control, so it does not.

**What you'll learn from it:**
- A low-level language describes the work in the hardware's terms; a high-level one hides them.
- JavaScript is high-level — Definition 1.4.1.
- Low-level buys run speed; high-level buys writing speed and fewer mistakes.
- Which is "better" depends on which resource is scarce for that project.

**Try it:**

Run this, then ask what a low-level version would have to say that this does not.

```js live plain
let name = "Sam";
let score = 42;
console.log(name + " scored " + score);
```

A low-level version would have to decide where the letters of `"Sam"` live in memory, how many bytes `42` occupies, how to join two different kinds of value into one piece of text, and how that text reaches the screen. None of that changed what the program *means* — which is exactly what "high-level" buys you.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **low-level language** | One where you describe the work in terms the hardware handles directly. Fast to run, slow to write |
| **high-level language** | One that hides hardware details so you say what should happen, not how. JavaScript is one |
| **memory address** | Where a value physically sits — something a low-level language makes you manage |
| **scarce resource** | The thing you have least of — programmer time or machine speed. It decides the trade-off |
