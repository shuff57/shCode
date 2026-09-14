// 3.6.13 Lab: Nested-Structure Mutation
//
// A spread copy of an object is SHALLOW: the new object is genuinely new, but
// any nested array or object inside it is still shared with the original.

// STEP 1: Create an object that holds a nested array, e.g. a student with a
//         list of scores. Then make a copy of the object using spread:
//         a new object built from the original's keys.

// STEP 2: Push a new number into the COPY's nested array.
//         Log the copy and the original. Notice the original changed too:
//         the shallow copy still points at the same nested array.

// STEP 3: Now copy the same object with structuredClone instead of spread.
//         Push into that copy's nested array and log both again.
//         This time the original should be untouched: structuredClone copies
//         all the way down.
