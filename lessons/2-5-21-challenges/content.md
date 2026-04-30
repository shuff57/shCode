## Challenge 1 — Top-3 high-score list (medium)

Store the top three scores across sessions. When a game ends, check whether the new score beats any of the saved top-3 entries and update the list.

**Hints:**
- Store the list as a JSON array: `storeItem('top3', JSON.stringify([9, 7, 5]));`
- On load, read it back with `JSON.parse(getItem('top3')) || []`.
- Add a clear button: `if (kb.presses('c')) removeItem('top3');`

---

## Challenge 2 — Lose state (medium)

Add a `'lose'` state so the game has a proper failure path — losing all lives or hitting a hazard sends the player to a lose screen instead of just looping.

**Hints:**
- Add `case 'lose':` to your switch with a "Game over" message.
- Trigger it with `gameState = 'lose'` when `lives === 0` or the player hits a deadly sprite.
- Let the player press a key from `'lose'` to return to `'menu'`.

---

## Challenge 3 — Mid-game save and resume (hard)

Let the player export their entire mid-game state — score, position, lives — to a JSON file on demand. On the next session, let them load it back and continue.

**Hints:**
- Press a key to call `save({ score, x: player.x, y: player.y, lives }, 'midgame.json')`.
- Use `loadJSON('midgame.json')` inside `preload()` to restore it on reload.
- This combines the round-trip pattern from 2.5.8 with the `save` function from 2.5.9.
