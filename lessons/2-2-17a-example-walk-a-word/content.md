**Goal:** Use a `for` loop to visit every character of a string, and meet the pattern that an enormous number of programs are built from.

Every loop so far has counted numbers. The counter does not care what you use it for, and one of the most useful things to count through is the characters of a word.

You have one of the two pieces already: `.length` counts the characters in a string (`1.2.14 Reading: String Methods in Practice`). The other is new and small.

## Step 1: Reach one character at a time

Square brackets after a string give you the character at that position. Positions start at **0**, not 1.

```js live plain
let word = "banana";

console.log(word[0]);
console.log(word[1]);
console.log(word.length);
```

`"banana"` has six characters, so `word.length` is 6 and the positions run 0, 1, 2, 3, 4, 5.

## Step 2: Let a loop do the counting

The loop counter and the character position are the same number, so `i` can do both jobs at once.

```js live plain
let word = "banana";

for (let i = 0; i < word.length; i++) {
  console.log(i + ": " + word[i]);
}
```

Six lines, numbered 0 to 5. Read the loop header against the string and it is the shape you already know: start at the first position, keep going while `i` is still a real position, step on by one.

## Step 3: Why it is `<` and not `<=`

The last character of `"banana"` sits at position 5, so stopping *before* 6 is exactly right. Run the wrong version and see what the extra round finds:

```js live plain
let word = "banana";

for (let i = 0; i <= word.length; i++) {
  console.log(i + ": " + word[i]);
}
```

Position 6 does not exist, so `word[6]` is `undefined`. This is the same one-character off-by-one you met in `2.2.9 Reading: The for Loop`, and with a string it announces itself: a stray `undefined` on the last line.

## Step 4: Visit, test, accumulate

Counting through characters answers questions no single operation answers. How many times does the letter `a` appear?

```js live plain
let word = "banana";
let count = 0;

for (let i = 0; i < word.length; i++) {
  if (word[i] === "a") {
    count = count + 1;
  }
}

console.log(count);
```

Three. The loop **visits** every character, the `if` **tests** which ones matter, and the counter **accumulates** the answer.

## Key takeaways

- `word[i]` is the character at position `i`. Positions start at 0, so the last one is `word.length - 1`.
- Loop with `i < word.length`. Using `<=` runs one extra round and hands you `undefined`.
- Visit everything, test each one, keep a running answer: that trio is the shape of an enormous number of programs, and you will use it again in the next lesson to search a range and in the unit challenges to count vowels.
