## The difference is permanence

For anything you want to **keep**, you use a **code editor** — a text editor built for code. It colours your syntax, indents for you, and flags some mistakes before you run anything. Visual Studio Code is the common choice and is free.

| | Console | Editor |
|---|---|---|
| Holds | One line at a time | A whole program, saved |
| Survives a reload | No | Yes |
| Good for | Quick questions | Anything you will run twice |
| Helps you with | Nothing — it just runs it | Colouring, indenting, flagging typos |

The console is a scratchpad; the editor holds the program. Most real work is done in the editor **with the console open beside it** to see the output — the two are a pair, not alternatives.

An editor plus a browser is a perfectly good **IDE** (integrated development environment) for this course. An IDE is just the name for whatever combination of tools lets you edit, run and inspect a program; a fancier one bundles more of that into a single window, and nothing about the work changes.

**What you'll learn from it:**
- A code editor is where programs you intend to keep are written.
- It colours syntax, indents, and flags some mistakes before you run.
- The console is for questions; the editor is for programs.
- Editor plus console is the working setup — both open at once.

**Try it:**

Two things an editor does for you that the console does not. Read the code and notice what would be harder without help.

```js live plain
const TAX_RATE = 0.0725;

let itemPrice = 19.99;
let itemCount = 3;

if (itemCount > 0) {
  let subtotal = itemPrice * itemCount;
  let total = subtotal + subtotal * TAX_RATE;
  console.log("Total: $" + total.toFixed(2));
} else {
  console.log("Nothing in the basket");
}
```

**The colouring** tells you at a glance that `const`, `let` and `if` are keywords, and that `"Total: $"` is text rather than code. **The indentation** tells you which lines are inside the `if` — the same job indentation did in your pseudocode at 1.5.20.

Typing this into a console one line at a time would work, and you would lose it all on reload, and nothing would line the braces up for you.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **code editor** | A text editor built for code — syntax colouring, indentation, hints |
| **syntax highlighting** | Colouring keywords, text and numbers differently |
| **IDE** | Integrated development environment — tools for editing, running, inspecting |
| **permanence** | The real difference between an editor and a console |
