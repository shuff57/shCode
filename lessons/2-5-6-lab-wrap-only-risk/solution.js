// 2.5.6 Wrap Only What Can Fail
// The loop and the total are safe, so they run before the try block.
// Only the risky line (label is never declared) sits inside try.

let total = 0;
for (let i = 1; i <= 4; i++) {
  total = total + i;
}

try {
  console.log(label);
} catch (err) {
  console.log("Failed.");
}

console.log("Total: " + total);
