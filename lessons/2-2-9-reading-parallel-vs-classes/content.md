Same problem, two shapes. An enemy fleet needs to spawn, take damage, and die. Below is the procedural version (three arrays moving in lockstep) next to the object-oriented version (one array of instances). Read both, then answer the discussion questions.

## Procedural — parallel arrays

```js
let enemyX = [];
let enemyY = [];
let enemyHP = [];

function spawnEnemy(x, y, hp) {
  enemyX.push(x); enemyY.push(y); enemyHP.push(hp);
}

function damageEnemy(i, n) {
  enemyHP[i] -= n;
  if (enemyHP[i] <= 0) {
    enemyX.splice(i, 1); enemyY.splice(i, 1); enemyHP.splice(i, 1);
  }
}
```

Every enemy is represented by an index `i` shared across three separate arrays. Adding a property means adding a fourth array everywhere it is used.

## Object-oriented — array of instances

```js
let enemies = [];

class Enemy {
  constructor(x, y, hp) {
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.color = 'red';
  }

  damage(n) {
    this.hp -= n;
    if (this.hp <= 0) {
      this.sprite.remove();
    }
  }
}

function spawnEnemy(x, y, hp) {
  enemies.push(new Enemy(x, y, hp));
}

// damage is a method on the instance:
// enemies[0].damage(5);
```

Each enemy carries its own data. Deleting one means removing a single object from `enemies` — no other arrays to update.

## Discussion

Think through these before the next class session. No written answer required, but be ready to share.

1. **Readability** — If you opened this code for the first time, which version makes it clearer what an "enemy" is? Why?
2. **Extension** — You need to add an `element` property (fire, ice, lightning) to every enemy. In each version, what do you have to add or change?
3. **Deletion** — An enemy dies at index 2. In the parallel-array version, how many `splice` calls are needed? In the OOP version, how many?
