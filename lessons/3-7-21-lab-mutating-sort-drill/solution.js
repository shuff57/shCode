const items = [1, 2];

console.log("before:", items);
items.push(3);
console.log("after push:", items);

const doubled = items.map((n) => n * 2);
console.log("doubled:", doubled);
console.log("original:", items);
