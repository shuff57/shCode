import Link from 'next/link';
import type { LessonGroup } from '../lib/lesson-groups';

/**
 * "Lesson 2 of 6 · The canvas and the sprite" above a screen.
 *
 * The module page shows these headings already; this is the same heading where
 * a student actually is, so the objective is readable without going back to the
 * module list. Server component — it renders from the group file and never
 * needs the client. Progress stays per screen: this banner says where you are
 * in the lesson, not how much of it is done.
 */
export default function LessonGroupBanner({
  moduleId,
  group,
  index,
  total,
  screenCount,
}: {
  moduleId: string;
  group: LessonGroup;
  index: number;
  total: number;
  screenCount: number;
}) {
  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '10px 20px 0',
      }}
    >
      <div
        className="border-border bg-card"
        style={{
          border: '1px solid',
          borderLeft: '4px solid #bd93f9',
          borderRadius: 8,
          padding: '10px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#bd93f9',
            }}
          >
            Lesson {index} of {total}
          </span>
          <span style={{ fontWeight: 650, fontSize: 15 }}>{group.title}</span>
          <span style={{ fontSize: 12, color: '#8393c4' }}>{screenCount} screens</span>
          <Link
            href={`/module/${moduleId}`}
            style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--brand)' }}
          >
            All lessons
          </Link>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8393c4', lineHeight: 1.45 }}>
          {group.objective}
        </p>
      </div>
    </div>
  );
}
