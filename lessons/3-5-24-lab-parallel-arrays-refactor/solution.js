const players = [
  { name: "Marisol", score: 92, group: "A" },
  { name: "Dev", score: 78, group: "B" },
  { name: "Priya", score: 85, group: "A" }
];

for (let i = 0; i < players.length; i++) {
  console.log(players[i].name + " (" + players[i].group + "): " + players[i].score);
}
