Problem: Snack Shack
Partners:

CONTRACTS (one row per function: name, takes in, gives back)
- makeItem(name, price, qty) gives back one item
- totalValue(list) gives back price times qty added up for the whole list
- lowStock(list, level) gives back a NEW list of the items with qty below the level
- receiptLines(list) gives back one line per item
- sellItem(list, name) lowers that item's qty by one, never below zero, and changes the list it was handed
- saveStock(list) saves the list to storage
- loadStock() gives the saved list back

PLAN
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
