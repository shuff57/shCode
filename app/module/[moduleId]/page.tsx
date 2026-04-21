import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import { listModules, getModule } from '../../../lib/curriculum';
import { badgeForLesson } from '../../../lib/lesson-badges';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const modules = await listModules();
  return modules.map((m) => ({ moduleId: m.id }));
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const result = await getModule(moduleId);
  if (!result) return notFound();
  const { summary, html, lessons, artifacts } = result;
  const cleanModuleHtml = DOMPurify.sanitize(html);

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px', color: '#f8f8f2' }}>
      <nav style={{ marginBottom: 16, fontSize: 13, color: '#888' }}>
        <Link href="/" style={{ color: '#8be9fd' }}>Home</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span>Module {summary.id}</span>
      </nav>

      <h1 style={{ marginBottom: 4 }}>Module {summary.id} — {summary.title}</h1>
      <p style={{ color: '#888', marginTop: 0, marginBottom: 24 }}>
        Quarter {summary.quarter ?? '?'} · Weeks {summary.weeks?.join('–') ?? '?'} · Environment: {summary.environment ?? '?'}
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ borderBottom: '1px solid #333', paddingBottom: 6 }}>
          Lessons in this module
        </h2>
        {lessons.length === 0 ? (
          <p style={{ color: '#888' }}>No lessons yet.</p>
        ) : (
          <ol style={{ listStyle: 'none', padding: 0, counterReset: 'item' }}>
            {lessons.map((l) => {
              const badge = badgeForLesson({ type: l.type, preview: l.preview });
              return (
                <li
                  key={l.id}
                  style={{ marginBottom: 8, padding: '10px 14px', background: '#282a36', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      color: badge.color,
                      background: badge.color + '22',
                      border: '1px solid ' + badge.color + '55',
                      borderRadius: 999,
                      padding: '3px 10px',
                      minWidth: 140,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                    }}
                  >
                    <badge.Icon size={12} strokeWidth={2.25} />
                    {badge.label}
                  </span>
                  <span style={{ color: '#6272a4', fontFamily: 'monospace', minWidth: 50 }}>{l.numberedId}</span>
                  <Link
                    href={`/lesson/${l.id}`}
                    style={{ color: '#50fa7b', textDecoration: 'none', fontWeight: 500, flex: 1 }}
                  >
                    {l.displayTitle}
                  </Link>
                  {l.estimateMins ? (
                    <span style={{ color: '#888', fontSize: 12 }}>~{l.estimateMins} min</span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <details>
        <summary style={{ cursor: 'pointer', color: '#6272a4', fontSize: 14, padding: '8px 0' }}>
          Module overview (teacher reference)
        </summary>
        <article
          className="prose"
          style={{ marginTop: 12 }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanModuleHtml) }}
        />
      </details>

      {artifacts.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', color: '#6272a4', fontSize: 14, padding: '8px 0' }}>
            Legacy module-level markdown files ({artifacts.length})
          </summary>
          {artifacts.map((a) => (
            <div key={a.filename} style={{ marginTop: 12 }}>
              <h3 style={{ margin: '16px 0 4px' }}>{a.label}</h3>
              <code style={{ color: '#6272a4', fontSize: 12 }}>{a.filename}</code>
              <article className="prose" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.html) }} />
            </div>
          ))}
        </details>
      )}

      <style>{`
        .prose h2 { margin-top: 28px; border-bottom: 1px solid #333; padding-bottom: 6px; }
        .prose h3 { margin-top: 20px; color: #bd93f9; }
        .prose table { border-collapse: collapse; margin: 12px 0; }
        .prose th, .prose td { border: 1px solid #444; padding: 6px 10px; }
        .prose th { background: #44475a; }
        .prose code { background: #282a36; padding: 1px 5px; border-radius: 3px; color: #ffb86c; }
        .prose pre { background: #282a36; padding: 12px; border-radius: 6px; overflow-x: auto; }
        .prose pre code { background: transparent; padding: 0; color: #f8f8f2; }
        .prose a { color: #8be9fd; }
        .prose blockquote { border-left: 3px solid #bd93f9; margin: 12px 0; padding: 4px 14px; color: #ccc; background: rgba(189,147,249,0.08); }
      `}</style>
    </main>
  );
}
