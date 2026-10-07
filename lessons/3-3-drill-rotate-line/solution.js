function rotate(items) {
  const first = items.shift();
  items.push(first);
  return items;
}

console.log(rotate(["ana", "bob", "cy"]));   // bob, cy, ana
