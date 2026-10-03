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
