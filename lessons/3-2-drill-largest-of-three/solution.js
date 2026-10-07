function largest(a, b, c) {
  let biggest = a;
  if (b > biggest) {
    biggest = b;
  }
  if (c > biggest) {
    biggest = c;
  }
  return biggest;
}

console.log(largest(9, 4, 6));
console.log(largest(4, 9, 6));
console.log(largest(4, 6, 9));
