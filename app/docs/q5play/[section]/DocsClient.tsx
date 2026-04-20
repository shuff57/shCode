'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { DocSection } from '../../../../lib/q5play-docs';

interface Props {
  section: DocSection;
  allSections: DocSection[];
}

export default function DocsClient({ section, allSections }: Props) {
  const params = useSearchParams();
  const pageParam = Number(params.get('page') || '1');
  const pageIndex = Math.min(Math.max(pageParam, 1), section.pages.length) - 1;
  const page = section.pages[pageIndex];

  const hasPrev = pageIndex > 0;
  const hasNext = pageIndex < section.pages.length - 1;

  const sectionIdx = allSections.findIndex((s) => s.slug === section.slug);
  const prevSection = sectionIdx > 0 ? allSections[sectionIdx - 1] : null;
  const nextSection =
    sectionIdx < allSections.length - 1 ? allSections[sectionIdx + 1] : null;

  return (
    <div className="docs-layout">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-title">q5play reference</div>
        <nav>
          {allSections.map((s) => {
            const active = s.slug === section.slug;
            return (
              <div key={s.slug} className={`docs-sidebar-section${active ? ' active' : ''}`}>
                <Link href={`/docs/q5play/${s.slug}`} className="docs-sidebar-section-title">
                  {s.title}
                </Link>
                {active && s.pages.length > 1 && (
                  <ul className="docs-sidebar-pages">
                    {s.pages.map((p, i) => (
                      <li key={i}>
                        <Link
                          href={`/docs/q5play/${s.slug}?page=${i + 1}`}
                          className={i === pageIndex ? 'current' : ''}
                        >
                          {p.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
        <div className="docs-sidebar-footer">
          <Link href="/">← Back to lessons</Link>
        </div>
      </aside>

      <main className="docs-main">
        <header className="docs-breadcrumb">
          {section.title}
          {section.pages.length > 1 && (
            <span className="docs-page-pill">
              Page {pageIndex + 1} of {section.pages.length}
            </span>
          )}
        </header>
        <h1 className="docs-title">{page.title}</h1>
        <div className="docs-body">
          {page.body.split(/\n\n+/).map((para, i) => (
            <p key={i}>
              {para.split('\n').map((line, j, arr) => (
                <span key={j}>
                  {line}
                  {j < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>
        {page.code && (
          <pre className="docs-code">
            <code>{page.code}</code>
          </pre>
        )}

        <footer className="docs-pagination">
          {hasPrev ? (
            <Link
              className="btn-secondary btn-sm"
              href={`/docs/q5play/${section.slug}?page=${pageIndex}`}
            >
              ← {section.pages[pageIndex - 1].title}
            </Link>
          ) : prevSection ? (
            <Link
              className="btn-secondary btn-sm"
              href={`/docs/q5play/${prevSection.slug}?page=${prevSection.pages.length}`}
            >
              ← {prevSection.title}
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              className="btn-secondary btn-sm"
              href={`/docs/q5play/${section.slug}?page=${pageIndex + 2}`}
            >
              {section.pages[pageIndex + 1].title} →
            </Link>
          ) : nextSection ? (
            <Link
              className="btn-secondary btn-sm"
              href={`/docs/q5play/${nextSection.slug}`}
            >
              {nextSection.title} →
            </Link>
          ) : (
            <span />
          )}
        </footer>
      </main>
    </div>
  );
}
