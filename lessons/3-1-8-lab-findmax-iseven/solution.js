function findMax(a, b) {
  if (a > b) {
    return a;
  }
  return b;
}

function isEven(n) {
  return n % 2 === 0;
}

console.log(findMax(3, 7));
console.log(isEven(4));
