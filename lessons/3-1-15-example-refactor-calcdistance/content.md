## Refactoring calcDistance

**What you'll learn:**
- What "refactor" means: same output, better structure
- Seeing modularity, reusability, and maintainability happen in one example

Before, with the distance formula written out three times:

```js live plain
const x1 = 0, y1 = 0, x2 = 3, y2 = 4;
const dist1 = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5;
console.log("Distance 1:", dist1);

const x3 = 1, y3 = 2, x4 = 4, y4 = 6;
const dist2 = ((x4 - x3) ** 2 + (y4 - y3) ** 2) ** 0.5;
console.log("Distance 2:", dist2);

const x5 = -1, y5 = -1, x6 = 2, y6 = 3;
const dist3 = ((x6 - x5) ** 2 + (y6 - y5) ** 2) ** 0.5;
console.log("Distance 3:", dist3);
```

Run it. Now here is the same program after moving the math into one function:

```js live plain
function calcDistance(x1, y1, x2, y2) {
  return ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5;
}

console.log("Distance 1:", calcDistance(0, 0, 3, 4));
console.log("Distance 2:", calcDistance(1, 2, 4, 6));
console.log("Distance 3:", calcDistance(-1, -1, 2, 3));
```

Run this one too — same three numbers come out. That is what a **refactor** is: a change to the code's structure that does not change its behavior.

The second version is shorter, reads better, and if the formula ever changes — say to `Math.hypot(x2 - x1, y2 - y1)`, which does the same job in one call — you edit one line instead of three.

Notice this function takes four values in its parentheses. Those are **parameters**, and they are the whole subject of Module 3.2, coming up next. For now, notice only what they bought you here: one definition, three different results.

**Trace the lines that mention a coordinate.** In the "before" version, each distance spends two lines on coordinates — one declaring four variables, one doing the math — six lines total. In the "after" version, the coordinates go straight into the three calls — three lines total. That drop from six to three is reusability, counted.
