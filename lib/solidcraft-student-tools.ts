// Host-side classroom control for the unmodified pinned canvas UI. When tools
// are off, all direct engine input is covered; only camera requests are sent.
type Camera = { target: number[]; yaw: number; pitch: number; distance: number };
type UiReply = { ui: { layout: string; showBrowser: boolean; showTimeline: boolean; showNavigationBar: boolean }; viewport: [number, number, number, number]; camera: Camera };
type Api = { request(method: string, params: object): Promise<unknown> };
type ScWindow = Window & { solidcraft?: Api };

export function createStudentTools(host: HTMLIFrameElement) {
  let previous: UiReply['ui'] | null = null;
  let hidden = false;
  let measuring = false;
  let camera: Camera | null = null;
  let pending: object | null = null;
  let sending = false;
  const frame = () => host.contentDocument?.getElementById('sc') as HTMLIFrameElement | null;
  const api = () => {
    const sc = (frame()?.contentWindow as ScWindow | null)?.solidcraft;
    if (!sc) throw new Error('SolidCraft is still loading.');
    return sc;
  };
  const cover = host.contentDocument!.createElement('div');
  cover.setAttribute('role', 'application');
  cover.setAttribute('aria-label', '3D view. Drag to orbit, Shift-drag to pan, scroll to zoom. Home fits the part.');
  cover.tabIndex = 0;
  cover.id = 'shcode-camera-only';
  cover.style.cssText = 'position:absolute;inset:0 0 210px;z-index:5;touch-action:none;cursor:grab;outline-offset:-3px;';
  cover.hidden = true;
  host.contentDocument!.body.append(cover);
  const blockKey = (e: Event) => { if (hidden) { e.preventDefault(); e.stopImmediatePropagation(); } };
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
  let drag: { x: number; y: number; pan: boolean; camera: Camera } | null = null;
  cover.addEventListener('pointerdown', e => {
    if (!camera) return;
    cover.focus(); cover.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 1 || e.button === 2, camera: { ...camera, target: [...camera.target] } };
    e.preventDefault();
  });
  cover.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, c = drag.camera;
    if (drag.pan) {
      const scale = c.distance / Math.max(cover.clientHeight, 1);
      const right = [Math.cos(c.yaw), Math.sin(c.yaw), 0];
      const up = [-Math.sin(c.yaw) * Math.sin(c.pitch), Math.cos(c.yaw) * Math.sin(c.pitch), Math.cos(c.pitch)];
      updateCamera({ ...c, target: c.target.map((n, i) => n - dx * scale * right[i] + dy * scale * up[i]) });
    } else updateCamera({ ...c, yaw: c.yaw - dx * .008, pitch: Math.max(-1.55, Math.min(1.55, c.pitch + dy * .008)) });
  });
  const endDrag = () => { drag = null; };
  cover.addEventListener('pointerup', endDrag); cover.addEventListener('pointercancel', endDrag); cover.addEventListener('lostpointercapture', endDrag);
  cover.addEventListener('contextmenu', e => e.preventDefault());
  cover.addEventListener('wheel', e => {
    e.preventDefault();
    if (camera) updateCamera({ ...camera, distance: Math.max(.1, Math.min(1e7, camera.distance * Math.exp(Math.max(-1, Math.min(1, e.deltaY * .002))))) });
  }, { passive: false });
  async function fit() {
    await api().request('ui.camera', { fit: true });
    camera = (await api().request('ui.inspect', {}) as UiReply).camera;
  }
  cover.addEventListener('keydown', e => {
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Home') { void fit(); return; }
    if (!camera) return;
    if (e.key === '+' || e.key === '=') updateCamera({ ...camera, distance: Math.max(.1, camera.distance / 1.15) });
    if (e.key === '-') updateCamera({ ...camera, distance: Math.min(1e7, camera.distance * 1.15) });
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') updateCamera({ ...camera, yaw: camera.yaw + (e.key === 'ArrowLeft' ? -.1 : .1) });
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') updateCamera({ ...camera, pitch: Math.max(-1.55, Math.min(1.55, camera.pitch + (e.key === 'ArrowUp' ? .1 : -.1))) });
  });
  const clearCrop = () => { frame()?.style.removeProperty('top'); frame()?.style.removeProperty('height'); };
  async function measure() {
    if (!hidden || measuring) return;
    measuring = true;
    try {
      bindKeys();
      let reply = await api().request('ui.inspect', {}) as UiReply;
      if (!hidden) return;
      if (reply.ui.layout !== 'compact' || reply.ui.showBrowser || reply.ui.showTimeline || reply.ui.showNavigationBar) {
        await api().request('ui.set', { layout: 'compact', showBrowser: false, showTimeline: false, showNavigationBar: false });
        reply = await api().request('ui.inspect', {}) as UiReply;
        if (!hidden) return;
      }
      camera = reply.camera;
      const sc = frame(); if (!sc) throw new Error('SolidCraft is still loading.');
      const [x, y, width] = reply.viewport;
      const cut = Math.ceil(y * sc.clientWidth / (x + width));
      if (!Number.isFinite(cut) || cut <= 0 || cut > sc.clientHeight * .8) throw new Error('The modelling toolbar could not be measured.');
      const top = `-${cut}px`, height = `calc(100% - 210px + ${cut}px)`;
      if (sc.style.top !== top) sc.style.top = top;
      if (sc.style.height !== height) sc.style.height = height;
    } finally { measuring = false; }
  }
  return {
    measure, fit,
    async setShown(shown: boolean) {
      if (shown) {
        // Restore the UI before allowing any direct input.
        if (previous) await api().request('ui.set', previous);
        hidden = false; pending = null; cover.hidden = true; clearCrop(); previous = null;
      } else {
        if (!hidden) previous = (await api().request('ui.inspect', {}) as UiReply).ui;
        hidden = true; cover.hidden = false; bindKeys();
        await api().request('ui.key', { key: 'Escape' });
        await measure();
      }
    },
    dispose() {
      hidden = false; pending = null; cover.remove(); clearCrop();
      for (const type of ['keydown', 'keyup', 'keypress']) blockedWindow?.removeEventListener(type, blockKey, true);
    },
  };
}
