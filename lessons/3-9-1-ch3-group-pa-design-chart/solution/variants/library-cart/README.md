START
set branch name and page limit
set cart to loadCart()
set pages to totalPages(cart)
report the branch name and the pages
set long to longTitles(cart, limit)
if long has anything in it
    report the long titles
otherwise
    report that nothing is long
set spines to spineLines(cart)
for each spine in spines
    put the spine on the screen
checkOut(cart, "Dune")
report totalPages(cart) and the copies Dune now has
saveCart(cart)
END
