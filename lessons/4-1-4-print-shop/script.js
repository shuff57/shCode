// Print Shop: Q1 Synthesis Project
//
// Everything prints to the console. There is no page to build: the whole
// program ends by printing one line that says what you made and how long
// the queue is. Write your code under each step.

// STEP 1: Create an array called `orders` holding at least 5 print orders.
//         Each order is an object with:
//           name        (string)  the customer's job name
//           width       (number)  mm
//           height      (number)  mm
//           depth       (number)  mm
//           filament    (string)  "PLA", "PETG", ...
//           priority    (number)  1 is most urgent

// STEP 2: Write `estimateHours(order)`: return the estimated print time
//         from the order's volume. Volume is width * height * depth.
//         Pick a rate and comment why you chose it.

// STEP 3: Write `priceOf(order)`: return the price:
//           grams * filament cost per gram  +  machine-time cost
//         Estimate grams from the volume. Keep the filament costs in one
//         object at the top of the file so they are easy to change.

// STEP 4: Write `fitsInVolume(order, maxW, maxH, maxD)`: three parameters
//         for the build volume. Return true when the order fits.

// STEP 5: Write `sortByPriority(list)`: return the queue sorted so the
//         most urgent job comes first. Do not modify the original array.

// STEP 6: Persist the queue between reloads, converting it to text on
//         the way out and back on the way in, as you did in 3.8.
//         `saveQueue()` writes it; `loadQueue()` reads it back.

// STEP 7: The main program. Call your functions and print ONE formatted
//         verdict line, for example:
//           You made $14.20; queue is 6 hours
//         Everything above this line is definitions; this is the part that
//         actually runs.

// STEP 8: Three manual tests. Call a function with an input whose answer
//         you already know, compare against it, and report whether each
//         check matched.
//         A test that cannot fail is not a test: make one of them check
//         an edge case, like an order that does not fit the build volume.
