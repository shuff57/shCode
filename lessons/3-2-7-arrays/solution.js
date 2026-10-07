let fruits = ["apple", "banana", "cherry"];

fruits.push("date");
fruits.pop();

for (let i = 0; i < fruits.length; i++) {
  console.log(fruits[i]);
}

let found = false;
for (let i = 0; i < fruits.length; i++) {
  if (fruits[i] === "banana") {
    found = true;
  }
}
console.log(found);

function countFruit(fruits, name) {
  let count = 0;
  for (let i = 0; i < fruits.length; i++) {
    if (fruits[i] === name) {
      count = count + 1;
    }
  }
  return count;
}

function longFruits(fruits, minLength) {
  let result = [];
  for (let i = 0; i < fruits.length; i++) {
    if (fruits[i].length >= minLength) {
      result.push(fruits[i]);
    }
  }
  return result;
}

console.log(countFruit(["apple", "banana", "apple"], "apple"));
console.log(longFruits(fruits, 6));
