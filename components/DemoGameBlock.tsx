'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import MoshionPreview from './MoshionPreview';
import { LIVE_SKETCH_RUN } from './LiveCodeBlock';

// A finished game a reading lets the student PLAY and nothing else: no editor, no Reset to
// starter, just the canvas, a Play button and a Restart. Authored as
//
//     ```js live demo size=420x680 id=pinball-finished-game
//
// `size` is the canvas's own pixel size plus the runner's margin, so a tall table is not
// squeezed into the 360px square an editable block uses. The sketch is still the fence body
// (so test-moshion.mjs still runs it), but it is never rendered as text on the page. That is
// a teaching choice, not security: it is still in the lesson's source, like any code the browser
// runs.

interface Props {
  code: string;
  blockId?: string;
  /** Pixel size of the play area, "WxH". Defaults to a 440x440 square. */
  size?: { w: number; h: number };
  label?: string;
}

const DEFAULT_SIZE = { w: 440, h: 440 };

// The runner takes the sketch in its URL (?code=base64), and a server answers 431 once the whole
// request line passes ~16 KB. The student never reads this code, so the comments and blank lines
// that make a long demo readable to its author are dropped before it is sent. Only whole-line
// comments and a trailing `// ...` with no quote after it are touched, so a string is never cut.
function slimForUrl(code: string): string {
  return code
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return t !== '' && !t.startsWith('//');
    })
    .map((line) => line.replace(/\s+\/\/[^'"`]*$/, '').trimEnd())
    .join('\n');
}

export default function DemoGameBlock({ code, blockId, size = DEFAULT_SIZE, label }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [runKey, setRunKey] = useState(0);
  const blockToken = useRef({});

  // One sketch at a time, shared with the editable blocks: playing another one stops this one.
  useEffect(() => {
    const onOtherRun = (e: Event) => {
      if ((e as CustomEvent<{ token: object }>).detail?.token === blockToken.current) return;
      setRunKey(0);
    };
    window.addEventListener(LIVE_SKETCH_RUN, onOtherRun);
    return () => window.removeEventListener(LIVE_SKETCH_RUN, onOtherRun);
  }, []);

  // The Play click is the user gesture that lets the game hear keys and play sound, so hand the
  // keyboard to the game right away instead of making the student click it a second time.
  useEffect(() => {
    if (runKey === 0) return;
    // Bring the whole game on screen first: a tall table must not be half under the fold while
    // you are playing it with the keyboard.
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    rootRef.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    const t = setTimeout(() => iframeRef.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [runKey]);

  function play() {
    window.dispatchEvent(new CustomEvent(LIVE_SKETCH_RUN, { detail: { token: blockToken.current } }));
    setRunKey((k) => k + 1);
  }

  const playing = runKey > 0;
  const name = label ?? 'Game demo';

  return (
    <div
      ref={rootRef}
      className="demogame"
      role="group"
      aria-label={name}
      data-block={blockId}
      style={
        {
          // Never wider than the canvas, and never so wide that its height outgrows the window:
          // 150px is the fixed header and progress bar plus the Restart row.
          maxWidth: `min(${size.w}px, max(240px, calc((100vh - 150px) * ${size.w / size.h})))`,
        } as CSSProperties
      }
    >
      <div className="demogame-stage" style={{ aspectRatio: `${size.w} / ${size.h}` }}>
        {playing ? (
          <MoshionPreview ref={iframeRef} code={slimForUrl(code)} runKey={runKey} />
        ) : (
          <button type="button" className="demogame-start" onClick={play}>
            <span className="demogame-start-icon" aria-hidden="true">
              <Play size={28} strokeWidth={2.5} />
            </span>
            <span className="demogame-start-label">Play</span>
            <span className="demogame-start-hint">then use the keys listed below</span>
          </button>
        )}
      </div>
      {playing && (
        <div className="demogame-toolbar">
          <button type="button" className="btn-secondary btn-sm" onClick={play}>
            <RotateCcw size={12} /> Restart
          </button>
          <span className="demogame-note">Click the game if the keys stop working.</span>
        </div>
      )}
      <style>{`
        .demogame {
          margin: 16px auto;
          width: 100%;
        }
        .demogame-stage {
          position: relative;
          width: 100%;
          margin: 0 auto;
          background: #000;
          border: 1px solid var(--border);
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .demogame-stage .reshape-frame {
          width: 100%;
          height: 100%;
          display: block;
          border: 0;
        }
        .demogame-start {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--card);
          color: var(--text);
          border: 0;
          cursor: pointer;
          font: inherit;
        }
        .demogame-start:hover .demogame-start-icon {
          transform: scale(1.06);
        }
        .demogame-start:focus-visible {
          outline: 2px solid #22c55e;
          outline-offset: -4px;
        }
        .demogame-start-icon {
          display: grid;
          place-items: center;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #22c55e;
          color: #0b0b0b;
          transition: transform 120ms ease-out;
        }
        .demogame-start-label {
          font-size: 20px;
          font-weight: 700;
        }
        .demogame-start-hint {
          font-size: 13px;
          color: #8393c4;
        }
        .demogame-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0 0;
        }
        .demogame-note {
          font-size: 12px;
          color: #8393c4;
        }
        @media (prefers-reduced-motion: reduce) {
          .demogame-start-icon { transition: none; }
        }
      `}</style>
    </div>
  );
}
