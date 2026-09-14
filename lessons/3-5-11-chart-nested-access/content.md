## Chart the Code: Tracing a Nested Access

**What you'll practise:**
- Charting a loop whose body reads a nested field
- Following a chain (`order.items[i].price`) as a single task
- Putting the decision on a nested value outside the loop

An access chain is one reader, not three boxes. `order.items[i].price` takes one step at a time, but on a chart it is a single task shape.

### The code

```js
const order = {
  customer: { name: "Marisol", vip: true },
  items: [
    { name: "Pen", price: 1.5 },
    { name: "Notebook", price: 3 }
  ]
};

let total = 0;

for (let i = 0; i < order.items.length; i++) {
  total = total + order.items[i].price;
}

const name = order.customer.name;

if (order.customer.vip) {
  console.log(name + " (VIP) total: " + total);
} else {
  console.log(name + " total: " + total);
}
```

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Loop setup** (hexagon) | `i = 0 to order.items.length - 1` |
| **Task** (rectangle) | `total = 0`, `total = total + order.items[i].price`, `name = order.customer.name` |
| **Decision** (diamond) | `order.customer.vip` |
| **Input / Output** (parallelogram) | The final print |

At least seven shapes, at least one diamond.

### The three arrows that decide whether this is right

1. **The loop body** runs the adding task, then goes **back to the hexagon**, not on to the decision.
2. **After the loop**, the flow leaves the hexagon for the `name = ...` task — the decision is *outside* the loop.
3. **Both diamond exits** rejoin at the single print, so neither path dead-ends.

### Before you submit

Press **Check my diagram**, then trace it by hand with the real data: prices `1.5` and `3`, and `vip` is `true`. Your chart should reach the VIP print with a total of **`4.5`**. If it does not, the chart is wrong somewhere even if every check is green.

That hand-trace is the actual test here. The checker cannot do it for you.
