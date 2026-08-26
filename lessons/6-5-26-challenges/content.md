## Challenge options

Pick one of the four challenges below. Each extends your save system in a different direction. All assume you have working save/load from A16.1.

---

### Option 1: Save previews (medium)

Instead of just showing slot labels ("Slot 1"), show what's inside each slot before the player loads it: score, level, player position. The player should see what they're loading without having to commit first.

**Hints:**
- Read each slot with `getItem` and `JSON.parse` during the menu/display phase
- Show the parsed data as text: `Score: ${data.score}  Level: ${data.level}`
- Don't apply the loaded values to the game until the player confirms
- If a slot is empty (`null`), show "Empty" instead

---

### Option 2: Save timestamps (medium)

Add `Date.now()` to your save object so every save records the exact moment it was created. On the slot display, show a human-friendly time like "Saved 2 minutes ago" or "Saved yesterday at 3:45 PM".

**Hints:**
- Add `timestamp: Date.now()` to your save object before `JSON.stringify`
- On load, read `data.timestamp` and compute the difference: `(Date.now() - data.timestamp) / 1000` gives seconds ago
- For the display: `< 60s` → "just now", `< 3600s` → "X minutes ago", else show the actual date
- Use `new Date(data.timestamp).toLocaleString()` for the full date format

---

### Option 3: Multiple profiles (hard)

Use a profile name as a prefix for all save keys. For example, player "Alex" saves to `'alex_slot1'`, `'alex_slot2'`, and `'alex_autoSave'`. Player "Jordan" saves to `'jordan_slot1'`, etc. Add a profile switcher so two people can share a browser without overwriting each other's saves.

**Hints:**
- Store the active profile name: `let profile = 'default';`
- Build save keys dynamically: `storeItem(profile + '_slot1', JSON.stringify(saveData));`
- On the title screen, let the player type a profile name or pick from a list
- Store the list of known profiles in its own key: `storeItem('_profiles', JSON.stringify(['alex', 'jordan']));`
- Loading switches all keys: you don't need separate logic, just a different prefix

---

### Option 4: Bulk delete with double-confirmation (medium)

Add a "Delete all saves" option that requires two key presses to confirm: first press asks "Are you sure?", second press confirms. This prevents accidental data loss from a stray keystroke.

**Hints:**
- Use a state variable: `let confirmWipe = false;`
- First press of the delete key sets `confirmWipe = true` and shows "Press D again to confirm"
- Second press (while `confirmWipe` is true) calls `clearStorage()` and resets the flag
- If the player presses any other key, cancel: `confirmWipe = false`
- After wiping, reset all game state to defaults

---

## Instructions

1. **Pick one challenge** from the options above
2. **Start from your A16.1 save system**: copy the core setup, player, and save/load logic
3. **Implement the feature**: add the new capability on top of your existing system
4. **Test with reloads**: your feature must survive a page reload and still work correctly

The auto-grader checks for the five core patterns (Canvas, storeItem, getItem, JSON.stringify, JSON.parse). The challenge-specific logic is for you: the grader only verifies the fundamentals are present.
