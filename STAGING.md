# `staging` — the promotion branch into production (`cs-3d`)

`cs-3d` is what Cloudflare Pages serves (project `shcode`, production branch `cs-3d`). It is a
**curated** line: work from `codehs-inspiration` reaches it in chosen batches, never as a
wholesale merge. `staging` holds one batch while it is being assembled and checked.

- **Base:** always `origin/cs-3d`. Staging is only ever `cs-3d` plus the batch in preparation.
- **Worktree:** `/home/shuff57/Documents/GitHub/shCode-staging`. `node_modules` is a symlink to
  the main tree's and `public/reshape/kernel/` is copied in; both are git-ignored.
- **Never deployed.** A deploy is made from `shCode-deploy` (a `cs-3d` checkout that has
  `pa-pseudocode/` and the kernel), after `cs-3d` has been fast-forwarded onto staging.
- **Never force-pushed, never rebased once shared.** One batch, one fast-forward merge.

## Why not just merge or rebase `codehs-inspiration`

Because the two lines already share work through cherry-picks. On 2026-11-03, `cs-3d` carried 19
commits whose shas are not on `codehs-inspiration`, and 9 of those are content-identical twins of
an inspiration commit (`git patch-id` says SAME). A merge would replay 89 commits and collide with
every twin; a rebase would rewrite the shared dev line and duplicate history. Cherry-pick is the
only mechanism that keeps both lines honest, and `git cherry` is what knows which commit is which.

## 1. See what is promotable

```bash
cd /home/shuff57/Documents/GitHub/shCode-staging
git fetch origin

# what production does not yet have, content-wise
git cherry -v origin/cs-3d codehs-inspiration

# what this batch does not yet have (staging, before it is pushed, is the local ref `staging`)
git cherry -v staging codehs-inspiration
```

`-` lines are already present (content comparison, not sha); `+` lines are candidates. On
2026-11-03 that was 9 and 78 against `cs-3d`.

## 2. Stage the work you want

Whole commits, oldest first:

```bash
git cherry-pick -x <sha> [<sha>…]
```

`-x` appends "cherry picked from <sha>", which is the trail that lets `git cherry` — and a human —
recognise the same content later.

A commit that mixes wanted and unwanted work (a `chore(generated)`, or a lens commit that touches
six modules) is staged **by path** instead:

```bash
git checkout codehs-inspiration -- <path> [<path>…]
git commit -m "promote(<area>): <what> (from codehs-inspiration@<sha>)"
```

Rules that have bitten before:

- **`codehs-review/` and `HANDOFF.md` are notes.** They are not shipped; leave them out of a
  promote commit unless the batch is about them.
- **`.gauntlet/occt-checks.json`** is rewritten by any test run. Never stage it.
- **Generated files** (`public/lessons-manifest.json`, `public/lesson-requirements.json`,
  `public/quiz-stems.json`, `functions/_shared/*.generated.ts`) are regenerated on the batch, never
  merged by hand: run `npm run build` here and commit the result as
  `chore(generated): regenerate on the staging tree`.
- **Lesson folder ids key student progress** — due dates, open dates and solution releases all
  point at them. A promotion may add folders; renaming or deleting one needs the three-table rule
  in CLAUDE.md.

## 3. Prove it

```bash
npm test        # the full gate; a batch that fails here does not land
npm run build   # also regenerates the generated files above
```

While iterating, the same scripts can be run alone: `check-lesson-numbers`,
`check-prompt-pointers`, `check-starters`, `audit-grader-tolerance.mjs --gate`.

## 4. Land it

```bash
git push origin staging                  # optional, but it makes the batch reviewable

cd /home/shuff57/Documents/GitHub/shCode-deploy
git merge --ff-only origin/cs-3d         # the deploy tree must be current first
git merge --ff-only staging              # refuses if cs-3d moved: rebase staging onto it, then retry
git push origin cs-3d
npm run deploy                           # the mandated path — never bare wrangler
```

Then resync the holding branch so the next batch starts from a clean base:

```bash
cd /home/shuff57/Documents/GitHub/shCode-staging
git merge --ff-only origin/cs-3d         # staging is now an ancestor of cs-3d, so this fast-forwards
```

`npm run deploy` needs `pa-pseudocode/` populated and `TRIES_APPLIED` stamped (CLAUDE.md);
`shCode-deploy` has both. **Do not move `TRIES_APPLIED`** — an earlier instant confiscates tries.

## Batches

| Date | Commits | What | Landed as |
| --- | --- | --- | --- |
| 2026-11-02 | 72 | Chapter 5 only (record: `codehs-review/RELEASE-CH5.md`) | `46087c3b` … `d55adf77` |
| — | — | next batch | — |
