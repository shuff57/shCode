## Fix the Broken Chart

**What you'll practise:**
- Reading the checker's output instead of guessing
- Seeing how *one* mistake sets off *several* alarms
- Repairing a chart rather than starting over

Every chart you have drawn so far, you drew from scratch. This one arrives already drawn — and already wrong.

### The chart

Somebody charted a rollercoaster height rule: get the rider's height, and if it is at least 48 inches, print "You may ride", otherwise print "Too short". The canvas below has their attempt on it.

Press **Check my diagram** before you change anything. You should see **five** red checks.

### Five red checks, one mistake

This is the part worth slowing down for. Five things are red, but there are not five mistakes — there is **one**, and it sets off five alarms:

| Red check | What it is complaining about |
|---|---|
| `decision-two-exits` | The diamond has one arrow leaving it, not two |
| `decision-labeled` | The arrow that *is* there does not say `yes` or `no` |
| `no-orphans` | The "Too short" rectangle is floating with no arrows at all |
| `one-start` | Two shapes have nothing pointing at them, so a reader cannot tell where to begin |
| `reaches-end` | It gave up. This check needs one clear starting point before it can follow the paths at all, so it waits for `one-start` to go green |

That last row is worth a second look. `reaches-end` is not reporting a fifth problem — it is reporting that it *cannot do its job yet*. Some checks depend on others, so a red near the bottom of the list sometimes clears itself the moment you fix something near the top.

All five trace back to a single missing idea: **the `no` branch was never drawn.** The person got as far as the happy path — tall enough, you may ride — and stopped. The "Too short" box exists because they knew it was needed, but nothing connects it, so as far as the chart is concerned it is a second place to start reading.

That last one surprises people. A floating shape is not just untidy — the checker cannot tell the difference between "a box I forgot to connect" and "a second beginning", because on the page they look identical.

### Your job

Repair it. Do not delete everything and start over — fix what is there:

1. Label the existing arrow out of the diamond, so a reader knows which answer it follows.
2. Draw the missing arrow from the diamond to the "Too short" box, and label it.
3. Make sure that branch goes somewhere afterwards. A branch that stops is still a broken branch.

Press **Check my diagram** after each fix and watch the count come down. Notice that fixing the one missing branch turns off all five alarms at once.

### Why this lesson exists

When you draw your own chart in the next lesson and five things go red, your instinct will be that you have made five mistakes and the whole thing is ruined. Usually you have made one. Read the checks, find the single idea they all point at, and fix that.

No points, no AI grader — get all nine checks green and you are done.
