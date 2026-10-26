## Plain English to Pseudocode: a switch is a chain of questions

**What you'll practise:**
- Seeing a switch as a chain of questions, one per case
- Knowing what break does: leave the switch, skip the cases below
- Turning plain English into exact, numbered steps

### The plan, in plain English

1. Set `grade` to `B`.
2. Is `grade` A? If so print `Excellent` and **break**.
3. Otherwise, is it B? If so print `Good` and **break**.
4. Otherwise, is it C? If so print `Passing` and **break**.
5. If nothing matched (the **default**), print `Not a grade I know`.
6. After the switch, either way, print `Done`.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
let grade = "B";

switch (grade) {
  case "A":
    console.log("Excellent");
    break;
  case "B":
    console.log("Good");
    break;
  case "C":
    console.log("Passing");
    break;
  default:
    console.log("Not a grade I know");
}

console.log("Done");
```

### The thing worth noticing

There is no "switch shape": a switch is **three diamonds in a row**, and the `no` arrow of each leads to the next question. `break` is not a shape either. It is the arrow from a case's print that jumps **past** every question below it. Take the `break` out of case A and the arrow out of `Excellent` would drop into `Good` and print that too: that is **fall-through**. The `default` is not a fourth question, it is just where the last `no` lands.

### Before you submit

Press **Grade**, then trace your steps by hand with `B`: `Good`, then `Done`, nothing else.
