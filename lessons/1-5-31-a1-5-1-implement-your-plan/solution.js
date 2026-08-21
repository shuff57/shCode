// PLAN (pseudocode):
// if pages requested <= credit remaining
//   print that printing is allowed
// else
//   print that there is not enough credit

let pagesRequested = 5;
let creditRemaining = 10;

if (pagesRequested <= creditRemaining) {
  console.log("Printing " + pagesRequested + " pages.");
} else {
  console.log("Not enough credit to print " + pagesRequested + " pages.");
}
