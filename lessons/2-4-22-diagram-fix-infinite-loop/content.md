## Fix the Infinite Loop

**What you'll practise:**
- Recognizing an infinite loop *on the chart*, not just in code
- Seeing that a missing `no` exit is the same idea as a missing stopping point
- Drawing the exit that lets the reader, and the program: finally reach End

### The chart

Someone charted a countdown: `count` starts at 5, prints while it's above 0, and decreases each round. Press **Check my diagram** before you change anything.

You'll see the diamond has only one exit. That's not a drawing mistake to shrug off: it's the picture of exactly what an infinite loop is.

### Why this is the same bug you read about

`reaches-end` fails here for the same reason a real infinite loop never finishes: from Start, the arrows lead into the diamond, around the loop body, and back to the diamond again, and there is nowhere else to go. **An infinite loop is not a chart with a missing End oval. It's a chart with an End that nothing can get to.** The End oval could be sitting right there on the page, and it still wouldn't matter if no arrow reaches it.

### Your job

1. Add an End oval, if one isn't already placed.
2. Draw the missing `no` exit from the diamond, and label it.
3. Route that exit to End.

### Before you submit

Press **Check my diagram** after each fix. Watch `decision-two-exits`, `decision-labeled`, and `reaches-end` clear once the missing branch exists.

No points, no AI grader: get every check green and you're done.
