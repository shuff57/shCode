# Open-Source JavaScript References — Full Table of Contents

Three open, free-to-read book references support the CSCI 4 plan, plus four project/engine references:

- **JS1** — *The Modern JavaScript Tutorial* (Source 1): JS-native syntax + examples
- **JS2** — *Eloquent JavaScript* (Source 2): narrative prose + project chapters
- **PY** — *Introduction to Python Programming* (Source 5): the **structural model** —
  sets the Q1 chapter sequence; Python syntax is translated to JS

Four project references round out the source set:

- **freeCodeCamp** (Source 6): the interactive platform driving Q1 activities
- **moSHion** (Source 3, bundled in-repo, browser docs): the game-dev engine (Q2)
- **JSCAD** (Source 4, CDN-loaded API docs + monorepo): the 3D-modeling library (Q3–Q4)
- **jscadui / jscad.app** (Source 7): the browser UI students actually use for JSCAD (Q3–Q4)

Engine dependencies cited from the moSHion stack: **q5.js** (bundled in-repo, LGPL-3.0) and
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

## Source 3 — moSHion (in-repo engine + in-app docs)
**In-repo:** `public/moshion/`  ·  **License:** MIT (original facade) + MIT (vendored planck.js). moSHion is an original engine **inspired by q5play**; it contains no q5play code. See `public/moshion/docs/LICENSE.md` §4 for the unresolved status of `assets/`

No internet required — the engine and physics (planck.js, a pure-JS Box2D port) ship fully offline in `public/moshion/`.

### In-repo files (`public/moshion/`)

| File | Covers |
|---|---|
| `public/moshion/moshion.js` | The entire engine (~800 lines, hand-authored, no build step). Reference source for any behavior the docs don't spell out |
| `public/moshion/planck.min.js` | planck.js v1.5.0 (Box2D port, MIT) — the physics backend |
| `public/moshion/runner.html` | Sandbox host: loads planck + moSHion, injects a sketch from `?code=<base64url>` |
| `public/moshion/docs/moshion.d.ts` | Full public API (hand-authored types). Anchor notation: `moshion → moshion.d.ts → <ClassName>` |
| `public/moshion/docs/README.md` | Project overview, runtime layout, credits |
| `public/moshion/docs/challenges.md` | Bundled challenge briefs (15-challenge ladder) |
| `public/moshion/docs/LICENSE.md` | MIT for the facade; MIT (upstream) for planck.js; credit to q5play as the inspiration; `assets/` unresolved |
| `public/moshion/docs/CLAUDE.md` | Engine architecture notes (lifecycle, class map, unit invariants) — dev reference, not student-facing |
| `public/moshion/docs/index.html` | Docs index page (open `docs/` in a browser) |

### moshion.d.ts class anchors

- **Canvas:** `Canvas` (L139)
- **Sprites:** `Sprite` (L27) — constructor dispatch `(x,y)` / `(x,y,d)` / `(x,y,w,h[,bodyType])`
- **Animation:** `Ani` (L13) · `Anis` (L21)
- **Collections:** `Group` (L68) `extends Array` — `.Sprite` factory, `newSprite`, `overlaps`
- **Physics:** `World` (L117) — `gravity`, `getSpriteAt`
- **Joints:** `Joint` (L86) → `HingeJoint` (L90) · `DistanceJoint` (L94) · `SliderJoint` (L99) · `WheelJoint` (L103) · `GrabberJoint` (L107) · `GlueJoint` (L111)
- **Input:** `Kb` (L124) · `Mouse` (L129)
- **Globals:** `world` (L145) · `camera` (L146) · `kb` (L147) · `mouse` (L148) · `allSprites` (L149) · `frameCount` (L150) · `background`/`text`/`fill`/`textSize`/`textAlign` (L152–156) · `storeItem`/`getItem`/`removeItem` (L162–164) · `start` (L166)

Persistent storage (`storeItem`/`getItem`/`removeItem`) is part of the engine facade itself (localStorage-backed) — cite javascript.info's LocalStorage sections for the underlying concept (see Source 1).

### In-app docs surface (student-facing anchor target)

The app renders a student-facing moSHion reference at `/docs/moshion` (built from `lib/moshion-docs.ts`).
Anchor notation for reading rows: `moshion → <Section> → <Page title>`. All anchors below are verified against the current in-app sections.

| Section (slug) | Page titles (anchor targets) |
|---|---|
| `overview` | What is moSHion? · The sketch lifecycle · Global mode · Debugging your sketch |
| `canvas` | Creating the canvas · frameCount · Background and clearing |
| `sprite` | Your first sprite · Collider types: dynamic, static, kinematic, none · Position, rotation, scale · Color, visibility, and layer · Shape options · Removing and cleaning up sprites · Angular velocity · Images and emoji on sprites |
| `physics` | Gravity and velocity · Bounciness and friction · Applying forces |
| `collisions` | colliding vs overlapping · Overlap callbacks · Collisions with groups |
| `groups` | Spawning and defaults · Iterating and removing · The allSprites group · Custom properties |
| `camera` | Following a target |
| `input` | Keyboard basics · Mouse position and buttons · Hit-testing with the mouse |
| `joints` | GlueJoint · DistanceJoint · HingeJoint · SliderJoint · WheelJoint · GrabberJoint |
| `animation` | Procedural animation · addAni and changeAni |
| `text` | Displaying text · HUDs that don't scroll |
| `persistence` | Saving and loading data |
| `patterns` | Top-down movement · Platformer jump · Projectiles from a player · Score and timer HUD · Scene/state switching |

For engine internals (dev-facing, not student-facing), use the `moshion.d.ts` class anchors above.

### Engine dependency stack (bundled in-repo)

moSHion is a standalone runtime on one lower layer, bundled in `public/moshion/`:

| Layer | Repo / site | In-repo artifact | License | When to cite |
|---|---|---|---|---|
| **planck.js** (physics) | https://github.com/shakiba/planck.js | `planck.min.js` (v1.5.0) | MIT (Box2D port; Box2D itself by Erin Catto) | W11+ physics feel — `bounciness`/`friction`/`gravity` are Box2D concepts; upstream docs at https://box2d.org/documentation/ (advanced only) |

The drawing layer is the engine's own 2D-canvas renderer (no q5.js). For graphics concepts the engine doesn't spell out, q5.js learn pages (https://q5js.org/learn/, LGPL-3.0) apply ~1:1 — q5 is a p5-compatible fork and moSHion's API mirrors its conventions.

---

## Source 4 — JSCAD (GitHub monorepo + hosted API docs)
**GitHub:** https://github.com/jscad/OpenJSCAD.org  ·  **API docs:** https://openjscad.xyz/docs/  ·  **Package:** `@jscad/modeling@2.13.0` (+ `@jscad/regl-renderer@2.6.15` for the viewport) via unpkg  ·  **License:** MIT

Not vendored — loaded at runtime from unpkg, so JSCAD lessons need internet (unlike moSHion). Anchor notation: `JSCAD → <module> → <fn>`, with a per-function fragment link of the form `<module docs page>#.<fn>` (verified against the generated jsdoc). E.g. `JSCAD → primitives → cube` → `https://openjscad.xyz/docs/module-modeling_primitives.html#.cube`.

### In-repo docs (`public/jscad/docs/`)

| File | Covers |
|---|---|
| `public/jscad/docs/reference.md` | Hand-authored API reference — the exact function subset the course teaches, with signatures + examples |
| `public/jscad/docs/challenges.md` | 15-challenge ladder for the JSCAD units |
| `public/jscad/docs/CLAUDE.md` | App integration notes (unpkg versions, CJS shim, preview builder) — dev reference |
| `public/jscad/docs/LICENSE.md` | MIT notes for @jscad/modeling + @jscad/regl-renderer |
| `public/jscad/docs/index.html` | Docs index page (open `docs/` in a browser) |

The app also renders a student-facing JSCAD reference at `/docs/jscad` (built from `lib/jscad-docs.ts`, with live runnable examples in the same sandbox style as `/docs/moshion`). Anchor notation for reading rows: `JSCAD → <Section> → <Page title>`.

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
| 11 | Classes | W12 OOP (moSHion) — borrow framing only |
| 12 | Recursion | W30 optional enrichment — not assessed |
| 13 | Inheritance | W12 — named, not required |
| 14 | Files | W8 File I/O, W16 moSHion save, W31 JSCAD multi-file — concept adopted; browser FileReader replaces Python `open()` |
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

**freeCodeCamp stops at general JS + algorithms — it does not cover q5.js, moSHion, or game development** (the in-app moSHion
docs are the textbook for Q2). It was chosen to teach the JS foundations that make moSHion possible.

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
- **W16 (moSHion save/load):** javascript.info *JSON methods* + *LocalStorage* — `storeItem`/`getItem` map to `localStorage`; `save()` to Blob download.
- **W26/W27 (error handling/testing):** Eloquent Ch 8 *Bugs and Errors* + javascript.info *Error handling* + *Automated testing with Mocha*.
- **W31 (JSCAD multi-file / git):** Eloquent Ch 10 *Modules* (ES + CommonJS) — mirrors JSCAD's `require`/`include` system.

### The browser constraint (honest note)
True sequential-access file writes (`open → write → close`) are **not possible in browser JS** the way they are in C++/Python. The outline's sequential-access example ("opens a text file and searches for and counts occurrences") is fully achievable: **reading** via FileReader (A8.2) and **writing** a new file via `Blob` + download (A8.3), with the round-trip proving both directions. The one real difference: browser JS has no explicit `close()` call — the download completing *is* the close, and the write targets a new file rather than modifying the original in place. Node's `fs` module (Eloquent Ch 20) demonstrates the true C-style sequential-access model but runs outside the browser environment the course uses.

---

## Curriculum Map: Chapter → Section → Subsection → Assignments → Seeded Sources

9 content chapters (1–3 Q1 · 4–5 Q2 · 6–7 Q3 · 8–9 Q4) + 4 Synthesis Projects (one per quarter). Subsection = plan section (e.g. 1.1.1); full descriptions live in `curriculum-plan.md`, dates in its Part B calendar. Anchor notation: `JS1 → <topic> → <page>` · `moshion → <section> → <page>` · `JSCAD → <module> → <fn>` · `PY → Ch N → Section` · `JS2 → Ch N` · FCC activity tags per `curriculum-alignment-guide.md`.

### Chapter 1 — Foundations (Q1)

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **1.1.1** Software Lifecycle | A1.1 (writeup) · A1.2 (console setup lab) | JS1 → An introduction → An Introduction to JavaScript · PY Ch 1 (intro framing) | FCC Variables and Strings → Introduction to JavaScript [Theory] | **Partial** — SDLC (design-code-test-maintain) is teacher-delivered |
| **1.1.2** Variables and Data Types | A2.1 (fix buggy declarations) · A2.2 (object description) | JS1 → JavaScript Fundamentals → Variables, Data types, Basic operators, maths · JS2 Ch 1 Values, Types, and Operators · PY Ch 2 Expressions | FCC Variables and Strings → Introduction to JavaScript [Theory], Working with Data Types [Theory], Build a Greeting Bot [Workshop], Build a JavaScript Trivia Bot [Lab], Build a Sentence Maker [Lab], Review, Quiz | **Strong** + AP CSP binary discussion (W2) |
| **1.1.3** Documentation and Coding Conventions | A3.1 (document messy program) · A3.2 (written) · A3.3 (quiz) | JS1 → Code quality → Coding Style, Comments · PY Ch 1 (comments) | FCC Variables and Strings → Understanding Code Clarity [Theory] | **Partial** — README/JSDoc-style docs teacher-delivered; teacher style guide still needed |

### Chapter 2 — Control Flow (Q1)

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **1.2.1** Conditionals | A4.1 (grade advisor) · A4.2 (quiz) | JS1 → JavaScript Fundamentals → Comparisons, Conditional branching: if '?', Logical operators · JS2 Ch 2 (Conditional execution) · PY Ch 4 Decisions | FCC Booleans and Numbers → Working with Comparison and Boolean Operators [Theory], Understanding Comparisons and Conditionals [Theory], Build a Logic Checker App [Workshop], Build a Fortune Teller [Lab], Review, Quiz | **Excellent** — supplement `===` vs `==` emphasis |
| **1.2.2** Algorithms and Loops | A5.1 (algorithm + loop program) · A5.2 (debug 5 loops) | JS1 → JavaScript Fundamentals → Loops: while and for, The "switch" statement · JS2 Ch 2 (while/do/for) · PY Ch 5 Loops (incl. do...while) | FCC Loops → Working with Loops [Theory], Build a Sentence Analyzer [Workshop], Build a Space Mission Roster [Workshop], Build a Factorial Calculator [Lab], Build a Longest Word Finder App [Lab], Review, Quiz | **Strong** — "what is an algorithm" (SLO 4) teacher-delivered |

### Chapter 3 — Functions and Data (Q1)

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **1.3.1** Functions: Definition and Calls | A6.1 (refactor grade advisor) · A6.2 (calculator design) | JS1 → JavaScript Fundamentals → Functions, Function expressions, Arrow functions · JS2 Ch 3 Functions · PY Ch 6 Functions | FCC Functions → Working with Functions [Theory], Build a Calculator [Workshop], Build a Boolean Check Function [Lab], Build an Email Masker [Lab], Build a Loan Qualification Checker [Workshop], Build a Celsius to Fahrenheit Converter [Lab], Review, Quiz | **Excellent** |
| **1.3.2** Functions: Pass by Value/Reference | A7.1 (scale-a-design) · A7.2 (written) · A7.3 (quiz) | JS1 → Objects: the basics → Object references and copying · JS2 Ch 4 (Mutability) · PY Ch 3 Objects | FCC Objects → Introduction to JavaScript Objects and Their Properties [Theory], Working with Optional Chaining and Object Destructuring [Theory] · FCC Fundamentals Review → Working with Types and Objects [Theory] | **Significant gap** — pass-by-value vs reference is teacher-delivered (custom exercises) |
| **1.3.3** Arrays and File I/O | A8.1 (measurements array) · A8.2 (FileReader lab) · A8.3 (file write + round-trip) | JS1 → Data types → Arrays, Array methods, Iterables · JS1 → Binary data, files → File and FileReader ⚠️FILE I/O · JS2 Ch 4 (Arrays), Ch 18 File fields · PY Ch 9 Lists, Ch 14 Files | FCC Arrays → Working with Arrays [Theory], Build a Shopping List [Workshop], Build a Lunch Picker Program [Lab], Build a Golf Score Translator [Lab], Working with Common Array Methods [Theory], Review, Quiz | **Good (arrays)** — File I/O (FileReader/Blob) has no FCC equivalent; A8.2/A8.3 are plan-specific + AP CSP compression discussion (W8) |

### Synthesis Project (Q1 — Chapters 1–3)
> 1.4.1 Q1 Review and Mini-Project — A9.1 Print Job Manager. Synthesis of Q1.

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **1.4.1** Q1 Review and Mini-Project | A9.1 (Print Job Manager — synthesis) | JS1 → Miscellaneous → JavaScript specials (review) · JS2 Ch 4 Summary (review) | FCC Fundamentals Review → full section (24 items: Gradebook App, Pyramid Generator, Password Generator, Inventory Management) · FCC Booleans and Numbers → Build a Mathbot [Workshop] | **Good supplemental** — FCC labs similar in scope; Print Job Manager itself is custom |

### Chapter 4 — moSHion Foundations (Q2)

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **2.1.1** Hello Sprite and Movement | A10.1 (sprite playground) · A10.2 (written) | moSHion → overview → The sketch lifecycle · moSHion → canvas → Creating the canvas, Background and clearing · moSHion → sprite → Your first sprite, Position, rotation, scale · moSHion → input → Keyboard basics, Multi-key movement · JS2 Ch 13 (context) | — (moSHion is the Q2 textbook; FCC covers no game dev) | **Primary** — in-app moSHion docs carry the module |
| **2.1.2** Physics Feel | A11.1 (pinball scene) · A11.2 (written) | moSHion → physics → Gravity and velocity, Bounciness and friction, Forces, torque, and rotation · moSHion → sprite → Collider types · JS2 Ch 6 (classes preview, optional) | — | **Primary** — in-app moSHion docs carry the module |
| **2.2.1** Classes and Objects via moSHion | A12.1 (collectible class) · A12.2 (written, SLO 2) | JS1 → Classes → Class basic syntax, Class inheritance (optional) · JS2 Ch 6 (Methods, Classes, Prototypes) · PY Ch 11 (framing only) · moSHion → in-app docs → `Sprite` class | FCC Classes → Understanding How to Work with Classes in JavaScript [Theory], Build a Shopping Cart [Workshop], Build a Project Idea Board [Lab], Review, Quiz · FCC Objects → Introduction to JavaScript Objects and Their Properties [Theory], Build a Wildlife Tracker [Workshop], Build a Recipe Tracker [Workshop] | **Strong** — FCC Classes maps directly (Shopping Cart ≈ PrintPart/PrintQueue); OOP vs procedural comparison (SLO 2) teacher-delivered |

### Chapter 5 — Game Mechanics (Q2)

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **2.3.1** Groups and Overlaps | A13.1 (asteroid field) | moSHion → groups → Spawning and defaults, Iterating and removing, Filtering and searching · moSHion → collisions → colliding vs overlapping, Collisions with groups · JS1 → Data types → Arrays, Array methods (review) | — | **Primary** — in-app moSHion docs carry the module |
| **2.3.2** Physics Applications | A14.1 (Space Jumper OR Car) | moSHion → input → Keyboard basics, Mouse position and buttons · moSHion → physics → Gravity and velocity, Bounciness and friction · JS1 → JavaScript Fundamentals → Comparisons, Conditional branching (review) | — | **Primary** — consolidation week; midterm 3 + AP CSP effects-of-computing discussion (W15) |
| **2.4.1** Animated Sprites and Camera | A15.1 (side-scrolling platformer) | moSHion → animation → Ani, Anis, Groups with animations · moSHion → camera → Following a target, Screen space vs world space · JS1 → Animation → JavaScript animations (conceptual, optional) | — | **Primary** — in-app moSHion docs carry the module |
| **2.5.1** Save and Load | A16.1 (persistent high scores — File I/O) | JS1 → Data types → JSON methods, toJSON · JS1 → Storing data in the browser → LocalStorage, sessionStorage · JS2 Ch 18 File fields · PY Ch 14 Files (structural) | — | **Strong** — JSON/LocalStorage fully covered by JS1 + JS2; + AP CSP metadata discussion (W16) |
| **2.6.1** Game State Machines | A16.2 (game states lab) | JS1 → Data types → JSON methods, toJSON (reference) · JS2 Ch 4 (switch/state review, optional) | — | **Teacher-delivered** — state-machine pattern is moshion/plan-specific; JS2 Ch 4 switch review supports |
| **2.7.1** Joints and Advanced Input | A17.1 (Two-Player Pong-Sumo) | moSHion → joints → DistanceJoint, HingeJoint, SliderJoint, GlueJoint, GrabberJoint · moSHion → input → Dragging and clicks, Gamepad · moSHion → patterns → Projectiles from a player | — | **Primary** — in-app moSHion docs carry the module; most complex moSHion concept, mastery not expected |

### Synthesis Project (Q2 — Chapters 4–5)
> 2.8.1 Capstone Game — A18.1 Game Capstone (SLO 1/2/3). Synthesis of Q2.

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **2.8.1** Capstone Game | A18.1 (Game Capstone — synthesis, SLO 1/2/3) | moSHion → patterns → Scene/state switching, Top-down movement, Platformer jump · JS2 Ch 16 Project: A Platform Game (enrichment) · JS2 Ch 8 Bugs and Errors (testing discipline) | — | **Synthesis** — 1-week build; JS2 Ch 16 is the design/iteration analog; + AP CSP beneficial/harmful effects discussion |

### Chapter 6 — JSCAD Foundations (Q3)

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **3.1.1** Libraries and JSCAD Introduction | A19.1 (multi-module program) · A19.2 (written) | JSCAD → parametric tutorial (entry point, `main()`) · jscadui → jscad.app (editor, viewport, parameters, export) · JSCAD → GitHub repo → packages/modeling/src, packages/web · JS1 → Modules → Modules, introduction, Export and Import · JS2 Ch 10 Modules (ES) · PY Ch 7 (structural) | — | **Strong** — JSCAD + JS1/JS2 modules cover it; PY Ch 7 is structural model |
| **3.1.2** 2D Shapes and Transforms | A20.1 (2D logo design) · A20.2 (doc-reading lab) | JSCAD → primitives → rectangle, circle, ellipse, polygon, star · JSCAD → transforms → translate, rotate, scale, center · JS1 → Objects: the basics → Objects (review) | — | **Strong** — JSCAD API docs are the primary source |
| **3.1.3** Boolean Operations in 2D | A21.1 (gasket/plate) · A21.2 (written) · A21.3 (quiz) | JSCAD → booleans → union, subtract, intersect · JS1 → JavaScript Fundamentals → Logical operators (conceptual parallel) | — | **Strong** — JSCAD API docs primary |
| **3.2.1** Parameters and getParameterDefinitions | A22.1 (parameterized logo) · A22.2 (written) | JSCAD → parametric tutorial → `getParameterDefinitions()`, `main(params)` · JSCAD → GitHub repo → packages/core/src/parameters · JS1 → JavaScript Fundamentals → Functions (parameters review) | — | **Strong** — the tutorial is the anchor; JSDoc build lacks parametric runtime |
| **3.2.2** Arrays in JSCAD / Loops | A23.1 (pattern generation) · A23.2 (map() rewrite) | JS1 → Data types → Arrays, Array methods · JS1 → Advanced working with functions → Rest parameters (optional) · JS2 Ch 5 Higher-order Functions · PY Ch 9 → 9.5 List comprehensions (structural) | — | **Strong** — JS1/JS2 arrays + higher-order carry it; + AP CSP parallel-computing discussion (W22) |

### Chapter 7 — 3D Modeling (Q3)

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **3.3.1** First Extrusion: 2D to 3D | A24.1 (extrude gasket, print) · A24.2 (extrudeRotate, print) | JSCAD → extrusions → extrudeLinear, extrudeRotate · JSCAD → primitives → circle, rectangle (profiles) · JS1 → JavaScript Fundamentals → Numbers (angle/segment review) | — | **Strong** — JSCAD API docs primary |
| **3.3.2** 3D Primitives and Transforms | A25.1 (3D assembly) · A25.2 (bushing part) · A25.3 (quiz) | JSCAD → primitives → cube, cuboid, sphere, cylinder, torus · JSCAD → transforms → translate, rotate, scale, scaleX/Y/Z · JSCAD → booleans → union, subtract, intersect (3D) | — | **Strong** — JSCAD API docs primary |
| **3.4.1** Error Handling and Debugging | A26.1 (errors on W9 manager) · A26.2 (errors on JSCAD project) | JS1 → Error handling → try...catch, Custom errors · JS1 → Code quality → Debugging in the browser · JS2 Ch 8 Bugs and Errors · PY Ch 14 → 14.4 Handling exceptions, 14.5 Raising exceptions (structural) | FCC Debugging → Debugging Techniques [Theory], Debug a Random Background Color Changer [Lab], Review, Quiz · FCC Booleans and Numbers → Debug Type Coercion Errors [Lab], Debug Increment and Decrement Operator Errors [Lab] | **Partial** — FCC covers debugging strategies only; try/catch/throw/custom errors teacher-delivered + AP CSP cybersecurity discussion (W23) |
| **3.4.2** Testing Principles | A27.1 (test suite) · A27.2 (written) · A27.3 (quiz) | JS1 → Code quality → Automated testing with Mocha · JS2 Ch 8 (Testing) · PY Ch 14 → 14.4 (structural) | — (none) | **Complete gap** in FCC — entire week is teacher-delivered plan content; JS1 Mocha + JS2 Testing are the JS-native anchors |

### Synthesis Project (Q3 — Chapters 6–7)
> [TITLE TBD] — Q3 synthesis build (placeholder theme; spans spring recess). Synthesis of Q3.

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| TBD | [CAPSTONE TBD] | No reading — synthesis build | — | **Synthesis** — theme TBD; no chapter test / group PA |

### Chapter 8 — Advanced Modeling (Q4)

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **4.1.1** Hulls and Advanced Extrusions | A28.1 (2 advanced techniques) · A28.2 (quiz) | JSCAD → hulls → hull, hullChain · JSCAD → extrusions → extrudeHelical, extrudeFromSlices · JS2 Ch 5 Higher-order Functions (composability, optional) | — | **Strong** — JSCAD API docs primary |
| **4.1.2** Measurements and Printability | A29.1 (measurement report) | JSCAD → measurements → measureVolume, measureBoundingBox, measureDimensions · JS2 Ch 4 (object data, review) | — | **Strong** — JSCAD measurements primary; light week by design |
| **4.1.3** Sorting and Searching on Geometry | A30.1 (sort/search, SLO 4) · A30.2 (written) | JS1 → Data types → Array methods (sort, find, indexOf) · JS2 Ch 5 (filter, map, reduce) · JS2 Ch 4 (Rest parameters, optional) · PY Ch 9 → 9.2 Sorting and reversing lists (structural) | FCC Algorithms → Introduction to Common Searching and Sorting Algorithms [Theory], Implement the Binary Search Algorithm [Workshop], Implement the Merge Sort Algorithm [Workshop], Implement the Bubble Sort Algorithm [Lab], Implement the Selection Sort Algorithm [Lab], Implement the Insertion Sort Algorithm [Lab], Implement the Quicksort Algorithm [Lab], Review, Quiz | **Excellent** — FCC Algorithms is the primary source (bubble sort required; quicksort/insertion = stretch) |

### Chapter 9 — Production Pipeline (Q4)

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **4.2.1** Multi-File Projects and File I/O | A31.1 (multi-file refactor + git) · A31.2 (written) | JSCAD → GitHub repo → jsdoc/tutorials (Multi-File), packages/io (file import) · JS1 → Modules → Modules, introduction, Export and Import · JS2 Ch 10 (ES + CommonJS) · JS2 Ch 20 → The filesystem module (conceptual File I/O) · PY Ch 14 (structural) | — | **Strong** — JS1/JS2 modules + JSCAD multi-file tutorial; JS2 Ch 20 `fs` gives the true sequential-access contrast |
| **4.2.2** Colors, Text, and Export Formats | A32.1 (nameplate/badge, print) · A32.2 (quiz) | JSCAD → colors → colorize · JSCAD → text → vectorChar, vectorText · JSCAD → GitHub repo → packages/io (STL/3MF/AMF/OBJ serializers) + User Guide en:user_guide_formats · JS1 → JavaScript Fundamentals → Data types (strings review) | — | **Strong** — JSCAD API + repo docs primary; STL/OBJ not in JSDoc build — cite repo source |

### Synthesis Project (Q4 — Chapters 8–9)
> 4.3.1–4.3.3 — A33.1–A36.2 full 3D capstone build; A36.1 presentation is the performance assessment. Synthesis of Q4.

| Subsection | Assignments | Seeded sources | FCC layer | Coverage |
|---|---|---|---|---|
| **4.3.1** Capstone Design Phase | A33.1 (design spec) | JS2 Ch 8 Bugs and Errors (design mindset, reference) · JSCAD → parametric tutorial (parameter design review) | — | **Synthesis** — design phase; + AP CSP digital-divide discussion (W33) |
| **4.3.2** Capstone Build and Iterate | A34.1 (M1 geometry) · A34.2 (M2 params + validation) · A35.1 (M3 complete + test) · A35.2 (peer review) · A35.3 (final print) | JSCAD → measurements (printability reference) · moSHion → patterns → Scene/state switching (design-pattern reference) · JS2 Ch 8 (iterative debugging) | — | **Synthesis** — build/iterate; + AP CSP computing-bias discussion (W34) |
| **4.3.3** Presentations and Reflection | A36.1 (capstone presentation) · A36.2 (course reflection, SLO 1) | No reading — presentation + reflection | — | **Synthesis** — no external sources |

**Coverage note:** all 71 assignments (A1.1–A36.2) trace to a chapter + subsection above; the only undefined row is Chapter 10's placeholder capstone (gets a subsection number + sources once the theme is chosen). FCC activity tags mirror `curriculum-alignment-guide.md` (its CodeHS rows were stripped during seeding; its AP CSP integration table remains the source of truth for the non-coding layer).
