// 2.5.11 Fix the Silent Catch
// itemTotal is never declared, so the try throws. The catch now reports
// what happened instead of silently swallowing the failure.

try {
  console.log("Total: $" + itemTotal);
} catch (err) {
  console.log("Could not calculate the total.");
}

console.log("Order placed.");
