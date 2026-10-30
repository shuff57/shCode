# AP CSA module 3 (Class Creation): what a lesson is made of

Read 2026-10-30 in the logged-in session: all 97 activities of module 3 (preview id 32674) by title,
and the exercise brief plus typical solution of three programming exercises (a class with a
static counter, a class using `this`, a plain data class). Structure and ideas only; no CodeHS
text, problems or code is reproduced here.

## Module shape

3.1 Abstraction and Program Design, 3.2 Impact of Program Design, 3.3 Anatomy of a Class,
3.4 Constructors, 3.5 Methods: How to Write Them, 3.6 Passing and Returning References,
3.7 Class Variables and Methods, 3.8 Scope and Access, 3.9 `this` Keyword, 3.10 Mid-Unit
Assessment (a quiz + one FRQ), 3.11 End of Unit Assessment (a quiz + two FRQs).

## The repeating lesson

Concept page, then a **quiz straight after the concept**, then a **Debugging:** activity (find the
fault in a given class), then an **Exploration:** (a guided probe), then **two to four
write-the-class exercises**. Unit 7 can copy that rhythm; ours currently has no named
debugging step and its checks sit at the end.

## Exercise form worth copying

- The student is handed a **class skeleton with comments and a runner file**, completes the
  bodies, and tests with the runner. One class per exercise, each worth the same.
- The skeleton **fixes the names** and tells the student not to change them, so the point of the
  exercise is the concept (here: `this` separating a field from a parameter of the same name).
- The `static` exercise is a **counter of instances**: a class-level count bumped by the
  constructor, a constant for a threshold, and a class-level method that answers a yes/no
  question about the count. That is a good shape for a game (enemies spawned, waves).

## Order, and what each lesson assumes

| # | Lesson | Assumes | Ours today | For Unit 7 |
| --- | --- | --- | --- | --- |
| 3.1 | Abstraction and Program Design | nothing | absent | **Open Unit 7 with it**: design before syntax. A diagram-and-reflect pair before any class is written. |
| 3.2 | Impact of Program Design | 3.1 | absent | Optional; the reliability/impact material is not a game concern. Keep only the "using someone else's code, with attribution" idea, as a short reading. |
| 3.3 | Anatomy of a Class | using objects (module 1) | 5.7.x | Same job: fields, access, the shape of a class. |
| 3.4 | Constructors | 3.3 | 5.7.x | Constructors with and without parameters, two lessons' worth in CSA. |
| 3.5 | Methods: How to Write Them | 3.4 | 5.7.x | Accessor and mutator pair as its own exercise (a full class with getters and setters). |
| 3.6 | Passing/Returning References | 3.5 | 5.8 "objects that meet" | Matches 5.8.10-13. |
| 3.7 | Class Variables and Methods | 3.6 | 5.8.14-16 | CSA puts this **before** scope/access. |
| 3.8 | Scope and Access | 3.7 | 5.8.1-9 | Ours puts scope **first**. Decide: CSA's order lets scope cover class variables too. |
| 3.9 | `this` Keyword | 3.5, 3.8 | 5.6.12-13 (early) | Forced early in JavaScript. Keep. |

## JavaScript versus Java: what changes

- **Types and `final`:** drop the type annotations. `const` for a constant and a leading
  underscore or `#field` for private are the JavaScript spellings; decide which one Unit 7 teaches.
- **`public static` getters** become `static` methods and a `static` field, which exist in
  JavaScript; the game-shaped version is the instance counter above.
- **`this` is mandatory** inside a method to reach a field, so it cannot wait until 3.9.
- **One class per file with a runner** has no JavaScript analogue; our equivalent is a class
  above `setup()` and a `draw()` that exercises it.
- **Access modifiers** are convention in JavaScript unless `#private` is taught; CSA grades
  encapsulation by the keyword, which we cannot.

## What Unit 7 should take

1. Open with a design lesson (3.1): diagram the thing before writing it.
2. The lesson rhythm: concept, quiz, **debugging**, exploration, two to four write-the-class
   exercises, with a runner-style test harness per class.
3. An accessor/mutator "full class" exercise.
4. A static **instance counter** exercise, built on a game object.
5. An end-of-unit pair of FRQ-style tasks (design a class from a description) after a mid-unit one.
