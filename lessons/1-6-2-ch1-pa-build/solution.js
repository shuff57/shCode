// Program: Is this pizza worth it?
// Problem: Slice Economics
// Partners: Reference answer (one worked example of the four)
// Date: 2026-09-01

// PLAN (pseudocode, from the chart in 1.6.1):
// START
// INPUT pizzeria name, pizza price, slice count
// SET cost per slice TO pizza price / slice count
// IF cost per slice <= good deal limit THEN
//     report it is a good deal
// ELSE
//     report it is not a good deal
// END IF
// END

// The inputs. One label, two numbers.
const pizzeriaName = "Tony's";
let pizzaPrice = 18.5;
let sliceCount = 8;

// The limit never changes, so it is a const in UPPER_SNAKE_CASE.
// $2.00 a slice is the bar the assignment sets.
const GOOD_DEAL_LIMIT = 2.0;

// The one value this whole program is about.
const costPerSlice = pizzaPrice / sliceCount;

// The diamond from the chart. A comparison produces a boolean, so the
// answer to the question is a value we can store and print.
const meetsTheLimit = costPerSlice <= GOOD_DEAL_LIMIT;

// The two branches, still pseudocode. Chapter 2 makes them real code.
// IF meetsTheLimit THEN report that the pizza is a good deal
// ELSE report that the pizza costs more per slice than we agreed to pay

console.log(`${pizzeriaName} sells a slice for $${costPerSlice.toFixed(2)}.`);
console.log(`The limit we set was $${GOOD_DEAL_LIMIT.toFixed(2)} a slice.`);
console.log(`Good deal? ${meetsTheLimit}`);
console.log("costPerSlice is a " + typeof costPerSlice + ", meetsTheLimit is a " + typeof meetsTheLimit);
