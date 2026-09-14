// 3.6.16 Lab: Pass-by-Reference Capstone Practice

function addScore(scores, score) {
  return [...scores, score];
}

function recordPlay(song) {
  song.plays = song.plays + 1;
}

function copyBook(library) {
  return structuredClone(library);
}

const original = [10, 20];
const withNew = addScore(original, 30);
console.log("original:", original);
console.log("new:     ", withNew);

const song = { title: "Daylight", plays: 4 };
recordPlay(song);
console.log("song:", song);

const library = { name: "Shelf", books: ["A", "B"] };
const clone = copyBook(library);
clone.books.push("C");
console.log("library:", library.books);
console.log("clone:  ", clone.books);
