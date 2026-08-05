import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Hierarchy:
 *   Unit    = top-level (e.g. "Unit 2: shPlay — Applied Game Development") — category field on lessons
 *   Module  = mid-level (e.g. "2.1 shPlay Foundations") — one .md file in curriculum/modules/
 *   Lesson  = leaf     (e.g. "2.1.1 Video: Your first shPlay sketch") — one folder under lessons/
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
  const match = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: src };
  const data: Record<string, any> = {};
  for (const line of match[1].split('\n')) {
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
  slug: string;          // e.g. "2.1_shplay-foundations"
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

export async function listModules(): Promise<ModuleSummary[]> {
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
    });
  }
  modules.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return modules;
}

// For backward compat with home page
export const listUnits = listModules;

function parseNumberedIdFromTitle(title: string): string | null {
  const m = title.match(/^(\d+\.\d+\.\d+[a-zA-Z]?)/);
  return m ? m[1] : null;
}

async function listLessonsInModule(moduleId: string, requiredCategory?: string): Promise<LessonInModule[]> {
  const out: LessonInModule[] = [];
  let dirs: any[] = [];
  try {
    dirs = await fs.readdir(LESSONS_DIR, { withFileTypes: true });
  } catch { return out; }

  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const meta = await readIfExists(path.join(LESSONS_DIR, d.name, 'lesson.json'));
    if (!meta) continue;
    let parsed: any;
    try { parsed = JSON.parse(meta); } catch { continue; }
    const numberedId = parseNumberedIdFromTitle(String(parsed.title || ''));
    if (!numberedId) continue;
    // Numbered id must start with moduleId + "." (so "2.1" matches "2.1.1", "2.1.10" but not "2.11.1")
    if (!(numberedId === moduleId || numberedId.startsWith(moduleId + '.'))) continue;
    // If the module spec declares a required category, only include lessons that match.
    if (requiredCategory && parsed.category !== requiredCategory) continue;
    const titleRest = String(parsed.title).replace(/^\d+\.\d+\.\d+[a-zA-Z]?\s*/, '').trim();
    out.push({
      id: d.name,
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

export async function getModule(moduleId: string): Promise<{
  summary: ModuleSummary;
  html: string;
  lessons: LessonInModule[];
  artifacts: ModuleArtifact[];
} | null> {
  const modules = await listModules();
  const summary = modules.find((m) => m.id === moduleId);
  if (!summary) return null;

  const src = await fs.readFile(path.join(MODULES_DIR, `${summary.slug}.md`), 'utf8');
  const { body } = parseFrontmatter(src);
  const html = await renderMarkdown(body);
  const lessons = await listLessonsInModule(moduleId, summary.category);

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

  return { summary, html, lessons, artifacts };
}

// backward-compat: getUnit is identical to getModule for our hierarchy
export const getUnit = getModule;
