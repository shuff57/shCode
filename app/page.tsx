import LessonSearchFilter from '../components/LessonSearchFilter';
import { loadLessons } from '../lib/lessons';
import { listUnits } from '../lib/curriculum';
import type { Lesson } from '../lib/types';
import { formQuestionCount } from '../lib/quiz-variant';

// The home page draws cards. A card shows a title, a description, a badge and
// a due chip -- it never touches a lesson's quiz, its grading rubric, its
// files or its requirements. But `lessons` crosses into LessonSearchFilter,
// which is `use client`, so whatever is on these objects is serialised into
// the page's RSC payload and readable with View Source.
//
// Measured on production 2026-09-03, BEFORE this projection: out/index.html
// was 2.59 MB and carried 121 quiz explanations, every summative answer key,
// and the full grading brief for 1.7.2 and 1.7.5 -- the marking instructions
// that name every accepted answer. On the first page of the site, signed out.
//
// lib/quiz-redact.ts does not help here: it strips a SUMMATIVE item's key,
// and this page ships every lesson in the course. So the fix is the other
// direction -- send only the fields the card tree reads, and let the type
// system keep the list honest. `files`, `steps` and `requirements` are
// required by Lesson, so they go across empty rather than absent.
//
// If a card ever needs another field, add it here. Do not pass `lessons`
// straight through, and do not reach for redactLessonForClient instead:
// it would leave every FORMATIVE quiz's answer key in the payload.
//
// `maxScore` is the one exception to "never touches a quiz/rubric": it is a
// single count (# of questions, or sum of rubric points), never the
// questions or the rubric itself, so it carries no answer and is safe to
// ship. It is what lets UnitProgressBadge weight a quiz/written lesson's
// completion by actual score instead of flat done/not-done -- see
// lib/progress.ts lessonPercent().
function maxScoreFor(l: Lesson): number | null {
  if (l.quiz && l.quiz.questions.length > 0) return formQuestionCount(l.quiz);
  if (l.grading?.formative) return null;
  const g = l.aiGrader ?? l.diagram?.aiGrader;
  if (g) {
    const total = g.rubric.reduce((sum, r) => sum + r.points, 0);
    if (total > 0) return total;
    // 0 = pass/fail rubric: criteria met out of criteria total, the same number the server
    // stores as the best (lib/grade-pass.ts criteriaScore; scripts/generate-lessons-manifest.mjs).
    if (g.rubric.length > 0) return g.rubric.length;
  }
  return null;
}

// scoreKind decides the GRADE CATEGORY (lib/grading-weights.ts: 'written' beats an
// assignmentCode's 'lab'), so it stays rubric-POINTS based: a pass/fail rubric gets a
// maxScore for its percent (above) but must not move from Lab to Written.
function scoreKindFor(l: Lesson): 'quiz' | 'written' | null {
  if (l.quiz && l.quiz.questions.length > 0) return 'quiz';
  if (l.grading?.formative) return null;
  const g = l.aiGrader ?? l.diagram?.aiGrader;
  if (g && g.rubric.reduce((sum, r) => sum + r.points, 0) > 0) return 'written';
  return null;
}

function forCards(l: Lesson): Lesson {
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    type: l.type,
    category: l.category,
    preview: l.preview,
    week: l.week,
    estimateMins: l.estimateMins,
    files: [],
    steps: [],
    requirements: [],
    assignmentCode: l.assignmentCode,
    maxScore: maxScoreFor(l),
    scoreKind: scoreKindFor(l),
  };
}

export default async function HomePage() {
  const lessons = await loadLessons();
  const units = await listUnits();

  return (
    <div className="p-4">
      <LessonSearchFilter units={units} lessons={lessons.map(forCards)} />

      <footer className="flex items-center justify-between w-2/3 mx-auto mt-8 pt-4 border-t border-border text-sm opacity-70">
        <span>© {new Date().getFullYear()} shCode</span>
        <span>LHD™</span>
      </footer>
    </div>
  );
}
