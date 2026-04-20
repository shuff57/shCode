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
      .filter((e) => e.name !== 'lesson.json')
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
  cache = await Promise.all(
    dirs.map(async (id) => {
      const base = path.join(lessonsDir, id);
      const meta = JSON.parse(
        await fs.readFile(path.join(base, 'lesson.json'), 'utf8')
      );
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
  return cache;
}

export async function getLesson(id: string): Promise<Lesson | undefined> {
  const lessons = await loadLessons();
  return lessons.find((l) => l.id === id);
}

export interface LessonNeighbor {
  id: string;
  title: string;
}

// Prev/next within the same `category`, ordered by week → unit → title.
export async function getLessonNeighbors(
  id: string
): Promise<{ prev: LessonNeighbor | null; next: LessonNeighbor | null }> {
  const lessons = await loadLessons();
  const current = lessons.find((l) => l.id === id);
  if (!current) return { prev: null, next: null };
  const peers = lessons
    .filter((l) => l.category === current.category)
    .sort((a, b) => {
      const w = (a.week ?? 999) - (b.week ?? 999);
      if (w !== 0) return w;
      const u = (a.unit || '').localeCompare(b.unit || '');
      if (u !== 0) return u;
      return a.title.localeCompare(b.title);
    });
  const idx = peers.findIndex((l) => l.id === id);
  const toNeighbor = (l?: Lesson): LessonNeighbor | null =>
    l ? { id: l.id, title: l.title } : null;
  return {
    prev: toNeighbor(idx > 0 ? peers[idx - 1] : undefined),
    next: toNeighbor(idx < peers.length - 1 ? peers[idx + 1] : undefined),
  };
}
