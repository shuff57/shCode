// 3.8.19 Load and Restore a Saved State

// STEP 1: Store an object under a key using JSON.stringify and
//         localStorage.setItem, so there is something to load.

// STEP 2: Use localStorage.getItem into a variable. A key that was never
//         saved returns null, so check for null before you parse.

// STEP 3: If text was found, parse it with JSON.parse inside a try block. In
//         the catch block, fall back to a default object instead of letting the
//         error stop the program.

// STEP 4: Use console.log to print a property of the restored object, proving
//         it came back as a real object and not a string.
