const COURSE_KEY = 'shCode_courseProgress';

export interface CourseProgress {
  completedLessons: string[];
  scores: Record<string, number>;
  totalCommits: number;
  lastActive: number;
}

export function loadCourseProgress(): CourseProgress {
  try {
    const stored = localStorage.getItem(COURSE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { completedLessons: [], scores: {}, totalCommits: 0, lastActive: Date.now() };
}

export function saveCourseProgress(progress: CourseProgress): void {
  localStorage.setItem(COURSE_KEY, JSON.stringify(progress));
}

export function markLessonComplete(lessonId: string, score?: number): void {
  const progress = loadCourseProgress();
  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId);
  }
  if (score !== undefined) {
    progress.scores[lessonId] = score;
  }
  progress.lastActive = Date.now();
  saveCourseProgress(progress);
}

export function incrementCommitCount(): void {
  const progress = loadCourseProgress();
  progress.totalCommits++;
  progress.lastActive = Date.now();
  saveCourseProgress(progress);
}
