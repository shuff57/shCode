## Two rules, and no others

> **Definition 1.5.5: Pseudocode.** A description of a program's steps written in plain language and arranged like code, with indentation showing which steps belong inside which. It is not written in any programming language and cannot be run.

There is no compiler for pseudocode and no rules to look up. The only requirement is that a human can follow it without guessing. Two conventions do almost all the work:

**1. One instruction per line.** If a line is doing two things, split it.

**2. Indent what is inside something else.** Indentation shows containment.

```
set total to 0
set i to 1
while i is 5 or less
    add i to total
    add 1 to i
print total
```

The two indented lines are the ones that **repeat**. `print total` is not indented, so it happens once, at the end. Move `print total` in by four spaces and you have described a completely different program: one that prints five times. That is how much work indentation is doing.

Anyone who can read English can follow that, including someone who has never written a line of code. It is also close enough to a program that turning it into JavaScript later is nearly mechanical.

**No compiler is the point.** Pseudocode is worth writing precisely *because* no machine checks it. A syntax error tells you nothing about whether your plan makes sense. Reading five lines of plain English to a classmate finds "you never told it to stop" far faster than a debugger will.

**What you'll learn from it:**
- One instruction per line; split any line doing two things.
- Indentation shows what is inside what: it is not decoration.
- Pseudocode cannot be run and is not any language.
- Nothing checks it, which is why a human has to.

**Try it:**

The pseudocode above, turned into JavaScript almost line for line. Watch the indentation survive the translation.

```js live plain
let total = 0;              // set total to 0
let i = 1;                  // set i to 1

while (i <= 5) {            // while i is 5 or less
  total = total + i;        //     add i to total
  i = i + 1;                //     add 1 to i
}

console.log(total);         // print total
```

The braces `{ }` are doing in JavaScript exactly what the indentation did in the plan: marking what is inside the loop. The plan already had the structure right, so the translation had no decisions left in it.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **pseudocode** | A program's steps in plain language, laid out like code. Not runnable |
| **indentation** | Leading spaces showing that a step is inside another |
| **containment** | What indentation expresses: this step belongs to that one |
| **one instruction per line** | The other rule; split any line doing two things |
