## A16.2 Game States — State Machine with Persistence

### Assignment overview

This is the capstone for Unit 2. You've learned two major systems: **save/load** (Module 2.5) and **state machines** (Module 2.6). Now you integrate them.

Build a game with at least 4 states: `'title'`, `'play'`, `'pause'`, and `'gameover'`. The state machine controls which screen you see. The save system captures your progress. When you press Continue, it loads the save AND restores the correct state.

### Rubric

| # | Requirement | What the grader checks |
|---|------------|----------------------|
| 1 | `switch` statement in `draw()` | Your `draw()` function uses `switch(state)` to route to the correct case |
| 2 | At least 3 `case` blocks ending with `break` | Each state has its own `case` block, and each `case` ends with `break` |
| 3 | `storeItem()` called | Save data is written to localStorage using `storeItem()` |
| 4 | `JSON.stringify()` called | The save object is converted to a string before storing |
| 5 | `JSON.parse()` called | Saved JSON is parsed back into an object when loading |

### Starter code

You'll start from the `script.js` file. It has a blank `setup()` and `draw()` with STEP comments — you write the code. Do not copy-paste a whole solution from an earlier lesson; build it step by step.

### How to submit

Commit your work through the workspace. The auto-grader checks the patterns above. Your teacher will also review your code for clarity and completeness during commit review.

### Tips

- **2.5.16 (Slots)** — how `storeItem` and `getItem` read/write named save slots
- **2.5.23 (Auto-save)** — saving automatically when something important happens
- **2.6.13 (Three-state machine)** — the switch/case pattern for title, play, gameover
- **2.6.19 (Pause state)** — toggling in and out of a freeze state with `kb.presses`
- **2.6.22 (Save on transition)** — calling `saveGame()` right after `state = 'gameover'`
- **2.6.23 (Continue loads right state)** — `saved.state` restores the correct case

Start small: title and play first. Get the switch working. Then add pause. Then gameover. Save for last — wire it in once the state machine is solid.
