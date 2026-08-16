## Chart this

> Get a number. If it is even, print "even". Otherwise print "odd".

Five shapes will do it. Drag them onto the canvas and connect them.

| # | Shape | What goes in it |
|---|---|---|
| 1 | **Oval** | Start |
| 2 | **Rectangle** | get the number |
| 3 | **Diamond** | is the number even? — two exits, **yes** and **no** |
| 4 | **Rectangle**, twice | print "even" on the yes path, print "odd" on the no path |
| 5 | **Oval** | End — with both branches joining back together before it |

### The detail worth checking

**The branches rejoining.** A flowchart whose paths never meet again has two endings, and that almost always means a step was forgotten. Both of your print boxes should have an arrow leading onward to the same End.

Draw it first, then look: can you follow an arrow from Start to End through *either* answer without lifting your finger?

### The other thing to try

When your chart is green, **break it on purpose** and read what turns red:

- Delete one of the two arrows leaving the diamond.
- Remove the label from the `no` arrow.
- Drag a shape loose so nothing connects to it.

Put each one back afterwards. Meeting every failure message once, on a chart nobody is grading, is much better than meeting it for the first time on A1.5.1.

### How this is checked

The structural checks run in your browser and tell you what is wrong. Nothing is graded and there is no limit on redraws. The checks look at *shape* — one start, every arrow labelled, nothing floating, decisions with two labelled exits, everything reaching the end. They cannot tell whether your labels describe the right task; only you can.
