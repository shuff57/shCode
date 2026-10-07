function triple(n) {
  return n * 3;
}

function addSeven(n) {
  return n + 7;
}

console.log(addSeven(triple(4)));
console.log(triple(addSeven(4)));
