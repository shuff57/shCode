#!/usr/bin/env npx tsx
/**
 * Lesson scaffolding script.
 *
 * Usage:
 *   npx tsx scripts/create-lesson.ts --id "variables-and-types" --title "Variables and Types" --week 3 --type assignment
 */
import fs from 'fs';
import path from 'path';

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1] || '';
  }
  return args;
}

const args = parseArgs(process.argv);

if (!args.id || !args.title) {
  console.error('Usage: npx tsx scripts/create-lesson.ts --id <id> --title <title> [--week <n>] [--type lesson|assignment|project] [--category <cat>] [--mins <n>]');
  process.exit(1);
}

const id = args.id;
const title = args.title;
const week = args.week ? parseInt(args.week, 10) : undefined;
const type = args.type || 'lesson';
const category = args.category || (week ? `Q${Math.ceil(week / 9)}-Fundamentals` : undefined);
const mins = args.mins ? parseInt(args.mins, 10) : 30;

const lessonDir = path.join(process.cwd(), 'lessons', id);

if (fs.existsSync(lessonDir)) {
  console.error(`Lesson directory already exists: ${lessonDir}`);
  process.exit(1);
}

fs.mkdirSync(lessonDir, { recursive: true });

// lesson.json
const meta: Record<string, any> = {
  id,
  title,
  description: '',
  type,
  estimateMins: mins,
};
if (category) meta.category = category;
if (week) meta.week = week;
meta.slos = [];
meta.steps = [{ id: 's1', title: 'Step 1' }];
meta.requirements = [
  {
    id: 'req1',
    title: 'Requirement 1',
    description: 'Description of requirement',
    type: 'regex',
    file: 'script.js',
    pattern: '',
    flags: 'i',
    points: 10,
  },
];
if (type === 'assignment' || type === 'project') {
  meta.grading = {
    totalPoints: 10,
    passingScore: 7,
    allowLateSubmit: true,
    reviewCommitHistory: true,
  };
}

fs.writeFileSync(path.join(lessonDir, 'lesson.json'), JSON.stringify(meta, null, 2) + '\n');

// index.html
fs.writeFileSync(
  path.join(lessonDir, 'index.html'),
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>${title}</h1>

  <script src="script.js"></script>
</body>
</html>
`
);

// style.css
fs.writeFileSync(path.join(lessonDir, 'style.css'), `/* ${title} styles */\n`);

// script.js
fs.writeFileSync(path.join(lessonDir, 'script.js'), `// ${title}\n// Write your code below\n`);

console.log(`Created lesson: lessons/${id}/`);
console.log('  lesson.json');
console.log('  index.html');
console.log('  style.css');
console.log('  script.js');
