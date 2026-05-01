// Tiny helper for finding the next lesson in the same category, used by the
// auto-advance-after-submit flow. Mirrors the sort order in HeaderLessonNav.

interface ManifestLesson {
  id: string;
  title: string;
  category: string | null;
}

let cached: ManifestLesson[] | null = null;
let inflight: Promise<ManifestLesson[]> | null = null;

async function loadLessons(): Promise<ManifestLesson[]> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch('/lessons-manifest.json')
    .then((r) => (r.ok ? r.json() : { lessons: [] }))
    .then((data) => {
      cached = data.lessons || [];
      return cached!;
    })
    .catch(() => {
      cached = [];
      return cached!;
    });
  return inflight;
}

function parseNumberedId(title: string): string | null {
  const m = title.match(/^(\d+\.\d+\.\d+[a-zA-Z]?)/);
  return m ? m[1] : null;
}

export async function getNextLessonId(currentId: string): Promise<string | null> {
  const lessons = await loadLessons();
  const current = lessons.find((l) => l.id === currentId);
  if (!current) return null;
  const peers = lessons
    .filter((l) => l.category === current.category)
    .sort((a, b) => {
      const an = parseNumberedId(a.title);
      const bn = parseNumberedId(b.title);
      if (an && bn) return an.localeCompare(bn, undefined, { numeric: true });
      if (an) return -1;
      if (bn) return 1;
      return a.title.localeCompare(b.title, undefined, { numeric: true });
    });
  const idx = peers.findIndex((l) => l.id === currentId);
  return idx >= 0 && idx < peers.length - 1 ? peers[idx + 1].id : null;
}

// Decide whether the current page is /lesson/X or /assignment/X. The next
// lesson keeps the same prefix — categories don't mix the two in practice.
function currentBasePath(): string {
  if (typeof window === 'undefined') return '/lesson';
  return window.location.pathname.startsWith('/assignment/') ? '/assignment' : '/lesson';
}

export async function navigateToNextLesson(currentId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const nextId = await getNextLessonId(currentId);
  // Last lesson in the category → land on home so the student can pick
  // the next module.
  window.location.href = nextId ? `${currentBasePath()}/${nextId}` : '/';
  return true;
}
