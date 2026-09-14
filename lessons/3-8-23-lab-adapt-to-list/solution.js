const records = [
  { name: "Pen", price: 2 },
  { name: "Pad", price: 5 }
];

localStorage.setItem("records", JSON.stringify(records));

const restored = JSON.parse(localStorage.getItem("records"));

console.log(restored.length);
console.log(restored[0].name);
