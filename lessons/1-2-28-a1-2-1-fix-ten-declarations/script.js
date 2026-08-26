// 1.2.28 A1.2.1: Fix Ten Declarations

// Ten declarations below. Every one of them is wrong.
// Some will not even run. Fix all ten, and above each fix write a
// comment saying what was wrong with it.
//
// The names are correct except where the comment says otherwise :
// keep them, and give each variable the type its name implies.

// 1. an age should be a number, not text
let studentAge = "16";

// 2. text has to be in quotes
let firstName = Sam;

// 3. a yes/no answer should be a real boolean
let isEnrolled = "true";

// 4. this one never got declared at all
gradeLevel = 10;

// 5. a school's maximum never changes during the program
let MAX_STUDENTS = 30;

// 6. what does "p" hold? rename it to unitPrice
let p = 29.99;

// 7. and "q"? rename it to itemCount
let q = 3;

// 8. JavaScript names are camelCase
let favourite_colour = "blue";

// 9. this student has no middle name: deliberately nothing
let middleName = "null";

// 10. the final score is not known yet; do not assign it at all
let finalScore = undefined;

console.log(studentAge, firstName, isEnrolled, gradeLevel);
console.log(MAX_STUDENTS, favourite_colour, middleName, finalScore);
