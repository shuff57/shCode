## Canonical Algorithms

**What you'll learn:**
- What a canonical algorithm is, and why computer scientists study a few of them by name
- Linear search: check one item at a time until you find the target, or run out of items
- Why the loop still finishes even after it finds what it's looking for

Some algorithms show up so often, in so many problems, that computer scientists give them names and study them on their own. A **canonical algorithm** is a well-known, widely used algorithm that demonstrates an idea useful far beyond the one problem it solves.

**Searching** is one of the biggest categories. You search constantly without noticing: finding a contact by name, finding a word in a document, finding the cheapest flight. **Linear search** is the simplest searching algorithm: start at the first item, check it, and if it's not the one you want, move to the next. Stop looking once you've found it, or once you've checked everything and it isn't there.

You haven't met arrays yet: that's Section 3.3, so this version searches a range of numbers instead of a list. Same idea either way: check one at a time.

**Try it:** search the numbers 1 through 10 for a target. `found` starts `false`, and the loop only logs a match once, when it happens.

```js live plain
let target = 7;
let found = false;

for (let i = 1; i <= 10; i++) {
  if (i === target) {
    found = true;
    console.log("Found " + target + " at position " + i);
  }
}

if (!found) {
  console.log(target + " not found.");
}
```

Change `target` to `15` and run it again. The loop still checks every number from 1 to 10: it just never matches, so the `if (!found)` block at the end is the only thing that prints.

When you meet arrays in Section 3.3, you'll write this same algorithm searching a real list instead of a number range, and you'll add `break` (Section 2.4) so the loop can stop the moment it finds a match, instead of checking every remaining number for nothing.

**Worth thinking about:** sorting a list into order is another canonical algorithm: you'll meet one in a later unit. Can you think of an everyday task that is really a search or a sort in disguise?

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **canonical algorithm** | A well-known algorithm that demonstrates design principles useful across many problems |
| **linear search** | Checking each item one at a time until the target is found or the list ends |
| **found flag** | A boolean variable that tracks whether the search has succeeded yet |
