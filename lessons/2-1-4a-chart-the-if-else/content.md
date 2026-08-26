## Chart the Code, if / else

**What you'll practise:**
- Seeing `if`/`else` as one diamond with two labelled exits
- Noticing where the two branches come back together
- Reading code and recovering the plan behind it

You traced this code by hand in the last lesson. Now draw it.

### The code

```js
let temperature = 34;

if (temperature > 30) {
  console.log("Too hot: stay inside");
} else {
  console.log("Fine to go out");
}

console.log("Have a good day");
```

### What to draw

Use the canvas below. **Start** and **End** are already placed.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Task** (rectangle) | Setting the temperature, and each of the three prints. |
| **Decision** (diamond) | `temperature > 30` |

### The thing worth noticing

Look at the last line. `"Have a good day"` is **outside** the `if`/`else`, so it runs no matter which branch was taken: which means on your chart, **both arrows out of the diamond have to reach it.**

That is the picture of what a closing brace means. Everything inside the braces belongs to one branch; the first statement after them belongs to both. If your chart has the last print hanging off only the `yes` path, your chart says something the code does not.

Ask yourself before you submit: *if the temperature is 12, does my chart still print "Have a good day"?*

### Before you submit

Press **Check my diagram**. Nine checks run in your browser: one Start, one End, nothing floating, two labelled exits on the diamond, every path reaching the End.

No points and no AI grader. Green means your drawing is a legal flowchart, not that it matches the code: check the 12 case and the 34 case against your own chart by hand.
