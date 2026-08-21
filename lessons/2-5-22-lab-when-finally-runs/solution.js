// 2.5.22 When Does finally Run?
// Prediction: when the try succeeds, try and finally run; catch is
// skipped. finally always runs, even in the success case.

try {
  console.log("Work done.");
} catch (err) {
  console.log("Handling error.");
} finally {
  console.log("Cleanup ran.");
}
