import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { loadModuleGroups, validateGroups, type LessonGroup } from './lesson-groups';

/**
 * Hierarchy:
 *   Unit    = top-level (e.g. "Unit 2: moSHion — Applied Game Development") — category field on lessons
 *   Module  = mid-level (e.g. "2.1 moSHion Foundations") — one .md file in curriculum/modules/
 *   Lesson  = leaf     (e.g. "2.1.1 Video: Your first moSHion sketch") — one folder under lessons/
 */

const ROOT = process.cwd();
const MODULES_DIR = path.join(ROOT, 'curriculum', 'modules');
const ASSIGNMENTS_DIR = path.join(ROOT, 'assignments');
const LESSONS_DIR = path.join(ROOT, 'lessons');

async function renderMarkdown(src: string): Promise<string> {
  const html = String(await marked.parse(src));
  return DOMPurify.sanitize(html);
}

function parseFrontmatter(src: string): { data: Record<string, any>; body: string } {
  // Line-ending agnostic: Windows checkouts (core.autocrlf) produce CRLF files,
  // which the naive /^---\n/ form silently fails to parse -> zero modules.
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: src };
  const data: Record<string, any> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    let val: any = raw.trim();
    if (/^\[.*\]$/.test(val)) {
      try { val = JSON.parse(val.replace(/'/g, '"')); } catch { /* ignore */ }
    } else if (val === 'true' || val === 'false') {
      val = val === 'true';
    } else if (/^-?\d+(\.\d+)?$/.test(val)) {
      val = Number(val);
    } else if (/^["'].*["']$/.test(val)) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  }
  return { data, body: match[2] };
}

async function readIfExists(p: string): Promise<string | null> {
  try { return await fs.readFile(p, 'utf8'); } catch { return null; }
}

export interface ModuleSummary {
  id: string;            // e.g. "2.1"
  title: string;
  quarter?: number;
  weeks?: number[];
  environment?: string;
  category?: string;     // category lesson.json must match to appear in this module
  slug: string;          // e.g. "2.1_moshion-foundations"
  /**
   * Keep this module out of the COURSE LIST (home page and its search), while
   * still building its pages and letting a direct link work.
   *
   * Deliberately not `status`: that field says how finished a module's DOC is,
   * and 23 of the 40 modules say `draft` — all of Unit 1 among them — so
   * filtering on it would hide most of the course. `hidden` says exactly one
   * thing: do not advertise this module yet. 8.1 Solid Shapes is the first user
   * (the 3D track is paused).
   */
  hidden?: boolean;
}

export interface LessonInModule {
  id: string;            // lesson folder name
  numberedId: string;    // e.g. "2.1.1"
  title: string;         // full title from lesson.json
  displayTitle: string;  // title with numberedId stripped
  type?: string;         // lesson.json type field
  preview?: string;      // lesson.json preview field (new types: reading, video, example, challenge, slides)
  estimateMins?: number;
  week?: number;
}

export interface ModuleArtifact {
  kind: string;
  label: string;
  filename: string;
  html: string;
}

// A production build renders every lesson page (twice: /lesson/ and
// /assignment/), and each one asks for its module. Uncached, that meant every
// page re-read all 97 module files and all ~990 lesson.json files one await at
// a time, and ran the module's markdown through marked + DOMPurify (jsdom) for
// HTML a lesson page never shows -- most of the export's time. The tree does
// not change during a build, so production memoises per process; dev reads
// fresh every time so an edited lesson or module shows up on reload.
// The cached objects are shared between pages: callers must not mutate them.
const memoise = process.env.NODE_ENV === 'production';
let modulesCache: Promise<ModuleSummary[]> | null = null;
const moduleCache = new Map<string, ReturnType<typeof readModule>>();

export function listModules(): Promise<ModuleSummary[]> {
  if (!memoise) return readModules();
  if (!modulesCache) modulesCache = readModules();
  return modulesCache;
}

async function readModules(): Promise<ModuleSummary[]> {
  let entries: { name: string; isFile: () => boolean }[] = [];
  try {
    entries = await fs.readdir(MODULES_DIR, { withFileTypes: true }) as any;
  } catch { return []; }

  const moduleFiles = entries
    .filter((e) => e.isFile && e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name);

  const modules: ModuleSummary[] = [];
  for (const f of moduleFiles) {
    const src = await fs.readFile(path.join(MODULES_DIR, f), 'utf8');
    const { data } = parseFrontmatter(src);
    if (!data.id) continue;
    modules.push({
      id: String(data.id),
      title: data.title ?? f,
      quarter: data.quarter,
      weeks: data.weeks,
      environment: data.environment,
      category: data.category,
      slug: f.replace(/\.md$/, ''),
      hidden: data.hidden === true,
    });
  }
  modules.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return modules;
}

// For backward compat with home page
export const listUnits = listModules;

function parseNumberedIdFromTitle(title: string): string | null {
  const m = title.match(/^(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

// Every lesson folder's parsed lesson.json, in readdir order. One read of the
// tree per build process (see `memoise`), not one per module asked for.
let lessonMetasCache: Promise<{ name: string; parsed: any }[]> | null = null;

function lessonMetas(): Promise<{ name: string; parsed: any }[]> {
  if (!memoise) return readLessonMetas();
  if (!lessonMetasCache) lessonMetasCache = readLessonMetas();
  return lessonMetasCache;
}

async function readLessonMetas(): Promise<{ name: string; parsed: any }[]> {
  let dirs: any[] = [];
  try {
    dirs = await fs.readdir(LESSONS_DIR, { withFileTypes: true });
  } catch { return []; }
  const metas = await Promise.all(dirs.map(async (d) => {
    if (!d.isDirectory()) return null;
    const meta = await readIfExists(path.join(LESSONS_DIR, d.name, 'lesson.json'));
    if (!meta) return null;
    try { return { name: d.name as string, parsed: JSON.parse(meta) }; } catch { return null; }
  }));
  return metas.filter((m): m is { name: string; parsed: any } => m !== null);
}

async function listLessonsInModule(moduleId: string, requiredCategory?: string): Promise<LessonInModule[]> {
  const out: LessonInModule[] = [];
  for (const { name, parsed } of await lessonMetas()) {
    const numberedId = parseNumberedIdFromTitle(String(parsed.title || ''));
    if (!numberedId) continue;
    // Numbered id must start with moduleId + "." (so "2.1" matches "2.1.1", "2.1.10" but not "2.11.1")
    if (!(numberedId === moduleId || numberedId.startsWith(moduleId + '.'))) continue;
    // If the module spec declares a required category, only include lessons that match.
    if (requiredCategory && parsed.category !== requiredCategory) continue;
    const titleRest = String(parsed.title).replace(/^\d+\.\d+\.\d+\s*/, '').trim();
    out.push({
      id: name,
      numberedId,
      title: parsed.title,
      displayTitle: titleRest,
      type: parsed.type,
      preview: parsed.preview,
      estimateMins: parsed.estimateMins,
      week: parsed.week,
    });
  }
  out.sort((a, b) => a.numberedId.localeCompare(b.numberedId, undefined, { numeric: true }));
  return out;
}

export function getModule(moduleId: string): ReturnType<typeof readModule> {
  if (!memoise) return readModule(moduleId);
  let hit = moduleCache.get(moduleId);
  if (!hit) { hit = readModule(moduleId); moduleCache.set(moduleId, hit); }
  return hit;
}

async function readModule(moduleId: string): Promise<{
  summary: ModuleSummary;
  html: string;
  lessons: LessonInModule[];
  artifacts: ModuleArtifact[];
  /** The module's lesson layer, or null when it has none authored yet. */
  groups: LessonGroup[] | null;
} | null> {
  const modules = await listModules();
  const summary = modules.find((m) => m.id === moduleId);
  if (!summary) return null;

  const src = await fs.readFile(path.join(MODULES_DIR, `${summary.slug}.md`), 'utf8');
  const { body } = parseFrontmatter(src);
  const html = await renderMarkdown(body);
  const lessons = await listLessonsInModule(moduleId, summary.category);

  // The lesson layer (curriculum/groups/<id>.json). A module without the file
  // renders exactly as before, so this can be adopted one module at a time.
  // A group file that disagrees with the folder tree is a build error rather
  // than a screen quietly falling outside every lesson.
  const groups = await loadModuleGroups(moduleId);
  if (groups) {
    const problems = validateGroups(groups, lessons.map((l) => l.id));
    if (problems.length) {
      throw new Error(`curriculum/groups/${moduleId}.json:\n  ${problems.join('\n  ')}`);
    }
  }

  // Collect any module-level artifacts in assignments/{moduleId}_* for legacy support
  const artifacts: ModuleArtifact[] = [];
  try {
    const assignFiles = await fs.readdir(ASSIGNMENTS_DIR);
    for (const f of assignFiles) {
      if (!f.startsWith(`${moduleId}_`) || !f.endsWith('.md')) continue;
      const content = await readIfExists(path.join(ASSIGNMENTS_DIR, f));
      if (!content) continue;
      artifacts.push({
        kind: 'module-artifact',
        label: f.replace(/^[\d.]+_/, '').replace(/\.md$/, '').replace(/-/g, ' '),
        filename: f,
        html: await renderMarkdown(content),
      });
    }
  } catch { /* no assignments dir */ }

  return { summary, html, lessons, artifacts, groups };
}

