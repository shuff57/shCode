// 2.1.36 Predict the Chain

const temperature = 75;
// I predict the "Warm" branch will fire.
if (temperature < 32) {
  console.log("Freezing");
} else if (temperature < 50) {
  console.log("Cold");
} else if (temperature < 70) {
  console.log("Cool");
} else {
  console.log("Warm");
}

// Chained ternary with different cutoffs.
const grade = 62;
// I predict the "Pass" result.
const result = grade >= 90 ? "Great" : grade >= 60 ? "Pass" : "Fail";
console.log(result);
