// 2.5.11 Fix the Silent Catch
//
// This catch block is empty. When itemTotal fails to calculate, the
// program says nothing at all: it just moves on as if everything worked.
//
// STEP: Add a console.log inside the catch block that reports what
//       happened, for example "Could not calculate the total."

try {
  console.log("Total: $" + itemTotal);
} catch (err) {

}

console.log("Order placed.");
