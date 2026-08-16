## One thing, one word

If your team calls a site visitor a **user**, then name your variables `currentUser` and `newUser` — not `currentVisitor`, not `newManInTown`. Consistent terminology prevents confusion.

This is the rule that does not bite until you work with other people, which is exactly why it is easy to skip and expensive to skip.

Here is the failure. Two people write code for the same website. One calls it a `cart`, the other calls it a `basket`. Both are perfectly good names. Now the codebase has `cartItems` and `basketTotal` and `addToCart` and `emptyBasket`, and every reader has to ask a question that has no answer: **are these two things, or one thing with two names?** Nothing in the code can tell them. That question costs real minutes, every time, forever.

The fix is not to find the *best* word. `cart` and `basket` are equally fine. The fix is to **pick one and write it down**, then have everybody use it — including in comments, commit messages and conversation.

So when you join a project that already has names, the right move is to match them, even when you would have chosen differently. Consistency beats your preference. That is not politeness; a codebase with one word per idea is genuinely easier to search, read and change.

**What you'll learn from it:**
- One idea should have exactly one word across the whole codebase.
- Two good names for the same thing is worse than one mediocre name.
- Match a project's existing vocabulary, even if you prefer another word.
- The cost is confusion — nobody can tell "two things" from "two names".

**Try it:**

```js live plain
// Two people, two words, one shopping cart
let cartItems = 3;
let basketTotal = 24.50;
console.log("items: " + cartItems + ", total: " + basketTotal);

// One agreed word
let cartItemCount = 3;
let cartTotal = 24.50;
console.log("items: " + cartItemCount + ", total: " + cartTotal);
```

In the top version, a reader genuinely cannot tell whether `basketTotal` is the total of `cartItems` or of something else entirely. In the bottom version the shared prefix answers it before the question forms.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **terminology** | The agreed set of words a team uses for the things in its project |
| **consistency** | Using the same word for the same idea everywhere |
| **domain vocabulary** | The words the project's subject already uses — cart, order, student |
| **convention over preference** | Matching what exists beats using the name you like more |
