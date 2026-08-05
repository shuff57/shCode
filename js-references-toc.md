# Open-Source JavaScript References — Full Table of Contents

Three open, free-to-read book references support the CSCI 4 plan, plus four project/engine references:

- **JS1** — *The Modern JavaScript Tutorial* (Source 1): JS-native syntax + examples
- **JS2** — *Eloquent JavaScript* (Source 2): narrative prose + project chapters
- **PY** — *Introduction to Python Programming* (Source 5): the **structural model** —
  sets the Q1 chapter sequence; Python syntax is translated to JS

Four project references round out the source set:

- **freeCodeCamp** (Source 6): the interactive platform driving Q1 activities
- **shplay** (Source 3, bundled in-repo, browser docs): the game-dev engine (Q2)
- **JSCAD** (Source 4, CDN-loaded API docs + monorepo): the 3D-modeling library (Q3–Q4)
- **jscadui / jscad.app** (Source 7): the browser UI students actually use for JSCAD (Q3–Q4)

Engine dependencies cited from the shplay stack: **q5.js** (bundled in-repo, LGPL-3.0) and
**Box2D v3 WASM** (bundled in-repo, Box2D MIT) — see the note inside Source 3.

---

## Source 1 — The Modern JavaScript Tutorial
**URL:** https://javascript.info/  ·  **Author:** Ilya Kantor  ·  **License:** Open source (CC-BY-SA), free online

### Part 1: The JavaScript language

**An introduction**
- An Introduction to JavaScript · Manuals and specifications · Code editors · Developer console

**JavaScript Fundamentals**
- Hello, world! · Code structure · The modern mode, "use strict" · Variables
- Data types · Interaction: alert, prompt, confirm · Type Conversions · Basic operators, maths
- Comparisons · Conditional branching: if, '?' · Logical operators · Nullish coalescing operator '??'
- Loops: while and for · The "switch" statement · Functions · Function expressions
- Arrow functions, the basics · JavaScript specials

**Code quality**
- Debugging in the browser · Coding Style · Comments · Ninja code
- Automated testing with Mocha · Polyfills and transpilers

**Objects: the basics**
- Objects · Object references and copying · Garbage collection
- Object methods, "this" · Constructor, operator "new" · Optional chaining '?.'
- Symbol type · Object to primitive conversion

**Data types**
- Methods of primitives · Numbers · Strings · Arrays · Array methods · Iterables
- Map and Set · WeakMap and WeakSet · Object.keys, values, entries
- Destructuring assignment · Date and time · JSON methods, toJSON

**Advanced working with functions**
- Recursion and stack · Rest parameters and spread syntax · Variable scope, closure
- The old "var" · Global object · Function object, NFE · The "new Function" syntax
- Scheduling: setTimeout and setInterval · Decorators and forwarding, call/apply
- Function binding · Arrow functions revisited

**Object properties configuration**
- Property flags and descriptors · Property getters and setters

**Prototypes, inheritance**
- Prototypal inheritance · F.prototype · Native prototypes · Prototype methods, objects without \_\_proto\_\_

**Classes**
- Class basic syntax · Class inheritance · Static properties and methods
- Private and protected properties and methods · Extending built-in classes
- Class checking: "instanceof" · Mixins

**Error handling**
- Error handling, "try...catch" · Custom errors, extending Error

**Promises, async/await**
- Introduction: callbacks · Promise · Promises chaining · Error handling with promises
- Promise API · Promisification · Microtasks · Async/await

**Generators, advanced iteration**
- Generators · Async iteration and generators

**Modules**
- Modules, introduction · Export and Import · Dynamic imports

**Miscellaneous**
- Proxy and Reflect · Eval: run a code string · Currying · Reference Type
- BigInt · Unicode, String internals · WeakRef and FinalizationRegistry

### Part 2: Browser — Document, Events, Interfaces

**Document**
- Browser environment, specs · DOM tree · Walking the DOM
- Searching: getElement\*, querySelector\* · Node properties: type, tag and contents
- Attributes and properties · Modifying the document · Styles and classes
- Element size and scrolling · Window sizes and scrolling · Coordinates

**Introduction to Events**
- Introduction to browser events · Bubbling and capturing · Event delegation
- Browser default actions · Dispatching custom events

**UI Events**
- Mouse events · Moving the mouse: mouseover/out, mouseenter/leave
- Drag'n'Drop with mouse events · Pointer events · Keyboard: keydown and keyup · Scrolling

**Forms, controls**
- Form properties and methods · Focusing: focus/blur
- Events: change, input, cut, copy, paste · Forms: event and method submit

**Document and resource loading**
- Page: DOMContentLoaded, load, beforeunload, unload · Scripts: async, defer
- Resource loading: onload and onerror

**Miscellaneous**
- Mutation observer · Selection and Range · Event loop: microtasks and macrotasks

### Part 3: Additional articles

**Frames and windows**
- Popups and window methods · Cross-window communication · The clickjacking attack

**Binary data, files** ⚠️ *FILE I/O*
- ArrayBuffer, binary arrays · TextDecoder and TextEncoder · Blob · **File and FileReader**

**Network requests**
- Fetch · FormData · Fetch: Download progress · Fetch: Abort
- Fetch: Cross-Origin Requests · Fetch API · URL objects · XMLHttpRequest
- Resumable file upload · Long polling · WebSocket · Server Sent Events

**Storing data in the browser** ⚠️ *FILE I/O*
- Cookies, document.cookie · **LocalStorage, sessionStorage** · IndexedDB

**Animation**
- Bezier curve · CSS-animations · JavaScript animations

**Web components**
- From the orbital height · Custom elements · Shadow DOM · Template element
- Shadow DOM slots, composition · Shadow DOM styling · Shadow DOM and events

**Regular expressions**
- Patterns and flags · Character classes · Unicode: flag "u" and class \\p{...}
- Anchors · Multiline mode · Word boundary · Escaping · Sets and ranges
- Quantifiers · Greedy and lazy · Capturing groups · Backreferences
- Alternation (OR) · Lookahead and lookbehind · Catastrophic backtracking
- Sticky flag "y" · Methods of RegExp and String

---

## Source 2 — Eloquent JavaScript
**URL:** https://eloquentjavascript.net/  ·  **Author:** Marijn Haverbeke  ·  **License:** CC-BY-NC (code MIT), free online + PDF/EPUB

### Part 1: Language

**Introduction** — On programming · Why language matters · What is JavaScript? · Code, and what to do with it · Overview of this book · Typographic conventions

**Ch 1 — Values, Types, and Operators**
- Values · Numbers (Arithmetic; Special numbers) · Strings · Unary operators
- Boolean values (Comparison; Logical operators) · Empty values
- Automatic type conversion (Short-circuiting of logical operators) · Summary

**Ch 2 — Program Structure**
- Expressions and statements · Bindings · Binding names · The environment · Functions
- The console.log function · Return values · Control flow · Conditional execution
- while and do loops · Indenting Code · for loops · Breaking Out of a Loop
- Updating bindings succinctly · Dispatching on a value with switch · Capitalization · Comments · Summary
- *Exercises:* Looping a triangle · FizzBuzz · Chessboard

**Ch 3 — Functions**
- Defining a function · Bindings and scopes · Nested scope · Functions as values
- Declaration notation · Arrow functions · The call stack · Optional Arguments · Closure
- Recursion · Growing functions · Functions and side effects · Summary
- *Exercises:* Minimum · Recursion · Bean counting

**Ch 4 — Data Structures: Objects and Arrays**
- The weresquirrel · Datasets · Properties · Methods · Objects · Mutability
- The lycanthrope's log · Computing correlation · Array loops · The final analysis
- Further arrayology · Strings and their properties · Rest parameters · The Math object
- Destructuring · Optional property access · **JSON** · Summary
- *Exercises:* The sum of a range · Reversing an array · A list · Deep comparison

**Ch 5 — Higher-order Functions**
- Abstraction · Abstracting repetition · Higher-order functions · Script dataset
- Filtering arrays · Transforming with map · Summarizing with reduce · Composability
- Strings and character codes · Recognizing text · Summary
- *Exercises:* Flattening · Your own loop · Everything · Dominant writing direction

**Ch 6 — The Secret Life of Objects**
- Abstract Data Types · Methods · Prototypes · Classes · Private Properties
- Overriding derived properties · Maps · Polymorphism · Getters, setters, and statics
- Symbols · The iterator interface · Inheritance · The instanceof operator · Summary
- *Exercises:* A vector type · Groups · Iterable groups

**Ch 7 — Project: A Robot**
- Meadowfield · The task · Persistent data · Simulation · The mail truck's route · Pathfinding
- *Exercises:* Measuring a robot · Robot efficiency · Persistent group

**Ch 8 — Bugs and Errors**
- Language · Strict mode · Types · Testing · Debugging · Error propagation
- Exceptions · Cleaning up after exceptions · Selective catching · Assertions · Summary
- *Exercises:* Retry · The locked box

**Ch 9 — Regular Expressions**
- Creating a regular expression · Testing for matches · Sets of characters · International characters
- Repeating parts of a pattern · Grouping subexpressions · Matches and groups · The Date class
- Boundaries and look-ahead · Choice patterns · The mechanics of matching · Backtracking
- The replace method · Greed · Dynamically creating RegExp objects · The search method
- The lastIndex property · Parsing an INI file · Code units and characters · Summary
- *Exercises:* Regexp golf · Quoting style · Numbers again

**Ch 10 — Modules**
- Modular programs · **ES modules** · Packages · **CommonJS modules** · Building and bundling · Module design · Summary
- *Exercises:* A modular robot · Roads module · Circular dependencies

**Ch 11 — Asynchronous Programming**
- Asynchronicity · **Callbacks** · **Promises** · Failure · Carla · Breaking In · **Async functions**
- Generators · A Corvid Art Project · The event loop · Asynchronous bugs · Summary
- *Exercises:* Quiet Times · Real Promises · Building Promise.all

**Ch 12 — Project: A Programming Language**
- Parsing · The evaluator · Special forms · The environment · Functions · Compilation · Cheating
- *Exercises:* Arrays · Closure · Comments · Fixing scope

### Part 2: Browser

**Ch 13 — JavaScript and the Browser**
- Networks and the Internet · The Web · HTML · HTML and JavaScript · In the sandbox · Compatibility and the browser wars

**Ch 14 — The Document Object Model**
- Document structure · Trees · The standard · Moving through the tree · Finding elements
- Changing the document · Creating nodes · Attributes · Layout · Styling · Cascading styles
- Query selectors · Positioning and animating · Summary
- *Exercises:* Build a table · Elements by tag name · The cat's hat

**Ch 15 — Handling Events**
- Event handlers · Events and DOM nodes · Event objects · Propagation · Default actions · Key events
- Pointer events (Mouse clicks; Mouse motion; Touch events) · Scroll events · Focus events · Load event
- Events and the event loop · Timers · Debouncing · Summary
- *Exercises:* Balloon · Mouse trail · Tabs

**Ch 16 — Project: A Platform Game**
- The game · The technology · Levels · Reading a level · Actors · Drawing
- Motion and collision · Actor updates · Tracking keys · Running the game
- *Exercises:* Game over · Pausing the game · A monster

**Ch 17 — Drawing on Canvas**
- SVG · The canvas element · Lines and surfaces · Paths · Curves · Drawing a pie chart · Text
- Images · Transformation · Storing and clearing transformations · Back to the game
- Choosing a graphics interface · Summary
- *Exercises:* Shapes · The pie chart · A bouncing ball · Precomputed mirroring

**Ch 18 — HTTP and Forms** ⚠️ *FILE I/O*
- The protocol · Browsers and HTTP · **Fetch** · HTTP sandboxing · Appreciating HTTP · Security and HTTPS
- Form fields · Focus · Disabled fields · The form as a whole · Text fields
- Checkboxes and radio buttons · Select fields · **File fields** · **Storing data client-side** · Summary
- *Exercises:* Content negotiation · A JavaScript workbench · Conway's Game of Life

**Ch 19 — Project: A Pixel Art Editor**
- Components · The state · DOM building · The canvas · The application · Drawing tools
- **Saving and loading** · Undo history · Let's draw · Why is this so hard?
- *Exercises:* Keyboard bindings · Efficient drawing · Circles · Proper lines

### Part 3: Node

**Ch 20 — Node.js** ⚠️ *FILE I/O*
- Background · The node command · Modules · Installing with NPM (Package files; Versions)
- **The filesystem module** · The HTTP module · Streams · A file server · Summary
- *Exercises:* Search tool · Directory creation · A public space on the web

**Ch 21 — Project: Skill-Sharing Website**
- Design · Long polling · HTTP interface · The server (Routing; Serving files; Talks as resources; Long polling support)
- The client (HTML; Actions; Rendering components; Polling; The application)
- *Exercises:* Disk persistence · Comment field resets

---

## Source 3 — shplay (in-repo engine + GitHub project + hosted docs)
**In-repo:** `public/shplay/` (v4.0.1)  ·  **GitHub:** https://github.com/shplay/shplay  ·  **Author:** Quinton Ashley  ·  **License:** shplay Creator License — **CS education requires the [shplay Educational License](https://shplay.org/teach)** (`public/shplay/docs/LICENSE.md` §1d expressly forbids CS-teaching use under the Creator License alone)

No internet required for the bundled engine — built on q5.js WebGPU + Box2D v3 WASM, ships fully offline.

### In-repo files (`public/shplay/`)

| File | Covers |
|---|---|
| `public/shplay/docs/shplay.d.ts` | Full public API (hand-authored types). Anchor notation: `shplay → shplay.d.ts → <ClassName>` |
| `public/shplay/docs/README.md` | Project overview, credits, license links |
| `public/shplay/docs/challenges.md` | Bundled challenge briefs (distinct numbering from the in-app "Learn shplay" lesson numbers cited in curriculum-plan.md activities, e.g. `5.1.2`) |
| `public/shplay/docs/LICENSE.md` | shplay Creator License — full text, incl. the CS-education restriction above |
| `public/shplay/docs/CLAUDE.md` | Engine architecture notes (lifecycle hooks, class map) — dev reference, not student-facing |

### GitHub repo (canonical)

**Repo:** https://github.com/shplay/shplay · branch `main` — **no `docs/` folder on `main`**; the engine source and types ship alone:

- `shplay.js` — the entire engine (~8k lines, hand-authored, no build step). Reference source for any behavior the docs don't spell out.
- `shplay.d.ts` — hand-authored public API types (source of the in-repo copy above).
- `LICENSE.md` — the Creator License (see header).
- Wiki: https://github.com/shplay/shplay/wiki — 3 pages (Home, Get Started, What's new in shplay?) — setup + v4 changelog, not a citation target for lessons.

### shplay.org hosted docs (external, online) — open sources only

> **Learn shplay textbook** (https://shplay.org/learn/) is **NOT used as a course reference**: it is
> Creator-Licensed for personal learning/evaluation only (`LICENSE.md` §3) and **classroom or textbook
> use requires the paid shplay Educational License** (§1d forbids CS-teaching use under the Creator
> License). The `5.1.2`-style lesson numbers cited in `curriculum-plan.md` activities refer to the
> **in-app** shplay lessons (built in-repo from the public `shplay.d.ts` API), not to this external textbook.

- **API reference** — https://shplay.org/docs/ — TypeDoc build (3 modules, 31 classes, 465 pages). Class pages map 1:1 to the `.d.ts` anchors below (e.g. `classes/shplay.Sprite.html` ↔ `Sprite` L227). Server-rendered; the in-app `/docs/shplay` pages are derived from the same public API surface, not scraped from the Learn site.
- **q5.js learn pages** — https://q5js.org/learn/ — **open (LGPL-3.0)** interactive reference for the graphics layer shplay sits on: canvas, `setup()`/`draw()`, shapes, color, text, input. Use for any drawing/rendering concept the engine docs don't spell out. Does **not** cover the physics/sprite/Group/joints layer — those are shplay additions covered by the in-app docs below.

### shplay.d.ts class anchors
- **Engine state:** `shplay` (L4)
- **Drawables:** `Visual` (L129) → `Sprite` (L227)
- **Animation:** `Ani` (L1063) · `Anis` (L1226)
- **Collections:** `Visuals` (L1259) → `Group` (L1323)
- **Physics:** `World` (L1796)
- **Camera:** `Camera` (L1944)
- **Joints:** `Joint` (L2014) → `GlueJoint` (L2123) · `DistanceJoint` (L2137) · `WheelJoint` (L2229) · `HingeJoint` (L2331) · `SliderJoint` (L2369) · `GrabberJoint` (L2421)
- **Input:** `InputDevice` (L2475) → `_Mouse` (L2521) · `_Pointer` (L2605) · `_Keyboard` (L2668) · `Contro` (L2693)

Persistent storage (`storeItem`/`getItem`/`removeItem`/`clearStorage`) and `loadJSON`/`save` are q5.js core functions (bundled in `public/shplay/q5.js`), not part of `shplay.d.ts` — cite javascript.info's LocalStorage/JSON sections for those instead (see Source 1).

### In-app docs surface (student-facing anchor target)

The app renders a student-facing shplay reference at `/docs/shplay` (built from `lib/shplay-docs.ts`).
Anchor notation for reading rows: `shplay → <Section> → <Page title>`. All anchors below are verified against the current in-app sections.

| Section (slug) | Page titles (anchor targets) |
|---|---|
| `overview` | What is shplay? · The sketch lifecycle · Global mode · Debugging your sketch |
| `canvas` | Creating the canvas · frameCount and frameRate · Background and clearing |
| `sprite` | Your first sprite · Collider types: dynamic, static, kinematic, none · Position, rotation, scale · Color, visibility, and layer · Shape options · Removing and cleaning up sprites · Pass through contacts · Advanced movement helpers · Chain colliders · Polygon colliders · Adding colliders · Adding sensors · Custom update per sprite · Custom draw per sprite · Awaiting animation sequences |
| `physics` | Gravity and velocity · Mass and density · Bounciness and friction · Drag and damping · Forces, torque, and rotation |
| `world` | World settings · Contact callbacks · Sleeping sprites · Controlling time · Performance testing · Finding sprites at a point · Ray casting · Meter size · Explosions |
| `collisions` | colliding vs overlapping · Collision callbacks · Collisions with groups |
| `groups` | Spawning and defaults · Iterating and removing · Filtering and searching · Arrow function property setters · Indexed arrow setters · Tiles · Custom properties · Sub groups · The allSprites group · Culling · Group lifecycle |
| `camera` | Following a target · Zoom · Screen space vs world space |
| `input` | Keyboard basics · Multi-key movement · Mouse position and buttons · Dragging and clicks · Touch and pointer · Gamepad (Contro) · Grab sprites with the mouse |
| `joints` | GlueJoint · DistanceJoint · WheelJoint · HingeJoint · SliderJoint · GrabberJoint |
| `animation` | Procedural animation · Ani (sprite-sheet frames) · Anis (named animation sets) · Groups with animations · Cut frames · Animation sequencing · Visuals (no physics) |
| `images` | Loading images · Emoji images and texture atlases |
| `drawing` | Shapes and primitives · Colors and palettes |
| `text` | Displaying text |
| `patterns` | Top-down movement · Platformer jump · Projectiles from a player · Score and timer HUD · Scene/state switching |

For engine internals (dev-facing, not student-facing), use the `shplay.d.ts` class anchors above.

### Engine dependency stack (bundled in-repo)

shplay is not a standalone runtime — it sits on three lower layers, all bundled in `public/shplay/`:

| Layer | Repo / site | In-repo artifact | License | When to cite |
|---|---|---|---|---|
| **q5.js** (graphics) | https://github.com/q5js/q5.js · https://q5js.org | `q5.js` (v4.5) | LGPL-3.0 | Any non-physics drawing: `background`, `text`, `frameCount`, `lerp` — the q5 learn pages + wiki cover them; p5.js docs apply ~1:1 (q5 is a p5-compatible fork) |
| **Box2D v3 WASM** (physics) | https://github.com/Birch-san/box2d3-wasm | `Box2D.deluxe.wasm` + `Box2D.deluxe.mjs` | MIT (Box2D itself, Erin Catto) | W11+ physics feel — `bounciness`/`friction`/`gravity` are Box2D concepts; upstream docs at https://box2d.org/documentation/ (advanced only) |
| **p5.js** (parent project) | https://github.com/processing/p5.js · https://p5js.org | — (not bundled) | LGPL-2 | Background only — q5 is a drop-in-compatible fork, so p5 references (`https://p5js.org/reference`, The Coding Train) apply almost 1:1 |

---

## Source 4 — JSCAD (GitHub monorepo + hosted API docs)
**GitHub:** https://github.com/jscad/OpenJSCAD.org  ·  **API docs:** https://openjscad.xyz/docs/  ·  **Package:** `@jscad/modeling@2.13.0` (+ `@jscad/regl-renderer@2.6.15` for the viewport) via unpkg  ·  **License:** MIT

Not vendored — loaded at runtime from unpkg, so JSCAD lessons need internet (unlike shplay). Anchor notation: `JSCAD → <module> → <fn>`, with a per-function fragment link of the form `<module docs page>#.<fn>` (verified against the generated jsdoc). E.g. `JSCAD → primitives → cube` → `https://openjscad.xyz/docs/module-modeling_primitives.html#.cube`.

### GitHub repo (canonical) — the source behind every anchor

**Repo:** https://github.com/jscad/OpenJSCAD.org · Lerna-Lite monorepo, branch `master`. The hosted API docs are **generated from this source** (`jsdoc.json` → `source.include: packages/modeling/src/**` + array-utils + select IO → docdash → `openjscad.xyz/docs/`). Every function anchor resolves to a real file:

- `packages/modeling/src/` — `@jscad/modeling` source. `src/primitives/cuboid.js` → docs `#.cuboid` (via `@alias module:modeling/primitives.cuboid`). Students can read the implementation behind any API page. Subfolders mirror the doc modules: `primitives/`, `operations/{transforms,booleans,extrusions,hulls}`, `measurements/`, `colors/`, `text/`.
- `packages/utils/regl-renderer/` — `@jscad/regl-renderer` (viewport/display, W19 UI).
- `packages/io/` — serializers/deserializers (STL, 3MF, AMF, OBJ, JSON, DXF, SVG, X3D). **STL/OBJ/JSON/DXF are source-only** — not in the JSDoc build; export-format lessons should cite the User Guide (`en:user_guide_formats`) for those.
- `jsdoc/tutorials/` — the 5 hosted tutorials as markdown: Getting Started · Modeling Basics · **Using Parameters** · Multi-File Projects · Importing Files (→ `tutorial-0X_*.html` on openjscad.xyz).
- `packages/web/` — browser app (editor + viewport); `README.md` + `demo.html` show self-host UI usage.
- Wiki: https://github.com/jscad/OpenJSCAD.org/wiki — Reporting Issues + release notes; **not** a citation target for lessons.

### Hosted doc surfaces (openjscad.xyz)

| Surface | URL | Covers |
|---|---|---|
| API Reference | https://openjscad.xyz/docs/ | JSDoc of `@jscad/modeling` (+ array-utils + IO serializers) — the function anchors below |
| Tutorials | https://openjscad.xyz/docs/tutorial-01…05_*.html | Getting Started, Modeling Basics, **Using Parameters**, Multi-File Projects, Importing Files |
| User Guide (DokuWiki) | https://openjscad.xyz/dokuwiki/ | Community-maintained: Quick Reference, User Guide, Design Guides, `en:user_guide_formats` (export formats), browser usage |

### Function anchors (verified against the generated jsdoc)

| Module | Function anchors (verified) | Used for |
|---|---|---|
| `modeling/primitives` | `rectangle` · `circle` · `ellipse` · `polygon` · `star` · `cube` · `cuboid` · `sphere` · `cylinder` · `torus` | 2D/3D shapes (W20, W25) |
| `modeling/transforms` | `translate` · `rotate` · `rotateX/Y/Z` · `scale` · `scaleX/Y/Z` · `mirror` · `center` | position/rotation/scale (W20, W25) |
| `modeling/booleans` | `union` · `subtract` · `intersect` | combine/cut/overlap (W21, W25) |
| `modeling/extrusions` | `extrudeLinear` · `extrudeRotate` · `extrudeHelical` · `extrudeFromSlices` | 2D→3D (W24, W28) |
| `modeling/hulls` | `hull` · `hullChain` | organic forms (W28) |
| `modeling/measurements` | `measureVolume` · `measureBoundingBox` · `measureDimensions` · `measureArea` · `measureCenter` · `measureAggregateBoundingBox` | query geometry (W29) |
| `modeling/colors` | `colorize` (named colors, RGB, hex) | color geometry (W32) |
| `modeling/text` | `vectorChar` · `vectorText` | 3D text (W32) |
| Parametric tutorial | https://openjscad.xyz/docs/tutorial-03_usingParameters.html | `getParameterDefinitions()`, `main(params)`, parameter types — **the** anchor for W19/W22 |

> **Note:** the wiki *Quick Reference* page (`en:jscad_quick_reference`) covers primitives/transforms/booleans/hulls/extrusions/text/colors as a cheat sheet but **does not** cover `getParameterDefinitions()` — use the tutorial link above for parametric lessons. Also note the wiki's API hrefs are stale; the function links above are the verified doc anchors.

---

## Source 5 — Introduction to Python Programming (OpenStax) — structural model
**URL:** https://openstax.org/details/books/introduction-python-programming  ·  **Authors:** Das, Lawson, Mayfield, Norouzi  ·  **License:** CC BY-NC-SA  ·  **Published:** Mar 2024 (live web edition)

**Role in CSCI 4:** structural model for the **Q1 console sequence** — Python syntax is
translated to JS (`print()`→`console.log`, `def`→`function`/arrow, `list`→array,
`dict`→object). SLO/topic coverage is language-agnostic; the *Introduction to Python
Programming* book sets the Q1 chapter sequence and is cited only for structure, not syntax.

| PY Ch | Title | Maps to (CSCI 4) |
|---|---|---|
| 1 | Statements | W1–3 Foundations (1.1) — incl. dedicated "Error messages" section (1.6) |
| 2 | Expressions | W2–3 operators/types (1.1.2) |
| 3 | Objects | W2 variables (object/ref preview) — value-first ordering retained |
| 4 | Decisions | W4 Conditionals (1.2.1) |
| 5 | Loops | W5 Algorithms + Loops (1.2.2) — incl. `do...while` |
| 6 | Functions | W6 Functions (1.3.1) |
| 7 | Modules | W19 JSCAD libraries — deferred |
| 8 | Strings | W2–3 string methods |
| 9 | Lists | W8 Arrays (1.3.3) — incl. multiple-subscripted (9.4 Nested lists) |
| 10 | Dictionaries | — **Excluded** (not in CSCI 4 outline/SLOs) |
| 11 | Classes | W12 OOP (shplay) — borrow framing only |
| 12 | Recursion | W30 optional enrichment — not assessed |
| 13 | Inheritance | W12 — named, not required |
| 14 | Files | W8 File I/O, W16 shplay save, W31 JSCAD multi-file — concept adopted; browser FileReader replaces Python `open()` |
| 15 | Data Science | — **Excluded** (belongs to Principles of Data Science) |

### Section anchors (verified from the published chapter outlines)

| Ch | Sections (anchor targets) |
|---|---|
| 1 Statements | 1.1 Background · 1.2 Input/output · 1.3 Variables · 1.4 String basics · 1.5 Number basics · 1.6 Error messages · 1.7 Comments · 1.8 Why Python? · 1.9 Chapter summary |
| 2 Expressions | 2.1 The Python shell · 2.2 Type conversion · 2.3 Mixed data types · 2.4 Floating-point errors · 2.5 Dividing integers · 2.6 The math module · 2.7 Formatting code · 2.8 Python careers · 2.9 Chapter summary |
| 3 Objects | 3.1 Strings revisited · 3.2 Formatted strings · 3.3 Variables revisited · 3.4 List basics · 3.5 Tuple basics · 3.6 Chapter summary |
| 4 Decisions | 4.1 Boolean values · 4.2 If-else statements · 4.3 Boolean operations · 4.4 Operator precedence · 4.5 Chained decisions · 4.6 Nested decisions · 4.7 Conditional expressions · 4.8 Chapter summary |
| 5 Loops | 5.1 While loop · 5.2 For loop · 5.3 Nested loops · 5.4 Break and continue · 5.5 Loop else · 5.6 Chapter summary |
| 6 Functions | 6.1 Defining functions · 6.2 Control flow · 6.3 Variable scope · 6.4 Parameters · 6.5 Return values · 6.6 Keyword arguments · 6.7 Chapter summary |
| 7 Modules | 7.1 Module basics · 7.2 Importing names · 7.3 Top-level code · 7.4 The help function · 7.5 Finding modules · 7.6 Chapter summary |
| 8 Strings | 8.1 String operations · 8.2 String slicing · 8.3 Searching/testing strings · 8.4 String formatting · 8.5 Splitting/joining strings · 8.6 Chapter summary |
| 9 Lists | 9.1 Modifying and iterating lists · 9.2 Sorting and reversing lists · 9.3 Common list operations · 9.4 Nested lists · 9.5 List comprehensions · 9.6 Chapter summary |
| 10 Dictionaries | 10.1 Dictionary basics · 10.2 Dictionary creation · 10.3 Dictionary operations · 10.4 Conditionals and looping in dictionaries · 10.5 Nested dictionaries · 10.6 Chapter summary |
| 11 Classes | 11.1 OOP basics · 11.2 Classes and instances · 11.3 Instance methods · 11.4 Overloading operators · 11.5 Using modules with classes · 11.6 Chapter summary |
| 12 Recursion | 12.1 Recursion basics · 12.2 Simple math recursion · 12.3 Recursion with strings and lists · 12.4 More math recursion · 12.5 Using recursion to solve problems · 12.6 Chapter summary |
| 13 Inheritance | 13.1 Inheritance basics · 13.2 Attribute access · 13.3 Methods · 13.4 Hierarchical inheritance · 13.5 Multiple inheritance and mixin classes · 13.6 Chapter summary |
| 14 Files | 14.1 Reading from files · 14.2 Writing to files · 14.3 Files in different locations + CSV · 14.4 Handling exceptions · 14.5 Raising exceptions · 14.6 Chapter summary |
| 15 Data Science | 15.1 Introduction to data science · 15.2 NumPy · 15.3 Pandas · 15.4 Exploratory data analysis · 15.5 Data visualization · 15.6 Summary |

Anchor notation: `PY → Ch N → Section` (e.g. `PY → Ch 1 → 1.2 Input/output`). Section titles were
verified from each chapter's official outline page; chapter titles from internal cross-references.

---

## Source 6 — freeCodeCamp JavaScript (content platform driving Q1)
**freeCodeCamp:** https://www.freecodecamp.org/learn/full-stack-developer/ → "JavaScript" certification (free, no login)

The interactive platform supplying the **Q1 video/exercise activity layer** (W1–9) plus a few Q2/Q3 JS-content weeks. Three artifacts govern how it's cited:

- **`curriculum-alignment-guide.md`** — the original week-by-week freeCodeCamp lesson mapping (W1–9, W17, W22–24), incl. the AP CSP non-coding integration analysis and gap analysis. Anchor notation: `ALIGN → Week N → <section> <title>`.
- **`curriculum-data/master-activity-list.md`** — the full per-activity list (226 freeCodeCamp activities).
- **`curriculum-data/curated-activity-list.md`** — the curated teaching order pulled into the module specs.

**Do not duplicate the per-activity or per-section lists here.**

| Platform | ID prefix | Coverage in CSCI 4 | Notes |
|---|---|---|---|
| freeCodeCamp JS v9 | module names (e.g. `Variables and Strings`) | Q1 readings + external activities; W17 Classes; W22 Algorithms | Uses Theory / Workshop / Lab tags, not `Video` |

**freeCodeCamp stops at general JS + algorithms — it does not cover q5.js, shplay, or game development** (the in-app shplay
docs are the textbook for Q2). It was chosen to teach the JS foundations that make shplay possible.

---

## Source 7 — jscadui / jscad.app (the JSCAD browser UI students use)
**GitHub:** https://github.com/hrgdavor/jscadui  ·  **Live app:** https://jscad.app/  ·  **License:** MIT

The **student-facing JSCAD environment** (Q3–Q4): editor pane + 3D viewport + parameter panel + export button,
built on `@jscad/modeling` + `@jscad/regl-renderer` (Source 4). It is an improved open-source reimplementation
of `openjscad.xyz` (runs npm imports, ES modules, TypeScript, and preserves the worker between parameter changes).

- **Live app:** https://jscad.app/ — the environment students open for every JSCAD lesson.
- **Repo:** https://github.com/hrgdavor/jscadui — `apps/jscad-web/` is the app source; `docs/` holds project notes.
- **Relationship:** `jscad.app` and `openjscad.xyz` are *two UIs over the same `@jscad/modeling` library*. The API
  anchors in Source 4 (`JSCAD → <module> → <fn>`) apply to code running in **either** app.

> **URL reconciliation:** `curriculum-plan.md` cited `https://openjscad.xyz/` as the Q3–Q4 environment; the
> activity files (`curriculum-data/jscad-freecad-activities.md`, `final-activity-list.md`) and the live practice
> use **jscad.app**. The canonical student environment is `jscad.app`; `openjscad.xyz/docs/` remains the API/docs site.

---

## File I/O Coverage Map (SLO 3 / outline topic)

**Outline requirement:** "File I/O including sequential access files" (2.50 lecture hours) — a core part of **SLO 3** (describe, design, implement, and test structured programs).

| Source | Where File I/O appears | Notes |
|---|---|---|
| javascript.info | **Binary data, files** → File and FileReader; **Storing data** → LocalStorage, sessionStorage, IndexedDB | Browser-native: read user-selected files + persist client-side |
| Eloquent JS | Ch 4 JSON; Ch 18 File fields + Storing data client-side; Ch 19 Saving and loading; **Ch 20 filesystem module** | Node's `fs` gives true sequential access (open/read/write/close) |
| OpenStax PY | Ch 14 Files (14.1 Reading · 14.2 Writing · 14.3 CSV) | Structural model — Python `open()`/`read()`/`write()` translated to the browser FileReader/Blob flow |

### Recommended curriculum touch points (JS-native)
- **W8 (Arrays + File I/O):** javascript.info *File and FileReader* + *Blob* + Eloquent Ch 18 *File fields* — read a `.txt` line-by-line via `FileReader.readAsText()` + `split('\n')` (A8.2), then write a new file via `Blob` + download (A8.3). Together A8.2 + A8.3 cover the full open → read → write → close sequential-access loop in browser JS.
- **W16 (shplay save/load):** javascript.info *JSON methods* + *LocalStorage* — `storeItem`/`getItem` map to `localStorage`; `save()` to Blob download.
- **W26/W27 (error handling/testing):** Eloquent Ch 8 *Bugs and Errors* + javascript.info *Error handling* + *Automated testing with Mocha*.
- **W31 (JSCAD multi-file / git):** Eloquent Ch 10 *Modules* (ES + CommonJS) — mirrors JSCAD's `require`/`include` system.

### The browser constraint (honest note)
True sequential-access file writes (`open → write → close`) are **not possible in browser JS** the way they are in C++/Python. The outline's sequential-access example ("opens a text file and searches for and counts occurrences") is fully achievable: **reading** via FileReader (A8.2) and **writing** a new file via `Blob` + download (A8.3), with the round-trip proving both directions. The one real difference: browser JS has no explicit `close()` call — the download completing *is* the close, and the write targets a new file rather than modifying the original in place. Node's `fs` module (Eloquent Ch 20) demonstrates the true C-style sequential-access model but runs outside the browser environment the course uses.
