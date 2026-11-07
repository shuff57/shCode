import type { ReactNode } from 'react';
import {
  BookOpen,
  Film,
  Lightbulb,
  Star,
  PenSquare,
  Presentation,
  Play,
  Terminal,
  Box,
  Globe,
  FileText,
  Workflow,
  ListChecks,
} from 'lucide-react';

export interface PreviewBadge {
  Icon: (props: { size?: number; strokeWidth?: number; color?: string; className?: string }) => ReactNode;
  label: string;
  color: string;
}

const ICON_PROPS = { size: 14, strokeWidth: 2 } as const;

function makeBadge(Icon: any, label: string, color: string): PreviewBadge {
  const Wrapped = (props: { size?: number; strokeWidth?: number; color?: string; className?: string }) => (
    <Icon
      size={props.size ?? ICON_PROPS.size}
      strokeWidth={props.strokeWidth ?? ICON_PROPS.strokeWidth}
      color={props.color ?? color}
      className={props.className}
    />
  );
  return { Icon: Wrapped, label, color };
}

const PREVIEW_BADGES: Record<string, PreviewBadge> = {
  reading:    makeBadge(BookOpen,     'Reading',        'var(--c-cyan)'),
  video:      makeBadge(Film,         'Video',          'var(--c-pink)'),
  example:    makeBadge(Lightbulb,    'Worked Example', 'var(--c-orange)'),
  challenge:  makeBadge(Star,         'Challenge',      'var(--c-yellow)'),
  assignment: makeBadge(PenSquare,    'Assignment',     'var(--c-green)'),
  slides:     makeBadge(Presentation, 'Slides',         'var(--c-purple)'),
  moshion:     makeBadge(Play,         'moSHion Lesson',  'var(--c-pink)'),
  console:    makeBadge(Terminal,     'Console',        'var(--c-green)'),
  html:       makeBadge(Globe,        'HTML',           'var(--c-cyan)'),
  diagram:    makeBadge(Workflow,     'Flowchart',      'var(--c-yellow)'),
  quiz:       makeBadge(ListChecks,   'Quiz',           'var(--c-yellow)'),
};

const FALLBACK_BADGE: PreviewBadge = makeBadge(FileText, 'Content', 'var(--x-888888)');

export function badgeFor(preview: string | undefined): PreviewBadge {
  if (!preview) return FALLBACK_BADGE;
  return PREVIEW_BADGES[preview] ?? FALLBACK_BADGE;
}

/**
 * Derive the badge from a lesson's type + preview.
 * Type wins when it maps to a known badge (challenge / assignment),
 * so a moshion-runnable can still display as "Challenge" or "Assignment".
 */
export function badgeForLesson(opts: { type?: string; preview?: string }): PreviewBadge {
  // A quiz keeps `type: "assignment"` so it still counts as graded work in the
  // lists — but "Quiz" is the more useful label, so the preview wins here.
  if (opts.preview === 'quiz') return PREVIEW_BADGES.quiz;
  const typeBadge = opts.type ? PREVIEW_BADGES[opts.type] : undefined;
  if (typeBadge) return typeBadge;
  return badgeFor(opts.preview);
}
