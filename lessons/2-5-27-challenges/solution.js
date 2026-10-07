// 2.5.27 Challenges: Stretch Problems

// Challenge 1: Divide Safely
// JavaScript returns Infinity on division by zero, so we throw our own
// error before dividing when the divisor is 0.
const dividend = 10;
const divisor = 0;
try {
  if (divisor === 0) {
    throw new Error("Cannot divide by zero.");
  }
  console.log(dividend / divisor);
} catch (err) {
  console.log("Division failed: " + err.message);
}

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
// the catch fired. Attempt 1 succeeds, attempt 2 fails.
for (let attempt = 1; attempt <= 2; attempt++) {
  try {
    if (attempt === 2) {
      throw new Error("Attempt 2 fails.");
    }
    console.log("Succeeded on attempt " + attempt);
  } catch (err) {
    console.log("Caught: " + err.message);
  } finally {
    console.log("Attempt finished.");
  }
}
