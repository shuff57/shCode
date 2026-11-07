## Kinds as data

**Read before 7.19.2 Sub-build: A list of kinds becomes a list of objects.** About 12 minutes.

One goblin is a fight. A game is a run of them, each harder than the last: a slime, then a
goblin, then an ogre. What makes an ogre different from a slime? Only its numbers: more hp, more
power, maybe a potion, and another colour. It attacks, guards and drinks exactly the way any
fighter does. So an ogre does not need a class of its own. **A kind of enemy is data**: a plain
object with the numbers, one per kind, in a list.

```js
const KINDS = [
  { name: 'Slime', hp: 14, power: 3, potions: 0, color: 'limegreen' },
  { name: 'Goblin', hp: 24, power: 5, potions: 1, color: 'orange' },
  { name: 'Ogre', hp: 36, power: 7, potions: 1, color: 'mediumpurple' },
];
```

These are plain objects with `{ name: value }` pairs, like Trail's list of players (6.23.1).
They have no methods: `KINDS[2].takeHit(5)` would fail. They are a description of a fighter,
not a fighter. Adding a fourth kind is one more line here, and no other line of the game changes.

## A list of kinds becomes a list of fighters: map

You need a `Fighter` for every kind. 3.7.2 (Reading: Transforming a List with `.map()`) is
exactly that job: `.map(callback)` calls the callback once for each item and collects what each
call returns into a new list of the same length. The callback is handed one kind, `k`, and
returns a new `Fighter` made from its numbers:

```js
enemies = KINDS.map((k) => new Fighter(k.name, k.hp, k.power, k.potions, k.color));
```

`enemies[0]` is now a real slime with 14 hp and a `takeHit` method, `enemies[1]` a goblin and
`enemies[2]` an ogre. `KINDS` is not changed (3.7.2 again): it stays the description, so a new
game can make fresh enemies from it. That is why this line goes in `newGame()`, not in
`setup()`: after a loss, R must bring back an ogre with full hp, not the hurt one from last game.

A loop that pushes does the same job by hand, and is just as right:

```js
enemies = [];
for (let i = 0; i < KINDS.length; i++) {
  const k = KINDS[i];
  enemies.push(new Fighter(k.name, k.hp, k.power, k.potions, k.color));
}
```

## Which enemy you are on

`which` is the number of the enemy you are fighting: 0 for the slime, 1 the goblin, 2 the ogre.
The fight itself does not change at all. `fighters[1]` is still "the one you face", and every
rule asks `fighters[1]`. Moving on is pointing `fighters[1]` at the next enemy in the list:

```js
which += 1;
fighters[1] = enemies[which];
```

No hp is copied and nothing is made: the goblin was waiting in `enemies` all along, with its own
full hp, and now it is the one you face.

## Levelling up changes one object's own state

Beating an enemy makes you stronger before the next one. That is a method on `Fighter`, because
it changes this fighter's own properties and nobody else's:

```js
levelUp() {
  this.maxHp += 5;
  this.hp = this.maxHp;
  this.power += 1;
  this.potions = 2;
}
```

The order matters: `maxHp` goes up first, then `hp` is set to the new `maxHp`, so you start the
next fight full. Only the hero levels up: `fighters[0].levelUp()`. The enemies have the same
method, since they are made from the same class, but nothing calls it on them.

## The end of a fight is not always the end of the game

7.17.3's `fightOver(winner)` always ended the game. Now a win only ends it after the last enemy.
Three cases, in order, each one leaving with `return`:

```js
function fightOver(winner) {
  if (winner === 1) {
    over = true;
    message = 'The ' + fighters[1].name + ' beat you. Press R to try again';
    return;
  }
  if (which === enemies.length - 1) {
    over = true;
    message = 'You beat them all! Press R to play again';
    return;
  }
  which += 1;
  fighters[0].levelUp();
  fighters[1] = enemies[which];
  turn = 0;
  message = 'Level up! Next: ' + fighters[1].name + '. Your turn';
}
```

The last enemy is `enemies.length - 1`, because a list of 3 is numbered 0, 1 and 2. Ask that
**before** `which += 1`, while `which` is still the enemy you just beat. When there is another,
`turn = 0` gives you the first move against it. And `enemies.length`, not 3, means a fourth kind
in `KINDS` makes a fourth fight with no other change.
