## Plain English to Pseudocode: if / else

**What you'll practise:**
- Seeing if/else as one question with two answers
- Noticing where the two branches come back together
- Turning plain English into exact, numbered steps

### The plan, in plain English

1. Set `temperature` to `34`.
2. Check whether `temperature` is over `30`.
3. If it is, print `Too hot: stay inside`. Otherwise, print `Fine to go out`.
4. After the check, either way, print `Have a good day`.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
let temperature = 34;

if (temperature > 30) {
  console.log("Too hot: stay inside");
} else {
  console.log("Fine to go out");
}

console.log("Have a good day");
```

### The thing worth noticing

The last line is **outside** the if/else, so it runs no matter which branch was taken: on the chart, both exits of the diamond reach it. Everything inside the braces belongs to one branch; the first statement after them belongs to both.

### Before you submit

Press **Grade**, then trace your steps by hand with `34` and with `12`. The last line should print both times.
