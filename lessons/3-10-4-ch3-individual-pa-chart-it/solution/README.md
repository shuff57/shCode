# Reference answer — Part 4: Plan It

Pseudocode plan for Price Check. A student who picked Reading Log or Watering Rota
instead is marked against THAT problem — see lesson.json → aiGrader.prompt. This is
one acceptable shape, not the only one: different names and phrasing score the same as
long as at least two named functions are called on the path to the answer, a loop adds
each item to the total, and ONE comparison after the loop reports every outcome.

```
get the cart
get the spending limit
set total to 0
for each item in the cart
    set price to priceOf the item
    set total to total plus price
    call receiptLine with the item
if the total is over the limit
    report over the limit
otherwise if the total is exactly the limit
    report at the limit
otherwise
    report under the limit
```
