# JSCAD and FreeCAD Activity Lists for CSCI 4
## Teacher-Delivered Content | Chico USD / Butte College Dual Enrollment

These are the complete activity lists for every JSCAD and FreeCAD subsection.
All activities are teacher-created. Tags indicate the activity type:

- **[Example]** — teacher demo or provided code for students to run and study
- **[Exercise]** — students write code to meet a specification
- **[Challenge]** — open-ended or harder exercise
- **[Reference]** — documentation pointer
- **[Discussion]** — class discussion activity
- **[Video]** — video resource (MangoJelly Solutions for FreeCAD)

Environment: https://jscad.app/ (browser-based, no install)

---

# Q2: JSCAD -- 2D to 3D

## Unit 2.1: JSCAD Foundations

### 2.1.1 Libraries and JSCAD Introduction (~3.5 hrs)

1. [JSCAD] What Is a Library? [Discussion] — class discussion: why programmers share code as libraries; npm, require(), real-world examples (lodash, three.js, jscad/modeling)
2. [JSCAD] The JSCAD App Interface [Example] — teacher walkthrough of https://jscad.app/: editor pane, 3D viewport, parameter panel, export button; orbit/pan/zoom controls
3. [JSCAD] Anatomy of a JSCAD Program [Example] — shows minimal program: `const { primitives } = require('@jscad/modeling')`, `function main() { return primitives.cube() }`, `module.exports = { main }`; explains each line
4. [JSCAD] require() and Destructuring [Example] — demonstrates `const { primitives, transforms } = require('@jscad/modeling')` and nested destructuring `const { cube, sphere } = primitives`; connects to Q1 object destructuring
5. [JSCAD] My First Cube [Exercise] — students write a complete JSCAD program from scratch that returns a cube with `size: 20`; verify it appears in the viewport
6. [JSCAD] Sphere with Options [Exercise] — students create a sphere using `primitives.sphere({ radius: 15, segments: 32 })`; experiment with lowering segments to see faceting
7. [JSCAD] Cuboid with Dimensions [Exercise] — students create a cuboid with different x/y/z sizes: `primitives.cuboid({ size: [30, 20, 10] })`; discuss how arrays define dimensions
8. [JSCAD] Three Shapes Side by Side [Exercise] — students return an array of three primitives `[cube, sphere, cylinder]` placed at different positions using `transforms.translate()`; first exposure to returning arrays
9. [JSCAD] Shape Options Explorer [Challenge] — students pick any three primitives from the JSCAD docs, create each with custom options, and arrange them in a row; write a comment above each explaining the options used
10. [JSCAD] JSCAD API Reference Tour [Reference] — guided reading of https://openjscad.xyz/docs/ primitives section; students identify five primitives they want to try and list the options each accepts

### 2.1.2 2D Shapes and Transforms (~3.5 hrs)

1. [JSCAD] 2D Coordinate System [Discussion] — whiteboard discussion: X/Y axes, origin at center, positive directions; why JSCAD starts with 2D before 3D
2. [JSCAD] Rectangle and Circle [Example] — demonstrates `primitives.rectangle({ size: [40, 20] })` and `primitives.circle({ radius: 15 })`; shows how 2D shapes render flat in the viewport
3. [JSCAD] Ellipse and Rounded Rectangle [Example] — demonstrates `primitives.ellipse({ radius: [20, 10] })` and `primitives.roundedRectangle({ size: [30, 20], roundRadius: 3 })`; discusses when rounded corners matter for real parts
4. [JSCAD] Translate in 2D [Example] — demonstrates `transforms.translate([30, 0], shape)` to move a circle to the right; explains the [x, y] offset array
5. [JSCAD] Rotate and Scale in 2D [Example] — demonstrates `transforms.rotate([0, 0, Math.PI/4], rect)` for 45-degree rotation and `transforms.scale([2, 1], rect)` for stretching; explains radians vs degrees
6. [JSCAD] Polygon from Points [Exercise] — students create a triangle using `primitives.polygon({ points: [[0,0], [20,0], [10,15]] })`; then modify points to make a pentagon
7. [JSCAD] Star Shape [Exercise] — students use `primitives.star({ vertices: 5, outerRadius: 20, innerRadius: 10 })` and experiment with vertex count and radii
8. [JSCAD] Translate, Rotate, Scale Drill [Exercise] — students start with a rectangle, then: (a) translate it 30 units right, (b) rotate a copy 45 degrees, (c) scale a copy to double width; return all four versions as an array
9. [JSCAD] Smiley Face [Exercise] — students compose a face from 2D primitives: a large circle for the head, two small circles for eyes, and an arc or ellipse for the mouth; uses translate to position each piece
10. [JSCAD] Returning Arrays of Shapes [Example] — demonstrates returning `[shape1, shape2, shape3]` from main(); explains that JSCAD renders all shapes in the returned array
11. [JSCAD] Name Initials [Exercise] — students build their initials from 2D rectangles and arcs, positioning each stroke with translate; minimum two letters
12. [JSCAD] 2D Transform Composition [Challenge] — students create a scene with at least six 2D shapes using all three transforms (translate, rotate, scale); must include at least one shape that uses all three transforms chained together

### 2.1.3 Boolean Operations in 2D (~3.5 hrs)

1. [JSCAD] What Are Boolean Operations? [Discussion] — whiteboard: Venn diagrams for union, subtract, intersect; preview how these create shapes impossible with primitives alone
2. [JSCAD] Union in 2D [Example] — demonstrates `booleans.union(circle, rectangle)` to merge two overlapping shapes into one; shows the result is a single unified shape
3. [JSCAD] Subtract in 2D [Example] — demonstrates `booleans.subtract(rectangle, circle)` to cut a circle hole from a rectangle; then reverses the order to show `subtract(circle, rectangle)` gives a completely different result
4. [JSCAD] Intersect in 2D [Example] — demonstrates `booleans.intersect(circle, rectangle)` to keep only the overlapping region; compares visually to union and subtract
5. [JSCAD] Order Matters in Subtract [Exercise] — students create a rectangle and circle that overlap, then write two subtracts: `subtract(rect, circle)` and `subtract(circle, rect)`; write comments explaining the difference
6. [JSCAD] Washer / Ring Shape [Exercise] — students create a ring by subtracting a smaller circle from a larger circle; parameterize outer and inner radii as variables
7. [JSCAD] Keyhole Shape [Exercise] — students build a keyhole by unioning a circle (top) with a rectangle (bottom shaft), then subtracting a smaller rectangle from the shaft for the slot
8. [JSCAD] Cookie Cutter Outlines [Exercise] — students create a cookie cutter profile: start with a star shape, offset it outward using a slightly larger star, then subtract the inner from the outer to get a thin outline
9. [JSCAD] Multi-Step Boolean [Exercise] — students create a shape that requires at least three boolean operations in sequence: e.g., start with a rectangle, subtract four corner circles, then union a circle onto one side
10. [JSCAD] Boolean Operation Sampler [Challenge] — students create a 3-panel display: left panel shows a union, middle shows a subtract, right shows an intersect; all using the same two base shapes, translated apart so the three results are visible side by side
11. [JSCAD] Logo Design [Challenge] — students design a simple logo using only boolean operations on 2D primitives; must use at least one union, one subtract, and one intersect; add a comment block explaining the design intent

---

## Unit 2.2: Parametric Design

### 2.2.1 Parameters and getParameterDefinitions (~3.5 hrs)

1. [JSCAD] Why Parametric Design? [Discussion] — discussion: why hard-coded dimensions are bad; one model, infinite variations; real-world parametric design in manufacturing
2. [JSCAD] getParameterDefinitions Anatomy [Example] — demonstrates adding `function getParameterDefinitions() { return [ { name: 'size', type: 'number', initial: 20, min: 5, max: 100, step: 1, caption: 'Size (mm):' } ] }` and accessing `params.size` in main(); shows the slider appearing in the JSCAD parameter panel
3. [JSCAD] Number Parameter with Min/Max/Step [Example] — demonstrates a number parameter controlling cube size: min/max clamp the slider, step controls increment; students see the slider update the model live
4. [JSCAD] Text and Checkbox Parameters [Example] — demonstrates `{ name: 'label', type: 'text', initial: 'hello', caption: 'Label:' }` and `{ name: 'showHole', type: 'checkbox', checked: true, caption: 'Show hole?' }`; checkbox drives an if-statement in main()
5. [JSCAD] Choice and Slider Parameters [Example] — demonstrates `{ type: 'choice', values: ['small', 'medium', 'large'], captions: ['S', 'M', 'L'] }` and `{ type: 'slider', min: 0, max: 100 }`; shows how choice returns a string and slider returns a number
6. [JSCAD] Parametric Box [Exercise] — students create a box where width, height, and depth are each controlled by separate number parameters with sensible min/max/step values
7. [JSCAD] Parametric Washer [Exercise] — students make the ring from 2.1.3 parametric: outer radius, inner radius, and a checkbox to toggle a flat edge (subtract a rectangle from one side); validate that inner < outer using `Math.min()`
8. [JSCAD] Conditional Geometry with Checkbox [Exercise] — students create a base plate with a checkbox parameter "Add mounting holes"; when checked, four corner circles are subtracted; when unchecked, the plate is solid
9. [JSCAD] Shape Chooser with Choice Parameter [Exercise] — students use a choice parameter to let the user pick between cube, sphere, and cylinder; a number parameter controls the size of whichever shape is selected
10. [JSCAD] Parameter Groups [Example] — demonstrates `{ type: 'group', caption: 'Dimensions' }` to organize parameters into collapsible sections; shows a complex model with "Dimensions" and "Options" groups
11. [JSCAD] Parametric Phone Stand [Challenge] — students design a simple phone stand with parameters for phone width, phone thickness, viewing angle, and material thickness; must use at least four parameters across two groups
12. [JSCAD] Parameter Validation Patterns [Reference] — reference document showing common patterns: clamping values with Math.min/Math.max, deriving one dimension from another, using conditional logic to prevent invalid geometry

### 2.2.2 Arrays in JSCAD / Loops Generating Geometry (~3.5 hrs)

1. [JSCAD] From Q1 Loops to Geometry Loops [Discussion] — discussion connecting Q1 for-loop patterns to generating arrays of shapes; the accumulator pattern now accumulates geometry instead of numbers
2. [JSCAD] For Loop Generating Shapes [Example] — demonstrates building an array of circles in a row: `const shapes = []; for (let i = 0; i < 5; i++) { shapes.push(translate([i * 25, 0], circle({ radius: 10 }))) }; return shapes`
3. [JSCAD] Map for Geometry [Example] — demonstrates the same row of circles using `[0,1,2,3,4].map(i => translate([i * 25, 0], circle({ radius: 10 })))` as an alternative to for loops; discusses when map is cleaner
4. [JSCAD] Grid Generation [Example] — demonstrates nested for loops to create a 4x4 grid of circles: outer loop for rows, inner loop for columns, translate each to `[col * spacing, row * spacing]`
5. [JSCAD] Row of Boxes [Exercise] — students use a for loop to create a row of 6 cubes, each spaced 30mm apart; add a parameter for "count" so the user can control how many
6. [JSCAD] Parametric Grid [Exercise] — students create a grid of shapes where both the row count, column count, and spacing are controlled by parameters; the shape at each position is a small cylinder
7. [JSCAD] Circular Pattern [Exercise] — students use a for loop with trigonometry to place 8 circles in a ring: `x = radius * Math.cos(angle)`, `y = radius * Math.sin(angle)`; parametric count and ring radius
8. [JSCAD] Scaling Pattern [Exercise] — students generate a row of shapes where each is slightly larger than the last: loop index controls both position and scale; produces a "growth" effect
9. [JSCAD] Alternating Pattern [Exercise] — students use loop index with modulo (`i % 2`) to alternate between two different shapes (e.g., circle and square) in a row; connects Q1 modulo concepts
10. [JSCAD] Parametric Pegboard [Exercise] — students create a rectangular base plate with a grid of evenly spaced holes subtracted from it; parameters: plate width, plate height, hole count X, hole count Y, hole radius
11. [JSCAD] Spiral Pattern [Challenge] — students use a loop where both angle and radius increase with each step to place shapes in a spiral; parametric turn count and shape count
12. [JSCAD] Snowflake Generator [Challenge] — students create one "arm" of a snowflake from 2D primitives, then use a loop with rotational symmetry (6 copies rotated 60 degrees apart) to produce the full snowflake; parametric arm detail

---

## Unit 2.3: 3D Modeling

### 2.3.1 First Extrusion: 2D to 3D (~3.5 hrs)

1. [JSCAD] 2D to 3D Concept [Discussion] — whiteboard: how a 2D profile becomes a 3D solid by adding height; real-world analogy: Play-Doh extruder, pasta maker; X/Y plane becomes the base, Z axis is up
2. [JSCAD] extrudeLinear Basics [Example] — demonstrates `extrusions.extrudeLinear({ height: 20 }, circle({ radius: 15 }))` to turn a 2D circle into a cylinder; shows how any 2D shape becomes 3D
3. [JSCAD] extrudeLinear with Twist [Example] — demonstrates `extrusions.extrudeLinear({ height: 30, twistAngle: Math.PI/2, twistSteps: 20 }, star())` to create a twisted extrusion; explains twistSteps controls smoothness
4. [JSCAD] extrudeRotate [Example] — demonstrates `extrusions.extrudeRotate({ segments: 32 }, polygon)` to spin a 2D profile around the Y axis; creates a vase shape from a simple polygon outline
5. [JSCAD] Coordinate System Transition [Discussion] — discussion: in 2D shapes live on X/Y; after extrusion Z is height; how translate changes from `[x, y]` to `[x, y, z]`
6. [JSCAD] Extruded Rectangle to Box [Exercise] — students create a rectangle and extrude it to a specified height; compare the result to `primitives.cuboid()` and discuss when each approach is better
7. [JSCAD] Extruded Star Token [Exercise] — students create a star in 2D, extrude it to 3mm height; this is a printable game token; set segments appropriately for smooth curves
8. [JSCAD] Extruded Ring [Exercise] — students create the 2D washer from 2.1.3 (subtract inner circle from outer) and extrude it; produces a 3D ring/washer shape
9. [JSCAD] Custom Profile Extrusion [Exercise] — students create a custom 2D polygon profile (at least 6 points) and extrude it with a twist; experiment with twist angle and steps
10. [JSCAD] STL Export Walkthrough [Example] — teacher demonstrates: click Export, choose STL, open the file in an online STL viewer or slicer; discuss file size and triangle count
11. [JSCAD] Printability Basics [Discussion] — discussion: what makes a model printable? manifold (watertight), flat bottom, no overhangs > 45 degrees without supports, minimum wall thickness (0.8mm for FDM)
12. [JSCAD] Design a Coaster [Exercise] — students design a printable drink coaster: extruded circle with parametric diameter (80-100mm), thickness (3-5mm), and optional center cutout; export as STL
13. [JSCAD] Lathe a Bowl Shape [Challenge] — students use extrudeRotate with a carefully designed polygon profile to create a bowl; parametric diameter and wall thickness; discuss whether it is printable without supports

### 2.3.2 3D Primitives and Transforms (~3.5 hrs)

1. [JSCAD] 3D Primitives Survey [Example] — demonstrates cube, cuboid, sphere, cylinder, torus, roundedCuboid, and roundedCylinder side by side with labels; shows options for each (size, radius, segments, roundRadius)
2. [JSCAD] 3D Translate, Rotate, Scale [Example] — demonstrates `translateZ(20, sphere())` to lift a sphere, `rotateX(Math.PI/4, cuboid())` to tilt a box, `scale([1, 1, 2], cylinder())` to stretch a cylinder vertically; contrasts with 2D versions
3. [JSCAD] 3D Booleans [Example] — demonstrates `subtract(cuboid(), sphere())` to carve a spherical cavity from a box; `union(cylinder(), cuboid())` to join; `intersect(sphere(), cuboid())` to get the overlap
4. [JSCAD] Rounded Primitives [Example] — demonstrates `roundedCuboid({ size: [30, 20, 10], roundRadius: 2 })` and `roundedCylinder({ height: 20, radius: 10, roundRadius: 2 })`; discusses why rounded edges are better for 3D printing and handling
5. [JSCAD] Dice [Exercise] — students create a cube, then subtract small spheres at the correct positions for each face to make pip indentations for a standard six-sided die; parametric size
6. [JSCAD] Snowman [Exercise] — students stack three spheres of decreasing size along the Z axis using translateZ; add cylinder arms and a torus hat brim; practice relative positioning in 3D
7. [JSCAD] Box with Lid [Exercise] — students create a hollow box (cuboid minus a slightly smaller cuboid translated up) and a separate lid piece that fits on top; parametric inner dimensions and wall thickness
8. [JSCAD] Bearing Shape [Exercise] — students create a torus (outer ring), subtract a slightly smaller torus to hollow it, and place small spheres around the inside channel; practice circular positioning from 2.2.2 in 3D
9. [JSCAD] Simple Bracket [Exercise] — students create an L-shaped bracket from two cuboids joined with union; add a cylindrical mounting hole through each arm using subtract; parametric arm length and thickness
10. [JSCAD] Multi-Part Assembly [Example] — demonstrates building an assembly from separate parts: base plate, vertical post (cylinder), and platform; each part is a separate function that returns geometry; main() unions them together
11. [JSCAD] Hammer Model [Exercise] — students build a hammer: cylinder for the handle, cuboid for the head, union them together; add a torus detail at the grip end; practice positioning 3D parts relative to each other
12. [JSCAD] Chess Piece [Challenge] — students design a chess piece (pawn, rook, or bishop) using combinations of 3D primitives and booleans; must use at least four primitives and two boolean operations; parametric height
13. [JSCAD] Fidget Spinner [Challenge] — students design a three-arm fidget spinner: central bearing (torus), three arms at 120-degree spacing (loop from 2.2.2), weight cylinders at each tip; parametric arm length and overall size

---

## Unit 2.5: Synthesis

### 2.5.1 Q2 Review and Major Project (~3.5 hrs)

1. [JSCAD] Q2 Skills Checklist [Reference] — self-assessment checklist: can you write a JSCAD program from scratch, use 2D/3D primitives, apply transforms, use booleans, add parameters, generate patterns with loops, extrude 2D to 3D, export STL?
2. [JSCAD] Design Thinking for 3D Modeling [Discussion] — class discussion connecting design thinking stages (empathize, define, ideate, prototype, test) to a JSCAD project; who is the user, what problem does the part solve?
3. [JSCAD] Project Proposal Template [Reference] — template for students: project name, target user, problem statement, sketch of design, list of JSCAD features they plan to use, parameter list, printability plan
4. [JSCAD] Project Ideation Session [Discussion] — brainstorm session: students pitch three project ideas to a partner; partner gives feedback on feasibility and which JSCAD skills each would require
5. [JSCAD] Minimum Viable Model [Exercise] — students build the simplest version of their project idea: one main shape with basic parameters; goal is to verify the core geometry works before adding detail
6. [JSCAD] Peer Design Review [Discussion] — students swap screens and review each other's MVP model; give feedback using the checklist: is it parametric, is it printable, are variable names clear, are there comments?
7. [JSCAD] Project Build Time [Exercise] — dedicated build session: students develop their Q2 project, adding detail, parameters, and polish; teacher circulates for individual help
8. [JSCAD] Export and Print Preparation [Exercise] — students export their project as STL, check it in an online mesh viewer for errors, verify dimensions match real-world measurements, prepare for printing
9. [JSCAD] Project Presentation Prep [Exercise] — students write a brief code walkthrough: which functions do what, which parameters matter most, what boolean operations were key; prepare to present in 2-3 minutes
10. [JSCAD] Q2 Project Gallery Walk [Discussion] — students display their models on screen (and printed parts if available); class does a gallery walk, leaving sticky-note feedback on two design strengths and one suggestion per project

---

# Q3: Advanced Modeling + CS Foundations

## Unit 3.1: Project Architecture

### 3.1.1 Multi-File Projects and File I/O (~3.5 hrs)

1. [JSCAD] Why Split into Multiple Files? [Discussion] — discussion: as JSCAD programs grow, one file becomes unmanageable; real codebases have hundreds of files; separation of concerns
2. [JSCAD] module.exports and require Between Files [Example] — demonstrates splitting a project: `parts/base.js` exports a function, `main.js` requires it with `const { makeBase } = require('./parts/base')`; shows the file structure
3. [JSCAD] Extracting a Helper Function [Example] — demonstrates refactoring: take an inline shape-building block from main(), move it to `helpers.js` as an exported function, require it back in main(); before/after comparison
4. [JSCAD] Two-File Split [Exercise] — students take their Q2 project (or a provided large file) and split it into two files: one for parameter definitions and main(), one for shape-building helper functions
5. [JSCAD] Three-File Architecture [Exercise] — students organize a project into three files: `main.js` (entry point), `params.js` (getParameterDefinitions), `shapes.js` (geometry functions); each file exports and imports correctly
6. [JSCAD] Importing SVG as Geometry [Example] — demonstrates using JSCAD's SVG deserializer to import an SVG file as 2D geometry that can be extruded; shows a logo SVG becoming a 3D badge
7. [JSCAD] Importing STL Files [Example] — demonstrates importing an existing STL file as geometry that can be combined with JSCAD-generated parts; discusses when importing vs modeling from scratch makes sense
8. [JSCAD] SVG Logo Extrusion [Exercise] — students find or create a simple SVG (school logo, simple icon), import it into JSCAD, and extrude it to create a 3D badge or keychain
9. [JSCAD] Multi-File Parametric Project [Exercise] — students create a parametric project split across at least three files, where changing a parameter in the UI updates geometry defined in a helper file; demonstrates the data flow across files
10. [JSCAD] Library Module [Challenge] — students create a reusable "library" file with at least three utility functions (e.g., `makeHole`, `makeGrid`, `makeRoundedPlate`) that could be shared across different projects; write JSDoc comments for each function

---

## Unit 3.2: Advanced JSCAD

### 3.2.1 Hulls and Advanced Extrusions (~3.5 hrs)

1. [JSCAD] What Is a Hull? [Discussion] — whiteboard: the hull is the "shrink-wrap" around a set of shapes; rubber-band analogy in 2D, shrink-wrap in 3D; when hulls create shapes that booleans cannot
2. [JSCAD] hull() in 2D [Example] — demonstrates `hulls.hull(circle({radius:5}), translate([40,0], circle({radius:5})))` to create a stadium/capsule shape; shows hull of three circles forming a rounded triangle
3. [JSCAD] hull() in 3D [Example] — demonstrates hull of two spheres at different positions creating a smooth capsule; hull of a sphere and a cube creating a rounded-edge transition shape
4. [JSCAD] hullChain() [Example] — demonstrates `hulls.hullChain(sphere1, sphere2, sphere3, sphere4)` to create a smooth path through a sequence of shapes; contrasts with hull() which wraps all at once
5. [JSCAD] extrudeHelical [Example] — demonstrates `extrusions.extrudeHelical({ height: 30, angle: Math.PI * 4 }, circle({radius:3}))` to create a spring/helix shape; shows parameter effects
6. [JSCAD] extrudeFromSlices Concept [Example] — demonstrates building a shape by defining cross-sections at different heights that morph from one profile to another; creates a square-to-circle transition
7. [JSCAD] Capsule Connector [Exercise] — students use hull() on two spheres to create a smooth connector piece between two mounting points; parametric length and end radii
8. [JSCAD] Organic Blob Shape [Exercise] — students place 4-6 spheres at irregular positions and hull them to create a smooth organic shape; experiment with sphere sizes to control the contour
9. [JSCAD] Smooth Path [Exercise] — students use hullChain() with a loop-generated array of small spheres positioned along a curve (sine wave or spiral) to create a smooth tubular path
10. [JSCAD] Spring [Exercise] — students use extrudeHelical to create a spring with parametric coil count, wire radius, and spring radius; discuss how the helix angle affects the pitch
11. [JSCAD] Hull vs Boolean Comparison [Exercise] — students create the same rounded bracket shape two ways: (a) using booleans and roundedCuboid, (b) using hull on positioned primitives; compare the results and write comments on which is cleaner
12. [JSCAD] When to Use Each Technique [Reference] — decision guide: use extrude for profiles with consistent cross-sections, hull for smooth transitions between shapes, hullChain for paths, extrudeFromSlices for morphing cross-sections
13. [JSCAD] Ergonomic Handle [Challenge] — students design a tool handle using hullChain on a series of ellipsoids of varying sizes to create an ergonomic grip; parametric hand size

### 3.2.2 Measurements and Printability (~3.5 hrs)

1. [JSCAD] Why Measure? [Discussion] — discussion: 3D printing demands precise dimensions; a part that is 0.5mm too wide will not fit; JSCAD units are millimeters; measure before you export
2. [JSCAD] measureBoundingBox and measureDimensions [Example] — demonstrates `measurements.measureBoundingBox(shape)` returning `[[minX,minY,minZ],[maxX,maxY,maxZ]]` and `measureDimensions(shape)` returning `[width, height, depth]`; logs to console
3. [JSCAD] measureVolume and measureArea [Example] — demonstrates `measureVolume(shape)` in mm^3 and `measureArea(shape)` in mm^2; converts volume to cm^3 for filament cost estimation (1cm^3 PLA ~ 1.24g)
4. [JSCAD] measureCenter [Example] — demonstrates `measureCenter(shape)` to find the centroid; useful for aligning parts relative to each other and checking symmetry
5. [JSCAD] Dimension Logger [Exercise] — students write a helper function `logDimensions(name, shape)` that uses measureBoundingBox and measureDimensions to print formatted dimensions to console; use it on three different shapes
6. [JSCAD] Will It Fit the Print Bed? [Exercise] — students write a function that takes a shape and a build plate size (250x250mm), uses measureBoundingBox, and returns true/false whether the part fits; test with shapes of various sizes
7. [JSCAD] Volume and Cost Estimator [Exercise] — students write a function that takes a shape, measures its volume, converts to cm^3, multiplies by filament density (1.24 g/cm^3 for PLA), then by cost per gram; returns estimated print cost
8. [JSCAD] Wall Thickness Check [Exercise] — students create a hollow box and use measureDimensions on the outer and inner shapes to verify the wall thickness matches the design intent; minimum 1.2mm walls for FDM printing
9. [JSCAD] Printability Checklist [Reference] — reference document: flat bottom surface? walls >= 0.8mm? no unsupported overhangs > 45 degrees? manifold (watertight)? fits build plate (250x250x250mm)? reasonable print time?
10. [JSCAD] Design for Assembly [Exercise] — students create two parts that fit together: a peg and a hole; use measurements to ensure the peg is 0.3mm smaller than the hole (tolerance for FDM); verify with measureDimensions
11. [JSCAD] Optimize for Print Time [Exercise] — students take a solid shape and hollow it out to reduce volume by at least 40% while maintaining structural integrity; compare measureVolume before and after; discuss infill as an alternative
12. [JSCAD] Full Print Preparation Report [Challenge] — students pick a model they have built, run all measurement functions, write a "print preparation report" as console output: dimensions, volume, estimated weight, estimated cost, fits-bed check, wall thickness check

---

## Unit 3.4: Presentation and Polish

### 3.4.1 Colors, Text, and Export Formats (~3.5 hrs)

1. [JSCAD] Why Color? [Discussion] — discussion: color in 3D models for visualization, assembly distinction, client presentation; which export formats preserve color (3MF, AMF) vs which do not (STL)
2. [JSCAD] colorize() Basics [Example] — demonstrates `colors.colorize([1, 0, 0], cube())` for red, `colorize([0, 0.5, 1], sphere())` for blue; explains RGB values are 0-1 range, not 0-255
3. [JSCAD] Color Conversion Helpers [Example] — demonstrates `colors.hexToRgb('#FF6600')` and `colors.colorNameToRgb('steelblue')`; shows how to use named CSS colors instead of memorizing RGB values
4. [JSCAD] Multi-Color Assembly [Example] — demonstrates coloring different parts of an assembly different colors: red base plate, blue vertical post, green platform; each part colored before union
5. [JSCAD] Color Your Model [Exercise] — students take an existing multi-part model and add distinct colors to each component; use at least four different colors; export as 3MF to preserve color
6. [JSCAD] vectorText Basics [Example] — demonstrates `primitives.vectorText({ height: 10, input: 'HELLO' })` returning an array of path2 segments; shows that text comes back as line segments, not solid shapes
7. [JSCAD] Extruding Text to 3D [Example] — demonstrates the full pipeline: vectorText -> convert segments to polygon paths -> extrudeLinear to get 3D raised text; complete working code for "JSCAD" in 3D
8. [JSCAD] Name Plate [Exercise] — students create a rectangular base plate with their name extruded as raised 3D text on top; parametric text height and plate dimensions
9. [JSCAD] Label on a Part [Exercise] — students take an existing 3D model and add embossed text to one face by subtracting extruded text (creates recessed lettering) or unioning it (creates raised lettering); parametric label text
10. [JSCAD] Export Format Comparison [Discussion] — class discussion comparing export formats: STL (universal, no color, large files), 3MF (color, compact, newer), AMF (color, XML-based), SVG (2D only); when to use each
11. [JSCAD] Export in Three Formats [Exercise] — students take one model and export it as STL, 3MF, and AMF; compare file sizes; open each in an online viewer and note which preserved color
12. [JSCAD] Color Palette Parameter [Exercise] — students add a choice parameter that lets the user select from preset color schemes (e.g., "Ocean", "Sunset", "Monochrome"); each scheme applies different colors to the model parts
13. [JSCAD] Engraved Trophy [Challenge] — students design a trophy with a base, pillar, and top ornament; add the recipient's name as parametric engraved text on the base; color each section differently; export as 3MF

---

# Q4: FreeCAD Bridge + Capstone

## Unit 4.1: FreeCAD Bridge

### 4.1.1 FreeCAD Interface and Part Design Basics (~3.5 hrs)

1. [FreeCAD] Why Learn FreeCAD? [Discussion] — discussion: JSCAD is code-based, FreeCAD is GUI-based; industry uses both approaches; FreeCAD is free and open-source; same concepts, different interface; prepares students for Mechatronics pathway
2. [FreeCAD] FreeCAD Interface Tour [Video] — MangoJelly Solutions: FreeCAD 1.0 interface overview; students follow along identifying the model tree, 3D view, workbench selector, and property panel
3. [FreeCAD] Workbenches Overview [Video] — MangoJelly Solutions: Part Design and Sketcher workbenches introduction; students switch between workbenches and note what tools become available in each
4. [FreeCAD] JSCAD-to-FreeCAD Concept Map [Reference] — reference sheet mapping concepts: `extrudeLinear` = Pad, `subtract` = Pocket, `union` = Boolean Union, `circle`/`rectangle` = Sketcher shapes, `getParameterDefinitions` = Spreadsheet workbench, `require` = importing a body
5. [FreeCAD] First Sketch [Exercise] — students open Sketcher, draw a rectangle with dimensions, add constraints (width = 40mm, height = 20mm); this is the equivalent of `primitives.rectangle({ size: [40, 20] })` in JSCAD
6. [FreeCAD] Sketch Constraints [Video] — MangoJelly Solutions: Sketcher constraints (horizontal, vertical, equal, symmetric, dimension); students practice constraining a simple profile until it turns green (fully constrained)
7. [FreeCAD] First Pad (Extrude) [Exercise] — students select their constrained sketch and use Pad to extrude it 15mm; this is the same as `extrudeLinear({ height: 15 }, rectangle())` in JSCAD; change the height and observe the update
8. [FreeCAD] Pocket (Subtract) [Exercise] — students draw a circle on the top face of their padded box, then use Pocket to cut it through; this is the same as `subtract(box, cylinder())` in JSCAD
9. [FreeCAD] Pad and Pocket Workflow [Video] — MangoJelly Solutions: Part Design Pad and Pocket tools; reinforces the sketch-then-extrude workflow
10. [FreeCAD] Fillet and Chamfer [Exercise] — students select edges on their box and apply Fillet (round edges) and Chamfer (angled edges); this is similar to using `roundedCuboid` in JSCAD but applied to specific edges only
11. [FreeCAD] Fillet and Chamfer Tools [Video] — MangoJelly Solutions: Fillet and Chamfer in Part Design; students experiment with different radii and see how dress-up features modify the solid
12. [FreeCAD] Boolean Combine Bodies [Exercise] — students create two separate bodies (a box and a cylinder), then use the Boolean tool to union, subtract, or intersect them; compare to `booleans.union()`, `booleans.subtract()`, `booleans.intersect()` in JSCAD
13. [FreeCAD] Linear and Polar Patterns [Video] — MangoJelly Solutions: Linear Pattern and Polar Pattern transformation tools; students see how one feature can be repeated in a row or around a center
14. [FreeCAD] Pattern a Hole [Exercise] — students create one pocket hole, then use Linear Pattern to repeat it in a row of 4 and Polar Pattern to repeat it in a ring of 6; compare to loop-generated geometry in JSCAD from 2.2.2
15. [FreeCAD] Recreate a JSCAD Model [Challenge] — students pick a model they built in JSCAD (e.g., the parametric box with holes from 2.2.1, or the bracket from 2.3.2) and recreate it in FreeCAD using Sketcher + Pad + Pocket; write a short comparison of the two workflows

---

# Activity Counts

| Quarter | Unit | Subsection | Activities | Time |
|---------|------|-----------|------------|------|
| Q2 | 2.1 JSCAD Foundations | 2.1.1 Libraries/JSCAD Intro | 10 | ~3.5 hrs |
| Q2 | 2.1 JSCAD Foundations | 2.1.2 2D Shapes/Transforms | 12 | ~3.5 hrs |
| Q2 | 2.1 JSCAD Foundations | 2.1.3 Boolean Ops 2D | 11 | ~3.5 hrs |
| Q2 | 2.2 Parametric Design | 2.2.1 Parameters | 12 | ~3.5 hrs |
| Q2 | 2.2 Parametric Design | 2.2.2 Arrays/Loops Geometry | 12 | ~3.5 hrs |
| Q2 | 2.3 3D Modeling | 2.3.1 First Extrusion | 13 | ~3.5 hrs |
| Q2 | 2.3 3D Modeling | 2.3.2 3D Primitives/Transforms | 13 | ~3.5 hrs |
| Q2 | 2.5 Synthesis | 2.5.1 Q2 Review/Project | 10 | ~3.5 hrs |
| Q3 | 3.1 Architecture | 3.1.1 Multi-File/I/O | 10 | ~3.5 hrs |
| Q3 | 3.2 Advanced JSCAD | 3.2.1 Hulls/Extrusions | 13 | ~3.5 hrs |
| Q3 | 3.2 Advanced JSCAD | 3.2.2 Measurements/Printability | 12 | ~3.5 hrs |
| Q3 | 3.4 Presentation | 3.4.1 Colors/Text/Export | 13 | ~3.5 hrs |
| Q4 | 4.1 FreeCAD Bridge | 4.1.1 FreeCAD Interface/Part Design | 15 | ~3.5 hrs |
| | | **Total** | **156** | |
