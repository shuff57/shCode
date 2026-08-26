## How much detail does the language make you handle?

Languages differ in how much detail they push onto you. That is their **level of abstraction**: how far the language sits from the hardware, and how much machine detail it hides.

You have been enjoying a high level of abstraction since §1.2 without noticing. Two lines of JavaScript add two numbers and print the answer. Nothing in those lines says where `5` and `3` are stored in memory, how the processor performs the addition, or how text reaches your screen. All of that is happening; the language just does not make you say it.

**What you'll learn from it:**
- Level of abstraction = how much machine detail a language hides from you.
- Abstraction is not the language being lazy: it is the language taking work off you.
- The detail still happens. You are just not the one describing it.
- More abstraction means faster to write; less abstraction means more control.

**Try it:**

```js live plain
let total = 5 + 3;
console.log(total);
```

Two lines. Now count what you did *not* have to decide: which memory addresses hold the two numbers, which processor instruction adds them, how many bytes the answer takes, how a number becomes text, how text becomes pixels. In a language close to the hardware, several of those are your job.

A comparison that holds up: cooking a meal entirely from scratch gives you control over every ingredient and takes all afternoon. Cooking with prepared ingredients is far quicker, and you accept someone else's choices about what is in them. Neither is right in general: it depends on whether the afternoon or the control matters more.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **abstraction** | Hiding detail that does not matter for the job in front of you |
| **level of abstraction** | How far a language sits from the hardware; how much machine detail it hides |
| **hardware detail** | Memory addresses, processor instructions: what a low-level language makes you handle |
| **trade-off** | What you give up to get something else: here, control against speed of writing |
