## Your First Flowchart

**What you'll practise:**
- Turning a rule written in English into pseudocode, then into a chart
- Using the diamond for the question and rectangles for the actions
- Labelling both exits so a reader can follow either answer

This is the first run of the convention you just read, and it is deliberately the gentlest one. Nothing here is graded, failing a check costs nothing, and you can redraw as many times as you want.

### The problem

The school printer gives every student **20 free pages a week**. After that, printing costs **10 cents a page** for each page over the 20.

Write a plan that takes the number of pages a student printed this week and reports what they owe.

### Step 1 — pseudocode first

Before you touch the canvas, write the algorithm as pseudocode on paper or in your notes. Use the keywords from the reading:

```
START
INPUT ...
IF ... THEN
    ...
ELSE
    ...
END IF
END
```

It should take you about a minute. Do this before drawing — the point of the exercise is that the plan exists before the picture, and the picture before the code.

### Step 2 — draw it

Use the canvas below. **Start** and **End** are already placed; everything between them is yours.

Use only the three shapes from the reading:

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Task** (rectangle) | Getting the page count, working out the charge, reporting it. |
| **Decision** (diamond) | The question: were more than 20 pages printed? |

The toolbar also offers a parallelogram for input and output. You may use it, and nothing requires you to — this chapter is assessed on the three shapes above.

**How to build it:** click a shape in the toolbar to drop it on the canvas, then type its text in the bar underneath. To draw an arrow, drag from one of the small circles on a shape's edge to a circle on the next shape. Click an arrow to label it — the two out of your diamond need `yes` and `no`.

### The part people get wrong

**The `no` branch still has to do something.** A student who printed 12 pages owes nothing — but "owes nothing" is a real answer that has to be printed, not a path that quietly stops. If your `no` arrow leads nowhere, the chart is saying the program hangs for anyone under the limit.

**Only the pages *over* 20 are charged.** 25 pages is 5 pages of charge, not 25. Whether your chart makes that clear is the difference between a plan someone else could build from and a rough sketch.

### Before you submit

Press **Check my diagram**. Nine checks run in your browser and tell you exactly which shape is wrong. Fix anything red and press it again.

Remember what the checker can and cannot see: green means your drawing is a legal flowchart. Whether it charges the right student the right amount is for you and your teacher to read. Check the 12-page case and the 25-page case against your own chart by hand before you call it done.
