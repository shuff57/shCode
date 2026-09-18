## Answer Key — 2.7.2 In Your Own Words

### Question 1: `for` vs `while` (4 points)

**Full credit (4 pts):** Student clearly distinguishes:
- `for`: known iteration count / definite iteration. Header packages init + condition + step.
- `while`: condition-driven / indefinite iteration. Only condition in header; setup and update are manual.

**Partial (2-3 pts):** Mentions one correctly but conflates the other, or describes syntax without the "when to choose" reasoning.

**Minimal (1 pt):** Only syntax difference ("for has three parts, while has one") without the "when to use" reasoning.

**No credit (0):** Confuses the two, or says they're interchangeable.

---

### Question 2: `===` vs `==` (3 points)

**Full credit (3 pts):** Mentions both:
- `===` checks value AND type (strict equality)
- `==` does type coercion, leading to surprises like `0 == false` → true, `"" == 0` → true
- Recommends `===` as default, `==` only with a specific reason

**Partial (2 pts):** Mentions coercion but not the strict equality distinction, or vice versa.

**Minimal (1 pt):** Says "`===` is better" without explaining why.

---

### Question 3: `throw` vs `console.log` (3 points)

**Full credit (3 pts):** Mentions both:
- `throw` stops normal flow, jumps to nearest `catch` (or crashes if uncaught)
- `console.log` just prints and continues
- `throw` is for signaling errors the program can respond to; logging is for humans

**Partial (2 pts):** Mentions one clearly but not the other.

**Minimal (1 pt):** Says "throw crashes the program" without mentioning `catch`.