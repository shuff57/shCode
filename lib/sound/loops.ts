// The mixer's built-in music loops.
//
// Format: ZzFXM (keithclark/ZzFXM), the same nested-array song a js13k game
// embeds. [instruments, patterns, sequence, BPM]. One note slot is a 16th
// note: samples = 44100 / BPM * 60 / 4. So a 16-slot pattern at 180 BPM is
// 2 seconds, and four of them are the 5.33-second loop the course's
// music.wav has always been.
//
// A channel is [instrumentIndex, pan, ...notes]. A note is 1..36 (the
// instrument's frequency is shifted by 2 ** ((note - 12) / 12)), 0 is a
// rest, and -1 releases the note. Attenuation is the decimal part: 25.5 is
// half volume. Keep the data plain numbers; the renderer does not parse it.
//
// These are deliberately short, simple, and easy to edit. They are teaching
// material, not a soundtrack. Each loop is the same tune family: a C major
// scale walk over a I–V–vi–IV-ish bass, so swapping the loop changes the
// mood without changing the key.

export interface MusicLoop {
  id: string;
  label: string;
  /** One sentence for the mixer, in the course's voice. */
  blurb: string;
  bpm: number;
  instruments: number[][];
  patterns: number[][][];
  sequence: number[];
}

const LEAD = [0.55, 0, 220, 0, 0.12, 0.06, 1, 0.8];
const BASS = [0.85, 0, 110, 0, 0.35, 0.06, 2, 1];
const DRUM = [0.45, 0, 120, 0, 0.01, 0.03, 4];
const PAD = [0.28, 0, 330, 0.01, 0.55, 0.25, 0];
const ARP = [0.3, 0, 880, 0, 0.08, 0.04, 0];

const INSTRUMENTS = [LEAD, BASS, DRUM, PAD, ARP];
const [LEAD_I, BASS_I, DRUM_I, PAD_I, ARP_I] = [0, 1, 2, 3, 4];

// A channel that rests for all sixteen slots.
const rest = (): number[] => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export const MUSIC_LOOPS: MusicLoop[] = [
  {
    id: 'title',
    label: 'Title screen',
    blurb: 'Slow and open. The tune under a menu, before the game starts.',
    bpm: 140,
    instruments: INSTRUMENTS,
    patterns: [
      [
        [LEAD_I, 0, 25, 0, 0, 0, 27, 0, 0, 0, 29, 0, 0, 0, 27, 0, 0, 0],
        [BASS_I, 0, 13, 0, 0, 0, 0, 0, 0, 0, 13, 0, 0, 0, 0, 0, 0, 0],
        [PAD_I, 0, 25, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ],
      [
        [LEAD_I, 0, 30, 0, 0, 0, 29, 0, 0, 0, 27, 0, 0, 0, 25, 0, 0, 0],
        [BASS_I, 0, 18, 0, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 0, 0, 0, 0],
        [PAD_I, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ],
      [
        [LEAD_I, 0, 25, 0, 0, 0, 29, 0, 0, 0, 32, 0, 0, 0, 29, 0, 0, 0],
        [BASS_I, 0, 13, 0, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0],
        [PAD_I, 0, 25, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0],
      ],
    ],
    sequence: [0, 1, 0, 2],
  },
  {
    id: 'play',
    label: 'Playing',
    blurb: 'Moving along. The loop the course uses for music.wav.',
    bpm: 180,
    instruments: INSTRUMENTS,
    patterns: [
      [
        [LEAD_I, 0, 25, 0, 27, 0, 29, 0, 32, 0, 29, 0, 27, 0, 25, 0, 0, 0],
        [BASS_I, 0, 13, 0, 0, 0, 13, 0, 0, 0, 20, 0, 0, 0, 20, 0, 0, 0],
        [DRUM_I, 0, 25, 0, 0, 0, 25, 0, 0, 0, 25, 0, 0, 0, 25, 0, 0, 0],
      ],
      [
        [LEAD_I, 0, 30, 0, 32, 0, 34, 0, 32, 0, 30, 0, 29, 0, 27, 0, 0, 0],
        [BASS_I, 0, 18, 0, 0, 0, 18, 0, 0, 0, 20, 0, 0, 0, 20, 0, 0, 0],
        [DRUM_I, 0, 25, 0, 0, 0, 25, 0, 0, 0, 25, 0, 0, 0, 25, 0, 0, 0],
      ],
      [
        [LEAD_I, 0, 32, 0, 34, 0, 36, 0, 34, 0, 32, 0, 30, 0, 29, 0, 0, 0],
        [BASS_I, 0, 20, 0, 0, 0, 20, 0, 0, 0, 22, 0, 0, 0, 22, 0, 0, 0],
        [DRUM_I, 0, 25, 0, 0, 0, 25, 0, 0, 0, 25, 0, 0, 0, 25, 0, 0, 0],
      ],
      [
        [LEAD_I, 0, 29, 0, 27, 0, 25, 0, 24, 0, 25, 0, 0, 0, 0, 0, 0, 0],
        [BASS_I, 0, 13, 0, 0, 0, 13, 0, 0, 0, 13, 0, 0, 0, 13, 0, 0, 0],
        [DRUM_I, 0, 25, 0, 0, 0, 25, 0, 0, 0, 25, 0, 0, 0, 25, 0, 0, 0],
      ],
    ],
    sequence: [0, 1, 2, 3],
  },
  {
    id: 'won',
    label: 'You won',
    blurb: 'A short rising run. Play it once, then stop.',
    bpm: 150,
    instruments: INSTRUMENTS,
    patterns: [
      [
        [LEAD_I, 0, 25, 0, 29, 0, 32, 0, 36, 0, 0, 0, 36, 0, 0, 0, 0, 0],
        [BASS_I, 0, 13, 0, 13, 0, 20, 0, 20, 0, 13, 0, 0, 0, 0, 0, 0, 0],
        [DRUM_I, 0, 25, 0, 0, 0, 0, 0, 0, 0, 25, 0, 0, 0, 0, 0, 0, 0],
      ],
    ],
    sequence: [0],
  },
  {
    id: 'lost',
    label: 'You lost',
    blurb: 'Four falling notes. Low, slow, and over quickly.',
    bpm: 90,
    instruments: INSTRUMENTS,
    patterns: [
      [
        [LEAD_I, 0, 29, 0, 0, 0, 27, 0, 0, 0, 25, 0, 0, 0, 24, 0, 0, 0],
        [BASS_I, 0, 17, 0, 0, 0, 13, 0, 0, 0, 17, 0, 0, 0, 13, 0, 0, 0],
      ],
    ],
    sequence: [0],
  },
];

export function findMusicLoop(id: string): MusicLoop {
  return MUSIC_LOOPS.find((l) => l.id === id) ?? MUSIC_LOOPS[1];
}

// `rest` and `ARP_I` are exported for a future loop that needs a quiet
// arpeggio; keeping them here rather than deleting them documents the shape.
export { rest, ARP_I };
