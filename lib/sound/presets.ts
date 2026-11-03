// The palette the mixer offers, and the names the course ships in
// public/moshion/assets/.
//
// `preset` is a jsfxr preset name (sfxr.generate accepts these). The mixer
// asks jsfxr for the actual samples, so this table is only labels and
// descriptions — no audio lives here.

export interface SfxPreset {
  id: string;
  label: string;
  preset: string;
  blurb: string;
}

export const SFX_PRESETS: SfxPreset[] = [
  { id: 'coin', label: 'Coin', preset: 'pickupCoin', blurb: 'A two-note rise. The sound of picking something up.' },
  { id: 'jump', label: 'Jump', preset: 'jump', blurb: 'A short upward sweep. Leaving the ground.' },
  { id: 'hit', label: 'Hit', preset: 'hitHurt', blurb: 'A dull knock. Something took damage.' },
  { id: 'laser', label: 'Laser', preset: 'laserShoot', blurb: 'A falling zap. Shooting into the distance.' },
  { id: 'powerup', label: 'Power-up', preset: 'powerUp', blurb: 'A rising run. A new ability arrives.' },
  { id: 'explode', label: 'Explosion', preset: 'explosion', blurb: 'Noise that falls apart. Something broke.' },
  { id: 'blip', label: 'Blip', preset: 'blipSelect', blurb: 'One very short click. A menu selection.' },
  { id: 'select', label: 'Select', preset: 'click', blurb: 'A tiny tick. Something was pressed.' },
  { id: 'tone', label: 'Tone', preset: 'tone', blurb: 'A steady note. Useful as a starting point.' },
  { id: 'synth', label: 'Synth', preset: 'synth', blurb: 'A longer, wobbling tone. A held note.' },
  { id: 'random', label: 'Random', preset: 'random', blurb: 'A brand-new sound every time you roll it.' },
];

export interface PaletteSound {
  name: string;
  file: string;
  label: string;
  kind: 'sfx' | 'music';
  /** jsfxr preset for an sfx, or ZzFXM loop id for music. */
  source: string;
}

/**
 * Every file scripts/make-moshion-sounds.mjs writes into
 * public/moshion/assets/. Keep this list and that script in step; the
 * check script compares them.
 */
export const PALETTE: PaletteSound[] = [
  { name: 'coin', file: '/moshion/assets/coin.wav', label: 'Coin', kind: 'sfx', source: 'pickupCoin' },
  { name: 'jump', file: '/moshion/assets/jump.wav', label: 'Jump', kind: 'sfx', source: 'jump' },
  { name: 'hit', file: '/moshion/assets/hit.wav', label: 'Hit', kind: 'sfx', source: 'hitHurt' },
  { name: 'laser', file: '/moshion/assets/laser.wav', label: 'Laser', kind: 'sfx', source: 'laserShoot' },
  { name: 'powerup', file: '/moshion/assets/powerup.wav', label: 'Power-up', kind: 'sfx', source: 'powerUp' },
  { name: 'explode', file: '/moshion/assets/explode.wav', label: 'Explosion', kind: 'sfx', source: 'explosion' },
  { name: 'blip', file: '/moshion/assets/blip.wav', label: 'Blip', kind: 'sfx', source: 'blipSelect' },
  { name: 'select', file: '/moshion/assets/select.wav', label: 'Select', kind: 'sfx', source: 'click' },
  { name: 'tone', file: '/moshion/assets/tone.wav', label: 'Tone', kind: 'sfx', source: 'tone' },
  { name: 'music', file: '/moshion/assets/music.wav', label: 'Music: playing', kind: 'music', source: 'play' },
  { name: 'title', file: '/moshion/assets/title.wav', label: 'Music: title', kind: 'music', source: 'title' },
  { name: 'win', file: '/moshion/assets/win.wav', label: 'Music: you won', kind: 'music', source: 'won' },
  { name: 'lose', file: '/moshion/assets/lose.wav', label: 'Music: you lost', kind: 'music', source: 'lost' },
];
