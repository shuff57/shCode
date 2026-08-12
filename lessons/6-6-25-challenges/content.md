## Extended State Features

Pick **one** challenge. Start from your A16.2 state machine code and build the feature on top.

---

### Challenge 1: Animated Transitions

Fade to black between state changes. When a transition happens, draw a full-screen black rectangle with increasing alpha over several frames, then switch the state. The reverse when entering the new state.

**How to approach it:**
- Add a `transitionAlpha` variable that counts from 0 to 255
- When a state change is requested, set a `targetState` variable and start incrementing `transitionAlpha`
- Draw `fill(0, 0, 0, transitionAlpha); rect(0, 0, width, height)` after the background each frame
- When alpha hits 255, swap `state = targetState` and decrement alpha back to 0

---

### Challenge 2: Loading State

Add a `'loading'` state that shows for 2 seconds before reaching `'title'`. This mimics a real game boot sequence.

**How to approach it:**
- Start `state = 'loading'` in setup()
- In draw(), add a `case 'loading':` that shows a simple message ("Loading...") or a progress bar
- Use `frameCount` as a timer: when `frameCount >= 120` (2 seconds at 60fps), set `state = 'title'`
- Use a local startFrame variable to reset the timer if you leave and re-enter loading

---

### Challenge 3: State History (Undo)

Keep an array of previous states. Press Backspace to undo the last transition — go back to the previous state.

**How to approach it:**
- Add `let stateHistory = []` at the top
- Every time you change `state`, push the old state into `stateHistory` first
- Listen for `kb.presses('backspace')` in every relevant case (or near the top of draw)
- To undo: pop the last item from `stateHistory` and set `state` to it
- Only undo if `stateHistory.length > 0`

---

### Challenge 4: Settings State

Add a `'settings'` state where the player can change game variables — speed, difficulty, or colors. These changes persist into gameplay.

**How to approach it:**
- Add `let playerSpeed = 4`, `let spawnRate = 60`, or similar tunable variables
- In `case 'settings':`, draw a menu with options and use keys (e.g. 1/2/3 or arrow keys) to change values
- Press ESC or a back button to return to the previous state
- The play state reads from the settings variables instead of hardcoded numbers
- Bonus: save settings to localStorage so they persist across sessions

---

### Instructions

1. Pick one challenge
2. Open `script.js` — it starts from the A16.2 scaffold
3. Add your challenge's code
4. Test that all base states still work
5. Commit when you're happy
