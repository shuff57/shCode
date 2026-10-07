function lastItem(items) {
  return items[items.length - 1];
}

let names = ["ana", "bob", "cy"];
console.log(lastItem(names));   // cy
console.log(names);             // still ana, bob, cy
