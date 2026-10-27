## 1. Who did what

Partners: Maya Lopez and Dev Patel.

Maya drove the keyboard for the plan (3.9.1) and Dev drove it for the code (3.9.2). We swapped for the checks
at the end. While Maya typed the plan, Dev noticed we had a load at the top but never saved at the bottom, so
we added the save call before moving on.

## 2. Three test cases

The level is 5 packets. The subset function is `lowPackets`.

| What we put in | What we expected | What we got |
| --- | --- | --- |
| Basil, 4 packets | kept (low) | kept |
| Tomato, 9 packets | left out (not low) | left out |
| a variety with exactly 5 packets | left out (5 is not below 5) | left out |

At least one case is kept and one is left out, and the third sits exactly on the level, which is where a `<`
written as `<=` would show up. What we got matched what we expected every time, so we changed nothing.

## 3. One thing we logged

After writing `lowPackets` we added `console.log(lowPackets(tray, packetLevel))`. It printed Marigold and
Sunflower, but Basil had only 4 packets and was missing. That told us the comparison was reading
`variety.seedsPerPacket` instead of `variety.packets`. We changed it to `variety.packets` and the log then
printed Basil and Marigold. If nothing had been wrong, the log would have confirmed the two low varieties,
and we would have known it was wrong if Tomato had shown up.

## 4. Three sections in our code

- **3.2 parameters and return:** in `totalSeeds(list)`, the line `return total;` hands the answer back to the
  main section instead of printing it.
- **3.3 the loop:** in `lowPackets`, the line `for (const variety of list) {` visits every variety, and
  `short.push(variety);` builds the new array.
- **3.8 save and load:** in `saveTray`, the line `localStorage.setItem(trayKey, JSON.stringify(list));`
  writes the list, and `loadTray` reads it back with `JSON.parse`.
