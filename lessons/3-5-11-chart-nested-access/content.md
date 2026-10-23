## Plain English to Pseudocode: Tracing a Nested Access

**What you'll practise:**
- Turning a loop whose body reads a nested field into numbered steps
- Following a chain (`order.items[i].price`) as a single step
- Putting the steps that run **once** after the loop
- Giving each answer of a decision its own result

An access chain is one reader, not three steps. `order.items[i].price` takes one hop at a time, but in pseudocode it is a single line.

### The plan, in plain English

1. Start the `total` at `0`.
2. Go through each item in `order.items`, and add that item's `price` to the `total`.
3. After the loop, read the customer's name, `order.customer.name`.
4. Ask whether the customer is a VIP, `order.customer.vip`. If so, print the name and total with a VIP label. Otherwise, print the name and total.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

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

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one. Plain English is fine: the AI reads what your steps mean.

| Write this | Use it for |
|---|---|
| `SET total TO 0` | starting the total |
| `FOR EACH item IN order.items` ... `END FOR` | the loop, with its steps indented |
| `IF order.customer.vip` ... `ELSE` ... `END IF` | the VIP question and its two answers |

### Three things that decide whether this is right

1. **The loop body** adds the price and goes **back to the loop**, not on to the VIP question.
2. **After the loop**, the flow reads the name. The VIP question is *outside* the loop, so it runs once.
3. **Each answer** of the VIP question has its own print, just as the code has one `console.log` in the `if` and one in the `else`.

### Before you submit

Press **Grade** above the editor. Before you submit, trace it by hand with the real data: prices `1.5` and `3`, and `vip` is `true`. Your steps should reach the VIP print with a total of `4.5`.
