# pa-pseudocode/: teacher-private solutions

One file per Performance Assessment lesson: `<lessonId>.md`, the solution written as
plain-language pseudocode. A student sees it only after spending every try on that part
(`GET /api/attempt-reveal`).

**The `.md` files here are git-ignored on purpose.** This repository is public so other
teachers can self-host it, and a solution published next to the test it answers is no
longer a solution. Only this README is tracked.

## What that means for you

- **Self-hosting teacher:** write your own `<lessonId>.md` files, or leave the folder
  empty. With none, the reveal route answers 404 and students simply never see a
  solution; everything else (the three tries, the AI feedback, the best score) works.
  `npm test` stays green with no files here.
- **Deploying (the original author):** these files exist only on the machine that has
  them. Deploy from a checkout that has this folder populated, or copy it into the
  deploy worktree the way `public/reshape/kernel` is copied. `npm run deploy` runs
  `check-pa-attempts --require-pseudocode` and refuses to ship without them.
- **Back them up.** They are not in git. A private repo cloned into this folder works
  (a nested `.git` here is ignored by the parent).

## Format

Plain Markdown, at least a few lines, numbered steps, no code fences needed:

    1. Set total to 0.
    2. For each item in the cart, add its price times its quantity to total.
    3. Return total.

Write steps a student could follow without seeing the answer code. Do not paste the
reference solution.
