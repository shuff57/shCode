Problem: Library Cart
Partners:

CONTRACTS (one row per function: name, takes in, gives back)
- makeTitle(title, copies, pages) gives back one title
- totalPages(cart) gives back copies times pages added up for the whole list
- longTitles(cart, limit) gives back a NEW list of the titles whose pages is above the limit
- spineLines(cart) gives back one line per title
- checkOut(cart, title) lowers that title's copies by one, never below zero, and changes the list it was handed
- saveCart(cart) saves the list to storage
- loadCart() gives the saved list back

PLAN
START
set cart to loadCart()
set branch name and page limit
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
