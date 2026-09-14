**Goal:** See a primitive and an array pass into the same function and come out differently, because one arrives as a copy of a value and the other as a copy of a reference.

## Step 1: A primitive parameter is a copy

`num` receives a copy of `myNum`. Changing the copy leaves the original alone, so the caller still prints `10`.

```js live plain
function tryToChange(num) {
  num = 99;
  console.log("inside:", num);
}

let myNum = 10;
tryToChange(myNum);
console.log("outside:", myNum);
```

## Step 2: An array parameter points at the same array

`arr` is not a copy of the whole list: it is a copy of the reference, an address that points at the one array in memory. `push` reaches that array, so the caller sees the new item.

```js live plain
function addTo(arr) {
  arr.push(99);
}

let myArr = [1, 2, 3];
addTo(myArr);
console.log(myArr);
```

## Step 3: Both together, in one function

Two parameters, treated the same way in the code, two different outcomes. `myNum` is a number, so `change` got a copy of `10`; setting it to `99` altered only the copy. `myArr` is an array, so `change` got a copy of the reference, and `push` added to the one and only array.

```js live plain
function change(num, arr) {
  num = 99;
  arr.push(99);
}

let myNum = 10;
let myArr = [1, 2, 3];

change(myNum, myArr);

console.log(myNum);
console.log(myArr);
```

## Key takeaways

- A primitive argument is handed over as a copy of its value: reassigning the parameter cannot touch the caller's variable.
- An array (or any object) argument is handed over as a copy of its reference: both names point at the same thing.
- Writing into that shared object — `arr.push(...)`, `arr[0] = ...` — is what the caller notices.
- The two outcomes come from the same function call because the *kind of value* differs, not because the code treats them differently.
