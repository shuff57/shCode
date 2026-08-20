-- 0011: Chapter-1 lesson folders renamed to match their title numbers.
--
-- Modules 1.1, 1.2, 1.3 and 1.5 were resequenced by title only, leaving
-- folder names (which key student progress via lesson_id) out of sync with
-- the numbers students see. This migration rewrites lesson_id in every table
-- that stores it, so the folders can be renamed to match their titles
-- without orphaning progress. See curriculum/modules/1.1_foundations.md and
-- 1.2_variables-and-data-types.md for the resequence history.
--
-- The new ids did not exist as folders before this change, so no row can
-- already carry one; the CASE/WHERE pair is safe to re-run (it matches
-- nothing the second time).

UPDATE lesson_state SET lesson_id = CASE lesson_id
  WHEN '1-1-6-first-statement' THEN '1-1-3-first-statement'
  WHEN '1-1-8-reading-four-phases' THEN '1-1-6-reading-four-phases'
  WHEN '1-1-9-classify-the-task' THEN '1-1-7-classify-the-task'
  WHEN '1-1-10-example-greeting-phases' THEN '1-1-8-example-greeting-phases'
  WHEN '1-1-11-reading-umbrella' THEN '1-1-10-reading-umbrella'
  WHEN '1-1-12-name-that-umbrella' THEN '1-1-11-name-that-umbrella'
  WHEN '1-1-13-reading-actions' THEN '1-1-12-reading-actions'
  WHEN '1-1-14-reading-task-sets' THEN '1-1-13-reading-task-sets'
  WHEN '1-1-15-example-task-set-loop' THEN '1-1-14-example-task-set-loop'
  WHEN '1-1-16-write-a-task-set' THEN '1-1-15-write-a-task-set'
  WHEN '1-1-17-reading-sdlc' THEN '1-1-16-reading-sdlc'
  WHEN '1-1-18-reading-four-ps' THEN '1-1-17-reading-four-ps'
  WHEN '1-1-19-same-framework' THEN '1-1-18-same-framework'
  WHEN '1-1-20-reading-prescriptive' THEN '1-1-19-reading-prescriptive'
  WHEN '1-1-21-reading-prescriptive-limits' THEN '1-1-20-reading-prescriptive-limits'
  WHEN '1-1-22-does-it-fit' THEN '1-1-21-does-it-fit'
  WHEN '1-1-23-a1-2-describe-lifecycle' THEN '1-1-22-a1-2-describe-lifecycle'
  WHEN '1-1-7-a3-3-unit-quiz' THEN '1-1-23-a3-3-unit-quiz'
  WHEN '1-2-7-reading-every-value-has-a-type' THEN '1-2-3-reading-every-value-has-a-type'
  WHEN '1-2-8-reading-dynamically-typed' THEN '1-2-4-reading-dynamically-typed'
  WHEN '1-2-9-lab-change-the-type' THEN '1-2-5-lab-change-the-type'
  WHEN '1-2-10-reading-number' THEN '1-2-6-reading-number'
  WHEN '1-2-4-reading-operators-coercion' THEN '1-2-7-reading-operators-coercion'
  WHEN '1-2-11-reading-special-numeric-values' THEN '1-2-8-reading-special-numeric-values'
  WHEN '1-2-12-example-nan-is-sticky' THEN '1-2-9-example-nan-is-sticky'
  WHEN '1-2-13-lab-predict-the-number' THEN '1-2-10-lab-predict-the-number'
  WHEN '1-2-14-reading-bigint' THEN '1-2-11-reading-bigint'
  WHEN '1-2-15-reading-strings-and-quotes' THEN '1-2-12-reading-strings-and-quotes'
  WHEN '1-2-16-reading-template-literals' THEN '1-2-13-reading-template-literals'
  WHEN '1-2-3-reading-string-methods' THEN '1-2-14-reading-string-methods'
  WHEN '1-2-17-lab-greeting-with-backticks' THEN '1-2-15-lab-greeting-with-backticks'
  WHEN '1-2-6-lab-operators-check' THEN '1-2-16-lab-operators-check'
  WHEN '1-2-18-reading-boolean' THEN '1-2-17-reading-boolean'
  WHEN '1-2-19-example-comparisons-make-booleans' THEN '1-2-18-example-comparisons-make-booleans'
  WHEN '1-2-20-reading-null' THEN '1-2-19-reading-null'
  WHEN '1-2-21-reading-undefined' THEN '1-2-20-reading-undefined'
  WHEN '1-2-22-null-vs-undefined' THEN '1-2-21-null-vs-undefined'
  WHEN '1-2-23-reading-primitive-vs-object' THEN '1-2-22-reading-primitive-vs-object'
  WHEN '1-2-24-reading-typeof' THEN '1-2-23-reading-typeof'
  WHEN '1-2-25-example-typeof-surprises' THEN '1-2-24-example-typeof-surprises'
  WHEN '1-2-26-lab-typeof-round-up' THEN '1-2-25-lab-typeof-round-up'
  WHEN '1-2-5-lab-variables-types-check' THEN '1-2-26-lab-variables-types-check'
  WHEN '1-2-30-unit-quiz' THEN '1-2-31-unit-quiz'
  WHEN '1-3-20-a1-3-3-unit-quiz' THEN '1-3-21-a1-3-3-unit-quiz'
  WHEN '1-5-44-unit-quiz' THEN '1-5-45-unit-quiz'
END WHERE lesson_id IN (
  '1-1-6-first-statement', '1-1-8-reading-four-phases', '1-1-9-classify-the-task',
  '1-1-10-example-greeting-phases', '1-1-11-reading-umbrella', '1-1-12-name-that-umbrella',
  '1-1-13-reading-actions', '1-1-14-reading-task-sets', '1-1-15-example-task-set-loop',
  '1-1-16-write-a-task-set', '1-1-17-reading-sdlc', '1-1-18-reading-four-ps',
  '1-1-19-same-framework', '1-1-20-reading-prescriptive', '1-1-21-reading-prescriptive-limits',
  '1-1-22-does-it-fit', '1-1-23-a1-2-describe-lifecycle', '1-1-7-a3-3-unit-quiz',
  '1-2-7-reading-every-value-has-a-type', '1-2-8-reading-dynamically-typed',
  '1-2-9-lab-change-the-type', '1-2-10-reading-number', '1-2-4-reading-operators-coercion',
  '1-2-11-reading-special-numeric-values', '1-2-12-example-nan-is-sticky',
  '1-2-13-lab-predict-the-number', '1-2-14-reading-bigint', '1-2-15-reading-strings-and-quotes',
  '1-2-16-reading-template-literals', '1-2-3-reading-string-methods',
  '1-2-17-lab-greeting-with-backticks', '1-2-6-lab-operators-check', '1-2-18-reading-boolean',
  '1-2-19-example-comparisons-make-booleans', '1-2-20-reading-null', '1-2-21-reading-undefined',
  '1-2-22-null-vs-undefined', '1-2-23-reading-primitive-vs-object', '1-2-24-reading-typeof',
  '1-2-25-example-typeof-surprises', '1-2-26-lab-typeof-round-up',
  '1-2-5-lab-variables-types-check', '1-2-30-unit-quiz',
  '1-3-20-a1-3-3-unit-quiz', '1-5-44-unit-quiz'
);

UPDATE lesson_drafts SET lesson_id = CASE lesson_id
  WHEN '1-1-6-first-statement' THEN '1-1-3-first-statement'
  WHEN '1-1-8-reading-four-phases' THEN '1-1-6-reading-four-phases'
  WHEN '1-1-9-classify-the-task' THEN '1-1-7-classify-the-task'
  WHEN '1-1-10-example-greeting-phases' THEN '1-1-8-example-greeting-phases'
  WHEN '1-1-11-reading-umbrella' THEN '1-1-10-reading-umbrella'
  WHEN '1-1-12-name-that-umbrella' THEN '1-1-11-name-that-umbrella'
  WHEN '1-1-13-reading-actions' THEN '1-1-12-reading-actions'
  WHEN '1-1-14-reading-task-sets' THEN '1-1-13-reading-task-sets'
  WHEN '1-1-15-example-task-set-loop' THEN '1-1-14-example-task-set-loop'
  WHEN '1-1-16-write-a-task-set' THEN '1-1-15-write-a-task-set'
  WHEN '1-1-17-reading-sdlc' THEN '1-1-16-reading-sdlc'
  WHEN '1-1-18-reading-four-ps' THEN '1-1-17-reading-four-ps'
  WHEN '1-1-19-same-framework' THEN '1-1-18-same-framework'
  WHEN '1-1-20-reading-prescriptive' THEN '1-1-19-reading-prescriptive'
  WHEN '1-1-21-reading-prescriptive-limits' THEN '1-1-20-reading-prescriptive-limits'
  WHEN '1-1-22-does-it-fit' THEN '1-1-21-does-it-fit'
  WHEN '1-1-23-a1-2-describe-lifecycle' THEN '1-1-22-a1-2-describe-lifecycle'
  WHEN '1-1-7-a3-3-unit-quiz' THEN '1-1-23-a3-3-unit-quiz'
  WHEN '1-2-7-reading-every-value-has-a-type' THEN '1-2-3-reading-every-value-has-a-type'
  WHEN '1-2-8-reading-dynamically-typed' THEN '1-2-4-reading-dynamically-typed'
  WHEN '1-2-9-lab-change-the-type' THEN '1-2-5-lab-change-the-type'
  WHEN '1-2-10-reading-number' THEN '1-2-6-reading-number'
  WHEN '1-2-4-reading-operators-coercion' THEN '1-2-7-reading-operators-coercion'
  WHEN '1-2-11-reading-special-numeric-values' THEN '1-2-8-reading-special-numeric-values'
  WHEN '1-2-12-example-nan-is-sticky' THEN '1-2-9-example-nan-is-sticky'
  WHEN '1-2-13-lab-predict-the-number' THEN '1-2-10-lab-predict-the-number'
  WHEN '1-2-14-reading-bigint' THEN '1-2-11-reading-bigint'
  WHEN '1-2-15-reading-strings-and-quotes' THEN '1-2-12-reading-strings-and-quotes'
  WHEN '1-2-16-reading-template-literals' THEN '1-2-13-reading-template-literals'
  WHEN '1-2-3-reading-string-methods' THEN '1-2-14-reading-string-methods'
  WHEN '1-2-17-lab-greeting-with-backticks' THEN '1-2-15-lab-greeting-with-backticks'
  WHEN '1-2-6-lab-operators-check' THEN '1-2-16-lab-operators-check'
  WHEN '1-2-18-reading-boolean' THEN '1-2-17-reading-boolean'
  WHEN '1-2-19-example-comparisons-make-booleans' THEN '1-2-18-example-comparisons-make-booleans'
  WHEN '1-2-20-reading-null' THEN '1-2-19-reading-null'
  WHEN '1-2-21-reading-undefined' THEN '1-2-20-reading-undefined'
  WHEN '1-2-22-null-vs-undefined' THEN '1-2-21-null-vs-undefined'
  WHEN '1-2-23-reading-primitive-vs-object' THEN '1-2-22-reading-primitive-vs-object'
  WHEN '1-2-24-reading-typeof' THEN '1-2-23-reading-typeof'
  WHEN '1-2-25-example-typeof-surprises' THEN '1-2-24-example-typeof-surprises'
  WHEN '1-2-26-lab-typeof-round-up' THEN '1-2-25-lab-typeof-round-up'
  WHEN '1-2-5-lab-variables-types-check' THEN '1-2-26-lab-variables-types-check'
  WHEN '1-2-30-unit-quiz' THEN '1-2-31-unit-quiz'
  WHEN '1-3-20-a1-3-3-unit-quiz' THEN '1-3-21-a1-3-3-unit-quiz'
  WHEN '1-5-44-unit-quiz' THEN '1-5-45-unit-quiz'
END WHERE lesson_id IN (
  '1-1-6-first-statement', '1-1-8-reading-four-phases', '1-1-9-classify-the-task',
  '1-1-10-example-greeting-phases', '1-1-11-reading-umbrella', '1-1-12-name-that-umbrella',
  '1-1-13-reading-actions', '1-1-14-reading-task-sets', '1-1-15-example-task-set-loop',
  '1-1-16-write-a-task-set', '1-1-17-reading-sdlc', '1-1-18-reading-four-ps',
  '1-1-19-same-framework', '1-1-20-reading-prescriptive', '1-1-21-reading-prescriptive-limits',
  '1-1-22-does-it-fit', '1-1-23-a1-2-describe-lifecycle', '1-1-7-a3-3-unit-quiz',
  '1-2-7-reading-every-value-has-a-type', '1-2-8-reading-dynamically-typed',
  '1-2-9-lab-change-the-type', '1-2-10-reading-number', '1-2-4-reading-operators-coercion',
  '1-2-11-reading-special-numeric-values', '1-2-12-example-nan-is-sticky',
  '1-2-13-lab-predict-the-number', '1-2-14-reading-bigint', '1-2-15-reading-strings-and-quotes',
  '1-2-16-reading-template-literals', '1-2-3-reading-string-methods',
  '1-2-17-lab-greeting-with-backticks', '1-2-6-lab-operators-check', '1-2-18-reading-boolean',
  '1-2-19-example-comparisons-make-booleans', '1-2-20-reading-null', '1-2-21-reading-undefined',
  '1-2-22-null-vs-undefined', '1-2-23-reading-primitive-vs-object', '1-2-24-reading-typeof',
  '1-2-25-example-typeof-surprises', '1-2-26-lab-typeof-round-up',
  '1-2-5-lab-variables-types-check', '1-2-30-unit-quiz',
  '1-3-20-a1-3-3-unit-quiz', '1-5-44-unit-quiz'
);

UPDATE lesson_submissions SET lesson_id = CASE lesson_id
  WHEN '1-1-6-first-statement' THEN '1-1-3-first-statement'
  WHEN '1-1-8-reading-four-phases' THEN '1-1-6-reading-four-phases'
  WHEN '1-1-9-classify-the-task' THEN '1-1-7-classify-the-task'
  WHEN '1-1-10-example-greeting-phases' THEN '1-1-8-example-greeting-phases'
  WHEN '1-1-11-reading-umbrella' THEN '1-1-10-reading-umbrella'
  WHEN '1-1-12-name-that-umbrella' THEN '1-1-11-name-that-umbrella'
  WHEN '1-1-13-reading-actions' THEN '1-1-12-reading-actions'
  WHEN '1-1-14-reading-task-sets' THEN '1-1-13-reading-task-sets'
  WHEN '1-1-15-example-task-set-loop' THEN '1-1-14-example-task-set-loop'
  WHEN '1-1-16-write-a-task-set' THEN '1-1-15-write-a-task-set'
  WHEN '1-1-17-reading-sdlc' THEN '1-1-16-reading-sdlc'
  WHEN '1-1-18-reading-four-ps' THEN '1-1-17-reading-four-ps'
  WHEN '1-1-19-same-framework' THEN '1-1-18-same-framework'
  WHEN '1-1-20-reading-prescriptive' THEN '1-1-19-reading-prescriptive'
  WHEN '1-1-21-reading-prescriptive-limits' THEN '1-1-20-reading-prescriptive-limits'
  WHEN '1-1-22-does-it-fit' THEN '1-1-21-does-it-fit'
  WHEN '1-1-23-a1-2-describe-lifecycle' THEN '1-1-22-a1-2-describe-lifecycle'
  WHEN '1-1-7-a3-3-unit-quiz' THEN '1-1-23-a3-3-unit-quiz'
  WHEN '1-2-7-reading-every-value-has-a-type' THEN '1-2-3-reading-every-value-has-a-type'
  WHEN '1-2-8-reading-dynamically-typed' THEN '1-2-4-reading-dynamically-typed'
  WHEN '1-2-9-lab-change-the-type' THEN '1-2-5-lab-change-the-type'
  WHEN '1-2-10-reading-number' THEN '1-2-6-reading-number'
  WHEN '1-2-4-reading-operators-coercion' THEN '1-2-7-reading-operators-coercion'
  WHEN '1-2-11-reading-special-numeric-values' THEN '1-2-8-reading-special-numeric-values'
  WHEN '1-2-12-example-nan-is-sticky' THEN '1-2-9-example-nan-is-sticky'
  WHEN '1-2-13-lab-predict-the-number' THEN '1-2-10-lab-predict-the-number'
  WHEN '1-2-14-reading-bigint' THEN '1-2-11-reading-bigint'
  WHEN '1-2-15-reading-strings-and-quotes' THEN '1-2-12-reading-strings-and-quotes'
  WHEN '1-2-16-reading-template-literals' THEN '1-2-13-reading-template-literals'
  WHEN '1-2-3-reading-string-methods' THEN '1-2-14-reading-string-methods'
  WHEN '1-2-17-lab-greeting-with-backticks' THEN '1-2-15-lab-greeting-with-backticks'
  WHEN '1-2-6-lab-operators-check' THEN '1-2-16-lab-operators-check'
  WHEN '1-2-18-reading-boolean' THEN '1-2-17-reading-boolean'
  WHEN '1-2-19-example-comparisons-make-booleans' THEN '1-2-18-example-comparisons-make-booleans'
  WHEN '1-2-20-reading-null' THEN '1-2-19-reading-null'
  WHEN '1-2-21-reading-undefined' THEN '1-2-20-reading-undefined'
  WHEN '1-2-22-null-vs-undefined' THEN '1-2-21-null-vs-undefined'
  WHEN '1-2-23-reading-primitive-vs-object' THEN '1-2-22-reading-primitive-vs-object'
  WHEN '1-2-24-reading-typeof' THEN '1-2-23-reading-typeof'
  WHEN '1-2-25-example-typeof-surprises' THEN '1-2-24-example-typeof-surprises'
  WHEN '1-2-26-lab-typeof-round-up' THEN '1-2-25-lab-typeof-round-up'
  WHEN '1-2-5-lab-variables-types-check' THEN '1-2-26-lab-variables-types-check'
  WHEN '1-2-30-unit-quiz' THEN '1-2-31-unit-quiz'
  WHEN '1-3-20-a1-3-3-unit-quiz' THEN '1-3-21-a1-3-3-unit-quiz'
  WHEN '1-5-44-unit-quiz' THEN '1-5-45-unit-quiz'
END WHERE lesson_id IN (
  '1-1-6-first-statement', '1-1-8-reading-four-phases', '1-1-9-classify-the-task',
  '1-1-10-example-greeting-phases', '1-1-11-reading-umbrella', '1-1-12-name-that-umbrella',
  '1-1-13-reading-actions', '1-1-14-reading-task-sets', '1-1-15-example-task-set-loop',
  '1-1-16-write-a-task-set', '1-1-17-reading-sdlc', '1-1-18-reading-four-ps',
  '1-1-19-same-framework', '1-1-20-reading-prescriptive', '1-1-21-reading-prescriptive-limits',
  '1-1-22-does-it-fit', '1-1-23-a1-2-describe-lifecycle', '1-1-7-a3-3-unit-quiz',
  '1-2-7-reading-every-value-has-a-type', '1-2-8-reading-dynamically-typed',
  '1-2-9-lab-change-the-type', '1-2-10-reading-number', '1-2-4-reading-operators-coercion',
  '1-2-11-reading-special-numeric-values', '1-2-12-example-nan-is-sticky',
  '1-2-13-lab-predict-the-number', '1-2-14-reading-bigint', '1-2-15-reading-strings-and-quotes',
  '1-2-16-reading-template-literals', '1-2-3-reading-string-methods',
  '1-2-17-lab-greeting-with-backticks', '1-2-6-lab-operators-check', '1-2-18-reading-boolean',
  '1-2-19-example-comparisons-make-booleans', '1-2-20-reading-null', '1-2-21-reading-undefined',
  '1-2-22-null-vs-undefined', '1-2-23-reading-primitive-vs-object', '1-2-24-reading-typeof',
  '1-2-25-example-typeof-surprises', '1-2-26-lab-typeof-round-up',
  '1-2-5-lab-variables-types-check', '1-2-30-unit-quiz',
  '1-3-20-a1-3-3-unit-quiz', '1-5-44-unit-quiz'
);

UPDATE commits SET lesson_id = CASE lesson_id
  WHEN '1-1-6-first-statement' THEN '1-1-3-first-statement'
  WHEN '1-1-8-reading-four-phases' THEN '1-1-6-reading-four-phases'
  WHEN '1-1-9-classify-the-task' THEN '1-1-7-classify-the-task'
  WHEN '1-1-10-example-greeting-phases' THEN '1-1-8-example-greeting-phases'
  WHEN '1-1-11-reading-umbrella' THEN '1-1-10-reading-umbrella'
  WHEN '1-1-12-name-that-umbrella' THEN '1-1-11-name-that-umbrella'
  WHEN '1-1-13-reading-actions' THEN '1-1-12-reading-actions'
  WHEN '1-1-14-reading-task-sets' THEN '1-1-13-reading-task-sets'
  WHEN '1-1-15-example-task-set-loop' THEN '1-1-14-example-task-set-loop'
  WHEN '1-1-16-write-a-task-set' THEN '1-1-15-write-a-task-set'
  WHEN '1-1-17-reading-sdlc' THEN '1-1-16-reading-sdlc'
  WHEN '1-1-18-reading-four-ps' THEN '1-1-17-reading-four-ps'
  WHEN '1-1-19-same-framework' THEN '1-1-18-same-framework'
  WHEN '1-1-20-reading-prescriptive' THEN '1-1-19-reading-prescriptive'
  WHEN '1-1-21-reading-prescriptive-limits' THEN '1-1-20-reading-prescriptive-limits'
  WHEN '1-1-22-does-it-fit' THEN '1-1-21-does-it-fit'
  WHEN '1-1-23-a1-2-describe-lifecycle' THEN '1-1-22-a1-2-describe-lifecycle'
  WHEN '1-1-7-a3-3-unit-quiz' THEN '1-1-23-a3-3-unit-quiz'
  WHEN '1-2-7-reading-every-value-has-a-type' THEN '1-2-3-reading-every-value-has-a-type'
  WHEN '1-2-8-reading-dynamically-typed' THEN '1-2-4-reading-dynamically-typed'
  WHEN '1-2-9-lab-change-the-type' THEN '1-2-5-lab-change-the-type'
  WHEN '1-2-10-reading-number' THEN '1-2-6-reading-number'
  WHEN '1-2-4-reading-operators-coercion' THEN '1-2-7-reading-operators-coercion'
  WHEN '1-2-11-reading-special-numeric-values' THEN '1-2-8-reading-special-numeric-values'
  WHEN '1-2-12-example-nan-is-sticky' THEN '1-2-9-example-nan-is-sticky'
  WHEN '1-2-13-lab-predict-the-number' THEN '1-2-10-lab-predict-the-number'
  WHEN '1-2-14-reading-bigint' THEN '1-2-11-reading-bigint'
  WHEN '1-2-15-reading-strings-and-quotes' THEN '1-2-12-reading-strings-and-quotes'
  WHEN '1-2-16-reading-template-literals' THEN '1-2-13-reading-template-literals'
  WHEN '1-2-3-reading-string-methods' THEN '1-2-14-reading-string-methods'
  WHEN '1-2-17-lab-greeting-with-backticks' THEN '1-2-15-lab-greeting-with-backticks'
  WHEN '1-2-6-lab-operators-check' THEN '1-2-16-lab-operators-check'
  WHEN '1-2-18-reading-boolean' THEN '1-2-17-reading-boolean'
  WHEN '1-2-19-example-comparisons-make-booleans' THEN '1-2-18-example-comparisons-make-booleans'
  WHEN '1-2-20-reading-null' THEN '1-2-19-reading-null'
  WHEN '1-2-21-reading-undefined' THEN '1-2-20-reading-undefined'
  WHEN '1-2-22-null-vs-undefined' THEN '1-2-21-null-vs-undefined'
  WHEN '1-2-23-reading-primitive-vs-object' THEN '1-2-22-reading-primitive-vs-object'
  WHEN '1-2-24-reading-typeof' THEN '1-2-23-reading-typeof'
  WHEN '1-2-25-example-typeof-surprises' THEN '1-2-24-example-typeof-surprises'
  WHEN '1-2-26-lab-typeof-round-up' THEN '1-2-25-lab-typeof-round-up'
  WHEN '1-2-5-lab-variables-types-check' THEN '1-2-26-lab-variables-types-check'
  WHEN '1-2-30-unit-quiz' THEN '1-2-31-unit-quiz'
  WHEN '1-3-20-a1-3-3-unit-quiz' THEN '1-3-21-a1-3-3-unit-quiz'
  WHEN '1-5-44-unit-quiz' THEN '1-5-45-unit-quiz'
END WHERE lesson_id IN (
  '1-1-6-first-statement', '1-1-8-reading-four-phases', '1-1-9-classify-the-task',
  '1-1-10-example-greeting-phases', '1-1-11-reading-umbrella', '1-1-12-name-that-umbrella',
  '1-1-13-reading-actions', '1-1-14-reading-task-sets', '1-1-15-example-task-set-loop',
  '1-1-16-write-a-task-set', '1-1-17-reading-sdlc', '1-1-18-reading-four-ps',
  '1-1-19-same-framework', '1-1-20-reading-prescriptive', '1-1-21-reading-prescriptive-limits',
  '1-1-22-does-it-fit', '1-1-23-a1-2-describe-lifecycle', '1-1-7-a3-3-unit-quiz',
  '1-2-7-reading-every-value-has-a-type', '1-2-8-reading-dynamically-typed',
  '1-2-9-lab-change-the-type', '1-2-10-reading-number', '1-2-4-reading-operators-coercion',
  '1-2-11-reading-special-numeric-values', '1-2-12-example-nan-is-sticky',
  '1-2-13-lab-predict-the-number', '1-2-14-reading-bigint', '1-2-15-reading-strings-and-quotes',
  '1-2-16-reading-template-literals', '1-2-3-reading-string-methods',
  '1-2-17-lab-greeting-with-backticks', '1-2-6-lab-operators-check', '1-2-18-reading-boolean',
  '1-2-19-example-comparisons-make-booleans', '1-2-20-reading-null', '1-2-21-reading-undefined',
  '1-2-22-null-vs-undefined', '1-2-23-reading-primitive-vs-object', '1-2-24-reading-typeof',
  '1-2-25-example-typeof-surprises', '1-2-26-lab-typeof-round-up',
  '1-2-5-lab-variables-types-check', '1-2-30-unit-quiz',
  '1-3-20-a1-3-3-unit-quiz', '1-5-44-unit-quiz'
);
