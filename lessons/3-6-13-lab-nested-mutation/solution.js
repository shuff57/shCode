// 3.6.13 Lab: Nested-Structure Mutation

const student = { name: "Alex", scores: [90, 85] };

const shallow = { ...student };
shallow.scores.push(100);
console.log("shallow copy:", shallow.scores);
console.log("original:    ", student.scores);

const deep = structuredClone(student);
deep.scores.push(70);
console.log("deep copy:   ", deep.scores);
console.log("original:    ", student.scores);
