**Goal:** Run decomposition and pattern recognition together on the sandwich problem, and see the categories do work you did not ask them to do.

## Step 1: Decompose: list everything, in any order

No structure yet. Just everything the robot will need or do.

> bread, jam, knife, pick up, spread, plate, unscrew, butter, repeat, left hand, right hand

Eleven items, in no order, with no relationship to each other. This is what raw decomposition looks like and it is not yet useful: it is a pile.

## Step 2: Recognise patterns: group them

```js live plain
let ingredients = ["bread", "jam", "butter"];
let equipment = ["plate", "knife"];
let actions = ["repeat x times", "left hand", "right hand", "pick up", "unscrew"];

console.log("ingredients: " + ingredients.length);
console.log("equipment:   " + equipment.length);
console.log("actions:     " + actions.length);
```

Three groups instead of eleven facts. You can now hold the whole problem in your head, which you could not do thirty seconds ago, and nothing was added or removed to achieve it.

## Step 3: The columns start asking questions

This is the part worth noticing. Having an **equipment** column makes the gaps in it obvious:

- Equipment has a plate and a knife. Does the robot need anything to open the jar? Anything to hold the bread down?
- Ingredients has bread, jam and butter. Is butter always wanted? *(That question becomes a decision: see 1.5.22.)*
- Actions has "pick up" and "unscrew". Nothing puts anything **down**.

None of those were in the original pile. The categories prompted them, which is why grouping is a thinking tool and not just tidying.

## Step 4: Add what the columns found

```js live plain
let actions = [
  "pick up", "put down", "unscrew", "screw on",
  "spread", "repeat x times", "left hand", "right hand"
];

for (let i = 0; i < actions.length; i = i + 1) {
  console.log((i + 1) + ". " + actions[i]);
}
```

Eight actions now, up from five. Three of them: "put down", "screw on", "spread": exist only because a category was staring at you with a hole in it.

The instructions the robot eventually gets will be better for it, and none of this required writing a program.

## Key takeaways

- Raw decomposition gives a pile; pattern recognition turns it into groups.
- Grouping compresses the problem to a size you can hold.
- Categories prompt you: the empty spaces are the useful part.
- All of this happens before any code, and improves the code that follows.
