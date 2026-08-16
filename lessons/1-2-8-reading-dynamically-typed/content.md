## The variable is not locked to one type

JavaScript is **dynamically typed**. A variable can hold any type of value, and that type can change while the program runs. One moment a variable holds a string; the next it holds a number. The variable itself is not locked to anything.

That is not a mistake or a loophole. It is how the language is designed.

Other languages work the other way. In Java or C++, you declare a variable's type upfront and it stays that type for good — try to put text in a number variable and the program refuses to build. JavaScript checks types **at runtime**, when the line actually executes, rather than ahead of time.

The trade is real and worth naming now: you get flexibility, and you pay for it with type bugs that stay invisible until the code runs. Nothing warns you in advance that `age` was a number on Monday and a string by Friday.

**What you'll learn from it:**
- Dynamically typed = a variable can hold any type, and can change type.
- JavaScript checks types at runtime, not ahead of time.
- Java and C++ do the opposite — the type is fixed when you declare it.
- The cost of the flexibility is that type bugs only appear when the code runs.

**Try it:**

No error, no warning, no complaint.

```js live plain
let message = "hello";
console.log(message);

message = 123456;
console.log(message);
```

One variable, two types, one program. Now imagine that second assignment is buried three hundred lines away in code somebody else wrote, and the line reading `message` expects text. That is the bug the flexibility buys you — and why `typeof` (1.2.24) exists.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **dynamically typed** | Variables are not bound to one type; the type can change at runtime |
| **statically typed** | The opposite — a variable's type is fixed when declared (Java, C++) |
| **runtime** | While the program is actually running, as opposed to before it starts |
| **type bug** | A mistake about what kind of value a variable holds |
