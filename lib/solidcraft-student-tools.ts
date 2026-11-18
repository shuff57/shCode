// Host-side classroom control for the unmodified pinned canvas UI. When tools
// are off, all direct engine input is covered; only camera requests are sent.
import { cadToolbarCrop } from './solidcraft-viewport';
import { sketchPoint, type Point2 } from './solidcraft-sketch';
type Camera = { target: number[]; yaw: number; pitch: number; distance: number };
type UiReply = { ui: { layout: string; showBrowser: boolean; showTimeline: boolean; showNavigationBar: boolean }; viewport: [number, number, number, number]; camera: Camera };
type Api = { request(method: string, params: object): Promise<unknown> };
type ScWindow = Window & { solidcraft?: Api };

export function createStudentTools(host: HTMLIFrameElement, options: { flat?: boolean; onPoint?: (point: Point2) => void; canDraw?: () => boolean; onError?: (message: string) => void } = {}) {
  let previous: UiReply['ui'] | null = null;
  let hidden = false;
  let paused = 0;
  let measuring = false;
  let camera: Camera | null = null;
  let pending: object | null = null;
  let sending = false;
  let disposed = false;
  let setting: Promise<void> = Promise.resolve();
  const frame = () => host.contentDocument?.getElementById('sc') as HTMLIFrameElement | null;
  const api = () => {
    const sc = (frame()?.contentWindow as ScWindow | null)?.solidcraft;
    if (!sc) throw new Error('SolidCraft is still loading.');
    return sc;
  };
  const cover = host.contentDocument!.createElement('div');
  cover.setAttribute('role', 'application');
  cover.setAttribute('aria-label', options.flat ? '2D sketch view. Click to draw; Shift-drag to pan; scroll to zoom. Home fits the sketch.' : '3D view. Drag to orbit, Shift-drag to pan, scroll to zoom. Home fits the part.');
  cover.tabIndex = 0;
  cover.id = 'shcode-camera-only';
  cover.style.cssText = 'position:absolute;inset:0 0 210px;z-index:5;touch-action:none;cursor:grab;outline-offset:-3px;';
  cover.hidden = true;
  host.contentDocument!.body.append(cover);
  const blockKey = (e: Event) => { if (hidden||paused) { e.preventDefault(); e.stopImmediatePropagation(); } };
  let blockedWindow: Window | null = null;
  function bindKeys() {
    const win = frame()?.contentWindow ?? null;
    if (blockedWindow === win) return;
    for (const type of ['keydown', 'keyup', 'keypress']) blockedWindow?.removeEventListener(type, blockKey, true);
    blockedWindow = win;
    for (const type of ['keydown', 'keyup', 'keypress']) win?.addEventListener(type, blockKey, true);
  }
  async function sendCamera() {
    if (sending) return;
    sending = true;
    try {
      while (pending && hidden) { const next = pending; pending = null; await api().request('ui.camera', next); }
    } catch { /* A trapped/reloading engine is reported by the guarded host. */ }
    finally { sending = false; }
  }
  const updateCamera = (next: Camera) => { camera = next; pending = next; void sendCamera(); };
  let drag: { x: number; y: number; pan: boolean; camera: Camera; moved: boolean; draw: boolean } | null = null;
  cover.addEventListener('pointerdown', e => {
    if (paused||!camera) return;
    cover.focus(); cover.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 1 || e.button === 2, camera: { ...camera, target: [...camera.target] }, moved: false, draw: !!options.flat && !!options.onPoint && (options.canDraw?.() ?? true) && e.button === 0 && !e.shiftKey };
    e.preventDefault();
  });
  cover.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, c = drag.camera;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (drag.draw) return;
    if (drag.pan || options.flat) {
      const scale = c.distance / Math.max(cover.clientHeight, 1);
      const right = [Math.cos(c.yaw), Math.sin(c.yaw), 0];
      const up = [-Math.sin(c.yaw) * Math.sin(c.pitch), Math.cos(c.yaw) * Math.sin(c.pitch), Math.cos(c.pitch)];
      updateCamera({ ...c, target: c.target.map((n, i) => n - dx * scale * right[i] + dy * scale * up[i]) });
    } else updateCamera({ ...c, yaw: c.yaw - dx * .008, pitch: Math.max(-1.55, Math.min(1.55, c.pitch + dy * .008)) });
  });
  const endDrag = () => { drag = null; };
  cover.addEventListener('pointerup', async e => {
    const clicked = drag?.draw && !drag.moved; drag = null;
    if (!clicked || !hidden || disposed) return;
    try {
      const sc = frame(); if (!sc) return;
      const rect = sc.getBoundingClientRect();
      const ui = await api().request('ui.inspect', {}) as UiReply;
      const projected = await api().request('ui.worldToScreen', { points: [[0, 0, 0], [1, 0, 0], [0, 1, 0]] }) as (Point2 | null)[];
      if (!hidden || disposed) return;
      const scale = (ui.viewport[0] + ui.viewport[2]) / rect.width;
      options.onPoint?.(sketchPoint([(e.clientX - rect.left) * scale, (e.clientY - rect.top) * scale], projected));
    } catch (e) { options.onError?.(e instanceof Error ? e.message : 'The sketch point could not be read.'); }
  }); cover.addEventListener('pointercancel', endDrag); cover.addEventListener('lostpointercapture', endDrag);
  cover.addEventListener('contextmenu', e => e.preventDefault());
  cover.addEventListener('wheel', e => {
    e.preventDefault();
    if (!paused&&camera) updateCamera({ ...camera, distance: Math.max(.1, Math.min(1e7, camera.distance * Math.exp(Math.max(-1, Math.min(1, e.deltaY * .002))))) });
  }, { passive: false });
  async function fit() {
    try {
      await api().request('ui.camera', { fit: true });
      camera = (await api().request('ui.inspect', {}) as UiReply).camera;
    } catch (e) { options.onError?.(e instanceof Error ? e.message : 'The sketch or part could not be fitted.'); }
  }
  cover.addEventListener('keydown', e => {
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Home') { void fit(); return; }
    if (paused||!camera) return;
    if (e.key === '+' || e.key === '=') updateCamera({ ...camera, distance: Math.max(.1, camera.distance / 1.15) });
    if (e.key === '-') updateCamera({ ...camera, distance: Math.min(1e7, camera.distance * 1.15) });
    if (options.flat && e.key.startsWith('Arrow')) {
      const step = camera.distance * .03;
      updateCamera({ ...camera, target: [camera.target[0] + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0), camera.target[1] + (e.key === 'ArrowDown' ? -step : e.key === 'ArrowUp' ? step : 0), 0] });
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') updateCamera({ ...camera, yaw: camera.yaw + (e.key === 'ArrowLeft' ? -.1 : .1) });
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') updateCamera({ ...camera, pitch: Math.max(-1.55, Math.min(1.55, camera.pitch + (e.key === 'ArrowUp' ? .1 : -.1))) });
  });
  const clearCrop = () => { frame()?.style.removeProperty('top'); frame()?.style.removeProperty('height'); };
  async function measure() {
    if (!hidden || measuring) return;
    measuring = true;
    try {
      bindKeys();
      // ui.set and iframe resizes report their new settings before egui has
      // rendered the corresponding viewport. Inspect after a complete frame.
      const rendered = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await rendered();
      let reply = await api().request('ui.inspect', {}) as UiReply;
      if (!hidden) return;
      if (reply.ui.layout !== 'compact' || reply.ui.showBrowser || reply.ui.showTimeline || reply.ui.showNavigationBar) {
        await api().request('ui.set', { layout: 'compact', showBrowser: false, showTimeline: false, showNavigationBar: false });
        await rendered();
        reply = await api().request('ui.inspect', {}) as UiReply;
        if (!hidden) return;
      }
      camera = reply.camera;
      const sc = frame(); if (!sc) throw new Error('SolidCraft is still loading.');
      const cut = cadToolbarCrop(reply.viewport, sc.clientWidth, sc.clientHeight);
      const top = `-${cut}px`, height = `calc(100% - 210px + ${cut}px)`;
      if (sc.style.top !== top) sc.style.top = top;
      if (sc.style.height !== height) sc.style.height = height;
    } finally { measuring = false; }
  }
  return {
    measure, fit,
    pauseInput(){
      paused++;cover.hidden=false;bindKeys();drag=null;
      let released=false;
      return ()=>{if(released)return;released=true;paused--;cover.hidden=!hidden&&!paused;};
    },
    setShown(shown: boolean) {
      // Serialize policy changes: a slow earlier On must never override a newer Off.
      const next = setting.catch(() => {}).then(async () => {
      if (disposed) return;
      if (shown && options.flat) throw new Error('This lesson allows sketch tools only.');
      if (shown) {
        // Restore the UI before allowing any direct input.
        if (previous) await api().request('ui.set', previous);
        hidden = false; pending = null; cover.hidden = !paused; clearCrop(); previous = null;
      } else {
        const entering = !hidden;
        if (entering) {
          const { layout, showBrowser, showTimeline, showNavigationBar } = (await api().request('ui.inspect', {}) as UiReply).ui;
          previous = { layout, showBrowser, showTimeline, showNavigationBar };
        }
        hidden = true; cover.hidden = false; bindKeys();
        if (entering) {
          const state=await api().request('ui.inspect',{}) as UiReply & {tool?:unknown;dialog?:unknown};
          if(state.tool||state.dialog)await api().request('ui.key',{key:'Escape'});
        }
        if (options.flat) {
          await api().request('ui.set', { perspective: false });
          await api().request('ui.camera', { yaw: 0, pitch: Math.PI / 2, roll: 0 });
        }
        await measure();
      }
      });
      setting = next;
      return next;
    },
    dispose() {
      disposed = true; hidden = false; pending = null; cover.remove(); clearCrop();
      for (const type of ['keydown', 'keyup', 'keypress']) blockedWindow?.removeEventListener(type, blockKey, true);
    },
  };
}
