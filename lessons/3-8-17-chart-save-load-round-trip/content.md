## Plain English to Pseudocode: Save/Load Round Trip

**What you'll practise:**
- Turning plain English into exact, numbered steps
- Putting **two** questions in the right order: is anything stored, and can it be read
- Landing both "fall back to defaults" paths on the same answer
- Reading a flow chart and matching each box to a step

### The plan, in plain English

Saving turns an object into text and stores it. This lab is the **load** half, `loadSettings()`:

1. Read the text stored under the key `"settings"`.
2. If nothing is stored, give back the defaults.
3. Otherwise try to parse the text into an object, and give back the object.
4. If the parse fails, give back the defaults instead.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
const defaults = { theme: "light", fontSize: 14 };

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

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one. Plain English is fine: the AI reads what your steps mean.

| Write this | Use it for |
|---|---|
| `SET text TO the stored value` | reading the key |
| `IF text is null` ... `END IF` | the missing-key check |
| `RETURN defaults` | falling back |
| `TRY` ... `END TRY` | the parse that might fail |

### The order the two questions have to be in

1. **First: is anything stored?** If not, give back the defaults right away. You never reach the parse.
2. **Second: does the parse succeed?** If it does, give back the object. If it fails, give back the defaults.

The first question is the one students skip. `JSON.parse(null)` does not throw, it quietly returns `null`, so the missing-data case slips through even with a `try` in place.

### Before you submit

Press **Grade** above the editor, then trace your steps by hand twice: once with a saved key, and once on a first run where nothing is stored. The first trace should reach the parse. The second should stop at the missing-key check and give back the defaults. If both reach the parse, the first question is in the wrong place.
