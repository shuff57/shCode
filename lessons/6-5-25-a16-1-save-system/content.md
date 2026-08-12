## Assignment overview

Build a game with a complete save system. Your game needs:

1. A playable game world (canvas, player, a way to earn points)
2. At least 3 save slots — the player can save to any of them
3. A load feature — the player can load from any saved slot
4. An auto-save that fires when the player reaches a goal (score threshold or zone)
5. A title screen with a Continue option (loads the latest auto-save)

You've practiced every piece. This assignment asks you to put them all together into one cohesive system.

## Rubric

| # | Requirement | ✓ (done) | ✗ (missing) |
|---|-------------|-----------|-------------|
| 1 | Canvas created with `new Canvas()` | | |
| 2 | `storeItem` called at least once to save data | | |
| 3 | `getItem` called at least once to load data | | |
| 4 | `JSON.stringify` used to serialize saves | | |
| 5 | `JSON.parse` used to deserialize saves | | |

All requirements scored pass/fail by the auto-grader. The assignment unlocks the next lesson on completion.

## Starter code

Your `script.js` starts as a scaffold with STEP breadcrumbs inside `setup()` and `draw()`. The functions are empty — you fill in everything. The comments guide you through the five requirements in order.

## How to submit

1. Complete all five requirements in the editor
2. Click **Mark Complete** to run the auto-grader
3. The grader checks for each pattern (Canvas, storeItem, getItem, JSON.stringify, JSON.parse)
4. If any requirement fails, fix it and re-submit
5. Once all five pass, you're done — the next lesson unlocks

## Tips

- **Reference 2.5.16** for the save-slot pattern with multiple `storeItem` keys
- **Reference 2.5.19** for building a title screen with state-based transitions
- **Reference 2.5.23** for the auto-save pattern — overlap check or score threshold
- **Test with reloads.** Save your game, reload the page, and verify the save loaded correctly. If something is `undefined`, check your `JSON.parse` fallback.
- **Handle empty slots.** A slot that hasn't been saved to yet returns `null` from `getItem`. Use `||` to provide a fallback value.
- **Keep it simple.** The grader checks for the five patterns — it doesn't care how big your game is. A simple player that moves and earns points is enough.
- **Save structure matters.** Your save object should be consistent across slots and auto-save. Same keys, same shape.
