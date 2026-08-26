## One language, three styles

Some languages commit to one paradigm. JavaScript does not: it is **multi-paradigm**, and supports all three of the styles you have just met. That is unusual, and it is a real advantage for a first language: you can meet each idea without changing languages to do it.

Everything in this course is JavaScript, and you will write all three in it:

| Style | Where you write it | What it looks like |
|---|---|---|
| **Procedural** | Chapters 1–3 | Variables, conditions, loops, functions |
| **Functional** | Chapter 3, especially §3.7 | Functions that transform data without disturbing it |
| **Object-oriented** | Chapter 5 onward | Objects with behaviour as the way the program is organised |

The important thing is that these are **choices, not rules**. Real programs mix them, using whichever fits the piece of work in hand. A game might hold each character as an object, use a loop to update them, and transform a list of scores functionally: all in the same file, all in one language.

So "what paradigm is this program?" is often the wrong question. "What paradigm is this *part* of the program?" usually has an answer.

**What you'll learn from it:**
- Multi-paradigm means a language supports more than one style of organising a program.
- JavaScript supports procedural, functional and object-oriented code.
- Real programs mix all three, choosing per piece of work.
- This is why one language carries you through the whole course.

**Try it:**

Three styles, one program, and no errors. Read each block's comment and check you can see why it earns its label.

```js live plain
// Object-oriented: data bundled into one value
let player = { name: "Ada", scores: [8, 25, 3] };

// Functional: a new list, original untouched
let bigScores = player.scores.filter(function (s) { return s > 5; });

// Procedural: steps in order, changing a running total
let total = 0;
for (let i = 0; i < bigScores.length; i = i + 1) {
  total = total + bigScores[i];
}

console.log(player.name + " scored " + total + " on big plays");
console.log("original scores still: " + player.scores);
```

Nothing in JavaScript made you pick one. That freedom is the point, and the reason the paradigms are worth being able to name.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **multi-paradigm** | A language supporting more than one style of organising a program |
| **JavaScript** | Multi-paradigm: procedural, functional and object-oriented are all valid in it |
| **mixing paradigms** | Using different styles for different parts of one program: normal, not a mistake |
