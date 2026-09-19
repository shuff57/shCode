Chapter 3 Individual PA, Part 2 — reference answers

Q1. A parameter is the name written in the function's definition; it has no value until
the function is called. An argument is the actual value handed over at the call, and it
is assigned to the matching parameter by position. A function that finishes without
running a return hands back undefined.

Q2. Yes, the caller sees the change: the parameter holds a copy of the reference, so the
object inside the function and the one outside are the same object. Changing a property
inside changes the one the caller holds. If the function had reassigned the parameter to
a brand-new object instead, the caller would see nothing -- that only points the name
inside the function somewhere else (3.6.6).

Q3. map() builds and returns a NEW array, one callback result per element, and leaves
the original array untouched. push() adds a value to the end of the array it is called
on and changes that array. map is non-mutating; push is mutating.
