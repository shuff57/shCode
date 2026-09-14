const state = { score: 1200, level: 3 };

localStorage.setItem("gameState", JSON.stringify(state));

console.log(localStorage.getItem("gameState"));
