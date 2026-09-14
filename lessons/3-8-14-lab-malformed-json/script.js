// 3.8.14 Handle a Malformed JSON String

// STEP 1: Define a function named readSave that takes one parameter, a string.
//         Inside it, attempt to parse the text with JSON.parse.

// STEP 2: Wrap the JSON.parse call in a try block. In the catch block, return
//         a fallback object with a property such as ok set to false, instead
//         of letting the error escape.

// STEP 3: Use console.log to call the function twice: once with a valid JSON
//         string and once with garbage. Confirm the first returns a value and
//         the second returns your fallback object.
