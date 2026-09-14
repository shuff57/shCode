**Goal:** Put stringify, storage and a guarded parse together into the whole save/load pattern, and watch it recover from corrupt data.

## Step 1: Save by key

Saving is one line: convert the object to text, then store the text under a key. Run this and read the key back.

```js live plain
const defaults = { theme: "light", fontSize: 14 };

function saveSettings(settings) {
  localStorage.setItem("settings", JSON.stringify(settings));
}

saveSettings({ theme: "dark", fontSize: 18 });

console.log(localStorage.getItem("settings"));
```

The stored value is the compact JSON text, not the object. Storage holds strings, so the conversion has to happen before `setItem`.

## Step 2: Load with three questions

`loadSettings` answers three questions in order: **is there anything saved?**, **can it be read?**, and **what do we use if either answer is no?** The defaults answer the last two.

```js live plain
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

console.log(loadSettings());
```

With nothing saved at the key, the first question catches it and returns the defaults — no parse, no throw.

## Step 3: The full pattern, and a corrupt value

Now run all three pieces together and then corrupt the stored text by hand. The load still answers every question.

```js live plain
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

saveSettings({ theme: "dark", fontSize: 18 });
console.log(loadSettings());

localStorage.setItem("settings", "{ not json");
console.log(loadSettings());
```

The first load returns the saved object. The second finds text at the key but cannot parse it, so the `catch` returns the defaults. One function, three cases, and it never throws.

## Step 4: What "persists" means here

This example runs in a console sandbox, so its storage lives only for the run. In a real browser page, `localStorage` survives the page closing — run the save, reload, and the value is still there. The pattern is identical; only the lifetime of the store changes. Run the block to confirm the store behaves like a real one within a single run.

```js live plain
const defaults = { theme: "light", fontSize: 14 };

localStorage.setItem("settings", JSON.stringify({ theme: "dark", fontSize: 18 }));

const text = localStorage.getItem("settings");
if (text === null) {
  console.log(defaults);
} else {
  console.log(JSON.parse(text));
}
```

## Key takeaways

- Saving is `localStorage.setItem(key, JSON.stringify(value))`.
- Loading reads the key, tests for `null`, then parses inside `try...catch`.
- All three questions must be answered: is anything there, can it be read, what is the fallback.
- The defaults are the single answer to the last two questions.
- In a real browser the value survives the page closing; the pattern is the same either way.
