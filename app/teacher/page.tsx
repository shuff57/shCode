'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClassSummary {
  id: string;
  name: string;
  code: string;
  owner_email: string;
  school_year: string | null;
  created_at: string;
  archived_at: string | null;
  role: 'owner' | 'co-teacher';
  student_count: number;
}

interface RosterRow {
  student_email: string;
  enrolled_at: string;
  enrolled_by: string | null;
  expires_at: string | null;
}

interface ClassDetail {
  class: ClassSummary;
  isOwner: boolean;
  roster: RosterRow[];
  coTeachers: unknown[];
}

interface StudentProgress {
  student_email: string;
  completed_count: number;
  started_count: number;
  last_active: number | null;
  total_score: number;
}

interface LessonStateEntry {
  state: 'started' | 'completed';
  started_at: number | null;
  completed_at: number | null;
  score: number | null;
}

interface SubmissionEntry {
  id: string;
  submitted_at: number;
  score: number | null;
  possible: number | null;
  grade_json: string | null;
}

interface StudentDetail {
  student_email: string;
  lessonState: Record<string, LessonStateEntry>;
  latestSubmissions: Record<string, SubmissionEntry>;
}

interface LessonMeta {
  id: string;
  title: string;
  unit: string | null;
}

interface GradeCriterion {
  id: string;
  title: string;
  earned: number;
  possible: number;
  feedback?: string;
}

interface GradeResponse {
  totalEarned: number;
  totalPossible: number;
  criteria?: GradeCriterion[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T; error: null } | { data: null; error: string; status: number }> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  if (res.ok) {
    const data = (await res.json()) as T;
    return { data, error: null };
  }
  let errorMsg = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) errorMsg = body.error;
  } catch {
    // ignore parse errors
  }
  return { data: null, error: errorMsg, status: res.status };
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function fmtTs(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = {
  page: {
    minHeight: '100vh',
    background: '#282a36',
    color: '#f8f8f2',
    padding: '32px 24px',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  h1: { fontSize: 28, fontWeight: 700, marginBottom: 24, color: '#f8f8f2' } as React.CSSProperties,
  h2: { fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#f8f8f2' } as React.CSSProperties,

  card: {
    background: '#1e1f29',
    border: '1px solid #44475a',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  } as React.CSSProperties,

  btn: (color: string) =>
    ({
      background: color,
      color: '#282a36',
      border: 'none',
      borderRadius: 4,
      padding: '7px 14px',
      fontWeight: 600,
      fontSize: 13,
      cursor: 'pointer',
    }) as React.CSSProperties,

  btnDisabled: {
    background: '#44475a',
    color: '#6272a4',
    border: 'none',
    borderRadius: 4,
    padding: '7px 14px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'not-allowed',
  } as React.CSSProperties,

  input: {
    background: '#282a36',
    border: '1px solid #44475a',
    borderRadius: 4,
    color: '#f8f8f2',
    padding: '7px 12px',
    fontSize: 14,
    outline: 'none',
    minWidth: 220,
  } as React.CSSProperties,

  error: { color: '#ff5555', fontSize: 13, marginTop: 6 } as React.CSSProperties,

  badge: (archived: boolean) =>
    ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      background: archived ? '#f1fa8c' : '#50fa7b',
      color: '#282a36',
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }) as React.CSSProperties,

  code: {
    fontFamily: 'monospace',
    fontSize: 28,
    fontWeight: 700,
    color: '#8be9fd',
    letterSpacing: '0.15em',
  } as React.CSSProperties,

  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: {
    textAlign: 'left' as const,
    padding: '8px 12px',
    borderBottom: '1px solid #44475a',
    color: '#6272a4',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase' as const,
  },
  td: { padding: '8px 12px', borderBottom: '1px solid #44475a22', verticalAlign: 'middle' as const },
};

// ---------------------------------------------------------------------------
// StudentDrawer — right-side panel showing per-lesson progress
// ---------------------------------------------------------------------------

function StudentDrawer({
  classId,
  email,
  lessonMap,
  onClose,
}: {
  classId: string;
  email: string;
  lessonMap: Map<string, LessonMeta>;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setErr('');
    apiFetch<StudentDetail>(
      `/api/classes/${classId}/students/${encodeURIComponent(email)}`,
    ).then((res) => {
      if (res.error !== null) {
        setErr(res.error);
      } else {
        setDetail(res.data);
      }
      setLoading(false);
    }).catch(() => {
      setErr('Network error');
      setLoading(false);
    });
  }, [classId, email]);

  function toggleSub(lessonId: string) {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }

  // Group active lessons by unit. Only show lessons that have some state.
  const unitGroups: Array<{ unit: string; lessons: LessonMeta[] }> = [];
  if (detail) {
    const unitOrder: string[] = [];
    const byUnit: Record<string, LessonMeta[]> = {};

    for (const id of Object.keys(detail.lessonState)) {
      const meta = lessonMap.get(id) ?? { id, title: id, unit: null };
      const u = meta.unit ?? 'Other';
      if (!byUnit[u]) {
        byUnit[u] = [];
        unitOrder.push(u);
      }
      byUnit[u].push(meta);
    }

    for (const u of unitOrder) {
      unitGroups.push({ unit: u, lessons: byUnit[u].sort((a, b) => a.id.localeCompare(b.id)) });
    }
  }

  const drawerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 600,
    background: '#1e1f29',
    borderLeft: '1px solid #44475a',
    overflowY: 'auto',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  };

  function stateBadge(state: 'started' | 'completed' | undefined) {
    if (state === 'completed') {
      return (
        <span style={{ background: '#50fa7b', color: '#282a36', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          Complete
        </span>
      );
    }
    if (state === 'started') {
      return (
        <span style={{ background: '#f1fa8c', color: '#282a36', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          In progress
        </span>
      );
    }
    return (
      <span style={{ background: '#44475a', color: '#6272a4', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        Not started
      </span>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div style={overlayStyle} onClick={onClose} />

      {/* Panel */}
      <div style={drawerStyle}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #44475a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f8f8f2', marginBottom: 2 }}>
              Student Progress
            </div>
            <div style={{ fontSize: 13, color: '#8be9fd', fontFamily: 'monospace' }}>{email}</div>
          </div>
          <button
            style={{ background: 'none', border: 'none', color: '#6272a4', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '4px 8px' }}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1 }}>
          {loading && <div style={{ color: '#6272a4' }}>Loading…</div>}
          {err && <div style={{ color: '#ff5555', fontSize: 13 }}>{err}</div>}
          {detail && unitGroups.length === 0 && (
            <p style={{ color: '#6272a4', fontSize: 14 }}>No lesson activity yet.</p>
          )}
          {detail && unitGroups.map(({ unit, lessons }) => (
            <div key={unit} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#bd93f9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                {unit}
              </div>
              <div>
                {lessons.map((lesson) => {
                  const ls = detail.lessonState[lesson.id];
                  const sub = detail.latestSubmissions[lesson.id];
                  const isExpanded = expandedSubs.has(lesson.id);

                  let gradeData: GradeResponse | null = null;
                  if (sub?.grade_json) {
                    try {
                      gradeData = JSON.parse(sub.grade_json) as GradeResponse;
                    } catch {
                      // malformed grade_json — skip
                    }
                  }

                  return (
                    <div key={lesson.id} style={{ marginBottom: 8, background: '#282a36', borderRadius: 6, padding: '10px 14px', border: '1px solid #44475a33' }}>
                      {/* Lesson row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ flex: 1, fontSize: 13, color: '#f8f8f2', minWidth: 0 }}>
                          {lesson.title}
                        </span>
                        {stateBadge(ls?.state)}
                        {ls?.state === 'completed' && ls.score !== null && (
                          <span style={{ fontSize: 12, color: '#8be9fd', fontFamily: 'monospace', flexShrink: 0 }}>
                            {ls.score} pts
                          </span>
                        )}
                        {sub && (
                          <button
                            style={{ background: 'none', border: '1px solid #6272a4', borderRadius: 4, color: '#8be9fd', fontSize: 12, cursor: 'pointer', padding: '3px 8px', flexShrink: 0 }}
                            onClick={() => toggleSub(lesson.id)}
                          >
                            {isExpanded ? 'Hide' : 'View submission'}
                          </button>
                        )}
                      </div>

                      {/* Submission detail */}
                      {isExpanded && sub && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #44475a33' }}>
                          <div style={{ fontSize: 11, color: '#6272a4', marginBottom: 8 }}>
                            Submitted: {fmtTs(sub.submitted_at)}
                            {sub.score !== null && sub.possible !== null && (
                              <span style={{ marginLeft: 12, color: '#f1fa8c' }}>
                                Score: {sub.score} / {sub.possible}
                              </span>
                            )}
                          </div>

                          {gradeData && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#50fa7b', marginBottom: 6 }}>
                                {gradeData.totalEarned} / {gradeData.totalPossible} pts
                              </div>
                              {gradeData.criteria && gradeData.criteria.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {gradeData.criteria.map((c) => (
                                    <div key={c.id} style={{ fontSize: 12, background: '#1e1f29', borderRadius: 4, padding: '6px 10px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: c.feedback ? 3 : 0 }}>
                                        <span style={{ color: '#f8f8f2' }}>{c.title}</span>
                                        <span style={{ color: '#8be9fd', fontFamily: 'monospace' }}>{c.earned}/{c.possible}</span>
                                      </div>
                                      {c.feedback && (
                                        <div style={{ color: '#6272a4', fontSize: 11 }}>{c.feedback}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function ListView() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadClasses = useCallback(async (withArchived: boolean) => {
    setLoading(true);
    const url = withArchived ? '/api/classes?includeArchived=true' : '/api/classes';
    const result = await apiFetch<{ classes: ClassSummary[] }>(url);
    if (result.error !== null) {
      if (result.status === 403) setForbidden(true);
    } else {
      setClasses(result.data.classes);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadClasses(includeArchived);
  }, [loadClasses, includeArchived]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    const result = await apiFetch<{ class: ClassSummary }>('/api/classes', {
      method: 'POST',
      body: JSON.stringify({ name: newName.trim() }),
    });
    setCreating(false);
    if (result.error !== null) {
      setCreateError(result.error);
    } else {
      setNewName('');
      router.push(`/teacher?class=${result.data.class.id}`);
    }
  }

  if (loading) return <div style={{ color: '#6272a4' }}>Loading…</div>;
  if (forbidden)
    return (
      <div style={{ color: '#ff5555', fontSize: 16, padding: 32 }}>Teacher access required.</div>
    );

  return (
    <div>
      <h1 style={S.h1}>My Classes</h1>

      {/* Create form */}
      <div style={{ ...S.card, marginBottom: 32 }}>
        <h2 style={{ ...S.h2, marginBottom: 12 }}>Create a new class</h2>
        <form onSubmit={(e) => { void handleCreate(e); }} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            style={S.input}
            placeholder="Class name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            style={creating || !newName.trim() ? S.btnDisabled : S.btn('#bd93f9')}
          >
            {creating ? 'Creating…' : 'Create class'}
          </button>
        </form>
        {createError && <p style={S.error}>{createError}</p>}
      </div>

      {/* Include archived toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#6272a4', marginBottom: 20, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
          style={{ accentColor: '#8be9fd' }}
        />
        Include archived classes
      </label>

      {/* Class list */}
      {classes.length === 0 ? (
        <p style={{ color: '#6272a4' }}>No classes yet. Create one above.</p>
      ) : (
        <div>
          {classes.map((c) => (
            <div
              key={c.id}
              style={{
                ...S.card,
                opacity: c.archived_at ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{c.name}</span>
                  {c.archived_at && <span style={S.badge(true)}>Archived</span>}
                </div>
                <div style={{ display: 'flex', gap: 20, color: '#6272a4', fontSize: 13, flexWrap: 'wrap' }}>
                  <span>Code: <span style={{ fontFamily: 'monospace', color: '#8be9fd' }}>{c.code}</span></span>
                  {c.school_year && <span>Year: {c.school_year}</span>}
                  <span>{c.student_count} student{c.student_count !== 1 ? 's' : ''}</span>
                  <span style={{ textTransform: 'capitalize' }}>{c.role}</span>
                </div>
              </div>
              <button
                style={S.btn('#8be9fd')}
                onClick={() => router.push(`/teacher?class=${c.id}`)}
              >
                Open →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------

function DetailView({ classId }: { classId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [removingEmail, setRemovingEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Progress state
  const [progressMap, setProgressMap] = useState<Map<string, StudentProgress>>(new Map());
  const [lessonMap, setLessonMap] = useState<Map<string, LessonMeta>>(new Map());
  const [drawerEmail, setDrawerEmail] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const result = await apiFetch<ClassDetail>(`/api/classes/${classId}`);
    if (result.error !== null) {
      setLoadError(result.error);
    } else {
      setDetail(result.data);
      setCurrentCode(result.data.class.code);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  // Fetch progress roll-up whenever class loads successfully.
  useEffect(() => {
    if (!detail) return;
    apiFetch<{ students: StudentProgress[] }>(`/api/classes/${classId}/progress`).then((res) => {
      if (res.error === null) {
        const m = new Map<string, StudentProgress>();
        for (const s of res.data.students) m.set(s.student_email, s);
        setProgressMap(m);
      }
    }).catch(() => undefined);
  }, [classId, detail]);

  // Load lesson manifest once (client-safe static JSON).
  useEffect(() => {
    fetch('/lessons-manifest.json')
      .then((r) => r.json() as Promise<{ lessons: LessonMeta[] }>)
      .then((data) => {
        const m = new Map<string, LessonMeta>();
        for (const l of data.lessons) m.set(l.id, l);
        setLessonMap(m);
      })
      .catch(() => undefined);
  }, []);

  async function handleRegenCode() {
    if (!window.confirm('Regenerate join code? The old code will stop working.')) return;
    setRegenerating(true);
    const result = await apiFetch<{ ok: boolean; code: string }>(
      `/api/classes/${classId}/regenerate-code`,
      { method: 'POST' },
    );
    setRegenerating(false);
    if (result.error === null) setCurrentCode(result.data.code);
  }

  async function handleArchiveToggle() {
    if (!detail) return;
    const isArchived = !!detail.class.archived_at;
    const action = isArchived ? 'Unarchive' : 'Archive';
    if (!window.confirm(`${action} this class?`)) return;
    setArchiving(true);
    const result = await apiFetch<{ ok: boolean; archived_at: string | null }>(
      `/api/classes/${classId}/archive`,
      { method: 'POST', body: JSON.stringify({ archived: !isArchived }) },
    );
    setArchiving(false);
    if (result.error === null) {
      setDetail((prev) =>
        prev
          ? { ...prev, class: { ...prev.class, archived_at: result.data.archived_at } }
          : prev,
      );
    }
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollEmail.trim()) return;
    setEnrolling(true);
    setEnrollError('');
    const result = await apiFetch<{ ok: boolean; enrollment: unknown }>(
      `/api/classes/${classId}/enrollments`,
      { method: 'POST', body: JSON.stringify({ email: enrollEmail.trim() }) },
    );
    setEnrolling(false);
    if (result.error !== null) {
      if (result.status === 404) setEnrollError('No account found for that email.');
      else if (result.status === 409) setEnrollError('Already enrolled.');
      else setEnrollError(result.error);
    } else {
      setEnrollEmail('');
      void loadDetail();
    }
  }

  async function handleDelete() {
    if (!detail) return;
    const name = detail.class.name;
    const typed = window.prompt(
      `Permanently delete "${name}"?\n\nThis removes the class, enrollments, and co-teacher rows. Student progress data (commits, completions) is preserved.\n\nType the class name to confirm:`,
    );
    if (typed === null) return;
    if (typed.trim() !== name) {
      setDeleteError('Name did not match. Nothing deleted.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    const result = await apiFetch<{ ok: boolean }>(`/api/classes/${classId}/delete`, {
      method: 'POST',
    });
    setDeleting(false);
    if (result.error !== null) {
      setDeleteError(result.error);
    } else {
      router.push('/teacher');
    }
  }

  async function handleRemove(email: string) {
    if (!window.confirm(`Remove ${email} from this class?`)) return;
    setRemovingEmail(email);
    await apiFetch(`/api/classes/${classId}/enrollments/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
    setRemovingEmail('');
    void loadDetail();
  }

  if (loading) return <div style={{ color: '#6272a4' }}>Loading…</div>;
  if (loadError)
    return (
      <div>
        <button
          style={{ ...S.btn('#6272a4'), color: '#f8f8f2', marginBottom: 16 }}
          onClick={() => router.push('/teacher')}
        >
          ← Back to list
        </button>
        <p style={{ color: '#ff5555' }}>{loadError}</p>
      </div>
    );
  if (!detail) return null;

  const { class: cls, isOwner, roster } = detail;
  const isArchived = !!cls.archived_at;

  return (
    <div>
      {/* Back link */}
      <button
        style={{ background: 'none', border: 'none', color: '#8be9fd', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 24 }}
        onClick={() => router.push('/teacher')}
      >
        ← Back to list
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ ...S.h1, marginBottom: 0 }}>{cls.name}</h1>
            {isArchived && <span style={S.badge(true)}>Archived</span>}
          </div>
          <div style={{ display: 'flex', gap: 20, color: '#6272a4', fontSize: 13, flexWrap: 'wrap' }}>
            {cls.school_year && <span>Year: {cls.school_year}</span>}
            <span>Created: {fmt(cls.created_at)}</span>
            {cls.archived_at && <span>Archived: {fmt(cls.archived_at)}</span>}
          </div>
        </div>

        {/* Owner-only actions */}
        {isOwner && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                style={archiving ? S.btnDisabled : S.btn(isArchived ? '#50fa7b' : '#f1fa8c')}
                disabled={archiving}
                onClick={() => { void handleArchiveToggle(); }}
              >
                {archiving ? '…' : isArchived ? 'Unarchive' : 'Archive'}
              </button>
              <button
                style={deleting ? S.btnDisabled : { ...S.btn('#ff5555'), color: '#f8f8f2' }}
                disabled={deleting}
                onClick={() => { void handleDelete(); }}
              >
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
            {deleteError && <p style={S.error}>{deleteError}</p>}
          </div>
        )}
      </div>

      {/* Code */}
      <div style={{ ...S.card, marginBottom: 28 }}>
        <div style={{ color: '#6272a4', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Join Code</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <span style={S.code}>{currentCode}</span>
          <button
            style={regenerating ? S.btnDisabled : S.btn('#ff79c6')}
            disabled={regenerating}
            onClick={() => { void handleRegenCode(); }}
          >
            {regenerating ? 'Regenerating…' : 'Regenerate code'}
          </button>
        </div>
      </div>

      {/* Roster */}
      <div style={{ ...S.card, marginBottom: 28 }}>
        <h2 style={S.h2}>Roster ({roster.length})</h2>
        {roster.length === 0 ? (
          <p style={{ color: '#6272a4', fontSize: 14 }}>No students enrolled yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {roster.map((row) => {
              const prog = progressMap.get(row.student_email);
              return (
                <div
                  key={row.student_email}
                  style={{ background: '#282a36', borderRadius: 6, padding: '12px 16px', border: '1px solid #44475a33', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#f8f8f2', marginBottom: 4 }}>
                      {row.student_email}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6272a4', flexWrap: 'wrap' }}>
                      <span>
                        Enrolled: {fmt(row.enrolled_at)} by {row.enrolled_by ?? 'self'}
                      </span>
                      {prog ? (
                        <>
                          <span style={{ color: '#50fa7b' }}>{prog.completed_count} completed</span>
                          {prog.started_count > 0 && (
                            <span style={{ color: '#f1fa8c' }}>{prog.started_count} started</span>
                          )}
                          {prog.last_active !== null && (
                            <span>last active {fmtTs(prog.last_active)}</span>
                          )}
                        </>
                      ) : (
                        <span>No activity yet</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      style={S.btn('#8be9fd')}
                      onClick={() => setDrawerEmail(row.student_email)}
                    >
                      Open
                    </button>
                    <button
                      style={
                        removingEmail === row.student_email
                          ? S.btnDisabled
                          : { ...S.btn('#ff5555'), color: '#f8f8f2' }
                      }
                      disabled={removingEmail === row.student_email}
                      onClick={() => { void handleRemove(row.student_email); }}
                    >
                      {removingEmail === row.student_email ? '…' : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add student */}
      <div style={S.card}>
        <h2 style={S.h2}>Add student by email</h2>
        <form onSubmit={(e) => { void handleEnroll(e); }} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            style={S.input}
            type="email"
            placeholder="student@example.com"
            value={enrollEmail}
            onChange={(e) => setEnrollEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={enrolling || !enrollEmail.trim()}
            style={enrolling || !enrollEmail.trim() ? S.btnDisabled : S.btn('#50fa7b')}
          >
            {enrolling ? 'Adding…' : 'Add student'}
          </button>
        </form>
        {enrollError && <p style={S.error}>{enrollError}</p>}
      </div>

      {/* Student drawer */}
      {drawerEmail !== null && (
        <StudentDrawer
          classId={classId}
          email={drawerEmail}
          lessonMap={lessonMap}
          onClose={() => setDrawerEmail(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root — reads ?class= param
// ---------------------------------------------------------------------------

function TeacherPageInner() {
  const params = useSearchParams();
  const classId = params.get('class');

  return (
    <div style={S.page}>
      {classId ? <DetailView classId={classId} /> : <ListView />}
    </div>
  );
}

export default function TeacherPage() {
  return (
    <Suspense fallback={<div style={{ ...S.page, color: '#6272a4' }}>Loading…</div>}>
      <TeacherPageInner />
    </Suspense>
  );
}
