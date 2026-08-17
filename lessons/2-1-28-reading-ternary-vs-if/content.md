## When to reach for ? and when to reach for if

**What you'll learn:**
- That `?` is designed to produce a value, not to run arbitrary code
- Why using `?` to run two different statements is legal but discouraged
- The rule of thumb: `?` for values, `if` for actions

`?` is built to answer "which value?" Some programmers stretch it to answer "which action?" instead:

```javascript
(company == 'Netscape') ?
  console.log('Right!') : console.log('Wrong.');
```

This runs. It is not a syntax error. But it throws away the reason `?` exists — producing a value — and uses it purely for its side effect, like a compressed `if`. The equivalent `if` is clearer:

```javascript
if (company == 'Netscape') {
  console.log('Right!');
} else {
  console.log('Wrong.');
}
```

Our eyes scan code vertically. A block that spans a few lines, with the two branches clearly separated, is easier to read than a long horizontal instruction packed onto one or two lines.

**The rule of thumb:** use `?` when you need to pick a *value*. Use `if` when you need to run different *blocks of code*. A ternary whose branches are both single `console.log` calls, both assignments, or both function calls with no return value used, is almost always better as an `if`/`else`.

**Try it:** Both lines below are legal. Notice how much harder the first one is to scan compared to the reading you've done all unit in `if`/`else` form.

```js live plain
let loggedIn = false;

(loggedIn) ? console.log("Welcome back!") : console.log("Please log in.");

if (loggedIn) {
  console.log("Welcome back!");
} else {
  console.log("Please log in.");
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **non-traditional use of ?** | Using `?` to run two different actions instead of picking a value |
| **side effect** | An effect of running code (like printing) rather than a value it returns |
| **rule of thumb** | `?` for values, `if` for actions |
