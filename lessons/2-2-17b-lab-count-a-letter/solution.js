// 2.2.20 Count a Letter in a Word

let word = "strawberry";
let count = 0;

for (let i = 0; i < word.length; i++) {
  if (word[i] === "r") {
    count = count + 1;
  }
}

console.log(count);
