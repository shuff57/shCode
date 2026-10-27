## 1. Who did what

Partners: Maya Lopez and Dev Patel.

Maya drove the keyboard for the plan (3.9.1) and Dev drove it for the code (3.9.2). We swapped for the checks
at the end. While Maya typed the plan, Dev noticed we had a load at the top but never saved at the bottom, so
we added the save call before moving on.

## 2. Three test cases

The target is 60 seconds a lap. The subset function is `slowRunners`.

| What we put in | What we expected | What we got |
| --- | --- | --- |
| Ben, 62 seconds a lap | kept (slow) | kept |
| Ana, 55 seconds a lap | left out (not slow) | left out |
| a runner on exactly 60 | left out (60 is not above 60) | left out |

At least one case is kept and one is left out, and the third sits exactly on the target, which is where a `>`
written as `>=` would show up. What we got matched what we expected every time, so we changed nothing.

## 3. One thing we logged

After writing `slowRunners` we added `console.log(slowRunners(meet, targetLapSeconds))`. It printed every
runner, including Dev, who runs 50-second laps. That told us the comparison was reading `runner.laps` instead
of `runner.lapSeconds`. We changed it to `runner.lapSeconds` and the log then printed Ben and Cara. If nothing
had been wrong, the log would have confirmed only the two runners over 60 seconds, and we would have known it
was wrong if Dev had shown up.

## 4. Three sections in our code

- **3.2 parameters and return:** in `totalSeconds(list)`, the line `return total;` hands the answer back to the
  main section instead of printing it.
- **3.3 the loop:** in `slowRunners`, the line `for (const runner of list) {` visits every runner, and
  `slow.push(runner);` builds the new array.
- **3.8 save and load:** in `saveMeet`, the line `localStorage.setItem(meetKey, JSON.stringify(list));`
  writes the list, and `loadMeet` reads it back with `JSON.parse`.
