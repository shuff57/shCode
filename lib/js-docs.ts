// In-app JavaScript reference — the Q1–Q2 taught surface, distilled from the
// bookSHelf "Introduction to Programming Concepts and Methodologies" remaster
// (chapters 1–3). Every code example runs in the Docs drawer's console runner
// (the same Worker + kill timer the console lessons use), so a page that
// teaches an infinite loop cannot freeze the tab.
//
// Scope-out, stated so a future maintainer doesn't rediscover the boundary:
// this is the reference for the PLAIN-JAVASCRIPT sandbox and the console
// lessons. moSHion and reSHape have their own docs sets (lib/moshion-docs.ts,
// lib/reshape-docs.ts) and their own runners; nothing here touches either
// engine. Browser-only APIs (prompt, alert, DOM) are deliberately absent —
// the console runner has no window, and the course's own lessons teach
// console.log as the output channel.
//
// The section order follows the book: values and types, variables, operators,
// strings, conditionals, loops, functions, arrays, objects, JSON. Each page
// carries the construct's name, the rule in one or two sentences, and a
// runnable example. The examples are written to be READ, not graded — they
// print their own answers.

import {
  searchDocs as coreSearchDocs,
  getSection as coreGetSection,
  getAllSectionSlugs as coreGetAllSectionSlugs,
  type DocPage,
  type DocSection,
  type DocSearchResult,
} from './docs-core';

export type { DocPage, DocSection, DocSearchResult };

export const sections: DocSection[] = [
  {
    slug: 'values',
    title: 'Values & Types',
    pages: [
      {
        title: 'Every value has a type',
        body: `Every value in JavaScript has a type: a number, a piece of text, a yes/no answer, and so on. There are eight basic types, and this course uses five of them most of the time.

- number — 42, 3.14, -7
- string — "hello", 'world', \`template\`
- boolean — true, false
- undefined — a variable that has no value yet
- object — a collection of named values (and arrays, which are a kind of object)

JavaScript is dynamically typed: a variable can hold any type, and the type can change while the program runs. One moment a variable holds a string, the next it holds a number. Nothing locks it in.`,
        code: `let message = "hello";
console.log(typeof message);

message = 123456;
console.log(typeof message);

console.log(typeof true);
console.log(typeof undefined);`,
      },
      {
        title: 'Number',
        body: `The number type covers whole numbers and decimals. Arithmetic uses the usual operators: +, -, *, /, and ** for powers.

Three special values live in the number type. Infinity is larger than any number — it appears when you divide by zero. NaN stands for "Not a Number" and is the result of a math operation that makes no sense, like dividing a word by a number.

NaN is sticky: once it appears in a calculation, it spreads to the whole result. Any operation on NaN gives back NaN.`,
        code: `console.log(1 / 0);            // Infinity
console.log("not a number" / 2); // NaN
console.log(NaN + 1);            // NaN
console.log(3 * NaN);            // NaN
console.log(2 ** 10);            // 1024`,
      },
      {
        title: 'Decimals are inexact',
        body: `Computers store numbers in binary, and most decimal fractions do not have an exact binary form. So 0.1 + 0.2 is not 0.3 — it is 0.30000000000000004.

This is not a bug you can fix, and it is not JavaScript's fault; every language that stores numbers this way has it. What you can do is never test a decimal for exact equality. Compare with a tolerance instead, or round before you compare.

The classic fix for money is to work in cents — whole numbers — and divide by 100 only when you print.`,
        code: `console.log(0.1 + 0.2);            // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3);    // false

// Compare with a tolerance instead.
const total = 0.1 + 0.2;
console.log(Math.abs(total - 0.3) < 0.0001);  // true

// Or work in whole units and round at the end.
const cents = 10 + 20;
console.log((cents / 100).toFixed(2));        // "0.30"`,
      },
      {
        title: 'String',
        body: `A string is text. Three kinds of quotes make one: double, single, and backtick. They are interchangeable for plain text — pick one and stay consistent.

Backticks do one extra thing: they make a template literal, which can embed values directly with \${...}. That is the modern way to build a message from parts, and it is what this course uses.

A string's length is the number of characters in it. Characters are counted from position 0, so the last character of a string of length 5 is at position 4.`,
        code: `const name = "Ada";
const greeting = \`Hello, \${name}!\`;
console.log(greeting);

console.log("hello".length);   // 5
console.log("hello"[0]);       // "h"
console.log("hello"[4]);       // "o"`,
      },
      {
        title: 'String methods never change the string',
        body: `A string method hands you a NEW string. The original is untouched — strings are immutable, which means they cannot be changed in place.

So a line like text.toUpperCase() on its own does nothing visible: the new string is built and then thrown away. You have to keep it — in a variable, or inside a console.log.

This is the same shape as the transform functions you will meet in reSHape: a function that takes a value and hands back a changed copy, leaving the original alone.`,
        code: `let text = "hello";
text.toUpperCase();          // built and thrown away
console.log(text);           // still "hello"

const loud = text.toUpperCase();
console.log(loud);           // "HELLO"

console.log("hello".slice(1, 3));   // "el"
console.log("a,b,c".split(","));    // ["a", "b", "c"]`,
      },
      {
        title: 'Boolean',
        body: `A boolean is one of two values: true or false. Booleans are the answer to a yes/no question, and they are what if statements and loop conditions are built from.

Comparisons produce booleans. The three to know: === (equal), !== (not equal), and the ordering ones <, >, <=, >=.

One equals sign stores a value; three ask a question. Read them aloud and the difference is hard to lose: let score = 85 is "score gets 85", while score === 85 is "is score 85?".`,
        code: `console.log(100 === 100);   // true
console.log(100 === 99);    // false
console.log(5 > 3);         // true
console.log(5 <= 5);        // true
console.log("a" !== "b");   // true

const score = 85;
console.log(score === 85);  // true — asking a question`,
      },
      {
        title: 'null and undefined',
        body: `undefined is the value a variable holds before anything is assigned to it. It is JavaScript's way of saying "no value yet".

null is a value you assign on purpose, to say "this is deliberately empty". A variable that will later hold an object often starts as null.

The two are different values, and typeof tells them apart: typeof undefined is "undefined", while typeof null is "object" — a quirk from the early days of the language that is kept for compatibility.`,
        code: `let nothing;
console.log(nothing);        // undefined
console.log(typeof nothing); // "undefined"

let empty = null;
console.log(empty);          // null
console.log(typeof empty);   // "object" — a famous quirk`,
      },
    ],
  },
  {
    slug: 'variables',
    title: 'Variables',
    pages: [
      {
        title: 'Declaring a variable',
        body: `A variable is a named box. Declaring it makes the box; assigning puts something in. You can do both in one line.

JavaScript has three words for making a variable:

- let makes a variable you can reassign later.
- const makes one you cannot reassign. Use it whenever the value should not change — which is most of the time.
- var is the 1995 original. It still works, and you will meet it in old code, but it behaves differently in a way that caused years of bugs. Do not write new code with it.

Reassigning a const is one of the few things that stops the program outright.`,
        code: `let score;              // declared, empty — holds undefined
score = 10;             // assigned
let player = "Ada";     // declared and assigned in one line

const pi = 3.14159;
let radius = 2;
radius = 5;             // fine — let allows this
console.log(pi * radius * radius);

// pi = 3;              // TypeError: Assignment to constant variable.`,
      },
      {
        title: 'let is block-scoped, var leaks',
        body: `A pair of braces { } marks a block — a section of code treated as one unit. Blocks are what if statements and loops are built from.

let is block-scoped: it exists only between the braces that declared it. var is function-scoped: it ignores blocks and leaks out to the surrounding code.

The leak matters most inside loops, because a loop body is a block. A var counter declared in a loop is still readable after the loop ends, still holding its last value. Code that reads it by accident looks correct and runs without complaint.`,
        code: `{
  let inner = "A";
}
// console.log(inner);  // ReferenceError — inner is gone

{
  var outer = "B";
}
console.log(outer);      // "B" — var escaped the block`,
      },
      {
        title: 'The variable you never declared',
        body: `Assigning to a name that was never declared does not fail. JavaScript creates the variable for you, at the outermost level of the program, where every other piece of code can see it and overwrite it.

A variable meant to stay inside one small piece of code is now visible to the whole program. Nothing warns you. The bug surfaces later, somewhere else, when a second piece of code uses the same ordinary name — tally, count, total — and the two quietly overwrite each other.

The fix is one line at the top of the file: "use strict". It turns the silent accident into an immediate error that names the line.`,
        code: `"use strict";

{
  subtotal = 100;   // ReferenceError: subtotal is not defined
}`,
      },
      {
        title: 'Naming rules and conventions',
        body: `A variable name can contain letters, digits, $ and _, and cannot start with a digit. It cannot be a reserved word like let, const, if or for.

The course convention is camelCase: start with a lowercase letter, and capitalise the first letter of each following word — playerScore, totalCost, isGameOver. Constants that are truly fixed use UPPER_SNAKE_CASE: TAX_RATE, MAX_PLAYERS.

A name should say what the value is for. total is better than t, and a comment explaining a name usually means the name should be better.`,
        code: `const TAX_RATE = 0.08;
let playerScore = 0;
let isGameOver = false;

playerScore = playerScore + 10;
console.log(playerScore, isGameOver, TAX_RATE);`,
      },
    ],
  },
  {
    slug: 'operators',
    title: 'Operators',
    pages: [
      {
        title: 'Arithmetic',
        body: `The arithmetic operators are +, -, *, /, and ** for powers. They work on numbers, and the result is a number.

The % operator is the remainder after division — 7 % 3 is 1, because 3 goes into 7 twice with 1 left over. It is how you test for evenness (n % 2 === 0) and how you wrap a counter around (i % 10).

The += family is shorthand: x += 5 means x = x + 5. There is a -=, *=, /= and %= to match. And ++ adds 1 to a variable — i++ is the loop counter's update.`,
        code: `console.log(7 + 3);   // 10
console.log(7 - 3);   // 4
console.log(7 * 3);   // 21
console.log(7 / 3);   // 2.333...
console.log(7 % 3);   // 1
console.log(2 ** 10); // 1024

let x = 5;
x += 3;               // x is now 8
x++;                  // x is now 9
console.log(x);`,
      },
      {
        title: 'Comparison',
        body: `Comparisons ask a question and answer with a boolean.

=== is strict equality: the values must be the same type AND the same value. 5 === "5" is false. The loose == does type conversion and is the source of a whole class of bugs — this course uses === everywhere and never ==.

!= is the strict not-equal partner of ===. The ordering operators <, >, <=, >= work on numbers, and on strings they compare alphabetically.

One equals sign stores a value. Three ask a question. Never confuse the two — JavaScript lets you put the storing one inside an if, where you meant to ask the question, and the program runs with a silent wrong answer.`,
        code: `console.log(5 === 5);    // true
console.log(5 === "5");   // false — different types
console.log(5 !== 4);     // true
console.log(5 > 3);       // true
console.log(5 <= 5);      // true
console.log("apple" < "banana");  // true — alphabetical`,
      },
      {
        title: 'Logical operators',
        body: `Three operators combine booleans:

- && means AND — both sides must be true.
- || means OR — at least one side must be true.
- ! means NOT — it flips a boolean.

They are how a condition with several parts gets written: a discount applies when the user is a member AND the total is over 20. Each side of && or || is a full comparison in its own right.

The result of a comparison is a boolean, and booleans can be stored in variables and used later — which is how a condition that is too long for one line gets split into named pieces.`,
        code: `const age = 17;
const hasTicket = true;

console.log(age >= 13 && age <= 19);   // true — a teenager
console.log(age >= 18 || hasTicket);   // true — one side is enough
console.log(!hasTicket);               // false

const isTeen = age >= 13 && age <= 19;
console.log(isTeen);                   // true`,
      },
    ],
  },
  {
    slug: 'conditionals',
    title: 'Conditionals',
    pages: [
      {
        title: 'if',
        body: `The if statement runs some code only when a condition is true. The condition goes inside parentheses; the code that runs goes inside curly braces.

If the condition is false, JavaScript skips the block entirely. The condition is a boolean — usually a comparison, but any value works, because JavaScript converts it: 0, "", null, undefined and NaN are falsy, and everything else is truthy.

The braces group several statements into one block. Even for a single statement, use them — code that skips the braces is harder to read and breaks when you add a second line.`,
        code: `const temperature = 35;

if (temperature > 30) {
  console.log("It's hot outside!");
}

if (temperature < 10) {
  console.log("It's freezing!");
}

console.log("done");`,
      },
      {
        title: 'else and else if',
        body: `else runs when the if condition was false. The two branches are exclusive: exactly one of them runs, never both.

else if chains several conditions in order. JavaScript tests them top to bottom and runs the first one that is true — once one matches, the rest are skipped, even if a later one would also be true.

Order matters in a chain. Put the most specific condition first: a grade of 95 should match "A", not fall through to "B" because 95 > 80.`,
        code: `const score = 85;

if (score >= 90) {
  console.log("A");
} else if (score >= 80) {
  console.log("B");
} else if (score >= 70) {
  console.log("C");
} else {
  console.log("Keep practicing");
}`,
      },
      {
        title: 'The conditional operator ?',
        body: `The ? operator is a compact if/else for choosing a VALUE. condition ? valueIfTrue : valueIfFalse.

It is not a statement — it is an expression, which means it produces a value you can store in a variable. Use it when both branches are short and the whole thing is one choice. If the branches are longer, or there are more than two, use a plain if/else: the longer form is easier to read.

The ? operator is also called the ternary operator, because it is the one operator in the language that takes three parts.`,
        code: `const age = 17;
const price = age >= 18 ? 10 : 6;
console.log(price);   // 6

const message = age >= 18 ? "Welcome" : "Come back later";
console.log(message);`,
      },
      {
        title: 'Truthy and falsy',
        body: `A condition does not have to be a comparison. JavaScript converts any value to a boolean when it is used in an if — and the conversion follows a short list.

Falsy values: false, 0, "" (empty string), null, undefined, NaN. Everything else is truthy: any other number, any non-empty string, any object, any array — even an empty one.

The practical rule: test for "has a value" by testing the value itself. if (name) is true when name holds any non-empty string, and false when it is "" or undefined. That is shorter and clearer than comparing to both.`,
        code: `const name = "Ada";
if (name) {
  console.log("Hello, " + name);
}

const empty = "";
if (empty) {
  console.log("never runs");
} else {
  console.log("empty string is falsy");
}

if ([]) {
  console.log("an empty array is truthy");
}`,
      },
    ],
  },
  {
    slug: 'loops',
    title: 'Loops',
    pages: [
      {
        title: 'for',
        body: `A loop repeats a block of code. The for loop puts all three of its parts on one line:

- start — where does the count begin? let i = 1
- condition — when should we stop? i <= 5
- update — how does the count change each time? i++

The condition is tested BEFORE the body every time, including the very first. The update runs after each round, on the way back to the condition.

The condition is where loops go wrong most often. i <= 5 runs five times; i < 5 runs only four. When a loop prints one too many or one too few, check the condition before anything else.`,
        code: `for (let i = 1; i <= 5; i++) {
  console.log(i);
}

// Counting by twos
for (let i = 2; i <= 10; i += 2) {
  console.log(i);
}

// Counting down
for (let i = 5; i >= 1; i--) {
  console.log(i);
}`,
      },
      {
        title: 'while',
        body: `A while loop repeats as long as its condition is true. The condition is tested before each round, exactly like a for loop's condition — if it is false at the start, the body never runs at all.

Use while when you cannot count the rounds in advance: the rule for stopping is clear, but the number of steps is not. The classic example is halving a number until it reaches 1 — you know the rule, not the count.

A while loop needs something inside the body that changes the condition, or it never stops. The update is not written on the loop line the way it is in a for loop — it is your job to put it in the body.`,
        code: `let n = 100;
while (n > 1) {
  console.log(n);
  n = n / 2;
}

// The same loop as a for loop
for (let i = 1; i <= 5; i++) {
  console.log(i);
}`,
      },
      {
        title: 'break and continue',
        body: `break leaves a loop early — the rest of the body is skipped and the loop ends. It is how a search stops the moment it finds what it was looking for, instead of walking the whole list.

continue skips the rest of the body and jumps to the next round. It is how a loop filters: do the work only for the items that pass a test, and skip the rest.

The two are easy to confuse. break leaves the loop entirely; continue stays in it. A break inside a loop inside a loop leaves only the inner one.`,
        code: `// break — stop at the first even number
for (let i = 1; i <= 10; i++) {
  if (i % 2 === 0) {
    console.log("first even:", i);
    break;
  }
}

// continue — print only the odd numbers
for (let i = 1; i <= 10; i++) {
  if (i % 2 === 0) continue;
  console.log(i);
}`,
      },
      {
        title: 'Infinite loops',
        body: `A loop that never reaches its stopping point runs forever. The classic cause is an update that never changes the condition — a counter that is never incremented, or a condition that compares the wrong variable.

In this app, a runaway loop is stopped after a few seconds and you get a message naming the likely cause. In a browser console it would keep running until the tab is closed.

The fix is usually one line: make sure the value in the condition actually changes inside the loop. When you are debugging, print the counter at the top of the body — the last value printed is the one the condition is stuck on.`,
        code: `// This loop never stops — i never changes.
// The runner stops it after a few seconds.
let i = 1;
while (i <= 5) {
  console.log(i);
  // i++;   // missing update
}`,
      },
    ],
  },
  {
    slug: 'functions',
    title: 'Functions',
    pages: [
      {
        title: 'Calling a function',
        body: `A function is a named, reusable block of code that performs a task when called. You have been calling functions since your first program: console.log("Hello") is a call, and so is Math.sqrt(16).

When you call a function, the program pauses what it is doing, jumps to the function's code, runs it, and comes back to the spot it left.

The parentheses are the tell. Math.PI is a value you read — no parentheses, no call. Math.sqrt(16) is a job you order. A name on its own fetches; a name with parentheses after it runs.`,
        code: `console.log("First message");
console.log("Second message");
console.log("Third message");

console.log(Math.sqrt(16));   // 4
console.log(Math.PI);         // a value, not a call`,
      },
      {
        title: 'Defining a function',
        body: `A function declaration has three parts: the word function, a name, and a body in curly braces. The body does not run when the function is defined — it runs when the function is called.

A function can be called before the line that defines it. Declarations are read first, before the rest of the program runs, so the order of your definitions does not matter.

A function that only prints is fine, but the real power comes when a function hands a value back — that is the next page.`,
        code: `function sayHello() {
  console.log("Hello!");
}

sayHello();   // runs the body
sayHello();   // and again

function greet(name) {
  console.log("Hello, " + name + "!");
}

greet("Ada");
greet("Grace");`,
      },
      {
        title: 'Parameters and arguments',
        body: `A parameter is a name the function declares to receive a value. An argument is the value you hand it when you call. The two are different things, and the words are worth keeping straight.

Order matters: the first argument lands in the first parameter, the second in the second. A function that takes (width, height) called with (height, width) builds the wrong shape and never complains.

A missing argument is undefined. A function that expects a number and gets undefined usually produces NaN — which is a silent wrong answer, not an error.`,
        code: `function area(width, height) {
  console.log(width * height);
}

area(5, 3);    // 15
area(3, 5);    // 15 — same answer here, but order still matters
area(5);       // NaN — height is undefined`,
      },
      {
        title: 'return',
        body: `return hands a value back to the caller. The call then IS that value: you can store it, print it, or pass it to another function.

return also ends the function. Nothing after it runs — a return inside an if that never fires does not end the function, which is a common source of "why did it keep going".

A function without a return hands back undefined. Printing is not returning: console.log shows a value on screen, but the function still hands back undefined. If you need the value, return it.`,
        code: `function double(n) {
  return n * 2;
}

const result = double(21);
console.log(result);   // 42

function isEven(n) {
  if (n % 2 === 0) return true;
  return false;
}

console.log(isEven(10));  // true
console.log(isEven(7));   // false`,
      },
      {
        title: 'Arrow functions',
        body: `An arrow function is a shorter way to write a function. The arrow => replaces the word function, and the parameter list moves in front of it.

Two shorthand rules make arrows shorter still. With one parameter, the parentheses are optional: n => n * 2. And when the body is a single expression, the return is implied — no braces, no return keyword.

Braces bring return back: an arrow with a body in { } needs an explicit return, exactly like a function declaration. The shorthand only applies to the one-expression form.

Arrows are the form you will see in array methods like map and filter, and in callbacks throughout the course.`,
        code: `const double = (n) => n * 2;
console.log(double(21));   // 42

const greet = (name) => "Hello, " + name;
console.log(greet("Ada"));

// With a block body, return is explicit again.
const describe = (n) => {
  const doubled = n * 2;
  return doubled + " is double " + n;
};
console.log(describe(21));`,
      },
      {
        title: 'Functions are values',
        body: `A function is a value, exactly like a number or a string. You can store one in a variable, hand it to another function, and keep several in an array.

That is what makes callbacks possible: a function that takes a function. The array method map hands your function each item in turn and collects what it returns — the function decides the transformation, map decides the walking.

A function that takes a function is a higher-order function. You will meet them constantly from here on: map, filter, and the event callbacks in moSHion.`,
        code: `const numbers = [1, 2, 3, 4];

const doubled = numbers.map((n) => n * 2);
console.log(doubled);   // [2, 4, 6, 8]

const evens = numbers.filter((n) => n % 2 === 0);
console.log(evens);     // [2, 4]`,
      },
    ],
  },
  {
    slug: 'arrays',
    title: 'Arrays',
    pages: [
      {
        title: 'Making a list',
        body: `An array is a list of values, written in square brackets. The values can be any type, and a single array can mix types — though in practice you usually keep one kind in one list.

Each value sits at an index, counted from 0. The first item is at index 0, the second at 1, and so on. Reading is square brackets: names[0] is the first name.

length is how many items are in the list. Because indexes start at 0, the last item is at length - 1 — a fencepost that trips up every beginner at least once.`,
        code: `const names = ["Ada", "Grace", "Alan"];
console.log(names.length);   // 3
console.log(names[0]);        // "Ada"
console.log(names[2]);        // "Alan"
console.log(names[names.length - 1]);  // "Alan" — the last one

names[1] = "Barbara";
console.log(names);           // ["Ada", "Barbara", "Alan"]`,
      },
      {
        title: 'Adding and removing',
        body: `push adds an item to the end of an array. pop removes the last item and hands it back. The two together make an array behave like a stack — last in, first out.

unshift adds to the front, and shift removes from the front. They do the same jobs at the other end, but they are slower on long lists, because every item has to move over.

push is the one you will use constantly: building a list of results by pushing inside a loop is the standard pattern for collecting output.`,
        code: `const queue = ["Ada", "Grace"];
queue.push("Alan");
console.log(queue);        // ["Ada", "Grace", "Alan"]

const last = queue.pop();
console.log(last);         // "Alan"
console.log(queue);        // ["Ada", "Grace"]

// Collecting results in a loop
const squares = [];
for (let i = 1; i <= 5; i++) {
  squares.push(i * i);
}
console.log(squares);      // [1, 4, 9, 16, 25]`,
      },
      {
        title: 'Walking through a list',
        body: `The for...of loop walks an array one item at a time. Each round, the variable in front of of holds the next item — no index, no counting, no off-by-one.

It is the loop to reach for when you want every item and do not need its position. If you need the position too, a plain for loop with an index is the tool.

The two loops answer different questions. for...of asks "what is in here?" A counted for loop asks "what is at position i?" — which is what you need when the position itself matters, like drawing a row of shapes.`,
        code: `const names = ["Ada", "Grace", "Alan"];

for (const name of names) {
  console.log("Hello, " + name);
}

// The same walk with an index
for (let i = 0; i < names.length; i++) {
  console.log(i + ": " + names[i]);
}`,
      },
      {
        title: 'map, filter, slice',
        body: `Three array methods do the most common list jobs in one call.

map transforms every item and collects the results into a new array. The original is untouched — like a string method, it hands back a new list.

filter keeps the items that pass a test. The test is a function that returns a boolean; filter keeps the true ones.

slice takes a part of an array: slice(1, 3) is items at indexes 1 and 2 — the start is included, the end is not. It is how you split a list in half or take a page of results.

All three take a function as their argument — the arrow functions from the Functions section.`,
        code: `const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map((n) => n * 2);
console.log(doubled);            // [2, 4, 6, 8, 10]

const evens = numbers.filter((n) => n % 2 === 0);
console.log(evens);              // [2, 4]

const middle = numbers.slice(1, 4);
console.log(middle);             // [2, 3, 4]

console.log(numbers);            // [1, 2, 3, 4, 5] — untouched`,
      },
    ],
  },
  {
    slug: 'objects',
    title: 'Objects',
    pages: [
      {
        title: 'Grouping related values',
        body: `An object groups related values under names. It is written with curly braces: a list of key: value pairs, separated by commas.

Each named value is a property. The name is the key, and the value can be any type — a number, a string, a boolean, an array, even another object.

An object is the natural way to describe one thing with several facts: a player has a name, a score, and a level. Instead of three loose variables, you get one value that travels together.

Read a property with dot notation: player.name. The dot means "of": player.name is the name of player.`,
        code: `const player = {
  name: "Ada",
  score: 1200,
  level: 3,
  isReady: true,
};

console.log(player.name);     // "Ada"
console.log(player.score);    // 1200
console.log(player.level);    // 3

player.score = 1500;          // properties can be reassigned
console.log(player.score);    // 1500`,
      },
      {
        title: 'Reading and changing properties',
        body: `Dot notation reads and writes a property: player.score reads it, player.score = 1500 writes it. A property that does not exist reads as undefined — no error, just undefined, which is how a typo becomes a silent wrong answer.

Square brackets read a property by a name held in a variable: player["score"] is the same as player.score. Use brackets when the key is computed — a loop over keys, or a key built from a string.

The two notations are the same property. player.score and player["score"] are two spellings of one thing, and writing with one is visible through the other.`,
        code: `const player = { name: "Ada", score: 1200 };

console.log(player["name"]);   // "Ada" — brackets, same property

const key = "score";
console.log(player[key]);     // 1200 — key from a variable

player["score"] = 2000;       // writing through brackets
console.log(player.score);    // 2000

console.log(player.missing);  // undefined — no error`,
      },
      {
        title: 'Objects inside objects and arrays',
        body: `A property's value can be another object, or an array of objects. This is how real data is shaped: a game has a list of players, and each player is an object.

Reading a nested value is dot after dot: game.players[0].name — the first player's name. Read it left to right: game, then its players list, then the first item, then that item's name.

Arrays of objects are the shape you will meet constantly — a class roster, a scoreboard, a list of shapes in a scene. The pattern for walking one is a for...of loop over the array, reading each object's properties inside.`,
        code: `const game = {
  title: "Quest",
  players: [
    { name: "Ada", score: 1200 },
    { name: "Grace", score: 900 },
  ],
};

console.log(game.title);              // "Quest"
console.log(game.players[0].name);    // "Ada"
console.log(game.players[1].score);   // 900

for (const p of game.players) {
  console.log(p.name + ": " + p.score);
}`,
      },
      {
        title: 'Methods',
        body: `A method is a function stored as a property. Call it with a dot and parentheses: player.greet().

Methods are how an object carries its own behaviour. A player object with a levelUp method knows how to level itself up; the code that uses the player does not need to know the rule.

Inside a method, this refers to the object the method was called on. this.score is the score of the player whose method is running — the same object, spelled with a pronoun.

Methods are everywhere in this course: arrays have push and map, strings have toUpperCase, and moSHion sprites have move and collide.`,
        code: `const player = {
  name: "Ada",
  score: 100,
  level: 1,
  levelUp() {
    this.level = this.level + 1;
    this.score = this.score + 500;
  },
};

player.levelUp();
console.log(player.level);    // 2
console.log(player.score);    // 600`,
      },
      {
        title: 'Objects as named arguments',
        body: `A function that takes several settings is easier to call with one object than with a row of positional arguments. The object's keys name the settings, so the call reads as a sentence.

The order of the keys does not matter — the names carry the meaning. And a setting can be left out entirely: the function checks for it, or the object simply does not have the key, which reads as undefined.

This is the pattern the reSHape layer uses for its options: box(40, 20, 10, { roundRadius: 3 }) — the values a shape cannot exist without are positional, and everything named rides in the trailing object.`,
        code: `function describePlayer(player) {
  console.log(
    player.name + " is level " + player.level +
    " with " + player.score + " points"
  );
}

describePlayer({ name: "Ada", level: 3, score: 1200 });
describePlayer({ score: 900, name: "Grace", level: 2 });  // order free`,
      },
      {
        title: 'Destructuring',
        body: `Destructuring pulls named values out of an object in one line. const { name, score } = player makes two variables, name and score, holding the object's properties of the same names.

It is the reverse of the object literal: the literal packs values into names, destructuring unpacks them. The two are the same shape, written on opposite sides of the equals sign.

Destructuring a parameter is the same thing in a function signature: a function that takes { name, score } receives an object and gets the two properties as local variables. It is how the reSHape docs' require line works — const { primitives } = require('@jscad/modeling') pulls one module out of the library.`,
        code: `const player = { name: "Ada", score: 1200, level: 3 };

const { name, score } = player;
console.log(name);    // "Ada"
console.log(score);   // 1200

function show({ name, level }) {
  console.log(name + " is level " + level);
}

show(player);         // "Ada is level 3"`,
      },
    ],
  },
  {
    slug: 'json',
    title: 'JSON & Storage',
    pages: [
      {
        title: 'JSON.stringify: object to text',
        body: `JSON is the text format JavaScript uses to save data. JSON.stringify turns an object or array into a string of that shape.

The string is plain text — it can be printed, stored, or sent. The object itself is untouched; stringify hands back a new string, like every other function that transforms a value.

Not everything survives the trip. Functions, undefined, and NaN are dropped or turned into null, because JSON has no words for them. What survives is the data: numbers, strings, booleans, arrays, and plain objects.`,
        code: `const player = { name: "Ada", score: 1200, level: 3 };

const text = JSON.stringify(player);
console.log(text);
// {"name":"Ada","score":1200,"level":3}

console.log(typeof text);   // "string"

const pretty = JSON.stringify(player, null, 2);
console.log(pretty);        // the same data, indented for reading`,
      },
      {
        title: 'JSON.parse: text back to object',
        body: `JSON.parse is the reverse of stringify: it takes a JSON string and rebuilds the object or array it describes.

A round trip — stringify, then parse — gives back the same data. The rebuilt object is a new object, not the original, but every value in it is the same.

Parsing can fail. A string that is not valid JSON throws an error, and the error stops the program. The fix is to check the data before you trust it — or to wrap the parse in a try/catch, which is the next page.`,
        code: `const text = '{"name":"Ada","score":1200}';

const player = JSON.parse(text);
console.log(player.name);    // "Ada"
console.log(player.score);   // 1200

// A round trip
const again = JSON.parse(JSON.stringify(player));
console.log(again);          // the same data, a new object`,
      },
      {
        title: 'try and catch',
        body: `try/catch is how a program survives an operation that can fail. The try block runs; if it throws, the catch block runs instead of the program stopping.

Only wrap what can fail. The try block should be as small as possible — the one risky call, not the whole program. Everything that cannot throw belongs outside, where an error in it is still loud.

The catch block receives the error as a variable. Its name and message tell you what went wrong — and printing them is how you debug a failure instead of guessing at it.`,
        code: `const good = '{"name":"Ada"}';
const bad = "not json at all";

try {
  const player = JSON.parse(bad);
  console.log(player.name);
} catch (err) {
  console.log("Could not read the data:", err.message);
}

// The good one parses fine
const player = JSON.parse(good);
console.log(player.name);   // "Ada"`,
      },
      {
        title: 'Saving by key',
        body: `Data has to outlive the program. The browser's localStorage keeps values between visits, stored by key — a name you choose, and the string it holds.

The pattern is always the same: stringify the data, store it under a key, and on the next visit read the key and parse it back. The two functions from the pages before this one are the whole mechanism.

Everything comes back as a string. Save the number 1200 and you get the string "1200" — add 1 to it and you get "12001", not 1201. And a key that was never saved gives null, not undefined, so a first run has to check for it.

In this course, moSHion's storeItem and getItem are the same idea with friendlier names — a key-value store for game saves. The shape of the code is identical: save by key, load by key, and check whether anything was saved before you parse.

This console runner has no browser, so the localStorage here is a small stand-in that lives for the one run. The pattern is real — save, load, parse, missing-key check — but the "survives the page closing" half is what a real browser adds.`,
        code: `// Save
const player = { name: "Ada", score: 1200 };
localStorage.setItem("player", JSON.stringify(player));

// Load
const saved = localStorage.getItem("player");
if (saved !== null) {
  const loaded = JSON.parse(saved);
  console.log(loaded.name, loaded.score);
} else {
  console.log("nothing saved yet");
}

// Everything comes back as a string
localStorage.setItem("highScore", 1200);
const score = localStorage.getItem("highScore");
console.log(score + 1);          // "12001" — string join, not addition
console.log(Number(score) + 1);  // 1201`,
      },
    ],
  },
];

export function getSection(slug: string): DocSection | undefined {
  return coreGetSection(sections, slug);
}

export function getAllSectionSlugs(): string[] {
  return coreGetAllSectionSlugs(sections);
}

export function searchDocs(query: string, limit = 30): DocSearchResult[] {
  return coreSearchDocs(sections, query, limit);
}
