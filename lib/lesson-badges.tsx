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

export const PREVIEW_BADGES: Record<string, PreviewBadge> = {
  reading:    makeBadge(BookOpen,     'Reading',        '#8be9fd'),
  video:      makeBadge(Film,         'Video',          '#ff79c6'),
  example:    makeBadge(Lightbulb,    'Worked Example', '#ffb86c'),
  challenge:  makeBadge(Star,         'Challenge',      '#f1fa8c'),
  assignment: makeBadge(PenSquare,    'Assignment',     '#50fa7b'),
  slides:     makeBadge(Presentation, 'Slides',         '#bd93f9'),
  moshion:     makeBadge(Play,         'moSHion Lesson',  '#ff79c6'),
  console:    makeBadge(Terminal,     'Console',        '#50fa7b'),
  jscad:      makeBadge(Box,          'JSCAD',          '#ffb86c'),
  html:       makeBadge(Globe,        'HTML',           '#8be9fd'),
  diagram:    makeBadge(Workflow,     'Flowchart',      '#f1fa8c'),
  quiz:       makeBadge(ListChecks,   'Quiz',           '#f1fa8c'),
};

export const FALLBACK_BADGE: PreviewBadge = makeBadge(FileText, 'Content', '#888888');

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
