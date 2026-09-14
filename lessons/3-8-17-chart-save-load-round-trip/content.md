## Chart the Code: Save/Load Round Trip End to End

**What you'll practise:**
- Charting a save step and a load step as separate runs of the same program
- Putting **two** decisions in the right order: is anything stored, and can it be read
- Landing both "fall back to defaults" paths on the same print
- Getting the `try...catch` on the parse drawn as a branch, not an ending

The whole module is one pattern in two halves. **Save** turns an object into text and stores it. **Load** reads the text, decides whether it is usable, and either restores the object or falls back to defaults. Both halves are short, and the load half has two decisions that are easy to put in the wrong order.

### The code

```js
const defaults = { theme: "light", fontSize: 14 };

function saveSettings(settings) {
  localStorage.setItem("settings", JSON.stringify(settings));
}

function loadSettings() {
  const text = localStorage.getItem("settings");
  if (text === null) {
    return defaults;
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    return defaults;
  }
}
```

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each |
| **Task** (rectangle) | Stringifying the state, storing it under the key, reading the key, and each `return` |
| **Decision** (diamond) | "Is anything stored?" and "Did the parse succeed?" |
| **Input / Output** (parallelogram) | The final print |

At least ten shapes, at least two diamonds.

### The order the two decisions have to be in

1. **First decision: is the text `null`?** This is the missing-key check. Its `yes` path returns the defaults immediately — you never reach the parse.
2. **Second decision: did the parse succeed?** This is the `try...catch`. Its `yes` path returns the parsed object; its `no` path returns the defaults.

The first decision is the one students skip. If you jump straight to parsing, `JSON.parse(null)` does not throw — it quietly returns `null` — so the missing-data case slips through and the chart is wrong even though the two decision shapes are both there.

### The arrows that matter

- Both **`yes`** paths out of a return box lead to the **same print** shape at the bottom.
- Both **defaults** returns (`text === null` and the catch) land on that same print, because a defaults object is still a value the program prints.
- The print is **outside** both decisions: the flow only reaches it once the restore has produced a value.

### Before you submit

Press **Check my diagram**, then trace it by hand twice: once with a saved key, and once on a first run where nothing is stored. The first trace should reach the parse and return the saved object; the second should stop at the missing-key check and return the defaults. If both traces reach the parse, the first decision is in the wrong place.

That hand-trace is the actual test here. The checker cannot do it for you.
