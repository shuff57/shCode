Chapter 3 Individual PA, Part 2 -- reference answers

Q1. A function that prints only shows text in the console; the call itself evaluates to
undefined, so the caller gets nothing back. A function that returns hands a value back to
the caller and ends the function. A returned value can be stored in a variable, used in
an expression or a condition, or passed into another function (3.2.9, 3.2.13).

Q2. Make a copy first and work on the copy: a spread copy ([...items]) or items.slice().
The copy is a different array, so changing it does not touch the caller's array. Without
the copy, the parameter and the caller's variable point at the same array and a change is
visible to the caller (3.6.9, 3.6.11, 3.7.6, 3.7.14).

Q3. slice() returns a NEW array holding the part you asked for and leaves the original
untouched. pop() removes the last element from the array it is called on, so the original
gets shorter, and hands that removed element back (3.7.6, 3.3.2). slice is non-mutating;
pop is mutating.
