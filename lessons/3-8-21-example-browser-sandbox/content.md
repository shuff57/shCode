**Goal:** See what a browser page actually can and cannot do for storage, and why the boundary is drawn there.

## Step 1: The storage a page does get

A page gets its own key-value store, kept separate per site. Run this and read it back — that half works.

```js live plain
localStorage.setItem("note", "hello from this page");
localStorage.setItem("count", "3");

console.log(localStorage.getItem("note"));
console.log(localStorage.getItem("count"));
```

The page can save under keys it chooses and read them back. This is the store the save/load pattern in this module uses.

## Step 2: The functions a page does not get

Other languages save with `open()`, `read()` and `write()`. A browser page has none of them. Run this and read the four lines.

```js live plain
console.log(typeof read);
console.log(typeof write);
console.log(typeof localStorage);
```

The first two are `"undefined"` — those file functions do not exist in the page at all. `localStorage` is an `"object"`, because it is the store the page is allowed to have.

## Step 3: Why the boundary is there

The reason is not that file access is hard to implement. A page runs code from a stranger's server, so if that code could open any file by name, merely visiting the page would expose your documents. The browser gives no filesystem access for that reason.

```js live plain
localStorage.setItem("safe", "kept inside this site's own store");

console.log(localStorage.getItem("safe"));

// No function here can name a file on the computer.
console.log("file access: " + typeof read);
console.log("per-site store: " + typeof localStorage);
```

One half is present, one half is absent, and the absence is the safety property — not a missing feature.

## Step 4: The two doors that do exist

When a real page needs a file, it must go through the user: either a file the **user picks** through a chooser, or a file the page offers as a **download** the user saves. Neither exists in this console sandbox, and neither appears in this book.

```js live plain
// The store the page gets is the only one it can reach on its own.
localStorage.setItem("draft", JSON.stringify({ level: 2 }));

const saved = localStorage.getItem("draft");
if (saved === null) {
  console.log("nothing saved yet");
} else {
  console.log(JSON.parse(saved));
}
```

## Key takeaways

- A page gets an isolated key-value store (`localStorage`), kept separate per site.
- A page has no `open()`, `read()` or `write()` — no filesystem access at all.
- The restriction is what makes visiting a page safe: a stranger's code cannot read your files.
- Real file access requires the user to choose a file, or to accept a download.
- Storing under a key is the browser's substitute for the file functions other languages teach.
