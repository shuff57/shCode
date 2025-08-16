import fs from 'fs/promises';
import path from 'path';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface FileNode {
  type: 'file' | 'folder';
  name: string;
  path: string;
  content?: string;
  children?: FileNode[];
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  messages?: string[];
  file?: string;
  pattern?: string;
  flags?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimateMins: number;
  files: FileNode[];
  steps: { id: string; title: string }[];
  requirements: Requirement[];
}

let cache: Lesson[] | null = null;

async function readFiles(dir: string, rel = ''): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes = await Promise.all(
    entries
      .filter((e) => e.name !== 'lesson.json')
      .map(async (entry) => {
        const full = path.join(dir, entry.name);
        const relative = path.join(rel, entry.name);
        if (entry.isDirectory()) {
          return {
            type: 'folder',
            name: entry.name,
            path: relative,
            children: await readFiles(full, relative),
          } as FileNode;
        }
        const content = await fs.readFile(full, 'utf8');
        return {
          type: 'file',
          name: entry.name,
          path: relative,
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
