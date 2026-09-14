**Goal:** Feed the value returned by one function straight into another, and read the chain from the inside out.

## Step 1: Two small returning functions

Start with two functions that each do one job and hand back a number.

```js live plain
function double(n) {
  return n * 2;
}

function addTen(n) {
  return n + 10;
}

console.log(double(5));
console.log(addTen(5));
```

Each works alone: `10` and `15`. Neither knows about the other yet.

## Step 2: Put one call inside the other

A call to a returning function *is* a value, so it can be written as the argument to another call.

```js live plain
function double(n) {
  return n * 2;
}

function addTen(n) {
  return n + 10;
}

console.log(double(addTen(5)));
```

The inner call runs first: `addTen(5)` is `15`, so the outer call is `double(15)`, which is `30`.

## Step 3: Swap the nesting

The order of the calls is not decoration. Reverse the nesting and the answer changes.

```js live plain
function double(n) {
  return n * 2;
}

function addTen(n) {
  return n + 10;
}

console.log(addTen(double(5)));
```

Now `double(5)` runs first and becomes `10`, so `addTen(10)` is `20`. Same two functions, same starting number, a different answer because a different call ran first.

## Step 4: A chain of three

The pattern extends as far as you like. Read it from the middle outward.

```js live plain
function double(n) {
  return n * 2;
}

function addTen(n) {
  return n + 10;
}

const result = addTen(double(addTen(5)));
console.log(result);
```

Inside out: `addTen(5)` is `15`, `double(15)` is `30`, `addTen(30)` is `40`. Three small functions composed into one longer job, with no logic repeated.

## Key takeaways

- The value returned by one function can be passed straight into another.
- The innermost call always runs first.
- Swapping the nesting order changes the result.
- Small returning functions compose into bigger jobs without duplicating logic.
