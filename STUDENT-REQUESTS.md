# Student requests: the to-do list

Requests from the in-app issue reports that the owner has accepted but not yet
scheduled. Each entry says what the student asked, what we found, and the
decision so far. Delete an entry when it ships (say which commit in the log).

## #100 Colliders that fit a picture's shape

**Asked:** "hitboxes should automatically fit around non-rectangular
textures".

**Found:** moSHion (`public/moshion/moshion.js`) only builds box and circle
colliders. planck supports convex polygons of at most 8 vertices per fixture;
a concave outline needs several fixtures.

**Plan (engine work, not small):** trace the texture's opaque pixels, take a
simplified outline, split it into convex pieces of 8 or fewer vertices, and
attach them as fixtures. Surface it as one plain switch (for example
`sprite.collider = 'texture'` or `sprite.fitCollider()`; decide the name
before building). Today's workaround, which the student already uses, is a
separate invisible hitbox sprite.
