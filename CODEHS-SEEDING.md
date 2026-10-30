# Seeding units 5, 6 and 7 from CodeHS

How the three game units should be laid out and rolled out, taken from four CodeHS courses
read on 2026-10-29: **Introduction to Game Design** (course 21074, 6 modules / 37 lessons),
**AP CSP in JavaScript** (6166, 19 modules / 106 lessons), **AP CSA** (22971, 4 modules / 61
lessons), and *Video Game Design in JavaScript* (20517 — background only; see §5).

Structure only. No CodeHS text, problems or code is copied.

> **Library name, verified 2026-10-30 in a logged-in session.** The game-design course's code is
> **p5play** (`new Canvas`, `new Sprite`, `.diameter`, `setup`/`draw`; the syllabus is titled "Intro
> to Game Design with p5play"). Some lesson prose still says **JSGameLib** (probably an earlier name for the same library; not
> confirmed): lesson 3.1's description and its activity 3.1.5 ("JSGameLib Documentation") both do. There is no
> separate JSGameLib *course* (`codehs.com/course/jsgamelib/explore` is a 404). So there is one
> game-design course, and it is described as both. Read `CODEHS-MAP.md`'s "JSGameLib" as that course.

---

## 1. The three units, and which course seeds each

| Unit | Ours | Seeds the **layout** | Seeds the **concept rollout** |
| --- | --- | --- | --- |
| **5 Functional game design** | 5.1, 5.2, 5.3–5.5 | **Intro to Game Design** (M3 → M4 → M5 → M6) | **AP CSP** M5 → M7 (functions/parameters/returns/scope, then arrays) |
| **6 OOP game design** | one or more modules | **AP CSA** M1 (objects *for use*) | **AP CSA** 1.12–1.14 |
| **7 Writing custom classes** | two or more modules | **AP CSA** M3 (Class Creation) | **AP CSA** 3.3–3.9, **in that order** |

---

## 2. Unit 5 — functional game design

### The layout: Game Design's module shape

| CodeHS | Lessons | Ours |
| --- | ---: | --- |
| M1 *Intro to Game Design* — 1.1 Intro to Games, 1.2 Unpacking a Game, 1.3 Categorizing Games | 3 | not copied (we start at `console.log` in Unit 1) |
| M2 *Programming in JavaScript* — How to Think Like a Programmer, Intro to JS, Variables, User Input, Basic Math, **Basic Functions** | 6 | already covered by units 1–3 |
| M3 *Getting to Know Game Design* — **3.1 Introducing Libraries, 3.2 Program Structure, 3.3 Understanding the Canvas, 3.4 Your First Sprites, 3.5 The Physics of Sprites** | 5 | **5.1 + 5.2** |
| M4 *Project: Mini Golf* | 7 | **5.3 Project: Pinball** (built) |
| M5 *Project: Projectiles* | 8 | **5.4 Flappy-style** |
| M6 *Project: Jumper* | 8 | **5.5 Snake** |

The finding that matters: **CodeHS puts nine lessons of plain JavaScript before the library
appears at 3.1, gives four more to the library itself, and only then starts the first project at
4.1.** From 4.1 onward every module is a project, and the remaining concepts are injected *inside*
the projects: Booleans at 4.3, If/Else at 4.4, Groups and Tiles at 5.3, Sprite Animations at 6.3.

Our 5.1/5.2 (40 screens) play the part of GD M3, and 5.3 is our 4.1. That matches.

### The rollout: what to inject, and in what order

CodeHS injects a concept when the project needs it. We should do the same, with one exception:
**GD never teaches arrays**, and our games need them. Take the array order from AP CSP:

- **AP CSP M5** — 5.1–5.3 Functions and Parameters, 5.4–5.5 Functions and Return Values,
  **5.6 Local Variables and Scope**
- **AP CSP M7** — 7.1 Intro to Lists/Arrays, 7.2 Indexing, 7.3 Adding/Removing, 7.4 Length and
  Looping, 7.5 Iterating, 7.6 Finding an Element, 7.7 Removing an Element, 7.8 Simulation

Note the order: **parameters and return values come before arrays, and local scope comes before
arrays too.** Our course already follows that (3.2 parameters/returns, 3.3 arrays), so the injection
rule is about timing, not order:

| Injected where | What |
| --- | --- |
| 5.3 Pinball | a variable that survives frames (the `wasTouching` flag), a score, a state flag |
| 5.4 Flappy-style | an array of obstacles, built and reaped |
| 5.5 Snake | an array that grows and is searched |

**Do not front-load these.** Each one arrives on the screen where the game needs it, the way
Booleans arrive in the middle of Mini Golf at 4.3.

---

## 3. Unit 6 — OOP game design

### The layout: CSA's "use it long before you write it"

AP CSA module 1 is called *Using Objects and Methods*, and the object work sits at the end of it:

```
1.12 Objects: Instances of Classes
1.13 Object Creation and Storage (Instantiation)
1.14 Calling Instance Methods
[module 2: all of selection and iteration — 14 lessons]
3.3  Anatomy of a Class        ← the first time a student WRITES one
```

So the gap between *using* an object and *writing* a class is **eleven lessons and a whole module**.

Our 5.6 is exactly the "use it" stage: the student is handed a class, instantiates it, reads its
properties, and watches `this` work. That is CSA 1.12–1.14, and it should stay a whole module —
that is the point of it being separate from unit 7.

### The rollout for unit 6

| Ours | CSA 1.12–1.14 |
| --- | --- |
| you are handed a class | 1.12 Objects: Instances of Classes |
| `new` builds one | 1.13 Object Creation and Storage (Instantiation) |
| calling a method on it | 1.14 Calling Instance Methods |
| reading and changing a property | no CSA lesson — Java teaches fields under "Anatomy of a Class" (3.3) |

**The divergence worth recording:** CSA can defer `this` to 3.9 because Java methods reach fields by
name. **JavaScript cannot** — a method body that reads a property must write `this.x`, so `this` has
to be taught at the "use it" stage, before the student writes a class. That is why our 5.6 has a
reading on `this` and CSA's equivalent does not.

---

## 4. Unit 7 — writing custom classes

### The order, from AP CSA module 3

This is the whole seed, and it is a strict sequence:

| CSA | Lesson | Ours (current) |
| --- | --- | --- |
| 3.1 | Abstraction and Program Design | not present |
| 3.2 | Impact of Program Design | not present |
| **3.3** | **Anatomy of a Class** | 5.7.x (present) |
| **3.4** | **Constructors** | 5.7.x (present) |
| **3.5** | **Methods: How to Write Them** | 5.7.x (present) |
| **3.6** | **Methods: Passing and Returning References of an Object** | 5.7.x (objects meet — but in 5.8) |
| **3.7** | **Class Variables and Methods** (static) | 5.8.14 (static) |
| **3.8** | **Scope and Access** | 5.8.1–5.8.9 |
| **3.9** | **`this` Keyword** | 5.6.12–5.6.13 (early!) |

Two deltas to decide on:

1. **CSA puts `this` last**, after constructors, methods, static and scope. We teach it at 5.6,
   before the student writes a class — forced by JavaScript (see §3). Keep ours, and record why.
2. **CSA puts static (3.7) before scope and access (3.8).** We do the reverse: scope/access at
   5.8.1–5.8.9, static at 5.8.14. CSA's order is defensible — a class variable is a *declaration*
   question, and scope/access reads better once you know what can be shared. Consider swapping.

Also absent from ours and present in CSA: **3.1 Abstraction and Program Design** and **3.2 Impact of
Program Design** open the unit. That is design before syntax, which is exactly what a
"writing custom classes" unit should open with.

---

## 5. Assessment cadence

Three different answers in the three courses, and we can only pick one:

| Course | Rhythm |
| --- | --- |
| **Intro to Game Design** | **no quizzes at all**; each project ends on a "Level #2 Challenge" (4.7, 5.8, 6.8) |
| **AP CSP** | **one quiz closing every content module** — 1.21, 3.9, 4.12, 5.9, 7.9, 8.11, 11.12, 13.4 — plus Practice PTs at modules 2, 6, 9, 10, 12, 14, 15 |
| **AP CSA** | **no quizzes**; a Mid-Unit Assessment and an End of Unit Assessment close every module — 1.16/1.17, 2.13/2.14, 3.10/3.11, 4.18/4.19 |

Our shape is closest to **AP CSA**: a group PA and an individual PA close each chapter. The one
thing worth stealing is **AP CSP's quiz closing a content module** — the game modules 5.3–5.5 and
the class modules should each close with a short check, which is also what
`curriculum/groups/README.md` asks for when a lesson ends on a reading.

**Do not copy:** CSA's mid-unit/end-of-unit pair (we have PAs), GD's total absence of checks (our
gradebook expects them), and any Karel material (VGD module 1 and CSP module 1 — 17 and 21 lessons
of grid-world programming with no shCode equivalent).

---

## 6. What this changes in the tree today

- **5.3 Pinball already fits the layout**: it is our GD 4.1, opens from the physics scene, and
  injects the state flag and the score mid-project rather than front-loading them. No change.
- **5.4 and 5.5 should follow the injection rule**, not the "teach arrays then build" rule.
- **`CODEHS-MAP.md`:** note that CodeHS's lesson prose still says JSGameLib for the p5play code; its unit-5 rows are re-checked against the logged-in project reads in `codehs-review/`.
- **Unit 7's ordering is an open question**: keep `this` at 5.6 (our way, forced by JavaScript) and
  static after scope/access (our way), or adopt CSA's static-before-scope swap.
- **Unit 6 has no modules yet** beyond 5.6, and the chapter-level repartition (5.x functional /
  6.x OOP / 7.x writing classes) is still unstarted — see `HANDOFF.md`.
