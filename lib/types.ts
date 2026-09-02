import type { DiagramConfig } from './diagram-types';

// ---- File System ----

export type FileType = 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'text' | 'python';

export interface FileNode {
  id: string;
  type: 'file' | 'folder';
  name: string;
  path: string;
  language?: FileType;
  content?: string;
  children?: FileNode[];
}

// ---- Version Control ----

export interface Commit {
  id: string;
  message: string;
  timestamp: number;
  changedFileIds: string[];
  fileContentsSnapshot: Record<string, string>;
  /** Email of whoever wrote this commit. For teacher pushes, this is
   *  the teacher's email and differs from the owning student's email. */
  authoredByEmail?: string;
}

export interface Version {
  timestamp: number;
  content: string;
}

export type FileHistory = Record<string, Version[]>;

// ---- Lessons & Assignments ----

export type LessonType = 'lesson' | 'assignment' | 'project' | 'example' | 'challenge';
export type RequirementType = 'regex' | 'inFunction' | 'output' | 'function' | 'custom';

export interface Step {
  id: string;
  title: string;
  instructions?: string;
  hints?: string[];
  requiredCommit?: boolean;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  messages?: string[];
  type?: RequirementType;
  file?: string;
  pattern?: string;
  flags?: string;
  /** For inFunction type: a single function name ("draw") or a list of names
   *  ("draw" + "update") whose bodies are concatenated before matching. */
  function?: string | string[];
  expected?: string;
  testFn?: string;
  /** Shown to the student ONLY when this requirement fails — grade() copies
   *  it into `messages`, which RequirementCard and GradeReport already
   *  render. Say what to look at, not what to type: a hint that hands over
   *  the answer turns the checklist into the assignment. Optional; a
   *  requirement without one fails silently, the way all of them used to. */
  hint?: string;
  points?: number;
  /** Set false to test the raw source instead of the comment-stripped
   *  version — needed for requirements that check for comments themselves
   *  (e.g. "at least four // comments"), since stripping runs first and
   *  would delete the very thing being matched for. Defaults to true. */
  stripComments?: boolean;
}

export interface Grading {
  totalPoints: number;
  passingScore: number;
  allowLateSubmit?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  type?: LessonType;
  estimateMins: number;
  /** Curriculum-plan assignment code (e.g. "A2.2.1"). Not shown to students;
   *  it exists so the plan and the lesson still resolve to each other. */
  assignmentCode?: string;
  category?: string;
  unit?: string;
  preview?: 'html' | 'console' | 'reshape' | 'moshion' | 'reading' | 'video' | 'example' | 'challenge' | 'assignment' | 'slides' | 'diagram' | 'quiz';
  week?: number;
  slos?: string[];
  files: FileNode[];
  steps: Step[];
  requirements: Requirement[];
  grading?: Grading;
  aiGrader?: AiGraderConfig;
  /** Flowchart assignment. See lib/diagram-types.ts. */
  diagram?: DiagramConfig;
  /** Multiple-choice module quiz. Graded in the browser — see components/QuizView.tsx. */
  quiz?: QuizConfig;
  /**
   * Part two of a split assignment: the lesson id of the part that holds the
   * student's flowchart. Renders that chart read-only above the editor and
   * seeds the starter with its pseudocode — see components/PlanChartPanel.tsx.
   * Set on 1.5.31, whose plan lives in 1.5.30.
   */
  planFrom?: string;
  /** Display label for `planFrom`, e.g. "1.5.30". */
  planFromLabel?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  /** Optional snippet rendered monospace above the options — for trace-the-code questions. */
  code?: string;
  /** Two or more. Exactly one is correct; the rest must be wrong, not merely worse. */
  options: string[];
  /** 0-based index into `options`. */
  answer: number;
  /** Shown after submitting, right or wrong. Says why, never just "correct". */
  explanation: string;
  /** Displayed lesson number to reread, e.g. "1.4.5". */
  source?: string;
  /**
   * Which form of the test this question belongs to. Only meaningful when the
   * quiz declares `variants`: a student assigned form "b" is shown the
   * untagged questions plus the ones tagged "b", and never sees "a" or "c".
   * Absent means "every form asks this one".
   */
  variant?: string;
}

export interface QuizConfig {
  /** Percent correct needed to advance. Default 70. */
  passPercent?: number;
  /**
   * Re-order questions and options per student. **Off by default, and that
   * default is load-bearing:** module quizzes routinely explain themselves
   * positionally ("the second list is the lifecycle"), and shuffling turns
   * those notes into lies. Opt in only when every explanation is written
   * without reference to where an option sits -- scripts/test-quiz.mjs
   * refuses a shuffled quiz whose prose says "the third".
   */
  shuffle?: boolean;
  /**
   * Form labels, e.g. `["a", "b", "c"]`. Each student is assigned one
   * deterministically from their email, so a proctored room gets neighbours
   * on different forms with no cards to hand out and nothing for a teacher
   * to track. Every form must end up the same length -- the checker enforces
   * it.
   */
  variants?: string[];
  /**
   * Test mode. A module quiz is formative -- it marks each answer, explains
   * itself and invites another go. A chapter test is not: submitting is final,
   * the paper locks, no answer is marked, no explanation is shown, and the
   * lesson completes on submission rather than on a score, because the course
   * is green-to-advance and a summative score is the teacher's to hand back.
   */
  summative?: boolean;
  questions: QuizQuestion[];
}

export interface AiGraderConfig {
  /**
   * Test mode, the written-response twin of QuizConfig.summative. One
   * submission, no rubric feedback returned to the student, and the lesson
   * completes on submission. Rubric feedback on a graded test is the answer
   * key: it names the criterion that was missed, and the student resubmits.
   */
  summative?: boolean;
  rubricTitle?: string;
  model?: string;
  contextDocs?: string[];
  prompt?: string;              // the prompt students responded to (for the grader context)
  rubric: Array<{ id: string; title: string; description?: string; points: number }>;
}

// ---- Student State (localStorage) ----

export interface StudentProgress {
  lessonId: string;
  fileContents: Record<string, string>;
  commits: Commit[];
  lastCommittedFileContents: Record<string, string>;
  fileHistory: FileHistory;
  completedSteps: string[];
  submissionStatus: 'in-progress' | 'submitted' | 'graded';
  score: number | null;
  submittedAt: number | null;
}
