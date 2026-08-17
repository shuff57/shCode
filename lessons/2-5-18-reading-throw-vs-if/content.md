## throw vs if: The Distance Rule

**What you'll learn:**
- `throw` is not always the right tool for a bad value — sometimes a plain `if` is simpler
- The rule: ask *who* notices the problem and *who* knows what to do about it

Both of these reject a negative age. Only one of them uses `throw`.

```js live plain
// Plain if — the code that notices is also the code that decides
const age = -5;

if (age < 0) {
  console.log("Age cannot be negative.");
} else {
  console.log("Age accepted: " + age);
}
```

```js live plain
// throw — because something further out should decide what the user sees
const age = -5;

try {
  if (age < 0) {
    throw new Error("Age cannot be negative.");
  }
  console.log("Age accepted: " + age);
} catch (err) {
  console.log("Rejected: " + err.message);
}
```

Both programs print the same thing here. The difference shows up in *where the decision gets made*. Use the **distance rule**: if the code that notices the problem is also the code that knows what to do about it, a plain `if` is simpler and clearer. `throw` earns its place when the code that notices *cannot* decide — a validation check buried deep inside a calculation has no business deciding what message the user sees, so it throws, and code further out decides what happens next.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **distance rule** | If the noticing code and the deciding code are the same, use `if`. If they're far apart, `throw` and let the outer code decide |
