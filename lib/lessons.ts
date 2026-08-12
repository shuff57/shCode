import fs from 'fs/promises';
import path from 'path';
import type { FileNode, FileType, Lesson } from './types';

// Re-export types for backward compatibility
export type { FileNode, Requirement, Lesson, Difficulty } from './types';

function inferLanguage(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return 'html';
    case 'css': return 'css';
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'json': return 'json';
    case 'py': return 'python';
    default: return 'text';
  }
}

let cache: Lesson[] | null = null;

async function readFiles(dir: string, rel = ''): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes = await Promise.all(
    entries
      // solution.js holds the reference answer — bundled separately for the
      // admin/teacher-only /api/lesson-solution endpoint, never sent to clients.
      .filter((e) => e.name !== 'lesson.json' && e.name !== 'solution.js')
      .map(async (entry) => {
        const full = path.join(dir, entry.name);
        const relative = path.join(rel, entry.name).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          const id = relative.replace(/\//g, '-');
          return {
            id,
            type: 'folder',
            name: entry.name,
            path: relative,
            children: await readFiles(full, relative),
          } as FileNode;
        }
        const content = await fs.readFile(full, 'utf8');
        const id = relative.replace(/\//g, '-');
        return {
          id,
          type: 'file',
          name: entry.name,
          path: relative,
          language: inferLanguage(entry.name),
          content,
        } as FileNode;
      })
  );
  return nodes;
}

export async function loadLessons(): Promise<Lesson[]> {
  if (cache) return cache;
  const lessonsDir = path.join(process.cwd(), 'lessons');
  const entries = await fs.readdir(lessonsDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const results = await Promise.all(
    dirs.map(async (id) => {
      const base = path.join(lessonsDir, id);
      // A folder with no lesson.json directly inside it (e.g. lessons/_retired/,
      // which nests retired lesson folders one level deeper) isn't a lesson —
      // skip it rather than error, same as generate-lessons-manifest.mjs.
      let raw: string;
      try {
        raw = await fs.readFile(path.join(base, 'lesson.json'), 'utf8');
      } catch {
        return null;
      }
      const meta = JSON.parse(raw);
      const files = await readFiles(base);
      return {
        ...meta,
        files,
        steps: meta.steps || [],
        requirements: (meta.requirements || []).map((r: any) => ({
          ...r,
          status: 'pending',
        })),
      } as Lesson;
    })
  );
  cache = results.filter((l): l is Lesson => l !== null);
  return cache;
}

export async function getLesson(id: string): Promise<Lesson | undefined> {
  const lessons = await loadLessons();
  return lessons.find((l) => l.id === id);
}
