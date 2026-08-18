'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, CurrentUser } from '../../../lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRecord {
  email: string;
  role: 'admin' | 'teacher' | 'student';
  created_at: number;
  classes_owned: number;
  active_enrollments: number;
  active_classes: string | null;
}

interface ClassRecord {
  id: string;
  name: string;
  student_count: number;
}

// 'active' = every class I currently teach, 'all' = no filter at all, anything
// else is a class id. Default is 'active' so last year's roster stops being the
// first thing on the page.
type Scope = 'active' | 'all' | string;

type Role = 'admin' | 'teacher' | 'student';

// Per-row UI state
interface RowState {
  role: Role;            // currently displayed / selected role
  saving: boolean;
  savedOk: boolean;      // true for ~1.5s after a successful save
  error: string;
}

// ---------------------------------------------------------------------------
// Styles (Dracula palette — mirrors app/teacher/page.tsx)
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

  card: {
    background: '#1e1f29',
    border: '1px solid #44475a',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  } as React.CSSProperties,

  input: {
    background: '#282a36',
    border: '1px solid #44475a',
    borderRadius: 4,
    color: '#f8f8f2',
    padding: '7px 12px',
    fontSize: 14,
    outline: 'none',
    minWidth: 260,
  } as React.CSSProperties,

  select: {
    background: '#282a36',
    border: '1px solid #44475a',
    borderRadius: 4,
    color: '#f8f8f2',
    padding: '5px 8px',
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none',
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
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid #44475a22',
    verticalAlign: 'middle' as const,
  },

  error: { color: '#ff5555', fontSize: 12, marginTop: 4 } as React.CSSProperties,
};

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
    return { data: (await res.json()) as T, error: null };
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

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Inner page (requires Suspense boundary for useSearchParams compatibility)
// ---------------------------------------------------------------------------

function AdminUsersInner() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [scope, setScope] = useState<Scope>('active');

  // Per-row state keyed by email
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  // Auth check on mount
  useEffect(() => {
    getCurrentUser().then((u) => {
      setCurrentUser(u);
      setAuthChecked(true);
    });
  }, []);

  // Classes for the switcher. Archived ones are left out — the point of the
  // filter is to stop showing classes that finished.
  useEffect(() => {
    if (!authChecked) return;
    if (currentUser?.role !== 'admin') return;
    apiFetch<{ classes: ClassRecord[] }>('/api/classes').then((res) => {
      if (res.error === null) setClasses(res.data.classes);
    });
  }, [authChecked, currentUser]);

  // Fetch users once auth confirmed as admin, and again whenever the scope changes
  useEffect(() => {
    if (!authChecked) return;
    if (currentUser?.role !== 'admin') return;

    setLoading(true);
    apiFetch<{ users: UserRecord[] }>(
      `/api/admin/users?scope=${encodeURIComponent(scope)}`,
    ).then((res) => {
      if (res.error !== null) {
        setLoadError(res.error);
      } else {
        setUsers(res.data.users);
        const initial: Record<string, RowState> = {};
        for (const u of res.data.users) {
          initial[u.email] = { role: u.role, saving: false, savedOk: false, error: '' };
        }
        setRowStates(initial);
        setLoadError('');
      }
      setLoading(false);
    });
  }, [authChecked, currentUser, scope]);

  // Patch one field of a row's state
  function patchRow(email: string, patch: Partial<RowState>) {
    setRowStates((prev) => ({
      ...prev,
      [email]: { ...prev[email], ...patch },
    }));
  }

  async function handleRoleChange(email: string, newRole: Role) {
    const isSelf = email === currentUser?.email;

    // Client-side self-demotion warning
    if (isSelf && newRole !== 'admin') {
      const confirmed = window.confirm(
        "You're about to lose admin access. Continue?",
      );
      if (!confirmed) {
        // Revert the select to 'admin' — the server would reject it anyway
        patchRow(email, { role: 'admin' });
        return;
      }
    }

    patchRow(email, { saving: true, savedOk: false, error: '' });

    const res = await apiFetch<{ ok: boolean; email: string; role: Role }>(
      `/api/admin/users/${encodeURIComponent(email)}/role`,
      { method: 'POST', body: JSON.stringify({ role: newRole }) },
    );

    if (res.error !== null) {
      const errMsg =
        res.error === "Can't demote yourself"
          ? "You can't demote yourself."
          : res.error;
      // Revert the displayed role to what the server still has
      patchRow(email, { saving: false, role: rowStates[email]?.role ?? 'student', error: errMsg });
      return;
    }

    // Success — update local state with server-confirmed role
    patchRow(email, { saving: false, savedOk: true, role: res.data.role, error: '' });

    // Clear the green check after 1.5s
    setTimeout(() => {
      patchRow(email, { savedOk: false });
    }, 1500);
  }

  // ---------------------------------------------------------------------------
  // Render: not authed
  // ---------------------------------------------------------------------------

  if (!authChecked) {
    return <div style={{ ...S.page, color: '#6272a4' }}>Loading…</div>;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={S.page}>
        <p style={{ color: '#ff5555', fontSize: 16, marginBottom: 16 }}>Admin access required.</p>
        <Link href="/" style={{ color: '#8be9fd', fontSize: 14 }}>
          ← Home
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: main table
  // ---------------------------------------------------------------------------

  const filtered = search
    ? users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()))
    : users;

  const studentCount = users.filter((u) => u.role === 'student').length;
  const staffCount = users.length - studentCount;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Admin · Users</h1>

      {/* Class switcher + search */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#6272a4' }} htmlFor="admin-class-scope">
          Class
        </label>
        <select
          id="admin-class-scope"
          style={{ ...S.select, minWidth: 220, padding: '7px 10px', fontSize: 14 }}
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="active">Active classes (all)</option>
          {classes.length > 0 && <option disabled>──────────</option>}
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.student_count})
            </option>
          ))}
          <option disabled>──────────</option>
          <option value="all">All accounts (incl. past)</option>
        </select>

        <input
          style={S.input}
          type="search"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Filter users by email"
        />

        <span style={{ fontSize: 13, color: '#6272a4' }}>
          {search ? `${filtered.length} of ${users.length}` : `${studentCount} students · ${staffCount} staff`}
        </span>
      </div>

      {scope !== 'all' && (
        <p style={{ fontSize: 13, color: '#6272a4', margin: '-8px 0 20px' }}>
          Students with no current enrollment are hidden. Teachers and admins always show.{' '}
          <button
            type="button"
            onClick={() => setScope('all')}
            style={{
              background: 'none',
              border: 'none',
              color: '#8be9fd',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
              textDecoration: 'underline',
            }}
          >
            Show every account
          </button>
        </p>
      )}

      {/* States */}
      {loading && <div style={{ color: '#6272a4' }}>Loading users…</div>}
      {loadError && <div style={{ color: '#ff5555', fontSize: 14 }}>{loadError}</div>}

      {!loading && !loadError && users.length === 0 && (
        <p style={{ color: '#6272a4', fontSize: 14 }}>
          {scope === 'all'
            ? 'No accounts found.'
            : 'Nobody is enrolled here yet. Students appear once they join with the class code.'}
        </p>
      )}

      {!loading && !loadError && users.length > 0 && (
        <div style={{ ...S.card, overflowX: 'auto', padding: 0 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Email</th>
                <th style={S.th}>Role</th>
                <th style={S.th}>Created</th>
                <th style={S.th}>Active classes</th>
                <th style={S.th}>Classes owned</th>
                <th style={S.th}>Active enrollments</th>
                <th style={{ ...S.th, width: 60 }}>Saved</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const rs = rowStates[u.email];
                if (!rs) return null;
                return (
                  <tr key={u.email}>
                    {/* Email */}
                    <td style={{ ...S.td, fontFamily: 'monospace', color: '#8be9fd' }}>
                      {u.email}
                    </td>

                    {/* Role dropdown */}
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <select
                          style={S.select}
                          value={rs.role}
                          disabled={rs.saving}
                          onChange={(e) => {
                            const next = e.target.value as Role;
                            // Update optimistically so the select isn't jarring
                            patchRow(u.email, { role: next });
                            void handleRoleChange(u.email, next);
                          }}
                          aria-label={`Role for ${u.email}`}
                        >
                          <option value="student">student</option>
                          <option value="teacher">teacher</option>
                          <option value="admin">admin</option>
                        </select>

                        {/* Spinner */}
                        {rs.saving && (
                          <span
                            style={{ color: '#6272a4', fontSize: 13, animation: 'none' }}
                            aria-label="Saving…"
                          >
                            …
                          </span>
                        )}
                      </div>
                      {/* Inline error */}
                      {rs.error && <div style={S.error}>{rs.error}</div>}
                    </td>

                    {/* Created */}
                    <td style={{ ...S.td, color: '#6272a4', fontSize: 13 }}>
                      {fmtDate(u.created_at)}
                    </td>

                    {/* Active classes this student is currently in */}
                    <td style={{ ...S.td, color: u.active_classes ? '#f8f8f2' : '#6272a4', fontSize: 13 }}>
                      {u.active_classes || (u.role === 'student' ? 'none' : '—')}
                    </td>

                    {/* Classes owned */}
                    <td style={{ ...S.td, textAlign: 'center' as const, color: '#f8f8f2' }}>
                      {u.classes_owned}
                    </td>

                    {/* Active enrollments */}
                    <td style={{ ...S.td, textAlign: 'center' as const, color: '#f8f8f2' }}>
                      {u.active_enrollments}
                    </td>

                    {/* Saved indicator */}
                    <td style={{ ...S.td, textAlign: 'center' as const }}>
                      {rs.savedOk && (
                        <span style={{ color: '#50fa7b', fontWeight: 700, fontSize: 16 }}>
                          ✓
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export — Suspense boundary required by Next.js static export
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div style={{ ...S.page, color: '#6272a4' }}>Loading…</div>}>
      <AdminUsersInner />
    </Suspense>
  );
}
