## Why There Is No `open()` Here

**What you'll learn from it:**
- That other languages save data with file functions such as `open()`, `read()` and `write()`
- Why a browser page is given no filesystem access at all
- The two doors that do exist: a file the user picks, and a download the user saves
- Why the restriction is what makes visiting a web page safe

Other languages teach saving data with file functions: open a file by name, read it, write to it, close it. You may have seen `open()`, `read()` and `write()` in a course that used one of those languages. JavaScript running in a browser has none of them, and the reason is deliberate.

A web page runs code from a stranger's server on your computer. If that code could open any file it liked, visiting a page would mean handing over your documents. So the browser gives a page no access to your filesystem at all. What it gets instead is storage of its own — like `localStorage` — kept separate for each site:

**Try it:** Run the block. The page can save and read its own named text, but it cannot reach a file by name.

```js live plain
localStorage.setItem("note", "saved text");

console.log(localStorage.getItem("note"));

// The file functions other languages use do not exist in a page's
// JavaScript. The only store a page gets is its own, under keys it chooses.
console.log(typeof read);
console.log(typeof write);
```

The page can save under a key it chose and read it back. What it cannot do is name a file on your machine. The two doors that do exist both require a person to open them:

- A file the **user picks** through a file-chooser dialog. The page never sees anything the user did not choose.
- A file the page offers as a **download**, which the user then chooses to save.

Neither appears in this book, because nothing in the later chapters needs one — the modelling chapters export finished models through their own export system, and the game chapters save to key-value storage. When you meet those two doors in other JavaScript, you will now know why they are shaped the way they are: not as an inconvenience, but as the reason it is safe to visit a web page at all.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`open()` / `read()` / `write()`** | File functions other languages have; browser JavaScript has none |
| **sandbox** | The rule that a page gets no access to your filesystem |
| **filesystem** | Your computer's files; deliberately outside a page's reach |
| **file picker** | The dialog where the user chooses one file to share |
| **download** | A file the page offers and the user chooses to save |
| **isolated storage** | The key-value store a site gets instead, kept separate per site |
