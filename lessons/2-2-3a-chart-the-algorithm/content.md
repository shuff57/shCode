## Plain English to Pseudocode: Largest of Three

**What you'll practise:**
- Reading an algorithm and writing it as exact, numbered steps
- Writing two checks in a row, each closed with END IF
- Seeing that a no answer still carries on to the next step

### The plan, in plain English

1. Set `largest` to `a`.
2. Check whether `b` is greater than `largest`. If it is, set `largest` to `b`.
3. Whether or not that happened, check whether `c` is greater than `largest`. If it is, set `largest` to `c`.
4. After both checks, print `largest`.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
let largest = a;

if (b > largest) {
  largest = b;
}

if (c > largest) {
  largest = c;
}

console.log("Largest:", largest);
```

### The thing worth noticing

There are **two** checks, and each has two answers. The `yes` answer updates `largest`. The `no` answer updates nothing, but it still carries on to the next step: an `else if` or a nested check would skip the second comparison whenever `b` won, and then `c` could never beat it. In your pseudocode, the `END IF` of the first check is what lets both answers reach the second one.

### Before you submit

Press **Grade**, then trace your steps by hand with (a, b, c) = (3, 9, 5), (3, 5, 9) and (9, 3, 5). Each should print `9`. Nothing here is graded and you can retry as often as you like.
