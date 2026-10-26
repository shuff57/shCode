## Write a Decision as Pseudocode

**What you'll practise:**
- Turning a written algorithm into exact, numbered steps
- Writing one question with two answers (IF / ELSE)
- Getting a value before you test it

### The algorithm, in plain English

A movie theatre charges by age:

1. Start.
2. Get the customer's age.
3. If the age is under 13, the ticket costs **$8**. Otherwise the ticket costs **$14**.
4. Print the ticket price.
5. End.

You have already turned code into a plan once, in 2.2.6. This time you write the steps straight from a written algorithm: no code to read first. The chart above the editor shows a different decision (a pool lane) for you to study; it is not the answer.

### The code it describes

```js
const age = Number(prompt("Age?"));
let price;

if (age < 13) {
  price = 8;
} else {
  price = 14;
}

console.log(price);
```

### The thing worth noticing

You must get the age **before** you ask the question, and the question has exactly two answers: the `IF` branch and the `ELSE` branch each set one price, and the print comes after both so it runs either way.

### Before you submit

Press **Grade**, then trace your steps by hand with age `9` and age `30`. Each should print a price. You can revise and resubmit as many times as you want. Getting this green unlocks the 2.2.8 A2.2.1 (Part A) plan next.
