// 3.6.12 Lab: Object-Parameter Mutation
//
// Objects pass to a function the same way arrays do: the function gets a copy
// of the reference, so changing a property reaches the original.

// STEP 1: Define a function called birthday. It takes one object parameter.
//         Add 1 to that object's age property. Change the PROPERTY the object
//         already has; do not point the parameter at a new object.

// STEP 2: Create an object with a name and an age. Call birthday with it.
//         console.log the caller's object afterwards and confirm the age
//         changed, because both names point at the same object.

// STEP 3: Define a function called birthdaySafe. It takes one object and
//         returns a NEW object with the age increased, leaving the one it was
//         given unchanged: copy the object with spread and add the new age.
//         Call it and log both the original object and the returned one.
