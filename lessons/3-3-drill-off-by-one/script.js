// 3.3.6 Lab: Fix the Off-by-One Loop

// printPrices should print every price in the array, one per line,
// and nothing else. Run it and read the output: something extra appears.

// STEP 1: Run the code. Which line should not be there?

// STEP 2: Find the condition in the for header. It lets i reach
//         prices.length, which is one place past the last item.

// STEP 3: Fix it so the loop stops after the last item, then run
//         again. The output should be exactly 5, 12, 8.

function printPrices(prices) {
  for (let i = 0; i <= prices.length; i++) {
    console.log(prices[i]);
  }
}

printPrices([5, 12, 8]);
