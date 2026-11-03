'use client';

// The 8-bit sound mixer.
//
// Why jsfxr + ZzFXM and not one library: no existing project is both a
// sound-effect generator and a music tracker that plays through moSHion's
// Sound. ZzFX and jsfxr generate effects; ZzFXM generates music. jsfxr is
// Unlicense and emits a WAV data URI on its own, which is exactly what
// loadSound() already fetches and decodes. ZzFXM (MIT) returns stereo sample
// arrays; lib/sound/wav.ts turns those into the same WAV URI. Both are
// vendored under lib/sound/vendor/ with their licences.
//
// Playback here is Web Audio, not moSHion's Sound: this page is the authoring
// surface, not a sketch. What a sketch gets is the saved WAV, loaded through
// loadSound('<name>') -- see the "How this reaches a sketch" panel. The
// exported volume/rate/pan lines are the same properties Sound exposes.
//
// Saving follows the texture editor's rule: the value lands in
// `moshion.store.v1` on this app's origin under `sound:<name>`, the preview
// bridge hydrates that store into the sandboxed iframe, and moshion.js's
// loadSound() resolves the name. No API route, no upload, no quota.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteSavedSound,
  listSavedSounds,
  saveSound,
  type SavedSound,
} from '../lib/moshion-storage';
import { MUSIC_LOOPS } from '../lib/sound/loops';
import { PALETTE, SFX_PRESETS } from '../lib/sound/presets';
import {
  PARAM_GROUPS,
  PARAM_SPECS,
  WAVE_SHAPES,
  mutateDef,
  paramsFromPreset,
} from '../lib/sound/params';
import { renderMusic, renderSfxDef, type Rendered } from '../lib/sound/render';
import { matchRecording } from '../lib/sound/match';
import type { SfxrParams } from '../lib/sound/vendor/jsfxr/sfxr.mjs';

type Kind = 'sfx' | 'music';

interface Channel {
  id: string;
  name: string;
  kind: Kind;
  /** jsfxr preset name, or ZzFXM loop id. */
  source: string;
  /** The editable definition for an effect. Music carries an empty object. */
  def: SfxrParams;
  volume: number;
  rate: number;
  pan: number;
  muted: boolean;
  solo: boolean;
}

function sfxChannel(id: string, name: string, preset: string): Channel {
  return {
    id,
    name,
    kind: 'sfx',
    source: preset,
    def: paramsFromPreset(preset),
    volume: 0.8,
    rate: 1,
    pan: 0,
    muted: false,
    solo: false,
  };
}

const INITIAL: Channel[] = [
  sfxChannel('c1', 'coin', 'pickupCoin'),
  sfxChannel('c2', 'jump', 'jump'),
  sfxChannel('c3', 'hit', 'hitHurt'),
  { id: 'c4', name: 'music', kind: 'music', source: 'play', def: {}, volume: 0.4, rate: 1, pan: 0, muted: false, solo: false },
];

let nextId = 5;

const card: React.CSSProperties = {
  background: 'var(--card)',
  // Longhand, not `border`: the selected-channel card and the active buttons
  // override borderColor. Mixing the shorthand with a longhand makes React
  // warn ("removing borderColor while border is set") on every re-render.
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--border)',
  borderRadius: 8,
  padding: 12,
  marginBottom: 10,
};
const btn: React.CSSProperties = {
  background: 'var(--muted)',
  color: 'var(--text)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--border)',
  borderRadius: 6,
  padding: '5px 10px',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 13,
};
const activeBtn: React.CSSProperties = {
  ...btn,
  background: 'var(--brand)',
  borderColor: 'var(--brand)',
  // Dark text on the light brand blue. White on #5baafd is only ~2.5:1, which
  // fails the contrast bar this app uses for every other control.
  color: '#0b1220',
};
const field: React.CSSProperties = {
  background: 'var(--muted)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '4px 7px',
  font: 'inherit',
  fontSize: 13,
  minWidth: 0,
};
const code: React.CSSProperties = {
  background: '#151515',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 12,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  margin: '6px 0',
};

function sourceLabel(ch: { kind: Kind; source: string }): string {
  if (ch.kind === 'music') return MUSIC_LOOPS.find((l) => l.id === ch.source)?.label ?? ch.source;
  return SFX_PRESETS.find((p) => p.preset === ch.source)?.label ?? ch.source;
}

function renderedFor(ch: Channel): Rendered {
  return ch.kind === 'music' ? renderMusic(ch.source) : renderSfxDef(ch.def);
}

function Waveform({ rendered }: { rendered: Rendered | null }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    const w = Math.max(120, canvas.clientWidth);
    const h = 64;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 0, w, h);
    if (!rendered) {
      ctx.fillStyle = '#8393c4';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('waveform appears after the page loads', 8, 36);
      return;
    }
    const channels = rendered.kind === 'music' ? rendered.channels : [rendered.samples];
    const frames = channels[0]?.length ?? 0;
    if (!frames) return;
    const per = frames / w;
    ctx.strokeStyle = '#5baafd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const start = Math.floor(x * per);
      const end = Math.min(frames, Math.floor((x + 1) * per) || start + 1);
      let min = 1;
      let max = -1;
      for (let i = start; i < end; i++) {
        let sum = 0;
        for (const c of channels) sum += c[i] ?? 0;
        const s = sum / channels.length;
        if (s < min) min = s;
        if (s > max) max = s;
      }
      if (min > max) {
        min = 0;
        max = 0;
      }
      const y1 = (1 - max) * 0.5 * h;
      const y2 = (1 - min) * 0.5 * h;
      ctx.moveTo(x + 0.5, y1);
      ctx.lineTo(x + 0.5, y2);
    }
    ctx.stroke();
  }, [rendered]);
  return (
    <canvas
      ref={ref}
      aria-label="Waveform of the selected sound"
      style={{ width: '100%', height: 64, display: 'block', borderRadius: 6, marginTop: 8 }}
    />
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, minWidth: 0 }}>
      <span style={{ color: '#8393c4', minWidth: 48 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, minWidth: 60, accentColor: '#5baafd' }}
        aria-label={label}
      />
      <span style={{ minWidth: 38, textAlign: 'right' }}>{display}</span>
    </label>
  );
}

export default function SoundMixer() {
  const [channels, setChannels] = useState<Channel[]>(INITIAL);
  const [selected, setSelected] = useState('c1');
  const [tweakId, setTweakId] = useState<string | null>(null);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [saved, setSaved] = useState<SavedSound[]>([]);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);

  // Microphone state. `recording` is global because only one stream can be
  // open at a time; `micId` says which channel's panel is showing.
  const [micId, setMicId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [micStatus, setMicStatus] = useState<string | null>(null);
  const [micNotes, setMicNotes] = useState<string[] | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const masterVolumeRef = useRef(0.8);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const micTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setSaved(listSavedSounds());
    return () => {
      for (const s of sourcesRef.current) {
        try { s.stop(); } catch { /* already ended */ }
      }
      sourcesRef.current.clear();
      if (micTimerRef.current) {
        clearTimeout(micTimerRef.current);
        micTimerRef.current = null;
      }
      if (recorderRef.current) {
        // Drop onstop first: unmounting must not run the analyzer and call
        // setState on a component that is already gone.
        recorderRef.current.onstop = null;
        try {
          if (recorderRef.current.state !== 'inactive') recorderRef.current.stop();
        } catch { /* already stopped */ }
        recorderRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      // The mixer mounts in the lesson drawer as well as on /sound, so it can
      // come and go many times in one session. Browsers cap live AudioContexts
      // (usually six), so opening a new one must not leak the old one.
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
      masterRef.current = null;
    };
  }, []);

  // The master gain is the one level every voice passes through. Keep the ref
  // in step with the slider so a voice started after a change lands at the
  // level the pointer is showing, not the value from when the audio context
  // was first created.
  useEffect(() => {
    masterVolumeRef.current = masterVolume;
    if (masterRef.current) masterRef.current.gain.value = masterVolume;
  }, [masterVolume]);

  // Renders are cached in lib/sound/render, so asking again for the same
  // channel is cheap. The mounted gate keeps the static export from
  // synthesizing every default sound at build time.
  const selectedChannel = channels.find((c) => c.id === selected) ?? channels[0];
  const selectedRendered = useMemo(
    () => (mounted && selectedChannel ? renderedFor(selectedChannel) : null),
    // `def` is a fresh object on every tweak, so the waveform follows the
    // knobs; `id` so removing a channel cannot leave the previous canvas.
    [mounted, selectedChannel?.id, selectedChannel?.kind, selectedChannel?.source, selectedChannel?.def]
  );

  const audible = useMemo(() => {
    const anySolo = channels.some((c) => c.solo);
    return channels.filter((c) => (anySolo ? c.solo : !c.muted));
  }, [channels]);

  const update = useCallback((id: string, patch: Partial<Channel>) => {
    setChannels((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const audioCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    let ctx = ctxRef.current;
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      ctxRef.current = ctx;
    }
    if (!masterRef.current) {
      const master = ctx.createGain();
      master.gain.value = masterVolumeRef.current;
      master.connect(ctx.destination);
      masterRef.current = master;
    }
    return ctx;
  }, []);

  const updateDef = useCallback((id: string, patch: Partial<SfxrParams>) => {
    setChannels((list) =>
      list.map((c) => (c.id === id ? { ...c, def: { ...c.def, ...patch } } : c))
    );
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const analyzeRecording = useCallback(async (channelId: string, mime: string) => {
    try {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) recorder.onstop = null;
      if (micTimerRef.current) {
        clearTimeout(micTimerRef.current);
        micTimerRef.current = null;
      }
      stopStream();

      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];
      if (!blob.size) {
        setMicStatus('I did not hear anything. Try again, a little louder.');
        return;
      }
      const ctx = audioCtx();
      if (!ctx) {
        setMicStatus('Audio is not available in this browser.');
        return;
      }

      let buffer: AudioBuffer;
      try {
        buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      } catch {
        setMicStatus('I could not read that recording. Try again.');
        return;
      }

      const mono = new Float32Array(buffer.length);
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < mono.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
      }

      const match = matchRecording(mono, buffer.sampleRate);
      if (!match) {
        setMicStatus('I did not hear enough. Make a slightly longer sound, then try again.');
        return;
      }

      setChannels((list) =>
        list.map((c) => (c.id === channelId ? { ...c, def: match.def } : c))
      );
      setTweakId(channelId);
      setMicNotes(match.notes);
      setMicStatus(
        match.confidence > 0.45
          ? 'Matched. Press ▶ to hear it, then tweak from here.'
          : 'That is my best guess. Press ▶, then tweak the knobs.'
      );
    } finally {
      setMicBusy(false);
    }
  }, [audioCtx, stopStream]);

  const startRecording = useCallback(async (ch: Channel) => {
    if (recording || micBusy) return;
    setMicNotes(null);
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setMicStatus('This browser cannot record audio. You can still shape the sound with the Tweak knobs.');
      return;
    }
    setMicBusy(true);
    setMicStatus('Opening the microphone…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;

      let mime: string | undefined;
      for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
        try {
          if (MediaRecorder.isTypeSupported(type)) {
            mime = type;
            break;
          }
        } catch { /* try the next type */ }
      }
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void analyzeRecording(ch.id, recorder.mimeType || mime || 'audio/webm');
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setMicStatus('Listening… make a short sound.');
      micTimerRef.current = window.setTimeout(() => {
        micTimerRef.current = null;
        if (recorder.state !== 'inactive') recorder.stop();
        setRecording(false);
      }, 3000);
    } catch (err) {
      stopStream();
      setRecording(false);
      setMicBusy(false);
      const name = (err as { name?: string } | null)?.name;
      setMicStatus(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'The microphone is blocked for this site. Allow it in the browser, then try again.'
          : 'I could not start the microphone. You can still shape the sound with the Tweak knobs.'
      );
    }
  }, [analyzeRecording, micBusy, recording, stopStream]);

  const stopRecording = useCallback(() => {
    if (micTimerRef.current) {
      clearTimeout(micTimerRef.current);
      micTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    setRecording(false);
  }, []);

  const stopAll = useCallback(() => {
    for (const s of sourcesRef.current) {
      try { s.stop(); } catch { /* already ended */ }
    }
    sourcesRef.current.clear();
  }, []);

  const start = useCallback((ch: Channel, loop: boolean) => {
    const ctx = audioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const rendered = renderedFor(ch);
    const channels = rendered.kind === 'music' ? rendered.channels : [rendered.samples];
    if (!channels.length || !channels[0].length) return;
    const buffer = ctx.createBuffer(channels.length, channels[0].length, rendered.sampleRate);
    channels.forEach((c, i) => buffer.getChannelData(i).set(c));

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = ch.rate;
    src.loop = loop;
    const gain = ctx.createGain();
    gain.gain.value = ch.volume;
    let head: AudioNode = src;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = ch.pan;
      head.connect(panner);
      head = panner;
    }
    head.connect(gain);
    gain.connect(masterRef.current ?? ctx.destination);
    src.start();
    sourcesRef.current.add(src);
    src.onended = () => sourcesRef.current.delete(src);
  }, [audioCtx]);

  const playOne = useCallback((ch: Channel) => {
    // Auditioning one channel stops the mix first: a second press must not
    // stack a second copy of the same music loop.
    stopAll();
    start(ch, ch.kind === 'music');
  }, [start, stopAll]);

  const playAll = useCallback(() => {
    stopAll();
    for (const ch of audible) start(ch, ch.kind === 'music');
  }, [audible, start, stopAll]);

  const addChannel = useCallback((kind: Kind) => {
    const id = `c${nextId++}`;
    const base = kind === 'music' ? 'music' : 'sound';
    const taken = new Set(channels.map((c) => c.name));
    let name = base;
    let n = 2;
    while (taken.has(name)) name = `${base}${n++}`;
    const ch: Channel = {
      id,
      name,
      kind,
      source: kind === 'music' ? 'play' : 'pickupCoin',
      def: kind === 'music' ? {} : paramsFromPreset('pickupCoin'),
      volume: kind === 'music' ? 0.4 : 0.8,
      rate: 1,
      pan: 0,
      muted: false,
      solo: false,
    };
    setChannels((list) => [...list, ch]);
    setSelected(id);
  }, [channels]);

  const removeChannel = useCallback((id: string) => {
    setChannels((list) => list.filter((c) => c.id !== id));
    setSelected((cur) => (cur === id ? (channels.find((c) => c.id !== id)?.id ?? '') : cur));
  }, [channels]);

  const save = useCallback((ch: Channel) => {
    const rendered = renderedFor(ch);
    const error = saveSound(ch.name, rendered.dataUri, {
      kind: ch.kind,
      source: ch.source,
      volume: ch.volume,
      rate: ch.rate,
      pan: ch.pan,
      // The WAV is the sound; the definition is what lets the library reopen
      // it with every knob where it was left. Music has none.
      def: ch.kind === 'sfx' ? (ch.def as Record<string, unknown>) : undefined,
    });
    if (error) {
      setMessage({ text: error, bad: true });
      return;
    }
    setSaved(listSavedSounds());
    setMessage({
      text: `Saved "${ch.name}". A sketch now loads it with loadSound('${ch.name}').`,
      bad: false,
    });
  }, []);

  const removeSaved = useCallback((name: string) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete the saved sound "${name}"?`)) return;
    deleteSavedSound(name);
    setSaved(listSavedSounds());
    setMessage({ text: `Deleted "${name}".`, bad: false });
  }, []);

  // Reopen a saved sound as a channel. The WAV is already there; the
  // definition is what lets the student keep tweaking it. Older saves that
  // predate the definition fall back to their preset.
  const editSaved = useCallback((s: SavedSound) => {
    const id = `c${nextId++}`;
    const def =
      s.kind === 'sfx'
        ? (Object.keys(s.def).length
            ? ({ ...s.def } as SfxrParams)
            : paramsFromPreset(s.source))
        : {};
    const ch: Channel = {
      id,
      name: s.name,
      kind: s.kind,
      source: s.source,
      def,
      volume: s.volume,
      rate: s.rate,
      pan: s.pan,
      muted: false,
      solo: false,
    };
    setChannels((list) => [...list, ch]);
    setSelected(id);
    if (s.kind === 'sfx') setTweakId(id);
    setMessage({ text: `Editing "${s.name}". Change it, then press Save again.`, bad: false });
  }, []);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ text: 'Copied to the clipboard.', bad: false });
    } catch {
      setMessage({ text: 'Could not copy. Select the text and copy it by hand.', bad: true });
    }
  }, []);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', paddingBottom: 40 }}>
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, margin: '0 0 6px' }}>8-bit sound mixer</h1>
        <p style={{ margin: 0, color: '#8393c4', fontSize: 14 }}>
          Build a little palette for a game: choose a chip sound, set its level, speed and place in
          the stereo field, and hear the channels together. Each effect has a <strong style={{ color: 'var(--text)' }}>Tweak</strong> panel
          for its own waveform, pitch and envelope, and a <strong style={{ color: 'var(--text)' }}>Mic</strong> panel that
          fits those knobs to a sound you make with your mouth. Save one and a moSHion sketch can play it with{' '}
          <code>loadSound(&apos;name&apos;)</code>. Everything stays in this browser.
        </p>
      </header>

      <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={activeBtn} onClick={playAll}>▶ Play all</button>
        <button style={btn} onClick={stopAll}>■ Stop</button>
        <div style={{ flex: '0 1 240px', minWidth: 190 }}>
          <Slider
            label="master"
            value={masterVolume}
            min={0}
            max={1}
            step={0.01}
            onChange={setMasterVolume}
            display={`${Math.round(masterVolume * 100)}%`}
          />
        </div>
        <span style={{ flex: 1 }} />
        <button style={btn} onClick={() => addChannel('sfx')}>+ Sound effect</button>
        <button style={btn} onClick={() => addChannel('music')}>+ Music</button>
      </div>

      {message && (
        <p
          role={message.bad ? 'alert' : 'status'}
          style={{
            ...card,
            margin: '0 0 10px',
            color: message.bad ? '#ff7b72' : '#8bd17c',
            fontSize: 13,
          }}
        >
          {message.text}
        </p>
      )}

      {channels.map((ch) => {
        const isSelected = ch.id === selectedChannel?.id;
        return (
          <section
            key={ch.id}
            style={{ ...card, borderColor: isSelected ? 'var(--brand)' : 'var(--border)' }}
            onFocus={() => setSelected(ch.id)}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                aria-label="Channel name"
                value={ch.name}
                onChange={(e) => update(ch.id, { name: e.target.value })}
                onFocus={() => setSelected(ch.id)}
                style={{ ...field, width: 140 }}
              />
              <span style={{ fontSize: 12, color: '#8393c4', minWidth: 70 }}>
                {ch.kind === 'music' ? 'music' : 'effect'}
              </span>
              <select
                aria-label="Sound"
                value={ch.source}
                onChange={(e) => update(ch.id, {
                  source: e.target.value,
                  def: ch.kind === 'music' ? ch.def : paramsFromPreset(e.target.value),
                })}
                onFocus={() => setSelected(ch.id)}
                style={{ ...field, flex: 1, minWidth: 140 }}
              >
                {ch.kind === 'music'
                  ? MUSIC_LOOPS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)
                  : SFX_PRESETS.map((p) => <option key={p.id} value={p.preset}>{p.label}</option>)}
              </select>
              <button style={btn} onClick={() => playOne(ch)} aria-label={`Play ${ch.name}`}>▶</button>
              <button
                style={ch.muted ? activeBtn : btn}
                onClick={() => update(ch.id, { muted: !ch.muted })}
                aria-pressed={ch.muted}
                aria-label={`Mute ${ch.name}`}
              >
                {ch.muted ? 'Muted' : 'Mute'}
              </button>
              <button
                style={ch.solo ? activeBtn : btn}
                onClick={() => update(ch.id, { solo: !ch.solo })}
                aria-pressed={ch.solo}
                aria-label={`Solo ${ch.name}`}
              >
                Solo
              </button>
              <button style={btn} onClick={() => save(ch)} aria-label={`Save ${ch.name}`}>Save</button>
              {ch.kind === 'sfx' && (
                <button
                  style={tweakId === ch.id ? activeBtn : btn}
                  onClick={() => setTweakId(tweakId === ch.id ? null : ch.id)}
                  aria-expanded={tweakId === ch.id}
                  aria-controls={`tweak-${ch.id}`}
                  aria-label={`Tweak ${ch.name}`}
                >
                  Tweak
                </button>
              )}
              {ch.kind === 'sfx' && (
                <button
                  style={micId === ch.id ? activeBtn : btn}
                  onClick={() => {
                    if (recording) {
                      stopRecording();
                      return;
                    }
                    setMicId(micId === ch.id ? null : ch.id);
                    setMicStatus(null);
                    setMicNotes(null);
                  }}
                  aria-expanded={micId === ch.id}
                  aria-controls={`mic-${ch.id}`}
                  aria-label={`Use the microphone for ${ch.name}`}
                >
                  Mic
                </button>
              )}
              <a
                style={{ ...btn, textDecoration: 'none' }}
                href={mounted ? renderedFor(ch).dataUri : '#'}
                download={`${ch.name || 'sound'}.wav`}
                aria-label={`Download ${ch.name} as a WAV`}
                onClick={(e) => { if (!mounted) e.preventDefault(); }}
              >
                .wav
              </a>
              <button
                style={btn}
                onClick={() => removeChannel(ch.id)}
                aria-label={`Remove ${ch.name}`}
              >
                ✕
              </button>
            </div>

            {ch.source === 'random' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 12, color: '#8393c4' }}>
                  {SFX_PRESETS.find((p) => p.preset === 'random')?.blurb}
                </span>
                <button
                  style={btn}
                  onClick={() => update(ch.id, { def: paramsFromPreset('random') })}
                >
                  ⟳ Roll again
                </button>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 8,
                marginTop: 8,
              }}
            >
              <Slider
                label="volume"
                value={ch.volume}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => update(ch.id, { volume: v })}
                display={`${Math.round(ch.volume * 100)}%`}
              />
              <Slider
                label="rate"
                value={ch.rate}
                min={0.5}
                max={2}
                step={0.01}
                onChange={(v) => update(ch.id, { rate: v })}
                display={`${ch.rate.toFixed(2)}×`}
              />
              <Slider
                label="pan"
                value={ch.pan}
                min={-1}
                max={1}
                step={0.01}
                onChange={(v) => update(ch.id, { pan: v })}
                display={ch.pan === 0 ? 'centre' : ch.pan < 0 ? 'left' : 'right'}
              />
            </div>

            {micId === ch.id && ch.kind === 'sfx' && (
              <div
                id={`mic-${ch.id}`}
                style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    style={recording ? activeBtn : btn}
                    onClick={() => (recording ? stopRecording() : startRecording(ch))}
                    disabled={micBusy && !recording}
                    aria-pressed={recording}
                  >
                    {recording ? '■ Stop listening' : micBusy ? 'Matching…' : '● Record'}
                  </button>
                  <span style={{ fontSize: 12, color: '#8393c4', flex: '1 1 240px' }}>
                    Make a short sound with your mouth, up to 3 seconds. The mixer fits the Tweak
                    knobs to it.
                  </span>
                </div>
                {micStatus && (
                  <p role="status" style={{ margin: '6px 0 0', fontSize: 12, color: '#8393c4' }}>
                    {micStatus}
                  </p>
                )}
                {micNotes && (
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                    Heard: <strong>{micNotes.join(', ')}</strong>
                  </p>
                )}
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#8393c4' }}>
                  Nothing is uploaded. The listening and matching happen in this browser.
                </p>
              </div>
            )}

            {tweakId === ch.id && ch.kind === 'sfx' && (
              <div
                id={`tweak-${ch.id}`}
                style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}
              >
                <div
                  style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}
                >
                  <span style={{ fontSize: 12, color: '#8393c4' }}>wave</span>
                  {WAVE_SHAPES.map((w) => {
                    const on = Math.floor(Number(ch.def.wave_type) || 0) === w.value;
                    return (
                      <button
                        key={w.value}
                        style={on ? activeBtn : btn}
                        onClick={() => updateDef(ch.id, { wave_type: w.value })}
                        aria-pressed={on}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                  <span style={{ flex: 1 }} />
                  <button
                    style={btn}
                    onClick={() => update(ch.id, { source: 'random', def: paramsFromPreset('random') })}
                  >
                    Random
                  </button>
                  <button style={btn} onClick={() => updateDef(ch.id, mutateDef(ch.def))}>
                    Mutate
                  </button>
                  <button
                    style={btn}
                    title="Back to this preset's settings"
                    onClick={() => update(ch.id, { def: paramsFromPreset(ch.source) })}
                  >
                    Reset
                  </button>
                </div>

                {PARAM_GROUPS.map((group) => (
                  <div key={group.id} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                        color: '#8393c4',
                        marginBottom: 3,
                      }}
                    >
                      {group.label}
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 6,
                      }}
                    >
                      {PARAM_SPECS.filter((s) => s.group === group.id).map((s) => {
                        const value = Number(ch.def[s.key]) || 0;
                        return (
                          <Slider
                            key={s.key}
                            label={s.label}
                            value={value}
                            min={s.min}
                            max={s.max}
                            step={s.step}
                            onChange={(v) => updateDef(ch.id, { [s.key]: v })}
                            display={value.toFixed(2)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}

                <p style={{ margin: 0, fontSize: 11, color: '#8393c4' }}>
                  The preset is a starting point. These controls change the sound itself; the
                  volume, rate and pan sliders change the mix.
                </p>
              </div>
            )}

            {isSelected && <Waveform rendered={selectedRendered} />}
          </section>
        );
      })}

      <section style={card}>
        <h2 style={{ fontSize: 16, margin: '0 0 6px' }}>How this reaches a sketch</h2>
        <p style={{ fontSize: 13, color: '#8393c4', margin: '0 0 6px' }}>
          <strong>Save</strong> writes the sound into this browser under its name. A sketch on this
          site then loads it by name, exactly like a file:
        </p>
        <pre style={code}>{`let zap = loadSound('${channels[0]?.name || 'coin'}');
zap.volume = 0.8;
zap.rate = 1;
zap.pan = 0;
zap.play();`}</pre>
        <p style={{ fontSize: 13, color: '#8393c4', margin: '0 0 6px' }}>
          A saved sound wins over a built-in file with the same name. The course palette is also
          available by path, so a game can use it without saving anything:
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PALETTE.map((p) => (
            <button
              key={p.name}
              style={btn}
              onClick={() => copy(`let ${p.name.replace(/[^A-Za-z0-9_]/g, '_')} = loadSound('${p.file}');`)}
              title={`Copy loadSound('${p.file}')`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 16, margin: '0 0 6px' }}>
          Saved in this browser {saved.length ? `(${saved.length})` : ''}
        </h2>
        {saved.length === 0 ? (
          <p style={{ fontSize: 13, color: '#8393c4', margin: 0 }}>
            Nothing saved yet. Give a channel a name and press <strong>Save</strong>.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {saved.map((s) => (
              <div
                key={s.name}
                style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
              >
                <code style={{ fontSize: 13 }}>{s.name}</code>
                <span style={{ fontSize: 12, color: '#8393c4' }}>
                  {s.kind === 'music' ? 'music' : 'effect'}, {Math.round(s.bytes / 1024)} KB,{' '}
                  {sourceLabel(s)}
                </span>
                <span style={{ flex: 1 }} />
                <button
                  style={btn}
                  aria-label={`Play ${s.name}`}
                  onClick={() => {
                    const audio = new Audio(s.dataUri);
                    audio.volume = Math.max(0, Math.min(1, s.volume));
                    audio.playbackRate = s.rate;
                    audio.play().catch(() => {});
                  }}
                >
                  ▶
                </button>
                <button style={btn} onClick={() => editSaved(s)} aria-label={`Edit ${s.name}`}>
                  Edit
                </button>
                <button style={btn} onClick={() => copy(`let ${s.name} = loadSound('${s.name}');`)}>
                  Copy code
                </button>
                <a
                  style={{ ...btn, textDecoration: 'none' }}
                  href={s.dataUri}
                  download={`${s.name}.wav`}
                  aria-label={`Download ${s.name} as a WAV`}
                >
                  .wav
                </a>
                <button style={btn} onClick={() => removeSaved(s.name)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ ...card, color: '#8393c4', fontSize: 12 }}>
        <p style={{ margin: '0 0 6px' }}>
          <strong style={{ color: 'var(--text)' }}>Tweak edits the sound; the sliders edit the mix.</strong>{' '}
          The Tweak panel sets the effect's own waveform, pitch, envelope and character. The three
          sliders are moSHion properties: <code>.volume</code> is 0 to 1, <code>.rate</code> shifts
          speed and pitch together, and <code>.pan</code> runs -1 (left) to 1 (right). They are
          printed in the snippet so the game can set them itself; the WAV holds the timbre only.
        </p>
        <p style={{ margin: '0 0 6px' }}>
          <strong style={{ color: 'var(--text)' }}>Master is this page's mix.</strong> It scales every
          channel without changing any channel's own volume. A sketch does the same with{' '}
          <code>masterVolume()</code>.
        </p>
        <p style={{ margin: '0 0 6px' }}>
          <strong style={{ color: 'var(--text)' }}>Mixing is simultaneous playback.</strong> Play all
          starts every channel that is not muted (or only the soloed ones) at once. A music channel
          loops; an effect channel plays once. Use Mute/Solo to hear one voice against the rest.
        </p>
        <p style={{ margin: '0 0 6px' }}>
          <strong style={{ color: 'var(--text)' }}>Mic fits a starting point.</strong> It measures pitch,
          envelope, waveform shape and noisiness in this browser and sets the Tweak knobs. Nothing is
          uploaded, and the first guess is meant to be tweaked, not to be a perfect copy.
        </p>
        <p style={{ margin: 0 }}>
          Built on <a href="https://github.com/chr15m/jsfxr" target="_blank" rel="noopener noreferrer">jsfxr</a>{' '}
          (Unlicense) for effects and{' '}
          <a href="https://github.com/keithclark/ZzFXM" target="_blank" rel="noopener noreferrer">ZzFXM</a>{' '}
          (MIT) for music. The course palette lives in <code>public/moshion/assets/</code>.
        </p>
      </section>
    </div>
  );
}
