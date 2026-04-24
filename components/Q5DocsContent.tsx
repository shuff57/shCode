'use client';

import { useState } from 'react';
import { sections } from '../lib/q5play-docs';

export default function Q5DocsContent() {
  const [activeSlug, setActiveSlug] = useState<string>(sections[0]?.slug ?? '');
  const activeSection = sections.find((s) => s.slug === activeSlug) ?? sections[0];

  return (
    <>
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <select
          aria-label="Select documentation section"
          value={activeSlug}
          onChange={(e) => setActiveSlug(e.target.value)}
          style={{
            width: '100%',
            background: '#282a36',
            color: '#f8f8f2',
            border: '1px solid #44475a',
            borderRadius: 4,
            padding: '5px 8px',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          {sections.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      {activeSection && (
        <>
          <h2 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#f8f8f2', fontWeight: 600 }}>
            {activeSection.title}
          </h2>
          {activeSection.pages.map((page, pi) => (
            <div key={pi} style={{ marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#bd93f9', fontWeight: 600 }}>
                {page.title}
              </h3>
              {page.body.split('\n\n').map((para, i) => (
                <p key={i} style={{ margin: '0 0 8px' }}>
                  {para}
                </p>
              ))}
              {page.code && (
                <pre
                  style={{
                    background: '#282a36',
                    color: '#f8f8f2',
                    padding: '10px 12px',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    margin: '8px 0 0',
                  }}
                >
                  <code>{page.code}</code>
                </pre>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}
