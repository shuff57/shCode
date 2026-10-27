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
