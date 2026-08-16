**Goal:** Watch a plan change when a case you skipped turns up — and meet the pseudocode keywords while you are there.

## Step 1 — The case that was skipped

Writing algorithms takes practice, and the practice is mostly in **noticing the cases you skipped.**

Not everyone wants butter in a jam sandwich. The original plan assumed everyone did, which is not a bug in the code — there is no code. It is a bug in the plan, and it was there before anything was typed.

Three steps cover it:

1. Ask whether there should be butter on the bread.
2. Either spread butter on the bread,
3. Or do not use butter.

That is a **decision**, and it needs a new row in the actions column and new steps in the plan.

## Step 2 — The plan, with keywords

Pseudocode often uses a handful of capitalised keywords to make the structure jump out:

```
START
INPUT "Do you want butter?" as answer
IF answer is yes THEN
    spread butter on the bread
ELSE
    do nothing
spread jam on the bread
OUTPUT the sandwich
```

| Keyword | Means |
|---|---|
| `START` | Where the algorithm begins |
| `INPUT` | Get something from outside — a person, a file, a sensor |
| `IF … THEN` | A decision, with the consequence indented under it |
| `ELSE` | The other branch |
| `OUTPUT` | Hand a result back |

The keywords are a convention, not a requirement. Nothing checks them. They exist because a capitalised `IF` is easier to find when you are scanning a page of plain English.

## Step 3 — Notice what `ELSE do nothing` is doing

It looks pointless and it is not. Writing the empty branch out **proves you considered it.** A plan with no `ELSE` is ambiguous: did the author decide nothing should happen, or did they forget the case existed?

Same reason a flowchart diamond must have both exits labelled — you will meet that rule at 1.5.26.

## Step 4 — In code

```js live plain
let wantsButter = true;              // INPUT

if (wantsButter) {                   // IF ... THEN
  console.log("spread butter on the bread");
} else {                             // ELSE
  // do nothing
}

console.log("spread jam on the bread");
console.log("here is your sandwich");   // OUTPUT
```

Set `wantsButter` to `false` and run it again. The jam line still happens either way — it is outside the decision, so it is not indented, so both paths reach it.

That rejoining is the shape of every decision you will write this year.

## Key takeaways

- Most plan bugs are cases you skipped, not steps you got wrong.
- `START`, `INPUT`, `IF/THEN`, `ELSE`, `OUTPUT` are conventions that aid scanning.
- Writing out an empty `ELSE` proves the case was considered, not forgotten.
- Steps after the decision are un-indented because both branches reach them.
