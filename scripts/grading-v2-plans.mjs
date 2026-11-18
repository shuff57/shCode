// The plan labs grading v2 scores out of their card count, and that count: lessonScoreFields() with v2 on,
// the very function the manifest uses, so the backfill and the impact report cannot disagree with it.
import { readdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { lessonScoreFields } from './lesson-score-fields.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** lessonId -> card count, for every plan whose maxScore exists only because of v2. */
export function planCardMaxima() {
  const out = new Map();
  for (const id of readdirSync(path.join(root, 'lessons'))) {
    const p = path.join(root, 'lessons', id, 'lesson.json');
    if (!existsSync(p)) continue;
    const meta = JSON.parse(readFileSync(p, 'utf8'));
    if (meta.work?.kind !== 'plan') continue;
    const before = lessonScoreFields(meta, null, false).maxScore;
    const after = lessonScoreFields(meta, null, true).maxScore;
    if (before === null && typeof after === 'number') out.set(meta.id ?? id, after);
  }
  return out;
}
