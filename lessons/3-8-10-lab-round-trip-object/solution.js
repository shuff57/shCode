const player = { name: "Marisol", score: 40 };

const saved = JSON.stringify(player);
const restored = JSON.parse(saved);

console.log(restored.score + 1);
console.log(player.name);
