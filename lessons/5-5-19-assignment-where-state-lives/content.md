# Where the state lives

Three numbers in the wave spawner (7.3.17), and one question about each:

1. **The list of enemies still on the field.**
2. **One enemy's health.**
3. **How many enemies have ever been built.**

For each, answer with one of the three places a value can live — a **local** in a method, a **property on `this`**, or a **class variable** (`static`) — and add one sentence saying why that place and not the other two.

There is a correct answer for each, and the reasoning matters more than the label. A good sentence names what would go wrong in the wrong place: "if it were a local, every call would start again at zero", or "if it were on `this`, each enemy would count only itself".

Write your answers in `README.md`, then press **Grade**. The AI reads what your answers mean and marks each card. Editing clears those marks, so press Grade again when you have finished.
