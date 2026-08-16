## Languages are purpose driven

There are thousands of programming languages and new ones appear every year. That looks wasteful until you notice why: languages are **purpose driven**. A language is designed for a kind of work, and the choices that make it good at that work make it worse at something else.

| Language | Designed for |
|---|---|
| **JavaScript** | Making web pages interactive — and it is the only language every browser runs, which is why this course uses it |
| **Python** | Data analysis and teaching; prized for being quick to read |
| **C** | Work that talks closely to the hardware — operating systems, device drivers |
| **SQL** | One thing: asking questions of a database. You cannot write a game in it, and it was never meant for that |
| **Swift** / **Kotlin** | Phone apps, on iOS and Android respectively |

That is a list of *jobs*, not a ranking. Asking which language is best is like asking which tool in a toolbox is best — the honest answer is another question: **best for what?**

**What you'll learn from it:**
- A language is designed for a kind of work, not to win a competition.
- The design choices that make a language good at one job cost it another.
- "Which language is best?" is not a well-formed question.
- The ideas outlast the languages, which is why this course is called Programming *Concepts*.

**Try it:**

A card-sort you can run. Read the two lists first and pair them up in your head before you press run.

```js live plain
let languages = ["Python", "C", "SQL", "Swift"];
let jobs = ["analysing data", "an operating system", "a database question", "an iPhone app"];

for (let i = 0; i < languages.length; i = i + 1) {
  console.log(languages[i] + " -> " + jobs[i]);
}
```

Languages come and go faster than the ideas do. Variables, conditions, loops, functions and data structures turn up in nearly all of them — which is why your second language takes dramatically less time to learn than your first. The second time, you are only learning new spellings for things you already understand.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **purpose driven** | A language is designed for a kind of work — the reason so many exist |
| **domain-specific language** | A language built for one narrow job — SQL for databases |
| **trade-off** | What you give up to get something else — the real basis for a language choice |
| **"best for what?"** | The question that replaces "which language is best?" |
