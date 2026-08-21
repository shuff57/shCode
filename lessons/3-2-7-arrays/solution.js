let fruits = ["apple", "banana", "cherry"];

fruits.push("date");
fruits.pop();

for (let i = 0; i < fruits.length; i++) {
  console.log(fruits[i]);
}

console.log(fruits.includes("banana"));
