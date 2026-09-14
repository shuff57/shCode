// 3.8.22 Saving-and-Loading Capstone

// STEP 1: Create a defaults object with at least two properties, then a state
//         object describing a player with a score and a level.

// STEP 2: Define a function that takes a state object and stores it under a
//         key with localStorage.setItem, converting it with JSON.stringify
//         first.

// STEP 3: Define a function that reads the key. If nothing is stored, return
//         the defaults. Otherwise parse the text inside a try block, and return
//         the defaults from the catch block if the text will not parse.

// STEP 4: Call save with your state, then call load and use console.log to
//         print a property of the restored object. Run it again and note the
//         value persists between runs.
