const first = [1, 2];
const second = [3, 4];

const combined = [...first, ...second];
const framed = [0, ...first, 99];

console.log(combined);
console.log(framed);
console.log(first);
