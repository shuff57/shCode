// FizzBuzz 1 to 20
for (let i = 1; i <= 20; i++) {
  if (i % 3 === 0 && i % 5 === 0) {
    console.log("FizzBuzz");
  } else if (i % 3 === 0) {
    console.log("Fizz");
  } else if (i % 5 === 0) {
    console.log("Buzz");
  } else {
    console.log(i);
  }
}

// Count vowels in a string
let text = "The quick brown fox jumps over the lazy dog";
let vowelCount = 0;
for (let i = 0; i < text.length; i++) {
  let ch = text[i].toLowerCase();
  if (ch === "a" || ch === "e" || ch === "i" || ch === "o" || ch === "u") {
    vowelCount = vowelCount + 1;
  }
}
console.log("Vowels: " + vowelCount);

// Sum even numbers from 1 to 20
let evenSum = 0;
for (let i = 1; i <= 20; i++) {
  if (i % 2 === 0) {
    evenSum = evenSum + i;
  }
}
console.log("Sum of evens: " + evenSum);
