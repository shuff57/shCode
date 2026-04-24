'use client';

import { useState, useEffect, useCallback } from 'react';
import { sections } from '../lib/q5play-docs';

const LS_KEY = 'shCode:q5docs:closed';

export default function Q5DocsDrawer() {
  // Read initial open state from localStorage — default open unless student has closed it
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(LS_KEY) !== '1';
  });
  const [activeSectionSlug, setActiveSectionSlug] = useState<string>(sections[0]?.slug ?? '');
  const [closeBtnHovered, setCloseBtnHovered] = useState(false);

  // Keep localStorage in sync with open state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (open) {
      localStorage.removeItem(LS_KEY);
    } else {
      localStorage.setItem(LS_KEY, '1');
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  const reopen = useCallback(() => setOpen(true), []);

  const activeSection = sections.find((s) => s.slug === activeSectionSlug) ?? sections[0];

  return (
    <>
      {/* --- Drawer --- */}
      <div
        aria-label="q5play docs reference"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(420px, 100vw)',
          background: '#21222c',
          borderLeft: '1px solid #44475a',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 900,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid #44475a',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#f8f8f2', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.02em' }}>
            q5play Docs
          </span>
          <button
            aria-label="Close docs drawer"
            onClick={close}
            onMouseEnter={() => setCloseBtnHovered(true)}
            onMouseLeave={() => setCloseBtnHovered(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 1,
              padding: '2px 4px',
              color: closeBtnHovered ? '#f8f8f2' : '#6272a4',
              transition: 'color 0.15s',
            }}
          >
            &times;
          </button>
        </div>

        {/* Section selector */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #44475a', flexShrink: 0 }}>
          <select
            aria-label="Select documentation section"
            value={activeSectionSlug}
            onChange={(e) => setActiveSectionSlug(e.target.value)}
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

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 16px',
            color: '#f8f8f2',
            fontSize: '0.875rem',
            lineHeight: 1.6,
          }}
        >
          {activeSection && (
            <>
              <h2
                style={{
                  margin: '0 0 12px',
                  fontSize: '1rem',
                  color: '#f8f8f2',
                  fontWeight: 600,
                }}
              >
                {activeSection.title}
              </h2>
              {activeSection.pages.map((page, pi) => (
                <div key={pi} style={{ marginBottom: 24 }}>
                  <h3
                    style={{
                      margin: '0 0 6px',
                      fontSize: '0.9rem',
                      color: '#bd93f9',
                      fontWeight: 600,
                    }}
                  >
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
        </div>
      </div>

      {/* --- Toggle tab (visible when drawer is closed) --- */}
      {!open && (
        <button
          aria-label="Open q5play docs"
          onClick={reopen}
          style={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 901,
            background: '#21222c',
            border: '1px solid #44475a',
            borderRight: 'none',
            borderRadius: '6px 0 0 6px',
            color: '#bd93f9',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            padding: '12px 6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.06em',
          }}
        >
          Docs
        </button>
      )}
    </>
  );
}
