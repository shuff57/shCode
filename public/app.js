// Monaco + live preview + hardened resizer
// Load Monaco from CDN
require.config({
  paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }
});

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

  // Expose for other scripts (like autograder.js)
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

  // ----- Resizable split logic -----
  const split   = document.getElementById('split');
  const divider = document.getElementById('divider');
  const left    = document.getElementById('editorPane');
  const right   = document.getElementById('previewPane');
  const overlay = document.getElementById('dragOverlay');
  let dragging  = false;
  let rect      = null;
  let rafId     = null;

  function relayoutEditor() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      if (window.editor?.layout) {
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
    overlay.style.display = 'block';
    document.body.style.userSelect = 'none';
    document.body.classList.add('is-resizing');
    try { divider.setPointerCapture(e.pointerId); } catch {}
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
  window.addEventListener('resize', relayoutEditor, false);

  // ----- Sidebar toggle and file explorer -----
  const sidebar = document.getElementById('sidebar');
  const fileList = document.getElementById('fileList');
  const files = {};

  const toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Auto-open sidebar when mouse is near the left edge
  document.addEventListener('mousemove', (e) => {
    if (e.clientX <= 10) {
      sidebar.classList.add('open');
    } else if (!sidebar.matches(':hover')) {
      sidebar.classList.remove('open');
    }
  });

  function addFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      files[file.name] = e.target.result;
      const li = document.createElement('li');
      li.textContent = file.name;
      li.draggable = true;
      li.addEventListener('click', () => {
        editorInstance.setValue(files[file.name]);
      });

      li.addEventListener('dragstart', (ev) => {
        li.classList.add('dragging');
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', file.name);
      });

      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
      });

      li.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        const dragging = fileList.querySelector('.dragging');
        if (dragging && dragging !== li) {
          const rect = li.getBoundingClientRect();
          const next = (ev.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
          fileList.insertBefore(dragging, next ? li.nextSibling : li);
        }
      });

      fileList.appendChild(li);
    };
    reader.readAsText(file);
  }

  sidebar.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  sidebar.addEventListener('drop', (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files;
    [...dropped].forEach(addFile);
  });
});
