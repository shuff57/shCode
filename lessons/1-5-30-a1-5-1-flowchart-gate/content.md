## Plan It in Pseudocode (Part 1)

**What you'll practise:**
- Turning a rule written in English into pseudocode
- Using the question (IF) and the two answers (THEN and ELSE)
- Making sure the ELSE branch still does something

This is the first run of the convention you just read, and it is deliberately the gentlest one. You can rewrite as many times as you want, and failing a check costs nothing.

### The problem

The school printer gives every student **20 free pages a week**. After that, printing costs **10 cents a page** for each page over the 20.

Write a plan that takes the number of pages a student printed this week and reports what they owe.

### Write it as pseudocode

In `README.md`, between `START` and `END`:

```
START
INPUT ...
IF ... THEN
    ...
ELSE
    ...
END IF
END
```

The plan comes before the code: Part 2 (1.5.31) shows it beside your JavaScript. The Flow Chart bar above the editor shows the same kind of plan for a different rule, a movie ticket. It is read-only.

### The part people get wrong

**The ELSE branch still has to do something.** A student who printed 12 pages owes nothing, but "owes nothing" is a real answer that has to be reported, not a path that quietly stops.

**Only the pages *over* 20 are charged.** 25 pages is 5 pages of charge, not 25.

### Before you submit

Press **Grade**. Then walk the 12-page case and the 25-page case through your plan by hand before you call it done.
