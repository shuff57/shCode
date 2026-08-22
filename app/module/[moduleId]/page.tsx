import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import { listModules, getModule } from '../../../lib/curriculum';
import { notFound } from 'next/navigation';
import ModuleLessonsList from '../../../components/ModuleLessonsList';
import TeacherOnly from '../../../components/TeacherOnly';

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
    <main
      className="text-text"
      style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 48px' }}
    >
      <nav style={{ marginBottom: 16, fontSize: 13, opacity: 0.6 }}>
        <Link href="/" style={{ color: 'var(--brand)' }}>Home</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span>Module {summary.id}</span>
      </nav>

      <h1 style={{ marginBottom: 4 }}>Module {summary.id} — {summary.title}</h1>
      <p style={{ opacity: 0.6, marginTop: 0, marginBottom: 24 }}>
        Quarter {summary.quarter ?? '?'} · Weeks {summary.weeks?.join('–') ?? '?'} · Environment: {summary.environment ?? '?'}
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2
          className="border-border"
          style={{ borderBottom: '1px solid', paddingBottom: 6 }}
        >
          Lessons in this module
        </h2>
        <ModuleLessonsList lessons={lessons} moduleId={summary.id} unitId={summary.category ?? null} />
      </section>

      <TeacherOnly>
        <details>
          <summary style={{ cursor: 'pointer', opacity: 0.55, fontSize: 14, padding: '8px 0' }}>
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
            <summary style={{ cursor: 'pointer', opacity: 0.55, fontSize: 14, padding: '8px 0' }}>
              Legacy module-level markdown files ({artifacts.length})
            </summary>
            {artifacts.map((a) => (
              <div key={a.filename} style={{ marginTop: 12 }}>
                <h3 style={{ margin: '16px 0 4px' }}>{a.label}</h3>
                <code style={{ opacity: 0.55, fontSize: 12 }}>{a.filename}</code>
                <article className="prose" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.html) }} />
              </div>
            ))}
          </details>
        )}
      </TeacherOnly>

      <style>{`
        .prose h2 { margin-top: 28px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
        .prose h3 { margin-top: 20px; color: #bd93f9; }
        .prose table { border-collapse: collapse; margin: 12px 0; }
        .prose th, .prose td { border: 1px solid var(--border); padding: 6px 10px; }
        .prose th { background: var(--muted); }
        .prose code { background: var(--muted); padding: 1px 5px; border-radius: 3px; color: #ffb86c; }
        .prose pre { background: var(--muted); padding: 12px; border-radius: 6px; overflow-x: auto; }
        .prose pre code { background: transparent; padding: 0; color: var(--text); }
        .prose a { color: var(--brand); }
        .prose blockquote { border-left: 3px solid #bd93f9; margin: 12px 0; padding: 4px 14px; color: var(--text); opacity: 0.85; background: rgba(189,147,249,0.08); }
      `}</style>
    </main>
  );
}
