// Boolean Operations
// Write your code below

// Step 1: Import primitives, transforms, AND booleans from @jscad/modeling.
//         const { primitives, transforms, booleans } = require('@jscad/modeling')

// Step 2: Create two overlapping shapes and combine them with union.
//         booleans.union(shape1, shape2) — merges shapes into one

// Step 3: Use subtract to cut one shape out of another.
//         booleans.subtract(base, cutter) — cuts cutter out of base
//         IMPORTANT: order matters! subtract(A, B) is not the same as subtract(B, A)

// Step 4: Use intersect to keep only the overlap of two shapes.
//         booleans.intersect(shape1, shape2) — keeps shared area only

// Tip: Use transforms.translate() to position shapes so they overlap.
// Don't forget: module.exports = { main }
