// 2.5.25 Predict, Then Run: try/catch/finally Together
// Prediction: A prints, the throw abandons the rest of try, catch prints
// "B: boom", finally prints C, then D prints after the whole statement.

try {
  console.log("A");
  throw new Error("boom");
} catch (err) {
  console.log("B: " + err.message);
} finally {
  console.log("C");
}

console.log("D");
