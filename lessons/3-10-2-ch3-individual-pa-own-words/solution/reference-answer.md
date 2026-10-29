## 1. Three test cases

The budget is 10, and the comparison is `total > budget`.

| What I put in | What I expected | What I got |
| --- | --- | --- |
| Clips at 3.00 and a pad at 3.00 (total 6.00) | within budget | within budget |
| Tape at 2.50 and a folder at 9.00 (total 11.50) | over budget | over budget |
| A single item at exactly 10.00 | not over (10 is not more than 10) | not over |

One case is over the budget and two are within, so both answers were tested; the third
sits exactly on the line, which is where writing `>=` instead of `>` would show up. What I
got matched what I expected every time, so I changed nothing.

## 2. One thing I logged

After writing `totalCost` I added `console.log(totalCost(cart))`. It printed 11.5 for the
second cart, which is what I had worked out by hand, so the total was right and the fault
had to be in the line that compared it. That print sent me to the comparison instead of
the loop. If the number had not matched, I would have looked at `totalCost` itself.

## 3. Three sections in my code

- **3.2 parameters and return:** in `totalCost(cart)`, the line `return total;` hands the
  answer back to the main section instead of printing it.
- **3.7 map:** in the main section, `const lines = cart.map((item) => receiptLine(item));`
  turns the cart into one line per record with an arrow callback.
- **3.8 save and load:** in `saveCart`, the line
  `localStorage.setItem(cartKey, JSON.stringify(cart));` writes the cart, and `loadCart`
  reads it back with `JSON.parse`.
