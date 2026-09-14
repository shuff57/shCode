function double(n) {
  return n * 2;
}

function addTen(n) {
  return n + 10;
}

console.log(addTen(double(5)));
console.log(double(addTen(5)));
