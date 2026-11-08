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
  /** jsfxr preset for an sfx, or ZzFXM loop id for music; 'designed' when `def` is given. */
  source: string;
  /**
   * A hand-designed jsfxr effect: only the fields that differ from DESIGN_BASE.
   * Rendered exactly (no random preset), so the file is the same every run.
   */
  def?: Record<string, number>;
}

/** jsfxr's own defaults, which every designed effect starts from. */
export const DESIGN_BASE: Record<string, number | boolean> = {
  oldParams: true, wave_type: 0, p_env_attack: 0, p_env_sustain: 0.3, p_env_punch: 0, p_env_decay: 0.4,
  p_base_freq: 0.3, p_freq_limit: 0, p_freq_ramp: 0, p_freq_dramp: 0, p_vib_strength: 0, p_vib_speed: 0,
  p_arp_mod: 0, p_arp_speed: 0, p_duty: 0, p_duty_ramp: 0, p_repeat_speed: 0, p_pha_offset: 0, p_pha_ramp: 0,
  p_lpf_freq: 1, p_lpf_ramp: 0, p_lpf_resonance: 0, p_hpf_freq: 0, p_hpf_ramp: 0, sound_vol: 0.25, sample_size: 8,
};

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
  // Designed 2026-11-07 for the board games and Quest (wave_type: 0 square, 1 saw, 2 sine, 3 noise).
  { name: 'dice', file: '/moshion/assets/dice.wav', label: 'Dice roll', kind: 'sfx', source: 'designed',
    def: { wave_type: 3, p_env_sustain: 0.32, p_env_decay: 0.38, p_base_freq: 0.55, p_repeat_speed: 0.7, p_lpf_freq: 0.75, p_hpf_freq: 0.12 } },
  { name: 'step', file: '/moshion/assets/step.wav', label: 'Step', kind: 'sfx', source: 'designed',
    def: { wave_type: 3, p_env_sustain: 0.08, p_env_decay: 0.16, p_base_freq: 0.2, p_lpf_freq: 0.45 } },
  { name: 'sword', file: '/moshion/assets/sword.wav', label: 'Sword hit', kind: 'sfx', source: 'designed',
    def: { wave_type: 3, p_env_sustain: 0.06, p_env_punch: 0.5, p_env_decay: 0.25, p_base_freq: 0.78, p_freq_ramp: -0.35, p_hpf_freq: 0.25 } },
  { name: 'clang', file: '/moshion/assets/clang.wav', label: 'Shield clang', kind: 'sfx', source: 'designed',
    def: { wave_type: 0, p_env_sustain: 0.05, p_env_punch: 0.6, p_env_decay: 0.35, p_base_freq: 0.62, p_vib_strength: 0.3, p_vib_speed: 0.7, p_duty: 0.15 } },
  { name: 'potion', file: '/moshion/assets/potion.wav', label: 'Potion', kind: 'sfx', source: 'designed',
    def: { wave_type: 2, p_env_sustain: 0.32, p_env_decay: 0.3, p_base_freq: 0.28, p_freq_ramp: 0.22, p_vib_strength: 0.5, p_vib_speed: 0.6, p_repeat_speed: 0.55 } },
  { name: 'levelup', file: '/moshion/assets/levelup.wav', label: 'Level up', kind: 'sfx', source: 'designed',
    def: { wave_type: 0, p_env_sustain: 0.35, p_env_decay: 0.3, p_base_freq: 0.35, p_arp_mod: 0.45, p_arp_speed: 0.55, p_duty: 0.4 } },
  { name: 'crown', file: '/moshion/assets/crown.wav', label: 'Crown', kind: 'sfx', source: 'designed',
    def: { wave_type: 2, p_env_sustain: 0.25, p_env_decay: 0.35, p_base_freq: 0.55, p_freq_ramp: 0.12, p_arp_mod: 0.3, p_arp_speed: 0.4, p_vib_strength: 0.1, p_vib_speed: 0.5 } },
  { name: 'whoosh', file: '/moshion/assets/whoosh.wav', label: 'Whoosh', kind: 'sfx', source: 'designed',
    def: { wave_type: 3, p_env_attack: 0.15, p_env_sustain: 0.15, p_env_decay: 0.2, p_base_freq: 0.4, p_freq_ramp: -0.2, p_lpf_freq: 0.35, p_lpf_ramp: 0.3 } },
  { name: 'pop', file: '/moshion/assets/pop.wav', label: 'Pop', kind: 'sfx', source: 'designed',
    def: { wave_type: 2, p_env_sustain: 0.07, p_env_decay: 0.16, p_base_freq: 0.35, p_freq_ramp: 0.5 } },
  { name: 'door', file: '/moshion/assets/door.wav', label: 'Door', kind: 'sfx', source: 'designed',
    def: { wave_type: 3, p_env_sustain: 0.15, p_env_decay: 0.4, p_base_freq: 0.12, p_lpf_freq: 0.3 } },
];
