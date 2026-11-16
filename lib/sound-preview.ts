/** One retained player per preview, with a single active preview across the app. */
export type SoundPreviewState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export type SoundPreviewSource = string | (() => string | null | Promise<string | null>);
type PreviewAudio = Pick<HTMLAudioElement, 'play' | 'pause' | 'paused' | 'ended' | 'currentTime' | 'volume' | 'playbackRate' | 'onplay' | 'onpause' | 'onended' | 'onerror'>;
export type SoundPreview = { toggle: () => Promise<void>; pause: () => void; dispose: () => void };
let activePreview: SoundPreview | null = null;

export function createSoundPreview({ source, onState, settings = () => ({}), makeAudio = (url) => new Audio(url) }: {
  source: SoundPreviewSource;
  onState: (state: SoundPreviewState) => void;
  settings?: () => { volume?: number; rate?: number };
  makeAudio?: (url: string) => PreviewAudio;
}): SoundPreview {
  let audio: PreviewAudio | null = null;
  let disposed = false;
  let wantsPlayback = false;
  let generation = 0;
  const clearActive = () => { if (activePreview === controller) activePreview = null; };
  const publish = (state: SoundPreviewState) => { if (!disposed) onState(state); };
  const pause = () => {
    generation++;
    wantsPlayback = false;
    audio?.pause();
    clearActive();
    publish(audio && !audio.ended ? 'paused' : 'idle');
  };
  const controller: SoundPreview = {
    pause,
    async toggle() {
      if (disposed) return;
      if (wantsPlayback) { pause(); return; }
      if (activePreview !== controller) activePreview?.pause();
      activePreview = controller;
      wantsPlayback = true;
      const token = ++generation;
      publish('loading');
      try {
        if (!audio) {
          const result = typeof source === 'function' ? source() : source;
          const url = typeof result === 'string' || result === null ? result : await result;
          if (disposed || token !== generation) return;
          if (!url) throw new Error('Sound unavailable');
          audio = makeAudio(url);
          audio.onplay = () => {
            if (!wantsPlayback || disposed) audio?.pause();
            else publish('playing');
          };
          audio.onpause = () => { if (audio?.paused && !audio.ended && wantsPlayback) { wantsPlayback = false; clearActive(); publish('paused'); } };
          audio.onended = () => {
            wantsPlayback = false;
            clearActive();
            if (audio) audio.currentTime = 0;
            publish('idle');
          };
          audio.onerror = () => { wantsPlayback = false; clearActive(); publish('error'); };
        }
        const { volume = 1, rate = 1 } = settings();
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.playbackRate = rate;
        await audio.play();
        if (disposed || !wantsPlayback) audio.pause();
        else if (token === generation && wantsPlayback && !audio.paused) publish('playing');
      } catch {
        if (!disposed && token === generation) { wantsPlayback = false; clearActive(); publish('error'); }
      }
    },
    dispose() {
      disposed = true;
      generation++;
      wantsPlayback = false;
      clearActive();
      if (audio) {
        audio.onplay = audio.onpause = audio.onended = audio.onerror = null;
        audio.pause();
      }
    },
  };
  return controller;
}
