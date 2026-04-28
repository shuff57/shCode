'use client';

import Link from 'next/link';
import type { Lesson } from '../lib/types';
import { badgeFor } from '../lib/lesson-badges';
import CompletionPanel from './CompletionPanel';
import WrittenGrader from './WrittenGrader';
import MarkdownWithLiveBlocks from './MarkdownWithLiveBlocks';

interface Props {
  lesson: Lesson;
}

function findContent(lesson: Lesson): string {
  const node = lesson.files.find((f) => f.type === 'file' && f.name === 'content.md') as any;
  return node?.content ?? '';
}

function toEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}

export default function ContentLessonView({ lesson }: Props) {
  const preview = lesson.preview as string;
  const badge = badgeFor(preview);
  const contentMd = findContent(lesson);
  const meta = lesson as any;

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 80px', color: '#f8f8f2' }}>
      <nav style={{ marginBottom: 12, fontSize: 13, color: '#888' }}>
        <Link href="/" style={{ color: '#8be9fd' }}>Home</Link>
        {lesson.unit ? (
          <>
            <span style={{ margin: '0 8px' }}>›</span>
            <Link href={`/module/${lesson.unit.split(' ')[0]}`} style={{ color: '#8be9fd' }}>
              {lesson.unit}
            </Link>
          </>
        ) : null}
        <span style={{ margin: '0 8px' }}>›</span>
        <span>{lesson.title}</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: badge.color + '22',
            color: badge.color,
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            border: '1px solid ' + badge.color + '55',
          }}
        >
          <badge.Icon size={13} strokeWidth={2.25} />
          {badge.label}
        </span>
        <span style={{ color: '#888', fontSize: 13 }}>~{lesson.estimateMins ?? '?'} min</span>
      </div>

      <h1 style={{ margin: '4px 0 6px' }}>{lesson.title}</h1>
      {lesson.description ? (
        <p style={{ color: '#888', marginTop: 0 }}>{lesson.description}</p>
      ) : null}

      {preview === 'video' ? (
        meta.videoUrl && meta.videoUrl.trim() ? (
          <div style={{ aspectRatio: '16 / 9', marginTop: 16, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
            <iframe
              src={toEmbedUrl(meta.videoUrl)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          </div>
        ) : (
          <div style={{ marginTop: 16, padding: 20, background: '#282a36', borderRadius: 8, border: '1px dashed #555', color: '#aaa' }}>
            <strong style={{ color: '#ff79c6' }}>No video URL set yet.</strong>
            <p style={{ margin: '8px 0 0', fontSize: 14 }}>
              {meta.videoFallback ?? "Teacher will paste a YouTube URL into this lesson's lesson.json (videoUrl field) when ready."}
            </p>
          </div>
        )
      ) : null}

      {preview === 'slides' ? (
        meta.slidesUrl ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <a href={meta.slidesUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#50fa7b' }}>
                → Open in new tab (full screen, editable code blocks)
              </a>
            </div>
            <div style={{ aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden', background: '#000', border: '1px solid #44475a' }}>
              <iframe
                src={meta.slidesUrl}
                allow="autoplay; clipboard-write; fullscreen"
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, padding: 20, background: '#282a36', borderRadius: 8, border: '1px dashed #555', color: '#aaa' }}>
            <strong style={{ color: '#bd93f9' }}>Slides not configured.</strong>
          </div>
        )
      ) : null}

      {meta.externalLink ? (
        <p style={{ margin: '16px 0' }}>
          <a href={meta.externalLink} target="_blank" rel="noopener noreferrer" style={{ color: '#50fa7b', textDecoration: 'none' }}>
            → {meta.externalLinkLabel ?? meta.externalLink}
          </a>
        </p>
      ) : null}

      {contentMd ? (
        <div style={{ marginTop: 20 }}>
          <MarkdownWithLiveBlocks src={contentMd} lessonId={lesson.id} />
        </div>
      ) : null}

      {meta.aiGrader ? (
        <WrittenGrader
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          prompt={meta.aiGrader.prompt ?? contentMd.slice(0, 2000)}
          config={meta.aiGrader}
        />
      ) : (
        <CompletionPanel lessonId={lesson.id} lessonType={preview} />
      )}

      <style>{`
        .content-prose h1 { font-size: 1.4em; margin-top: 28px; }
        .content-prose h2 { margin-top: 24px; color: #f8f8f2; border-bottom: 1px solid #333; padding-bottom: 4px; }
        .content-prose h3 { margin-top: 18px; color: #bd93f9; }
        .content-prose table { border-collapse: collapse; margin: 12px 0; width: 100%; }
        .content-prose th, .content-prose td { border: 1px solid #444; padding: 6px 10px; vertical-align: top; }
        .content-prose th { background: #44475a; }
        .content-prose code { background: #282a36; padding: 1px 5px; border-radius: 3px; color: #ffb86c; }
        .content-prose pre { background: #282a36; padding: 12px; border-radius: 6px; overflow-x: auto; }
        .content-prose pre code { background: transparent; padding: 0; color: #f8f8f2; }
        .content-prose a { color: #8be9fd; }
        .content-prose blockquote { border-left: 3px solid #bd93f9; margin: 12px 0; padding: 4px 14px; color: #ccc; background: rgba(189,147,249,0.08); }
        .content-prose hr { border: none; border-top: 1px solid #333; margin: 20px 0; }
        .content-prose ul, .content-prose ol { padding-left: 24px; }
      `}</style>
    </main>
  );
}

