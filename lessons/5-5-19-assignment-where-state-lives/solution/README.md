Where the state lives

1. The list of enemies still on the field is a property of the scene, `this.enemies` (an array). It has to outlive a single frame, and it holds several objects, so it cannot be a local in a method: a local would be rebuilt every frame and the game would forget every enemy it made. It cannot be a property of one enemy either, because the list is not about any one enemy — it is about the field.

2. One enemy's health is a property on `this`, set in the constructor. Each enemy needs its own copy, so two enemies can be at different health at the same time. As a local it would reset on every method call, and `takeHit` could never carry a wound from one frame to the next. As a class variable every enemy would share one number, and damaging one would damage all of them.

3. How many enemies have ever been built is a class variable, `static spawned`, bumped in the constructor. It belongs to the class, not to any one enemy, and it has to count enemies that no longer exist, so no single instance can hold it. A local would start again at zero on every call, and a property on `this` would give each enemy its own count of one.
