function triple(n) {
  return n * 3;
}

function isNegative(n) {
  return n < 0;
}

function label(name, score) {
  return name + ": " + score;
}

const tripleArrow = (n) => n * 3;
const isNegativeArrow = (n) => n < 0;
const labelArrow = (name, score) => name + ": " + score;

console.log(tripleArrow(5), triple(5));
console.log(isNegativeArrow(-1), isNegative(-1));
console.log(labelArrow("Ada", 100), label("Ada", 100));
