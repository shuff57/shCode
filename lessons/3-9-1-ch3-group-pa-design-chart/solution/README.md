# Reference answer — Part 1: Design the Plan

Pseudocode plan for Snack Shack. A student who picked Lap Times, Seed Tray or Library
Cart instead is marked against THAT problem — see lesson.json → aiGrader.prompt. This is
one acceptable shape, not the only one: different names and phrasing score the same as
long as at least four named functions are called with what they need, a loop does
something with each item, the change-one-record call is handed the list and a name and
its effect is reported afterwards, and the list is loaded at the start and saved at the end.

```
START
set stock to loadStock()
set shop name and reorder level
set total to totalValue(stock)
report the shop name and the total
set low to lowStock(stock, reorder level)
if low has anything in it
    report the low-stock list
otherwise
    report that everything is stocked
set lines to receiptLines(stock)
for each line in lines
    put the line on the screen
sellItem(stock, "Popcorn")
report the new total, totalValue(stock), and the new quantity of Popcorn
saveStock(stock)
END
```
