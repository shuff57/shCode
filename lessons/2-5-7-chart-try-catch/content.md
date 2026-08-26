## Chart the Code: try/catch as a Flowchart

**What you'll practise:**
- Seeing that "did it fail?" is an ordinary yes/no question, even though no `if` ever asks it
- Drawing the point where `try` abandons its block and jumps to `catch`
- Showing both paths landing back on the same next step

There is no "try shape" and no "catch shape". A flowchart has one way to ask a question: the diamond, so "did this line fail?" becomes a diamond, exactly like any other decision, even though nothing in the code literally writes that question.

### The code

```js
try {
  console.log(quantity);
} catch (err) {
  console.log("Could not read quantity.");
}
console.log("Done.");
```

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Task** (rectangle) | The risky line, the `catch` message, and the final "Done." |
| **Decision** (diamond) | "Did the risky line fail?": exactly two arrows leave it |

The `yes` arrow off the diamond goes to the `catch` message. The `no` arrow skips straight past it. **Both arrows land on the same next box**: "Done." runs either way, because the program continues normally once the `try...catch` statement finishes.

### Before you submit

Press **Check my diagram**. It needs at least one diamond with two labelled exits, no floating shapes, and every path reaching the End, including both the `yes` and the `no` path off your diamond.
