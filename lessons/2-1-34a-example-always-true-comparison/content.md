**Goal:** See why `0 < x < 10` is true for every number you can put in `x`, and why JavaScript accepts it without complaint.

In maths you would write "x is between 0 and 10" as `0 < x < 10`, and anyone reading it would know what you meant. JavaScript takes that line without an error. It also gets it wrong every time.

## Step 1: Predict, then run

`x` is 500. That is nowhere near between 0 and 10. Then `x` becomes -7, which is not between them either. Predict both lines before you run.

```js live plain
let x = 500;
console.log( 0 < x < 10 );

x = -7;
console.log( 0 < x < 10 );
```

## Step 2: Both were true

JavaScript reads the line in two steps, left to right.

First it works out `0 < x`. That is a comparison, so it produces a boolean: `true` for 500, `false` for -7.

Then it compares that boolean against 10. To do that it converts the boolean to a number: `true` becomes `1`, and `false` becomes `0`. So the second step is really `1 < 10` or `0 < 10` — and both of those are true no matter what `x` was.

Watch the conversion happen on its own:

```js live plain
console.log( 0 < 500 );
console.log( Number(true) );
console.log( 1 < 10 );
```

The condition looked at `x` once and then forgot about it.

## Step 3: Written properly, it has to look twice

Each side of `&&` has to be a complete comparison that names `x` itself.

```js live plain
let x = 500;
console.log( x > 0 && x < 10 );

x = 5;
console.log( x > 0 && x < 10 );
```

Now `false` for 500 and `true` for 5, which is what "between 0 and 10" actually means.

## Key takeaways

- `0 < x < 10` is legal JavaScript and always true. It never throws an error.
- The reason is the same one behind `day === "Saturday" || "Sunday"` in the last example: a piece of the condition that is not a full comparison gets converted to a boolean on its own, and the answer stops depending on your variable.
- Every side of `&&` or `||` must be a complete question with a yes-or-no answer, and it must name the variable it is asking about.
- To test a range, say it twice: `x > 0 && x < 10`.
