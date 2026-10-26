## Plain English to Pseudocode: Even or Odd

**What you'll practise:**
- Turning plain English into exact, numbered steps
- Writing a question with two answers (even and odd)
- Seeing both answers join back together before the end

### The plan, in plain English

1. Get a number.
2. Check whether the number is even.
3. If it is, print `even`. Otherwise, print `odd`.
4. Either way, the program then ends.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
let number = Number(prompt("Enter a number"));

if (number % 2 === 0) {
  console.log("even");
} else {
  console.log("odd");
}
```

### The thing worth noticing

**The branches rejoin.** A plan whose paths never meet again has two endings, and that almost always means a step was forgotten. In your pseudocode the `END IF` is where the two answers come back together: both print lines lead to the same end.

### Before you submit

Press **Grade**, then trace your steps by hand with `4` and with `7`. Each prints exactly one word. Nothing here is graded and you can retry as often as you like.
