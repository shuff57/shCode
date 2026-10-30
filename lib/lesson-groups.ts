import fs from 'fs/promises';
import path from 'path';

/**
 * Lesson groups: the layer between a module and its screens.
 *
 * A module page lists 15–45 screens in a row; a CodeHS module splits the same
 * work into lessons of 4–6 activities, each with one objective, so a student
 * gets a closure point before the module ends. This is that layer, authored
 * per module in `curriculum/groups/<moduleId>.json` and keyed by lesson
 * FOLDER id (never the numbered title — the numbers still have to survive a
 * renumber, and `5.1.24` lives in the folder `moshion-gravity`).
 *
 * Groups are presentation only. Progress, completion, locking and the "X of Y"
 * counts all stay per screen, so adding a group cannot orphan a student's D1
 * progress the way a renumber can.
 */

export interface LessonGroup {
  id: string;
  title: string;
  objective: string;
  screens: string[];
}

interface GroupFile {
  moduleId: string;
  source?: string;
  lessons: LessonGroup[];
}

const GROUPS_DIR = path.join(process.cwd(), 'curriculum', 'groups');

/** Every problem with these groups against the module's screens, in plain words. */
export function validateGroups(groups: LessonGroup[], screenIds: string[]): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  const ids = new Set<string>();

  if (groups.length === 0) problems.push('no lessons defined');

  groups.forEach((g, i) => {
    const where = `lesson ${i + 1} ("${g.title || g.id || '?'}")`;
    if (!g.id) problems.push(`${where}: missing id`);
    else if (ids.has(g.id)) problems.push(`${where}: duplicate id "${g.id}"`);
    ids.add(g.id);
    if (!g.title) problems.push(`${where}: missing title`);
    if (!g.objective) problems.push(`${where}: missing objective`);
    if (!Array.isArray(g.screens) || g.screens.length === 0) {
      problems.push(`${where}: has no screens`);
      return;
    }
    if (g.screens.length > 8) {
      problems.push(`${where}: ${g.screens.length} screens — a lesson is 4–6, and 8 is the ceiling`);
    }
    for (const s of g.screens) {
      const prior = seen.get(s);
      if (prior) problems.push(`${where}: screen "${s}" already belongs to "${prior}"`);
      else seen.set(s, g.title || g.id);
      if (!screenIds.includes(s)) problems.push(`${where}: screen "${s}" is not in this module`);
    }
  });

  for (const s of screenIds) {
    if (!seen.has(s)) problems.push(`screen "${s}" belongs to no lesson`);
  }

  // Groups must follow the module's own screen order, and be contiguous: a
  // screen that appears before its group's first screen would render under the
  // wrong heading on the module page.
  const order = new Map(screenIds.map((s, i) => [s, i]));
  let last = -1;
  for (const g of groups) {
    for (const s of g.screens) {
      const at = order.get(s);
      if (at === undefined) continue;
      if (at <= last) problems.push(`lesson "${g.title || g.id}": screens are out of module order at "${s}"`);
      last = at;
    }
  }

  return problems;
}

/** The groups authored for a module, or null when it has none yet. */
export async function loadModuleGroups(moduleId: string): Promise<LessonGroup[] | null> {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(GROUPS_DIR, `${moduleId}.json`), 'utf8');
  } catch {
    return null;
  }
  const parsed = JSON.parse(raw) as GroupFile;
  if (parsed.moduleId && parsed.moduleId !== moduleId) {
    throw new Error(`curriculum/groups/${moduleId}.json declares moduleId "${parsed.moduleId}"`);
  }
  return parsed.lessons ?? [];
}
