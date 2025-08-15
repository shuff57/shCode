// Monaco + live preview + hardened resizer
// Load Monaco from CDN
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
require(['vs/editor/editor.main'], function () {
  const starterCode = `<h1>Hello from Camperbot!</h1>

<heading2>About</heading2>

<pp>My name is Camperbot and I love learning new things.</pp>

<h3>Background and Interests<h3/>
<pp>I enjoy solving puzzles.</pp>`;

  const editorInstance = monaco.editor.create(document.getElementById('editor'), {
    value: starterCode,
    language: 'html',
    theme: 'vs-dark',
    fontSize: 14,
    automaticLayout: true
  });

  // Expose for layout calls
  window.editor = editorInstance;

  const previewFrame = document.getElementById('preview');

  function updatePreview() {
    const htmlContent = editorInstance.getValue();
    const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
  }

  // Initial render + live update
  editorInstance.onDidChangeModelContent(updatePreview);
  updatePreview();

  // ----- Resizable split logic (hardened + bigger handle) -----
  const split        = document.getElementById('split');
  const divider      = document.getElementById('divider');
  const left         = document.getElementById('editorPane');
  const right        = document.getElementById('previewPane');
  const overlay      = document.getElementById('dragOverlay');
  let dragging = false;
  let rect = null;
  let rafId = null;

  function relayoutEditor() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      if (window.editor && typeof window.editor.layout === 'function') {
        window.editor.layout();
      }
      rafId = null;
    });
  }

  function setPositions(clientX) {
    if (!rect) rect = split.getBoundingClientRect();
    const min = 220;
    const max = rect.width - 220;
    let x = clientX - rect.left;
    x = Math.max(min, Math.min(max, x));
    const leftPct = (x / rect.width) * 100;
    left.style.flex  = `0 0 ${leftPct}%`;
    right.style.flex = `0 0 ${100 - leftPct}%`;
    relayoutEditor();
  }

  function onMove(e) {
    if (!dragging) return;
    setPositions(e.clientX);
    e.preventDefault();
  }

  function stopDrag() {
    if (!dragging) return;
    dragging = false;
    overlay.style.display = 'none';
    document.body.style.userSelect = '';
    document.body.classList.remove('is-resizing');
    window.removeEventListener('pointermove', onMove, false);
    window.removeEventListener('pointerup', onUp, false);
    window.removeEventListener('pointercancel', onCancel, false);
    window.removeEventListener('blur', onWindowBlur, false);
    document.removeEventListener('visibilitychange', onVisChange, false);
  }

  function onUp(e) {
    try { divider.releasePointerCapture(e.pointerId); } catch {}
    stopDrag();
  }
  function onCancel() { stopDrag(); }
  function onWindowBlur() { stopDrag(); }
  function onVisChange() { if (document.hidden) stopDrag(); }

  divider.addEventListener('pointerdown', (e) => {
    dragging = true;
    rect = split.getBoundingClientRect();
    overlay.style.display = 'block';            // block iframe events
    document.body.style.userSelect = 'none';
    document.body.classList.add('is-resizing');
    try { divider.setPointerCapture(e.pointerId); } catch {}
    // Listen on window so we keep getting events even if cursor leaves the container
    window.addEventListener('pointermove', onMove, false);
    window.addEventListener('pointerup', onUp, false);
    window.addEventListener('pointercancel', onCancel, false);
    window.addEventListener('blur', onWindowBlur, false);
    document.addEventListener('visibilitychange', onVisChange, false);
    e.preventDefault();
  }, false);

  // Keyboard resizing (accessible)
  divider.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 40 : 10;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      rect = split.getBoundingClientRect();
      const currentLeft = left.getBoundingClientRect().width || rect.width / 2;
      const next = currentLeft + (e.key === 'ArrowRight' ? step : -step);
      setPositions(rect.left + next);
      e.preventDefault();
    }
  }, false);

  // Keep Monaco crisp on window resize
  window.addEventListener('resize', () => relayoutEditor(), false);
});
