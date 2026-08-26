## A4.1.0: Print Shop Design Chart

**What you'll practise:**
- Designing a whole program before writing any of it
- Using the double-rail to keep a big chart under twenty shapes
- Committing to a plan you will be held to

This is design day. **No JavaScript is written today.** The editors for the build stay closed until this chart is green, and that is deliberate: the Print Shop is the first program you will write that is too big to hold in your head, and "I'll work it out as I go" is how those go wrong.

### What the program has to do

From the project brief:

- store at least five print orders as objects in an array
- work out an estimated print time from an order's volume
- work out a price from filament grams and machine time
- find the orders that fit inside a given build volume
- sort the queue by priority
- save and load the queue
- print one verdict line: *"You made $14.20; queue is 6 hours"*

### What to draw

Chart the **main program**: the sequence that actually runs when the page loads. Every function you plan to write is one double-rail shape.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Function call** (double rail) | `estimateHours`, `priceOf`, `fitsInVolume`, `sortByPriority`, `saveQueue`, `loadQueue`: one shape each, whichever you plan |
| **Task** (rectangle) | Steps the main program does itself |
| **Decision** (diamond) | Any choice the main program makes: "is there a saved queue?" is the obvious one |
| **Loop setup** (hexagon) | Walking the orders |
| **Connector** (circle) | If the chart runs off the page |
| **Note** (bracket) | For a decision a reader would question |

At least ten shapes, at least one decision, and connectors paired if you use any.

### The three rules that make it a design

**One double-rail per planned function, both directions.** Every function you intend to write is on the chart; every `[[ ]]` on the chart becomes a real function. This is the contract, and it is checked by eye when the project is marked.

**Stay under twenty shapes.** If you cannot, you have not decomposed enough: collapse a run of steps into a function and give it a name. Running out of room is the chart telling you something true about the program.

**Do not draw the function bodies.** Only the main program. What is inside `priceOf` is not this chart's business, and that is the point of having it.

### The part you will be graded on later

When you hand in the finished Print Shop, the chart comes with it, and one thing is compared: **does the code match the plan?**

You are allowed to change your mind. Designs meet reality and lose. What is not allowed is silently abandoning the chart, if the build went somewhere else, come back, update the chart, and say in your README what changed and why.

A design that survived contact with the build completely unchanged is rare, and honestly a little suspicious. A design that was quietly ignored is the actual deduction.

### Before you submit

Press **Check my diagram**. Eleven checks run: the eight structural ones, plus a decision, at least ten shapes, and paired connectors.

Then read it as though you were the person who has to build from it. Could you? If a step on the chart leaves you thinking "and then somehow the price appears", that is a shape that has not been decided yet: decide it now, while it costs thirty seconds.
