// Quiz questions name the lesson to reread as a bare number ("1.1.17", or
// "1.3.13, 1.3.14 and 1.3.15"). Those lessons are written against the
// Introduction to Programming Concepts and Methodologies book on bookSHelf, so
// the hint can carry the student straight to the reading it came from.

const BOOK_BASE =
  'https://oerbookshelf.app/introduction-to-programming-concepts-and-methodologies';

/** Course unit ("1.1" of a "1.1.17" lesson number) -> the book page covering it. */
const UNIT_PAGES: Record<string, string> = {
  '1.1': 'chapter-1-foundations/1.1_software_lifecycle',
  '1.2': 'chapter-1-foundations/1.2_variables_and_data_types',
  '1.3': 'chapter-1-foundations/1.3_documentation_and_coding_conventions',
  '1.4': 'chapter-1-foundations/1.4_programming_paradigms_and_languages',
  '1.5': 'chapter-1-foundations/1.5_program_design_tools_and_environments',
  '2.1': 'chapter-2-control-flow/2.1_conditionals',
  '2.2': 'chapter-2-control-flow/2.2_algorithms_and_loops',
  '2.3': 'chapter-2-control-flow/2.3_the_switch_statement',
  '2.4': 'chapter-2-control-flow/2.4_loop_control_and_nested_loops',
  '2.5': 'chapter-2-control-flow/2.5_handling_errors_with_try_catch',
};

/** Human name of each unit's book page, used for the link tooltip. */
const UNIT_TITLES: Record<string, string> = {
  '1.1': '1.1 Software Lifecycle',
  '1.2': '1.2 Variables and Data Types',
  '1.3': '1.3 Documentation and Coding Conventions',
  '1.4': '1.4 Programming Paradigms and Languages',
  '1.5': '1.5 Program Design Tools and Environments',
  '2.1': '2.1 Conditionals',
  '2.2': '2.2 Algorithms and Loops',
  '2.3': '2.3 The Switch Statement',
  '2.4': '2.4 Loop Control and Nested Loops',
  '2.5': '2.5 Handling Errors with try/catch',
};

// The course splits a book subsection across several short lessons, so the
// numbers do not line up — 1.1.17 (the four Ps) is book 1.1.4. A lesson with no
// entry here lands on the top of its unit's page, which is still the right
// reading, just not scrolled to the paragraph.
const LESSON_ANCHORS: Record<string, string> = {
  // 1.1 Software Lifecycle
  '1.1.6': '111-the-four-framework-activities',
  '1.1.8': '111-the-four-framework-activities',
  '1.1.10': '112-umbrella-activities',
  '1.1.12': '113-task-sets-and-workflows',
  '1.1.13': '113-task-sets-and-workflows',
  '1.1.17': '114-sdlc-methodologies-and-the-four-ps',
  '1.1.19': '115-traditional-prescriptive-process-models',
  '1.1.20': '115-traditional-prescriptive-process-models',

  // 1.2 Variables and Data Types
  '1.2.8': '121-number',
  '1.2.12': '123-string',
  '1.2.13': '123-string',
  '1.2.19': '125-the-null-value',
  '1.2.20': '126-the-undefined-value',
  '1.2.23': '128-the-typeof-operator',
  '1.2.24': '128-the-typeof-operator',
  '1.2.27': 'summary',

  // 1.3 Documentation and Coding Conventions
  '1.3.6': '131-naming-variables-well',
  '1.3.7': '131-naming-variables-well',
  '1.3.8': '131-naming-variables-well',
  '1.3.13': '132-reuse-or-create',
  '1.3.14': '132-reuse-or-create',
  '1.3.15': '132-reuse-or-create',

  // 1.4 Programming Paradigms and Languages
  '1.4.2': '141-why-there-are-so-many-languages',
  '1.4.4': '142-low-level-and-high-level',
  '1.4.5': '142-low-level-and-high-level',
  '1.4.7': '143-what-a-paradigm-is',
  '1.4.8': '144-procedural-and-structured-programming',
  '1.4.9': '144-procedural-and-structured-programming',
  '1.4.10': '144-procedural-and-structured-programming',
  '1.4.15': '145-object-oriented-programming',
  '1.4.18': '146-functional-programming',

  // 1.5 Program Design Tools and Environments
  '1.5.2': '151-think-before-you-type',
  '1.5.3': '151-think-before-you-type',
  '1.5.4': 'the-four-techniques',
  '1.5.8': '152-decomposition-and-pattern-recognition',
  '1.5.11': '152-decomposition-and-pattern-recognition',
  '1.5.13': '153-abstraction',
  '1.5.14': 'layers-of-abstraction',
  '1.5.19': '154-pseudocode',
  '1.5.20': '154-pseudocode',
  '1.5.21': 'handling-a-choice-butter-or-no-butter',
  '1.5.25': '155-flowcharts',
  '1.5.26': '155-flowcharts',
  '1.5.27': 'when-to-use-which',
  '1.5.33': 'recursion',
  '1.5.34': 'recursion',
  '1.5.38': '158-reading-an-error-message',
  '1.5.41': 'finding-out-what-a-program-is-doing',
  '1.5.42': 'finding-out-what-a-program-is-doing',

  // 2.1 Conditionals
  '2.1.3': '211-the-if-statement',
  '2.1.4': '213-the-else-clause',
  '2.1.15': '212-boolean-conversion',
  '2.1.16': '212-boolean-conversion',
  '2.1.18': '218-combining-conditions',
  '2.1.22': '216-multiple',
  '2.1.23': '216-multiple',
  '2.1.28': '218-combining-conditions',
  '2.1.33': '218-combining-conditions',
};

export interface BookLink {
  url: string;
  /** Book page the link lands on, e.g. "1.1 Software Lifecycle". */
  sectionTitle: string;
}

/** The book reading behind a lesson number, or null if that unit is not in the book yet. */
export function bookLinkForLesson(lessonNumber: string): BookLink | null {
  const unit = lessonNumber.split('.').slice(0, 2).join('.');
  const page = UNIT_PAGES[unit];
  if (!page) return null;
  const anchor = LESSON_ANCHORS[lessonNumber];
  return {
    url: `${BOOK_BASE}/${page}${anchor ? `#${anchor}` : ''}`,
    sectionTitle: UNIT_TITLES[unit] ?? unit,
  };
}

export interface SourceHintPart {
  text: string;
  /** Set when this part is a lesson number the book covers. */
  link: BookLink | null;
}

/**
 * Splits a source hint into linkable numbers and the words between them, so
 * "1.3.13, 1.3.14 and 1.3.15" keeps its punctuation and links each number.
 */
export function sourceHintParts(source: string): SourceHintPart[] {
  const parts: SourceHintPart[] = [];
  const re = /\d+\.\d+(?:\.\d+)?/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    if (m.index > last) parts.push({ text: source.slice(last, m.index), link: null });
    parts.push({ text: m[0], link: bookLinkForLesson(m[0]) });
    last = m.index + m[0].length;
  }
  if (last < source.length) parts.push({ text: source.slice(last), link: null });
  return parts;
}
