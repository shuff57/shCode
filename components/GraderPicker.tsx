'use client';

// Lets a student choose which grader marks their written work: the hosted
// cloud model, or the school's own machine. Shared by WrittenGrader and
// DiagramAssignmentView so the two never drift into different wording.
//
// The menu is fetched from GET /api/grade-written rather than hardcoded, so a
// deploy with no classroom box never offers one. When fewer than two targets
// are actually runnable there is nothing to choose, and the picker renders
// nothing at all -- a dropdown with one entry is furniture, not a choice.
//
// What the student picks is an id ('workersai' | 'cloud' | 'local'). It is never a host, a
// model, or a key: the server owns all three. See the target-resolution note
// in functions/api/grade-written.ts for why that separation is load-bearing.

import { useEffect, useState } from 'react';
import { Server, Cloud, Zap, Sparkles } from 'lucide-react';
import {
  fetchGraders,
  loadGraderPref,
  saveGraderPref,
} from '../lib/written-grader-store';
import { DEFAULT_GRADER, type GraderId, type GraderOption } from '../lib/grade-written-core';

export interface GraderChoice {
  graders: GraderOption[];
  grader: GraderId;
  setGrader: (id: GraderId) => void;
}

export function useGraderChoice(): GraderChoice {
  const [graders, setGraders] = useState<GraderOption[]>([]);
  const [grader, setGraderState] = useState<GraderId>(DEFAULT_GRADER);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchGraders();
      if (cancelled) return;
      setGraders(list);

      // A remembered choice is only honoured if the server still offers it.
      // Otherwise the student would sit on a dead target every visit and get
      // the same "not set up" error each time without knowing why.
      const saved = loadGraderPref();
      const usable = list.find((g) => g.id === saved && g.available)
        ?? list.find((g) => g.available);
      if (usable) setGraderState(usable.id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    graders,
    grader,
    setGrader: (id: GraderId) => {
      setGraderState(id);
      saveGraderPref(id);
    },
  };
}

/**
 * Whether there is an actual choice to offer. Callers use this to decide
 * whether to keep showing their own standalone "model: ..." chip -- the picker
 * already names the model, and two of them side by side reads as two graders.
 */
export function hasGraderChoice(graders: GraderOption[]): boolean {
  return graders.filter((g) => g.available).length >= 2;
}

interface Props {
  graders: GraderOption[];
  value: GraderId;
  onChange: (id: GraderId) => void;
  disabled?: boolean;
  /**
   * The model this lesson names for the cloud grader. The GET can only report
   * the deploy-wide default, because a menu is not lesson-scoped -- so the
   * caller, which does know the lesson, supplies the accurate one.
   */
  cloudModel?: string;
}

export default function GraderPicker({ graders, value, onChange, disabled, cloudModel }: Props) {
  if (!hasGraderChoice(graders)) return null;

  const selected = graders.find((g) => g.id === value);
  const shownModel = value === 'cloud' ? (cloudModel || selected?.model) : selected?.model;
  // One icon per target, so the row reads at a glance rather than needing the
  // label. A shared cloud icon for both hosted graders made them look like the
  // same thing with two names.
  const Icon =
    value === 'local' ? Server : value === 'workersai' ? Zap : value === 'openrouter' ? Sparkles : Cloud;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <label
        htmlFor="grader-picker"
        style={{ fontSize: 13, color: '#aaa', display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <Icon size={14} color="#6272a4" />
        Graded by
      </label>
      <select
        id="grader-picker"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as GraderId)}
        style={{
          background: '#282a36',
          color: '#f8f8f2',
          border: '1px solid #44475a',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 13,
          fontFamily: 'system-ui, sans-serif',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {graders.map((g) => (
          // An unavailable target stays on the list, greyed out, rather than
          // vanishing: a class expecting the classroom grader can see that it
          // exists and is not set up, instead of wondering where it went.
          <option key={g.id} value={g.id} disabled={!g.available}>
            {g.label}
            {g.available ? '' : ' — not set up'}
          </option>
        ))}
      </select>
      {selected?.description ? (
        <span style={{ color: '#6272a4', fontSize: 12 }}>{selected.description}</span>
      ) : null}
      {shownModel ? (
        <code style={{ color: '#6272a4', fontSize: 11 }}>{shownModel}</code>
      ) : null}
    </div>
  );
}
