const gameState = {
  player: "Marisol",
  items: [
    { name: "Pen", price: 2 },
    { name: "Pad", price: 5 }
  ]
};

const saved = JSON.stringify(gameState);
const restored = JSON.parse(saved);

console.log(restored.items[1].price + 10);
console.log(restored.items[1].name);
