## Plain English to Pseudocode: try/catch

**What you'll practise:**
- Seeing try/catch as a hidden "did it fail?" question
- Knowing the catch runs only when the try fails
- Noticing both paths continue with the same next step

### The plan, in plain English

1. Try to print `quantity`.
2. If that fails, catch it: print `Could not read quantity.`
3. After the try/catch, either way, print `Done.`

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
try {
  console.log(quantity);
} catch (err) {
  console.log("Could not read quantity.");
}
console.log("Done.");
```

### The thing worth noticing

There is no `if` anywhere, but `try` asks a hidden yes/no question: **did that line fail?** Yes runs the catch block, no skips it, and then both paths carry on with the same next line, because the program continues normally once the try/catch is over.

### Before you submit

Press **Grade**, then trace your steps by hand when the try fails and when it works. `Done.` prints both times; the catch message only when it failed.
