## 1. Who did what

Partners: Maya Lopez and Dev Patel.

Maya drove the keyboard for the plan (3.9.1) and Dev drove it for the code (3.9.2). We swapped for the checks
at the end. While Maya typed the plan, Dev noticed we had a load at the top but never saved at the bottom, so
we added the save call before moving on.

## 2. Three test cases

Reorder level is 5. The subset function is `lowStock`.

| What we put in | What we expected | What we got |
| --- | --- | --- |
| Pretzel, qty 3 | kept (low stock) | kept |
| Popcorn, qty 12 | left out (not low) | left out |
| Nachos, qty 5 | left out (5 is not below 5) | left out |

At least one case is kept and one is left out, and the third sits exactly on the level, which is where a `<`
written as `<=` would show up. What we got matched what we expected every time, so we changed nothing.

## 3. One thing we logged

After writing `lowStock` we added `console.log(lowStock(stock, reorderLevel))`. It printed Pretzel and Nachos,
but Nachos has qty 5. That told us our comparison was `<=`, not `<`. We changed it to `<` and the log then
printed only Pretzel. If nothing had been wrong, the log would have confirmed the list was right, and we would
have known it was wrong if Popcorn had shown up.

## 4. Three sections in our code

- **3.2 parameters and return:** in `totalValue(list)`, the line `return total;` hands the answer back to the
  main section instead of printing it.
- **3.3 the loop:** in `lowStock`, the line `for (const item of list) {` visits every item, and
  `short.push(item);` builds the new array.
- **3.8 save and load:** in `saveStock`, the line `localStorage.setItem(stockKey, JSON.stringify(list));`
  writes the list, and `loadStock` reads it back with `JSON.parse`.
