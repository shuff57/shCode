// 2.5.27 Challenges -- Optional Stretch

// Challenge 1: Divide Safely
// JavaScript returns Infinity on division by zero, so we throw our own
// error before dividing when the divisor is 0.
function divide(a, b) {
  try {
    if (b === 0) {
      throw new Error("Cannot divide by zero.");
    }
    return a / b;
  } catch (err) {
    console.log("Division failed: " + err.message);
  }
}

divide(10, 0);
divide(10, 2);

// Challenge 2: Parse a Malformed Number
// Number("12abc") produces NaN, so we detect it and throw a clear error
// naming the bad text.
const text = "12abc";
try {
  const num = Number(text);
  if (Number.isNaN(num)) {
    throw new Error("Not a valid number: " + text);
  }
  console.log("Parsed: " + num);
} catch (err) {
  console.log("Parse failed: " + err.message);
}

// Challenge 3: Cleanup Counter
// finally always logs "Attempt finished." whether the try succeeded or
// the catch fired. Tested once with input that succeeds and once with
// input that fails.
function attempt(input) {
  try {
    if (input < 0) {
      throw new Error("Negative input.");
    }
    console.log("Succeeded with " + input);
  } catch (err) {
    console.log("Caught: " + err.message);
  } finally {
    console.log("Attempt finished.");
  }
}

attempt(5);
attempt(-1);
