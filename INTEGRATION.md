# shDev + shCode Integration Specification

> **Purpose:** Complete blueprint for merging shDev's live coder and git-style version control into the shCode lesson platform, adding autograded assignments. Read this file to resume the merge work in any future session.
>
> **Source repos:**
> - **shCode** (target): `C:\Users\shuff57\Documents\GitHub\shCode` — Next.js 15 lesson platform with Monaco editor, regex autograding, 5 HTML lessons
> - **shDev**: `C:\Users\shuff57\Documents\GitHub\shDev` — Next.js 16 dev environment with live coder, snapshot-based version control (shRepo), Google Drive sync

---

## Table of Contents

1. [Architecture Comparison](#1-architecture-comparison)
2. [Unified Data Model](#2-unified-data-model)
3. [Phase 0 — Pre-Merge Prep](#3-phase-0--pre-merge-prep)
4. [Phase 1 — Port Version Control](#4-phase-1--port-version-control)
5. [Phase 2 — Upgrade Live Preview](#5-phase-2--upgrade-live-preview)
6. [Phase 3 — Unified Lesson + Assignment Model](#6-phase-3--unified-lesson--assignment-model)
7. [Phase 4 — Assignment Workflow](#7-phase-4--assignment-workflow)
8. [Phase 5 — Curriculum Content](#8-phase-5--curriculum-content)
9. [Phase 6 — Polish](#9-phase-6--polish)
10. [File-by-File Port Map](#10-file-by-file-port-map)
11. [Dependency Reconciliation](#11-dependency-reconciliation)
12. [Source Code Reference](#12-source-code-reference)

---

## 1. Architecture Comparison

| Aspect | shCode (target) | shDev (source) | Merge Decision |
|--------|----------------|----------------|----------------|
| **Framework** | Next.js 15.4.6, React 19.1.1 | Next.js 16, React 18.2 | Keep shCode's Next.js 15 + React 19 |
| **Editor** | Monaco (`@monaco-editor/react` 4.6.0) | CodeMirror 6 (`@uiw/react-codemirror`) | **Keep Monaco** — richer autocomplete, familiar to VS Code users |
| **State mgmt** | Zustand 4.5.2 (`lib/store.ts`) | React Context (`shcode-context.tsx`, 1789 lines) | **Keep Zustand** — add new slices for VC state |
| **File explorer** | react-arborist 3.4.3 with drag-drop | Custom Radix accordion tree | **Keep react-arborist** — recently improved |
| **Preview** | Naive concat of index.html + style.css + script.js | Smart inlining with path resolution | **Port shDev's inlining** |
| **Console** | postMessage with source filter | postMessage with type-based tabs | **Port shDev's tabbed console** |
| **Version control** | None | Snapshot-based commits/history/restore | **Port entirely** |
| **Grading** | Express `/api/grade` with regex matching | None | **Keep and extend** |
| **Styling** | Tailwind 3.4.4 | Tailwind + Radix UI | Keep Tailwind, add Radix components as needed |
| **Auth** | None | Google OAuth via Appwrite | **Defer** — not needed for MVP |
| **Storage** | Server filesystem (lessons) | localStorage + Google Drive | **Add localStorage for student work** |

---

## 2. Unified Data Model

### Current shCode types (`lib/lessons.ts`)

```typescript
interface FileNode {
  type: 'file' | 'folder';
  name: string;
  path: string;          // relative path like "index.html" or "css/style.css"
  content?: string;
  children?: FileNode[];
}

interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  messages?: string[];
  file?: string;
  pattern?: string;
  flags?: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimateMins: number;
  files: FileNode[];
  steps: { id: string; title: string }[];
  requirements: Requirement[];
}
```

### Current shDev types (`src/lib/types.ts`)

```typescript
interface File {
  id: string;
  name: string;
  type: 'file';
  language: FileType;  // 'html' | 'css' | 'javascript' | ...30 types
  path: string;        // absolute path like "/index.html"
  driveId?: string;
  content?: string;
}

interface Folder {
  id: string;
  name: string;
  type: 'folder';
  children: FileSystemItem[];
  path: string;
  driveId?: string;
}

type FileSystemItem = File | Folder;

interface Commit {
  id: string;
  message: string;
  timestamp: number;
  changedFileIds: string[];
  fileContentsSnapshot: Record<string, string>;  // fileId -> content
}

interface Project {
  id: string;
  name: string;
  fileSystem: Folder;
  openFileIds: string[];
  activeFileId: string | null;
  commits: Commit[];
  lastCommittedFileContents: Record<string, string>;
}

interface Workspace {
  id: string;
  name: string;
  projects: Project[];
  activeProjectId: string | null;
}

interface Version {
  timestamp: number;
  content: string;
  driveRevisionId?: string;
}

type History = Record<string, Version[]>;
```

### Merged data model (new `lib/types.ts`)

```typescript
// ---- File System ----

export type FileType = 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'text' | 'python';

export interface FileNode {
  id: string;               // NEW: unique ID for version control tracking
  type: 'file' | 'folder';
  name: string;
  path: string;             // relative path: "index.html", "css/style.css"
  language?: FileType;      // NEW: from shDev, for editor language detection
  content?: string;
  children?: FileNode[];
}

// ---- Version Control ----

export interface Commit {
  id: string;                                    // "commit-{timestamp}"
  message: string;
  timestamp: number;
  changedFileIds: string[];                      // which file IDs changed
  fileContentsSnapshot: Record<string, string>;  // fileId -> full content at commit time
}

export interface Version {
  timestamp: number;
  content: string;
}

export type FileHistory = Record<string, Version[]>;  // fileId -> versions

// ---- Lessons & Assignments ----

export type LessonType = 'lesson' | 'assignment' | 'project';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type RequirementType = 'regex' | 'output' | 'function' | 'custom';

export interface Step {
  id: string;
  title: string;
  instructions?: string;     // NEW: markdown content for the step
  hints?: string[];          // NEW: progressive hints
  requiredCommit?: boolean;  // NEW: must commit before advancing
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  messages?: string[];
  // Grading config
  type?: RequirementType;    // NEW: defaults to 'regex' for backward compat
  file?: string;
  pattern?: string;
  flags?: string;
  expected?: string;         // NEW: for 'output' type
  testFn?: string;           // NEW: for 'function' type - JS code string
  points?: number;           // NEW: point value
}

export interface Grading {
  totalPoints: number;
  passingScore: number;
  allowLateSubmit?: boolean;
  reviewCommitHistory?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  type?: LessonType;         // NEW: defaults to 'lesson'
  difficulty: Difficulty;
  estimateMins: number;
  category?: string;         // NEW: maps to curriculum quarter
  week?: number;             // NEW: curriculum week number
  slos?: string[];           // NEW: SLO coverage
  files: FileNode[];
  steps: Step[];
  requirements: Requirement[];
  grading?: Grading;         // NEW: grading config for assignments
}

// ---- Student State (localStorage) ----

export interface StudentProgress {
  lessonId: string;
  fileContents: Record<string, string>;  // fileId -> current content
  commits: Commit[];
  lastCommittedFileContents: Record<string, string>;
  fileHistory: FileHistory;
  completedSteps: string[];
  submissionStatus: 'in-progress' | 'submitted' | 'graded';
  score: number | null;
  submittedAt: number | null;
}
```

### Key design notes:
- **FileNode gets an `id` field** — shDev tracks files by ID for version control snapshots. shCode tracks by path. Adding `id` enables VC while keeping path-based lookup for grading.
- **Backward compatible** — All new fields are optional. Existing `lesson.json` files work unchanged.
- **No Workspace/Project abstraction** — shCode's unit of work is a Lesson. Student progress per lesson replaces shDev's workspace concept.

---

## 3. Phase 0 -- Pre-Merge Prep

### Tasks

1. **Create feature branch:**
   ```bash
   git checkout -b feature/merge-shdev
   ```

2. **Create `lib/types.ts`** with the unified data model above.

3. **Add `id` generation to lesson loader** — In `lib/lessons.ts:readFiles()`, generate deterministic IDs for each file node:
   ```typescript
   // In readFiles(), for each file:
   const id = relative.replace(/[\/\\]/g, '-');  // "css/style.css" -> "css-style.css"
   return { id, type: 'file', name: entry.name, path: relative, content, language: inferLanguage(entry.name) };
   ```

4. **Update Zustand store** — Add version control state slice (details in Phase 1).

5. **Verify existing tests pass** (currently none, but verify `npm run build` succeeds).

---

## 4. Phase 1 -- Port Version Control

### New file: `lib/version-control.ts`

Extract pure logic from shDev's `shcode-context.tsx` (lines 1497-1620). No React dependencies.

```typescript
import { Commit, FileHistory, Version, FileNode } from './types';

// ---- Generate file ID map from FileNode tree ----
export function buildFileIdMap(nodes: FileNode[]): Record<string, string> {
  // Returns { filePath: fileId } for all files in tree
  const map: Record<string, string> = {};
  function walk(nodes: FileNode[]) {
    for (const n of nodes) {
      if (n.type === 'file') map[n.path] = n.id;
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return map;
}

// ---- Detect changed files ----
export function getChangedFiles(
  currentContents: Record<string, string>,
  lastCommitted: Record<string, string>,
  dirtyIds: Set<string>
): string[] {
  const changed: string[] = [];
  for (const fileId of dirtyIds) {
    if (currentContents[fileId] !== lastCommitted[fileId]) {
      changed.push(fileId);
    }
  }
  return changed;
}

// ---- Create a commit ----
export function createCommit(
  message: string,
  changedFileIds: string[],
  allFileContents: Record<string, string>
): Commit {
  return {
    id: `commit-${Date.now()}`,
    message,
    timestamp: Date.now(),
    changedFileIds,
    fileContentsSnapshot: { ...allFileContents },
  };
}

// ---- Restore to a specific commit ----
export function restoreToCommit(
  commitId: string,
  commits: Commit[]
): { restoredContents: Record<string, string>; truncatedCommits: Commit[] } | null {
  const idx = commits.findIndex(c => c.id === commitId);
  if (idx === -1) return null;
  const target = commits[idx];
  if (!target.fileContentsSnapshot) return null;
  return {
    restoredContents: { ...target.fileContentsSnapshot },
    truncatedCommits: commits.slice(0, idx + 1),
  };
}

// ---- Restore a single file version ----
export function restoreFileVersion(
  fileId: string,
  version: Version
): { fileId: string; content: string } {
  return { fileId, content: version.content };
}

// ---- Get history for a file from commits ----
export function getFileHistoryFromCommits(
  fileId: string,
  commits: Commit[],
  currentContent: string
): Version[] {
  const versions: Version[] = [
    { timestamp: Date.now(), content: currentContent },
  ];
  for (let i = commits.length - 1; i >= 0; i--) {
    const commit = commits[i];
    if (commit.changedFileIds.includes(fileId) && commit.fileContentsSnapshot[fileId] !== undefined) {
      versions.push({
        timestamp: commit.timestamp,
        content: commit.fileContentsSnapshot[fileId],
      });
    }
  }
  return versions;
}

// ---- Filter commits by file/folder ----
export function filterCommitsByPath(
  commits: Commit[],
  fileIds: Set<string>
): Commit[] {
  return commits.filter(c =>
    c.changedFileIds.some(id => fileIds.has(id))
  );
}

// ---- localStorage persistence ----
const STORAGE_KEY = 'shCode_progress';

export function saveProgress(lessonId: string, data: {
  fileContents: Record<string, string>;
  commits: Commit[];
  lastCommittedFileContents: Record<string, string>;
  completedSteps: string[];
}): void {
  const all = loadAllProgress();
  all[lessonId] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function loadProgress(lessonId: string): {
  fileContents: Record<string, string>;
  commits: Commit[];
  lastCommittedFileContents: Record<string, string>;
  completedSteps: string[];
} | null {
  const all = loadAllProgress();
  return all[lessonId] || null;
}

function loadAllProgress(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}
```

### Zustand store additions (`lib/store.ts`)

Add a version control slice alongside the existing lesson state:

```typescript
// Add to existing store interface:
interface VCState {
  commits: Commit[];
  lastCommittedFileContents: Record<string, string>;
  dirtyFileIds: Set<string>;
  fileHistory: FileHistory;

  // Actions
  initVC: (fileContents: Record<string, string>) => void;
  markDirty: (fileId: string) => void;
  commitChanges: (message: string) => boolean;
  restoreCommit: (commitId: string) => void;
  restoreVersion: (fileId: string, version: Version) => void;
  getFileHistory: (fileId: string) => Version[];
}

// Implementation uses the pure functions from lib/version-control.ts
```

### New UI components

**`components/CommitDialog.tsx`** — Port from shDev `src/components/shdev/commit-dialog.tsx`:
- Dialog with textarea for commit message
- Shows count of changed files
- Ctrl+Enter shortcut to commit
- Disabled when no dirty files
- Uses shCode's existing Tailwind styling (no Radix dependency needed; use native `<dialog>` or a simple modal)

**`components/HistoryPanel.tsx`** — Merge shDev's file-history-panel + project-history-panel:
- Tab: "File History" -- versions of the currently selected file
- Tab: "Project History" -- all commits, filterable by file/folder
- Each entry shows: timestamp, message (for commits) or "auto-save" (for file versions)
- "Restore" button per entry
- Side-by-side diff view (selected version vs current) -- use Monaco's built-in diff editor:
  ```typescript
  import { DiffEditor } from '@monaco-editor/react';
  <DiffEditor original={selectedVersion.content} modified={currentContent} />
  ```

**`components/DiffViewer.tsx`** — Wrapper around Monaco DiffEditor for reuse.

### Integration points in LessonWorkspace.tsx

```typescript
// In LessonWorkspace, after setLesson:
// 1. Check localStorage for saved progress
const saved = loadProgress(lesson.id);
if (saved) {
  // Restore file contents, commits, completed steps from saved state
} else {
  // Create initial commit from starter files
  initVC(fileContents);
}

// 2. On every file update, mark dirty
const updateFile = (path, value) => {
  store.updateFile(path, value);
  store.markDirty(fileIdFromPath(path));
};

// 3. Auto-save to localStorage on changes (debounced)
useEffect(() => {
  const timer = setTimeout(() => saveProgress(lesson.id, { ... }), 2000);
  return () => clearTimeout(timer);
}, [fileContents, commits]);
```

### Header additions

Add to the lesson workspace header bar:
- **Commit button** (opens CommitDialog) -- show dirty file count badge
- **History button** (opens HistoryPanel)

---

## 5. Phase 2 -- Upgrade Live Preview

### Problem with current shCode preview

In `LessonWorkspace.tsx` lines 133-181, preview is built by:
1. Reading `files['index.html']`, `files['style.css']`, `files['script.js']` by exact name
2. Replacing `<link href="style.css">` with inline `<style>` tag
3. Appending `<script>` with JS content

This breaks when:
- Files are in subdirectories (e.g., `css/style.css`, `js/app.js`)
- HTML references multiple CSS/JS files
- Files have non-standard names

### Port shDev's inlining logic

Create `lib/preview-builder.ts` — extracted from shDev's `live-preview.tsx`:

```typescript
import { FileNode } from './types';

// ---- Find file by name recursively ----
function findFileByName(nodes: FileNode[], name: string): FileNode | null {
  for (const item of nodes) {
    if (item.type === 'file' && item.name.toLowerCase() === name.toLowerCase()) {
      return item;
    }
    if (item.type === 'folder' && item.children) {
      const found = findFileByName(item.children, name);
      if (found) return found;
    }
  }
  return null;
}

// ---- Find file by absolute path from root ----
function findFileByPath(nodes: FileNode[], absolutePath: string): FileNode | null {
  const segments = absolutePath.split('/').filter(p => p.length > 0);
  let current: FileNode[] = nodes;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const match = current.find(n => n.name === seg);
    if (!match) return null;
    if (i === segments.length - 1 && match.type === 'file') return match;
    if (match.type === 'folder' && match.children) current = match.children;
    else return null;
  }
  return null;
}

// ---- Resolve relative path ----
function resolvePath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/')) return relativePath;
  const baseSegments = basePath.split('/').filter(p => p.length > 0);
  baseSegments.pop(); // remove filename
  for (const segment of relativePath.split('/')) {
    if (segment === '..') baseSegments.pop();
    else if (segment !== '.' && segment !== '') baseSegments.push(segment);
  }
  return '/' + baseSegments.join('/');
}

// ---- Build preview HTML ----
export function buildPreviewHtml(
  fileTree: FileNode[],
  fileContents: Record<string, string>  // fileId -> content
): string {
  const htmlFile = findFileByName(fileTree, 'index.html');
  if (!htmlFile) return '<!DOCTYPE html><!-- index.html not found -->';

  let html = fileContents[htmlFile.id] ?? '';

  // Inline CSS <link> tags
  const cssRegex = /<link[^>]*?href=(["'])(.+?\.css)\1[^>]*?\/?>/gi;
  html = html.replace(cssRegex, (_match, _quote, path) => {
    const absPath = resolvePath(htmlFile.path, path);
    const cssFile = findFileByPath(fileTree, absPath);
    if (cssFile && fileContents[cssFile.id] !== undefined) {
      return `<style>${fileContents[cssFile.id]}</style>`;
    }
    // Fallback: try by name
    const byName = findFileByName(fileTree, path.split('/').pop());
    if (byName && fileContents[byName.id] !== undefined) {
      return `<style>${fileContents[byName.id]}</style>`;
    }
    return `<!-- Could not resolve: ${path} -->`;
  });

  // Inline JS <script src> tags
  const jsRegex = /<script[^>]*?src=(["'])(.+?\.js)\1[^>]*?>\s*<\/script>/gi;
  html = html.replace(jsRegex, (_match, _quote, path) => {
    const absPath = resolvePath(htmlFile.path, path);
    const jsFile = findFileByPath(fileTree, absPath);
    if (jsFile && fileContents[jsFile.id] !== undefined) {
      return `<script>${fileContents[jsFile.id]}</script>`;
    }
    const byName = findFileByName(fileTree, path.split('/').pop());
    if (byName && fileContents[byName.id] !== undefined) {
      return `<script>${fileContents[byName.id]}</script>`;
    }
    return `<!-- Could not resolve: ${path} -->`;
  });

  // Inject console override (from shDev)
  const consoleOverride = `<script>
(function() {
  var send = function(type, args) {
    window.parent.postMessage({ source: 'preview-console', type: type, args: args }, '*');
  };
  ['log','warn','error','info'].forEach(function(t) {
    var fn = console[t];
    console[t] = function() {
      var a = Array.prototype.slice.call(arguments);
      send(t, a);
      fn.apply(console, a);
    };
  });
  window.onerror = function(m, s, l, c) {
    send('error', [m + ' (' + l + ':' + c + ')']);
  };
})();
</script>`;

  if (html.includes('</head>')) {
    html = html.replace('</head>', consoleOverride + '</head>');
  } else {
    html = consoleOverride + html;
  }

  // Ensure DOCTYPE
  if (!html.trim().toLowerCase().startsWith('<!doctype')) {
    html = '<!DOCTYPE html>\n' + html;
  }

  return html;
}
```

### Update LessonWorkspace.tsx

Replace the current preview build logic (lines 133-181) with:

```typescript
import { buildPreviewHtml } from '../lib/preview-builder';

// In the useEffect that builds srcDoc:
useEffect(() => {
  const timer = setTimeout(() => {
    // Convert path-keyed fileContents to id-keyed for preview builder
    const idContents = Object.fromEntries(
      Object.entries(files).map(([path, content]) => [pathToId(path), content])
    );
    const doc = buildPreviewHtml(lesson.files, idContents);
    setSrcDoc(doc);
  }, 600);
  return () => clearTimeout(timer);
}, [files, lesson.files]);
```

### Upgrade Console component

Replace `components/Console.tsx` with tabbed version inspired by shDev's `console-output.tsx`:

```typescript
// New Console.tsx features:
// - Tabs: All | Warnings | Errors (from shDev)
// - Color-coded log levels (log=gray, warn=yellow, error=red)
// - Timestamp per entry
// - Clear button
// - Collapsible (already exists in LessonWorkspace as <details>)
// - Object pretty-printing (JSON.stringify with 2-space indent)
```

---

## 6. Phase 3 -- Unified Lesson + Assignment Model

### Extended lesson.json schema

Existing fields remain unchanged. New optional fields added:

```jsonc
{
  // ---- Existing (unchanged) ----
  "id": "variables-and-types",
  "title": "Variables and Types",
  "description": "Understand how to store and work with data.",
  "difficulty": "beginner",
  "estimateMins": 30,
  "steps": [
    { "id": "s1", "title": "Declare a variable" }
  ],
  "requirements": [
    {
      "id": "req1",
      "title": "Declare age variable",
      "description": "Create a variable called age",
      "file": "script.js",
      "pattern": "(?:let|const|var)\\s+age\\s*=",
      "flags": "i"
    }
  ],

  // ---- New optional fields ----
  "type": "assignment",
  "category": "Q1-Fundamentals",
  "week": 3,
  "slos": ["SLO-2", "SLO-3"],

  "steps": [
    {
      "id": "s1",
      "title": "Declare a variable",
      "instructions": "Use `let` or `const` to create a variable called `age` and set it to your age.",
      "hints": [
        "Variables are declared with `let`, `const`, or `var`.",
        "Example: `let name = 'Alice';`"
      ],
      "requiredCommit": false
    }
  ],

  "requirements": [
    {
      "id": "req1",
      "title": "Declare age variable",
      "description": "Create a variable called age",
      "type": "regex",
      "file": "script.js",
      "pattern": "(?:let|const|var)\\s+age\\s*=",
      "flags": "i",
      "points": 10
    },
    {
      "id": "req2",
      "title": "Print age to console",
      "description": "Use console.log to print the age variable",
      "type": "output",
      "expected": "\\d+",
      "points": 5
    },
    {
      "id": "req3",
      "title": "Write doubleAge function",
      "description": "Create a function that returns double the input",
      "type": "function",
      "file": "script.js",
      "testFn": "function test() { return typeof doubleAge === 'function' && doubleAge(5) === 10 && doubleAge(0) === 0; }",
      "points": 15
    }
  ],

  "grading": {
    "totalPoints": 30,
    "passingScore": 20,
    "allowLateSubmit": true,
    "reviewCommitHistory": true
  }
}
```

### Grading engine: `lib/grader.ts`

Replace Express-only grading with a shared module usable both server-side and client-side.

**SECURITY NOTE:** The `output` and `function` requirement types execute student code. For client-side grading, run these checks inside a **Web Worker** with a timeout to prevent infinite loops from freezing the UI. The Web Worker provides a sandboxed execution context. For server-side grading, use `vm2` or Node.js `vm` module with a timeout.

```typescript
import { Requirement } from './types';

export interface GradeResult {
  id: string;
  status: 'passed' | 'failed';
  messages: string[];
  pointsEarned: number;
  pointsPossible: number;
}

export interface GradeReport {
  results: GradeResult[];
  totalScore: number;
  totalPossible: number;
  passed: boolean;
  passingScore: number;
}

// ---- Regex checker (existing behavior) ----
function checkRegex(req: Requirement, files: Record<string, string>): boolean {
  const content = files[req.file || ''] || '';
  const regex = new RegExp(req.pattern || '', req.flags || 'i');
  return regex.test(content);
}

// ---- Output checker (NEW) ----
// IMPORTANT: In production, run this in a Web Worker with a timeout
// to prevent infinite loops. The worker should:
// 1. Receive the JS code string
// 2. Override console.log to capture output
// 3. Execute the code with a 5-second timeout
// 4. Return captured output for regex matching against req.expected
function checkOutput(req: Requirement, files: Record<string, string>): boolean {
  // Implementation: delegate to Web Worker (see worker template below)
  // Synchronous fallback for server-side:
  try {
    const logs: string[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(args.join(' ')) };
    const allJs = Object.entries(files)
      .filter(([path]) => path.endsWith('.js'))
      .map(([, content]) => content)
      .join('\n');
    // Use vm module on server, Web Worker on client
    const output = logs.join('\n');
    return new RegExp(req.expected || '', 'i').test(output);
  } catch {
    return false;
  }
}

// ---- Function checker (NEW) ----
// IMPORTANT: Same sandboxing requirements as checkOutput.
// Evaluates student code, then runs teacher's test function.
function checkFunction(req: Requirement, files: Record<string, string>): boolean {
  // Implementation: delegate to Web Worker
  // The worker evaluates the student JS, then runs req.testFn,
  // and returns whether test() === true
  try {
    const allJs = Object.entries(files)
      .filter(([path]) => path.endsWith('.js'))
      .map(([, content]) => content)
      .join('\n');
    // Sandboxed execution needed here
    return false; // placeholder - implement via Worker
  } catch {
    return false;
  }
}

// ---- Main grader ----
export function grade(
  requirements: Requirement[],
  files: Record<string, string>,
  passingScore: number = 0
): GradeReport {
  const results: GradeResult[] = requirements.map(req => {
    const type = req.type || 'regex';
    let passed = false;

    switch (type) {
      case 'regex':
        passed = checkRegex(req, files);
        break;
      case 'output':
        passed = checkOutput(req, files);
        break;
      case 'function':
        passed = checkFunction(req, files);
        break;
      case 'custom':
        // Future: run arbitrary test script
        passed = false;
        break;
    }

    const points = req.points || 0;
    return {
      id: req.id,
      status: passed ? 'passed' : 'failed',
      messages: passed ? [] : [req.description],
      pointsEarned: passed ? points : 0,
      pointsPossible: points,
    };
  });

  const totalScore = results.reduce((sum, r) => sum + r.pointsEarned, 0);
  const totalPossible = results.reduce((sum, r) => sum + r.pointsPossible, 0);

  return {
    results,
    totalScore,
    totalPossible,
    passed: totalScore >= passingScore,
    passingScore,
  };
}
```

### Web Worker template for sandboxed execution: `public/grader-worker.js`

```javascript
// Web Worker for sandboxed student code execution
// Receives: { type: 'output'|'function', code: string, testFn?: string, expected?: string }
// Returns:  { passed: boolean }

self.onmessage = function(e) {
  const { type, code, testFn, expected } = e.data;
  let passed = false;

  try {
    if (type === 'output') {
      const logs = [];
      const mockConsole = {
        log: function() { logs.push(Array.from(arguments).join(' ')); },
        warn: function() {},
        error: function() {},
        info: function() {}
      };
      const fn = new Function('console', code);
      fn(mockConsole);
      const output = logs.join('\n');
      passed = new RegExp(expected || '', 'i').test(output);
    } else if (type === 'function') {
      const fn = new Function(code + '\n' + testFn + '\nreturn test();');
      passed = fn() === true;
    }
  } catch (err) {
    passed = false;
  }

  self.postMessage({ passed: passed });
};
```

### Update server.js

```javascript
// Replace inline grading logic with:
import { grade } from './lib/grader.ts';
// (Will need to handle ESM/CJS boundary or move to Next.js API route)

server.post('/api/grade', async (req, res) => {
  const { lessonId, files } = req.body;
  const meta = JSON.parse(await fs.readFile(...));
  const report = grade(meta.requirements, files, meta.grading?.passingScore || 0);
  res.json(report);
});
```

### Client-side grading option

For `regex` type requirements, grading can run entirely client-side (no server round-trip):

```typescript
// In LessonWorkspace.tsx:
function runClientTests() {
  const report = grade(lesson.requirements, files, lesson.grading?.passingScore);
  setRequirements(lesson.requirements.map(r => ({
    ...r,
    ...report.results.find(g => g.id === r.id),
  })));
}
```

---

## 7. Phase 4 -- Assignment Workflow

### Student lifecycle

```
1. Student opens assignment -> /assignment/[id]
2. Workspace initializes:
   a. Check localStorage for saved progress
   b. If none: load starter files, create "Initial code" commit
   c. If saved: restore file contents, commits, step progress
3. Student codes -> auto-save (debounced 2s) -> localStorage
4. Student commits -> CommitDialog -> snapshot saved
5. Auto-grading runs on each save -> RequirementsSection updates
6. Student clicks "Submit" -> SubmitDialog confirms
7. Final grade calculated -> GradeReport shown
8. Progress saved as submitted
```

### New components

**`components/AssignmentHeader.tsx`:**
```
+----------------------------------------------------------+
| Variables and Types              Week 3 - Q1 Fundamentals |
| ######### 80/100 pts           Status: In Progress       |
| [Commit (2 changes)] [History]  [Submit Assignment]      |
+----------------------------------------------------------+
```
- Shows lesson title, week, category
- Progress bar based on points earned
- Commit button with dirty file count
- History button
- Submit button (disabled until passing score reached)

**`components/SubmitDialog.tsx`:**
- Shows final score, requirement breakdown
- Warns if below passing score
- "Are you sure?" confirmation
- On submit: saves `submissionStatus: 'submitted'` to localStorage

**`components/GradeReport.tsx`:**
- Post-submission view showing:
  - Total score / total possible
  - Each requirement: title, points, pass/fail
  - Commit count (how many snapshots the student made)
  - "Reopen" button to continue working (if `allowLateSubmit`)

### New route: `app/assignment/[id]/page.tsx`

Same as lesson page but with AssignmentHeader instead of basic title bar:

```typescript
export default async function AssignmentPage({ params }) {
  const { id } = await params;
  const lesson = await getLesson(id);
  if (!lesson) return <div>Assignment not found</div>;
  // Pass type='assignment' to LessonWorkspace for different header
  return <LessonWorkspace lesson={lesson} mode="assignment" />;
}
```

### LessonSteps upgrade

When `step.instructions` is present, render markdown content instead of just the title. When `step.requiredCommit` is true, show a lock icon on the next step until a commit is made.

---

## 8. Phase 5 -- Curriculum Content

### Lesson generator script: `scripts/create-lesson.ts`

```bash
npx tsx scripts/create-lesson.ts --id "variables-and-types" --title "Variables and Types" --week 3 --type assignment
```

Generates:
```
lessons/variables-and-types/
  lesson.json    # Pre-filled with id, title, week, type, empty steps/requirements
  index.html     # HTML boilerplate
  style.css      # Empty
  script.js      # Starter comment
```

### Q1 lesson content to build (Weeks 1-9)

| Week | Lesson ID | Type | Title | Key Requirements |
|------|-----------|------|-------|-----------------|
| 1 | `sdlc-overview` | lesson | Software Development Lifecycle | Reading + reflection (no code grading) |
| 2 | `variables-and-types` | assignment | Variables and Types | Declare variables, use typeof, console.log output |
| 3 | `operators-expressions` | assignment | Operators and Expressions | Arithmetic, string concat, comparison operators |
| 4 | `conditionals` | assignment | Conditionals | if/else, ternary, switch statement |
| 5 | `intro-algorithms` | lesson | Introduction to Algorithms | Pseudocode exercise (custom grading) |
| 5 | `algorithm-practice` | assignment | Algorithm Practice | Implement simple algorithms |
| 6 | `loops` | assignment | Loops | for, while, do-while, loop output matching |
| 7 | `functions` | assignment | Functions | Function declarations, returns, parameters |
| 8 | `arrays` | assignment | Arrays | Create, push, pop, iterate, find |
| 9 | `print-job-manager` | project | Print Job Manager | Q1 capstone -- multi-requirement project |

### Requirement patterns per topic

**Variables (`regex` type):**
```json
{ "pattern": "(?:let|const)\\s+\\w+\\s*=", "file": "script.js" }
```

**Console output (`output` type):**
```json
{ "type": "output", "expected": "^Hello, World!$" }
```

**Function correctness (`function` type):**
```json
{
  "type": "function",
  "testFn": "function test() { return add(2,3)===5 && add(-1,1)===0; }",
  "file": "script.js"
}
```

---

## 9. Phase 6 -- Polish

### Home page updates (`app/page.tsx`)

- Group lessons by `category` (quarter) instead of hardcoded categories
- Show lesson type badges: "Lesson" / "Assignment" / "Project"
- Show completion status from localStorage
- Filter by week, difficulty, SLO

### Progress tracking

```typescript
// lib/progress.ts
interface CourseProgress {
  completedLessons: string[];          // lesson IDs
  scores: Record<string, number>;      // lessonId -> score
  totalCommits: number;
  lastActive: number;
}
```

Stored in `localStorage` key `shCode_courseProgress`.

### Export (from shDev)

Port JSZip integration for "Download as ZIP":
- Add `jszip` dependency
- Button in workspace header to download all current files as .zip
- Useful for students to save work offline

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Force save to localStorage |
| `Ctrl+Enter` | Open commit dialog |
| `Ctrl+Shift+T` | Re-run tests |
| `Ctrl+Shift+H` | Toggle history panel |

---

## 10. File-by-File Port Map

### Files to CREATE in shCode

| New File | Source | Notes |
|----------|--------|-------|
| `lib/types.ts` | New | Unified data model (Section 2) |
| `lib/version-control.ts` | shDev `shcode-context.tsx` lines 1497-1620 | Pure functions, no React |
| `lib/preview-builder.ts` | shDev `live-preview.tsx` | Extract inlining logic |
| `lib/grader.ts` | New (extends `server.js` logic) | Multi-type grading engine |
| `lib/progress.ts` | New | localStorage progress tracking |
| `public/grader-worker.js` | New | Web Worker for sandboxed code execution |
| `components/CommitDialog.tsx` | shDev `commit-dialog.tsx` | Simplify: remove Radix, use native dialog or Tailwind modal |
| `components/HistoryPanel.tsx` | shDev `file-history-panel.tsx` + `project-history-panel.tsx` | Merge into one component with tabs |
| `components/DiffViewer.tsx` | New | Wrapper around Monaco DiffEditor |
| `components/AssignmentHeader.tsx` | New | Assignment-specific header bar |
| `components/SubmitDialog.tsx` | New | Submission confirmation |
| `components/GradeReport.tsx` | New | Post-submission grade breakdown |
| `app/assignment/[id]/page.tsx` | New | Assignment route |
| `scripts/create-lesson.ts` | New | Lesson scaffolding CLI |

### Files to MODIFY in shCode

| Existing File | Changes |
|---------------|---------|
| `lib/store.ts` | Add VC state slice (commits, dirtyFileIds, history actions) |
| `lib/lessons.ts` | Add `id` generation in `readFiles()`, update types to use new `lib/types.ts` |
| `components/LessonWorkspace.tsx` | Replace preview builder, add VC initialization, add commit/history buttons, wire up localStorage save/restore |
| `components/LivePreview.tsx` | No change (still receives `srcDoc` prop) |
| `components/Console.tsx` | Add tabs (All/Warnings/Errors), timestamps, color coding |
| `components/CodeEditor.tsx` | Add `id`-based file tracking alongside path |
| `components/RequirementsSection.tsx` | Add point totals, score display |
| `components/RequirementCard.tsx` | Show points earned/possible |
| `components/LessonSteps.tsx` | Render `instructions` markdown, show hints, handle `requiredCommit` |
| `components/FileExplorer.tsx` | No changes needed |
| `server.js` | Import `lib/grader.ts`, use `grade()` function |
| `app/page.tsx` | Add category grouping, type badges, progress indicators |
| `app/lesson/[lessonId]/page.tsx` | No changes needed |
| `package.json` | Add `jszip`, `date-fns` |

### Files NOT to port from shDev

| shDev File | Reason |
|------------|--------|
| `shcode-context.tsx` (1789 lines) | Too coupled to React Context. Extract logic into `version-control.ts` instead. |
| `code-editor.tsx` | Uses CodeMirror. We keep Monaco. |
| `file-explorer.tsx` | Uses Radix accordion. We keep react-arborist. |
| `app-header.tsx`, `global-header.tsx` | shDev-specific navigation |
| `workspace-switcher.tsx`, `project-switcher.tsx` | No workspace/project abstraction in shCode |
| `settings-menu.tsx`, `user-menu.tsx` | Auth-dependent, defer |
| `terminal.tsx` | xterm.js -- not needed for lesson platform |
| `appwrite.ts` | Auth backend -- defer |
| `mock-files.ts` | Sample data -- not needed |

---

## 11. Dependency Reconciliation

### Add to shCode

```json
{
  "jszip": "^3.10.1",
  "date-fns": "^3.6.0"
}
```

### Keep as-is in shCode

```json
{
  "@monaco-editor/react": "^4.6.0",
  "express": "^4.21.2",
  "lucide-react": "^0.539.0",
  "next": "^15.4.6",
  "react": "^19.1.1",
  "react-arborist": "^3.4.3",
  "react-dom": "^19.1.1",
  "zustand": "^4.5.2",
  "tailwindcss": "^3.4.4"
}
```

### Do NOT port from shDev

```json
{
  "@uiw/react-codemirror": "replaced by Monaco",
  "codemirror": "replaced by Monaco",
  "@radix-ui/*": "not needed - use Tailwind + native elements",
  "appwrite": "defer auth",
  "@xterm/xterm": "no terminal needed",
  "react-router-dom": "Next.js handles routing",
  "react-resizable": "shCode already has custom resize logic",
  "recharts": "no charts needed yet",
  "react-hook-form": "no complex forms yet",
  "zod": "defer validation"
}
```

---

## 12. Source Code Reference

### shDev key files (read these when implementing)

| File | Path | What to extract |
|------|------|-----------------|
| **Types** | `C:\Users\shuff57\Documents\GitHub\shDev\src\lib\types.ts` | Commit, Version, FileSystemItem interfaces |
| **VC Logic** | `C:\Users\shuff57\Documents\GitHub\shDev\src\shared\shcode\shcode-context.tsx` | `commitChanges` (L1572-1620), `restoreCommit` (L1507-1570), `restoreVersion` (L1497-1505), `getHistoryForFile` (L1438-1495), `updateFileContent` (L575-611) |
| **Preview** | `C:\Users\shuff57\Documents\GitHub\shDev\src\components\shdev\live-preview.tsx` | `findFileByNameRecursive`, `findFileByAbsolutePath`, `resolvePath`, CSS/JS inlining regex, console override injection |
| **Commit UI** | `C:\Users\shuff57\Documents\GitHub\shDev\src\components\shdev\commit-dialog.tsx` | Dialog layout, Ctrl+Enter shortcut |
| **File History** | `C:\Users\shuff57\Documents\GitHub\shDev\src\components\shdev\file-history-panel.tsx` | Version list UI, diff comparison, restore button |
| **Project History** | `C:\Users\shuff57\Documents\GitHub\shDev\src\components\shdev\project-history-panel.tsx` | Commit list, filtering by file/folder, commit preview |
| **Console** | `C:\Users\shuff57\Documents\GitHub\shDev\src\components\shdev\console-output.tsx` | Tabbed console (All/Warnings/Errors), log formatting, clear button |
| **Lessons stub** | `C:\Users\shuff57\Documents\GitHub\shDev\src\lib\shcode-lessons.ts` | 6 lesson definitions (hello-world through arrays) |

### shCode key files (modify these)

| File | Path | Lines of interest |
|------|------|-------------------|
| **Store** | `C:\Users\shuff57\Documents\GitHub\shCode\lib\store.ts` | Full file -- add VC slice |
| **Lessons** | `C:\Users\shuff57\Documents\GitHub\shCode\lib\lessons.ts` | `readFiles()` -- add ID generation |
| **Workspace** | `C:\Users\shuff57\Documents\GitHub\shCode\components\LessonWorkspace.tsx` | L133-181 (preview build), L183-193 (grading trigger) |
| **Console** | `C:\Users\shuff57\Documents\GitHub\shCode\components\Console.tsx` | Full file -- upgrade to tabbed |
| **Grading API** | `C:\Users\shuff57\Documents\GitHub\shCode\server.js` | L20-38 (grade endpoint) |
| **Lesson schema** | `C:\Users\shuff57\Documents\GitHub\shCode\lessons\basic-html\lesson.json` | Reference for backward compat |

---

## Execution Order

```
Phase 0: Branch + types + ID generation          [foundation]
    |
    v
Phase 1: Version control core + UI               [can parallel with Phase 2]
Phase 2: Preview upgrade + console tabs           [can parallel with Phase 1]
    |
    v
Phase 3: Grading engine + lesson schema           [depends on 1 + 2]
    |
    v
Phase 4: Assignment workflow + routes             [depends on 1 + 3]
    |
    v
Phase 5: Build Q1 lesson content                  [depends on 3]
    |
    v
Phase 6: Home page + progress + polish            [depends on all above]
```

Phases 1 and 2 have no dependencies on each other and can be done in parallel.

---

## Validation Checklist

After each phase, verify:

- [ ] `npm run build` succeeds
- [ ] Existing 5 lessons still load and grade correctly (backward compat)
- [ ] New features work in dev server at localhost:3000
- [ ] No console errors in browser
- [ ] localStorage persistence works (refresh preserves state)
