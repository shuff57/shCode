## Read the Chart: Does Continue Show Up?

**What you'll practise:**
- Reading a chart somebody else drew
- Tracing two different players through the same diagram
- Spotting the case a chart handles badly

Nothing to draw here. Read this one and answer the questions: reading charts is the half of the skill you will use most, because most charts you meet will not be yours.

### The chart

This is the title screen deciding whether to offer **Continue**.

```flow readonly caption="Figure 6.5.1: the title screen's save check. Two players, two different paths through the same shapes."
flowchart TD
  A([Title screen loads]) --> B[read "save" from storage]
  B --> C{did we get anything back}
  C -- yes --> D[JSON.parse it]
  C -- no --> E[hide the Continue button]
  D --> F{is the level number valid}
  F -- yes --> G[show the Continue button]
  F -- no --> E
  G --> H([wait for input])
  E --> H
```

### Trace it

Answer these before you look at any code. Put a finger on **Title screen loads** and walk.

1. **A player who has never played before.** Which shapes do they visit? Which button state do they end on?
2. **A player who finished level 3 last night.** Same question.
3. **Why are there two diamonds and not one?** What is the second one protecting against that the first one cannot?
4. **Both `no` arrows go to the same box.** Is that a mistake, or deliberate? Say what it means in plain English.
5. **Find the shape that runs for every player, no matter which path they took.**

### The one it handles badly

Question 3 is the interesting one. The first diamond asks *did we get anything back*: that catches the brand-new player, where storage returns nothing at all.

The second asks *is the level number valid*, and that catches a stranger case: a save that exists but is **damaged**. Storage returned a string, `JSON.parse` turned it into an object, and the object is nonsense: a level of `0`, or `undefined`, or a number from a version of the game that no longer exists.

Without the second diamond, that player gets a Continue button that loads them into nowhere. With it, they get treated like a new player, which is not perfect but is at least a game they can play.

**Here is what the chart does not tell you.** Look again at the `JSON.parse` rectangle. What happens if the saved text is not valid JSON at all, if it is half-written, or something else overwrote it? `JSON.parse` throws, and there is no arrow on this chart for that. The chart is drawn as though parsing always succeeds.

That is a real gap, and you found it by reading a picture rather than by running code. When you build your own save system, that missing arrow is a `try`/`catch`.
