## 1. Who did what

Partners: Maya Lopez and Dev Patel.

Maya drove the keyboard for the plan (3.9.1) and Dev drove it for the code (3.9.2). We swapped for the checks
at the end. While Maya typed the plan, Dev noticed we had a load at the top but never saved at the bottom, so
we added the save call before moving on.

## 2. Three test cases

The limit is 300 pages. The subset function is `longTitles`.

| What we put in | What we expected | What we got |
| --- | --- | --- |
| Dune, 412 pages | kept (long) | kept |
| Holes, 233 pages | left out (not long) | left out |
| a title with exactly 300 pages | left out (300 is not over 300) | left out |

At least one case is kept and one is left out, and the third sits exactly on the limit, which is where a `>`
written as `>=` would show up. What we got matched what we expected every time, so we changed nothing.

## 3. One thing we logged

After writing `longTitles` we added `console.log(longTitles(cart, pageLimit))`. It printed nothing, even
though Dune and Emma are both long. That told us the comparison was reading `title.copies` (2 and 3) against
a page limit. We changed it to `title.pages` and the log then printed Dune and Emma. If nothing had been
wrong, the log would have confirmed those two titles, and we would have known it was wrong if Holes had
shown up.

## 4. Three sections in our code

- **3.2 parameters and return:** in `totalPages(list)`, the line `return total;` hands the answer back to the
  main section instead of printing it.
- **3.3 the loop:** in `longTitles`, the line `for (const title of list) {` visits every title, and
  `long.push(title);` builds the new array.
- **3.8 save and load:** in `saveCart`, the line `localStorage.setItem(cartKey, JSON.stringify(list));`
  writes the list, and `loadCart` reads it back with `JSON.parse`.
