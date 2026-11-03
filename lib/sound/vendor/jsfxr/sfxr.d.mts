// Type surface for the vendored jsfxr. The package is plain JavaScript and
// this app has no types for it; only the three calls the mixer makes matter.
export interface SfxrParams {
  sample_rate?: number;
  sample_size?: number;
  [key: string]: unknown;
}

export interface SfxrWave {
  dataURI: string;
}

export const sfxr: {
  generate(preset: string, options?: { sound_vol?: number; sample_rate?: number; sample_size?: number }): SfxrParams;
  toWave(def: SfxrParams | string): SfxrWave;
  toBuffer(def: SfxrParams | string): Uint8Array;
  b58encode(def: SfxrParams): string;
  b58decode(text: string): SfxrParams;
};
export default sfxr;
