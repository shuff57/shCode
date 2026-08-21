// 2.5.9 What Runs, What Doesn't
// Prediction: A prints, then boom throws, so B is skipped. C prints in
// the catch, and D prints after the whole block.

try {
  console.log("A");
  console.log(boom);
  console.log("B");
} catch (err) {
  console.log("C");
}

console.log("D");
