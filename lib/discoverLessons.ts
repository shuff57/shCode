import fs from 'fs';
import path from 'path';
import { Lesson } from './lessons';

export function getLessonsFromHtmlDir(): Lesson[] {
  const lessonsDir = path.join(process.cwd(), 'public', 'HTML', 'Basic HTML');
  const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.html'));
  return files.map((file): Lesson => {
    const filePath = path.join(lessonsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    // Extract title from <title> tag or filename
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : file.replace(/\.html$/, '');
    return {
      id: file.replace(/\.html$/, ''),
      title,
      description: `Lesson from ${file}`,
      difficulty: 'beginner',
      estimateMins: 10,
      files: [
        { type: 'file', name: file, path: file, content },
      ],
      steps: [],
      requirements: [],
    };
  });
}
