// 1.2.28 A1.2.1 — Fix Ten Declarations

// 1. an age should be a number, not text
let studentAge = 16;

// 2. text has to be in quotes
let firstName = "Sam";

// 3. a yes/no answer should be a real boolean
let isEnrolled = true;

// 4. this one never got declared at all
const gradeLevel = 10;

// 5. a school's maximum never changes during the program
const MAX_STUDENTS = 30;

// 6. what does "p" hold? rename it to unitPrice
const unitPrice = 29.99;

// 7. and "q"? rename it to itemCount
let itemCount = 3;

// 8. JavaScript names are camelCase
let favouriteColour = "blue";

// 9. this student has no middle name — deliberately nothing
const middleName = null;

// 10. the final score is not known yet; do not assign it at all
let finalScore;

console.log(studentAge, firstName, isEnrolled, gradeLevel);
console.log(MAX_STUDENTS, favouriteColour, middleName, finalScore);
