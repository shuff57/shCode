'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { getCurrentUser, CurrentUser } from '../lib/auth';
import NavDropdown from './NavDropdown';
import AuthButton from './AuthButton';

// Which top-nav section the page belongs to, so its nav item can carry aria-current and the
// accent underline (globals.css climb4 r9 S1). The query string matters only for the teacher
// gradebook (`/teacher?view=gradebook` or a class's `tab=gradebook`).
type NavSection = 'lessons' | 'learn' | 'teach' | 'gradebook' | 'issues' | null;
function navSection(pathname: string, search: string): NavSection {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/' || p.startsWith('/module/') || p.startsWith('/lesson/') || p.startsWith('/assignment/')) return 'lessons';
  if (p === '/progress') return 'gradebook';
  if (p === '/issues') return 'issues';
  if (/^\/(docs|sandbox|library|textures|sound|play)(\/|$)/.test(p)) return 'learn';
  if (p === '/teacher' && /(?:^|[?&])(?:view|tab)=gradebook(?:&|$)/.test(search)) return 'gradebook';
  if (p.startsWith('/teacher') || p.startsWith('/admin')) return 'teach';
  return null;
}

// useSearchParams needs a Suspense boundary in a static export; this tiny child is the only part
// that reads it, so the rest of the header still prerenders.
function SearchWatch({ onChange }: { onChange: (s: string) => void }) {
  const params = useSearchParams();
  const s = params?.toString() ?? '';
  useEffect(() => { onChange(s); }, [s, onChange]);
  return null;
}

// Menu-item style shared by both dropdowns below — a real <Link>/<a>, not a
// div with onClick, so it stays keyboard- and screen-reader-reachable.
const itemStyle: React.CSSProperties = {
  color: 'var(--c-fg)',
  textDecoration: 'none',
  fontSize: 13,
  padding: '6px 10px',
  borderRadius: 4,
  whiteSpace: 'nowrap',
};

export default function HeaderNav() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hasEnrollments, setHasEnrollments] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Phone menu (ux2 S6). Closing by hand (Escape, a tap outside) puts focus back on the ☰ button; a tap
  // outside lands on a full-screen backdrop, so it only closes the menu and never also opens what is
  // underneath (a walker opened a module that way).
  const closeMenu = (refocus: boolean) => {
    setMenuOpen(false);
    if (refocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!menuOpen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeMenu(true); };
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('keydown', escape); };
  }, [menuOpen]);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      if (u?.role === 'student') {
        fetch('/api/my-enrollments', { credentials: 'same-origin' })
          .then((res) => {
            if (!res.ok) return null;
            return res.json() as Promise<{ enrollments?: unknown[] }>;
          })
          .then((data) => {
            if (data == null) {
              setHasEnrollments(null);
            } else {
              setHasEnrollments(
                Array.isArray(data.enrollments) ? data.enrollments.length > 0 : true
              );
            }
          })
          .catch(() => {
            setHasEnrollments(null);
          })
          .finally(() => setLoaded(true));
      } else {
        setLoaded(true);
      }
    });
  }, []);

  const isStaff = loaded && (user?.role === 'teacher' || user?.role === 'admin');
  const pathname = usePathname() || '/';
  const [search, setSearch] = useState('');
  const section = navSection(pathname, search);
  const cur = (s: NavSection) => (section === s ? { 'aria-current': 'page' as const, className: 'nav-current' } : {});
  // A new page closes the menu: it used to stay open on top of the page just chosen.
  useEffect(() => { setMenuOpen(false); }, [pathname, search]);
  // Not in a class yet (known, not guessed): the only time "Join your class" is shown, on any screen.
  const showJoin = loaded && user?.role === 'student' && hasEnrollments === false;

  return (
    <div ref={menuRef} className="site-header-nav-wrap">
      <Suspense fallback={null}><SearchWatch onChange={setSearch} /></Suspense>
      {/* Phones: the report-an-issue flag renders in here (ReportIssueButton, climb4 r9 S15). */}
      <span id="header-flag-slot" className="header-flag-slot" />
      <button ref={menuButtonRef} className="mobile-header-menu" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)} style={{ display: 'none', background: 'transparent', color: 'var(--header-fg)', border: '1px solid var(--c-comment)', borderRadius: 4, padding: '6px 9px', fontSize: 18, lineHeight: 1, cursor: 'pointer' }}>
        ☰
      </button>
      {showJoin ? <Link className="mobile-join-link header-join-btn" href="/join-class" style={{ display: 'none', color: 'var(--c-yellow)', fontSize: 12, whiteSpace: 'nowrap' }}>Join your class</Link> : null}
      {menuOpen ? (
        // Phones only (CSS): swallows the tap that closes the menu.
        <button type="button" className="mobile-menu-backdrop" tabIndex={-1} aria-hidden="true" onClick={() => closeMenu(true)} />
      ) : null}
      <nav
        className={`desktop-header-links flex items-center gap-4 flex-wrap justify-end${menuOpen ? ' mobile-open' : ''}`}
        onClick={(e) => { if ((e.target as Element).closest('a[href]')) setMenuOpen(false); }}
      >
      <Link href="/" style={{ color: 'var(--header-fg)' }} {...cur('lessons')}>Lessons</Link>
      {/* Phones only (CSS): the sandbox in one obvious tap, not hidden under "Learn". */}
      <Link href="/sandbox" className="mobile-menu-only" style={{ color: 'var(--header-fg)' }}>Sandbox</Link>

      <NavDropdown label="Learn" current={section === 'learn'} triggerStyle={{ color: 'var(--header-fg)', fontSize: 15 }}>
        <Link href="/sandbox" style={itemStyle}>Sandbox</Link>
        {/* The pixel editor behind `sprite.texture`. Linked here rather than
            only from the docs: a page nothing navigates to is the failure
            check-reachable.mjs exists to catch. */}
        <Link href="/textures" style={itemStyle}>Textures</Link>
        {/* The 8-bit sound mixer behind `loadSound('name')`. Link it beside
            the texture editor for the same reason: a tool no page reaches is
            a tool nobody finds. */}
        <Link href="/sound" style={itemStyle}>Sounds</Link>
        {/* What classmates shared (#81): textures and sounds, with Copy to mine. */}
        <Link href="/library" style={itemStyle}>Library</Link>
        {/* One Docs tab for the whole family — JavaScript, moSHion and reSHape
            each have a set inside, switched from the hub at /docs and from the
            family switcher on every docs page. */}
        <Link href="/docs" style={itemStyle}>Docs</Link>
      </NavDropdown>

      {isStaff && (
        <NavDropdown label="Teach" current={section === 'teach'} triggerStyle={{ color: 'var(--header-fg)', fontSize: 15 }}>
          <Link href="/teacher" style={itemStyle}>Classes</Link>
          <Link href="/teacher/issues" style={itemStyle}>Issues</Link>
          {user?.role === 'admin' && (
            <Link href="/admin/users" style={itemStyle}>Users</Link>
          )}
        </NavDropdown>
      )}

      {/* Top-level shortcut into the same gradebook DetailView tab reaches via
          Teach -> Classes -> pick a class -> Gradebook tab. Staff only. */}
      {isStaff && (
        <Link href="/teacher?view=gradebook" style={{ color: 'var(--header-fg)' }} {...cur('gradebook')}>Gradebook</Link>
      )}

      {/* Students only get two extra links — not worth a dropdown for two.
          Students get the anonymised queue at /issues, staff get the triage
          page above (a different route, kept separate deliberately). Without
          this link the only way in is the one-off link shown after filing a
          report, which is not visibility. */}
      {loaded && user?.role === 'student' && (
        <Link href="/issues" style={{ color: 'var(--header-fg)' }} {...cur('issues')}>Issues</Link>
      )}
      {/* The student's own gradebook. Until 2026-09-02 /progress was linked
          from NOWHERE in the app — the score table, the due dates and the
          teacher's override comments all rendered on a page reachable only by
          typing the URL. scripts/check-reachable.mjs now holds that open. */}
      {loaded && user?.role === 'student' && (
        <Link href="/progress" style={{ color: 'var(--header-fg)' }} {...cur('gradebook')}>Gradebook</Link>
      )}

      {showJoin && (
        <Link
          href="/join-class"
          className="header-join-btn"
          style={{
            background: 'var(--c-yellow)',
            color: 'var(--c-bg)',
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Join your class
        </Link>
      )}
        <AuthButton />
      </nav>
    </div>
  );
}
