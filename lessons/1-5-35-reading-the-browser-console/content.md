## A scratchpad that forgets

A plan eventually has to become a running program, which needs somewhere to run. For JavaScript that is a **browser**: every browser has a JavaScript engine built in, which is why this course needs no installation.

> **Definition 1.5.8: Developer console.** A panel built into the browser where JavaScript can be typed and run immediately, and where error messages and `console.log` output appear. It is opened with **F12** in most browsers.

Open it with **F12**, then choose the **Console** tab. Type a line, press Enter, and it runs.

The console is for **quick questions**: checking what a value is, trying a line you are unsure about, confirming a piece of syntax. Everything you type is forgotten when you reload the page, and that is exactly what makes it comfortable to experiment in. Nothing you do there can break anything you have saved.

**What you'll learn from it:**
- Every browser has a JavaScript engine: no installation needed.
- F12, then the Console tab, opens the developer console.
- It runs a line immediately and shows output and errors in the same panel.
- Everything is forgotten on reload, which is a feature.

**Try it:**

Anything you can type here you can also type in your own browser's console, and it behaves identically.

```js live plain
console.log("Hello from the console");

// The console is fastest for settling a question you are unsure of
console.log(typeof "42");
console.log(7 % 2);
console.log("abc".toUpperCase());
```

Each of those is a question somebody had and answered in four seconds. That is what the console is for, not writing programs, but resolving the small uncertainties that would otherwise stall you.

> **The boxes on this page are both at once.** The runnable blocks in these lessons are a third option, and a deliberate convenience: they are editors and consoles at the same time, so you can change an example and run it without leaving the page. Use them freely. Everything in them is ordinary JavaScript and behaves the same way anywhere else.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **developer console** | The browser panel for running JavaScript immediately |
| **F12** | The key that opens developer tools in most browsers |
| **JavaScript engine** | The part of a browser that runs JavaScript |
| **scratchpad** | Somewhere to try things, where nothing is kept |
