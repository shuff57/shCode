// 2.5.6 Wrap Only What Can Fail
//
// This try block wraps too much. If the risky line fails, the total is
// thrown away along with it, even though the total had nothing to do
// with the failure.
//
// STEP 1: Move the for loop (and the let total = 0; line) so they run
//         BEFORE the try block, not inside it. A loop over numbers you
//         already have cannot fail.
// STEP 2: Keep only console.log(label) inside try, with its catch.
//         Log the total with console.log AFTER the whole try...catch
//         finishes.

try {
  let total = 0;
  for (let i = 1; i <= 4; i++) {
    total = total + i;
  }
  console.log(label);
  console.log("Total: " + total);
} catch (err) {
  console.log("Failed.");
}
