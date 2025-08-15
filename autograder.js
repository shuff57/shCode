(function () {
  'use strict';

  const preview = document.getElementById('preview');
  const reqCards = Array.from(document.querySelectorAll('.requirement'));

  // Ensure a status badge exists on every requirement card
  reqCards.forEach((card) => {
    if (!card.querySelector('.req-status')) {
      const s = document.createElement('span');
      s.className = 'req-status';
      s.textContent = '…';
      card.appendChild(s);
    }
  });

  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const getPreviewDoc = () =>
    preview && (preview.contentDocument || preview.contentWindow?.document);

  // Render "Pass/Fail" with Lucide if available; otherwise show ✓/✗.
  function renderStatus(badge, ok) {
    const iconName = ok ? 'check-circle' : 'x-circle';
    const text = ok ? ' Pass' : ' Fail';

    // Prefer direct SVG if present
    const L = window.lucide;
    if (L) {
      // Strategy 1: icons[name].toSvg()
      const iconObj = L.icons && L.icons[iconName];
      if (iconObj && typeof iconObj.toSvg === 'function') {
        const svg = iconObj.toSvg({ class: 'req-icon', width: 18, height: 18 });
        badge.innerHTML = svg + text;
        return;
      }

      // Strategy 2: createIcons() using <i data-lucide="...">
      if (typeof L.createIcons === 'function') {
        badge.innerHTML = `<i data-lucide="${iconName}" class="req-icon" width="18" height="18"></i>${text}`;
        // Scope the replacement to just this badge for speed
        L.createIcons(
          { attrs: { width: 18, height: 18, class: 'req-icon' }, nameAttr: 'data-lucide' },
          badge
        );
        return;
      }
    }

    // Fallback: plain text
    badge.textContent = (ok ? '✓' : '✗') + text;
  }

  function gradeOnce() {
    const doc = getPreviewDoc();
    if (!doc || !doc.body) return;

    const q = (sel) => Array.from(doc.body.querySelectorAll(sel));

    const h1s = q('h1');
    const h2s = q('h2');
    const h3s = q('h3');
    const ps  = q('p');
    const allInsideBody = q('*');

    const hasText = (nodes, text) => nodes.some(el => norm(el.textContent) === text);

    const results = [
      /* 1 */ h1s.length === 1,
      /* 2 */ hasText(h1s, 'Hello from Camperbot!'),
      /* 3 */ h2s.length === 1,
      /* 4 */ hasText(h2s, 'About'),
      /* 5 */ hasText(ps, 'My name is Camperbot and I love learning new things.'),
      /* 6 */ hasText(ps, 'I enjoy solving puzzles.'),
      /* 7 */ ps.length === 2,
      /* 8 */ h3s.length === 1,
      /* 9 */ hasText(h3s, 'Background and Interests'),
      /* 10 */ allInsideBody.length === 5
    ];

    results.forEach((ok, i) => {
      const card = reqCards[i];
      if (!card) return;
      card.classList.toggle('pass', !!ok);
      card.classList.toggle('fail', !ok);
      const badge = card.querySelector('.req-status');
      if (badge) renderStatus(badge, ok);
    });
  }

  // Attach to Monaco editor changes
  function attachToEditor() {
    if (!window.editor || typeof window.editor.onDidChangeModelContent !== 'function') return false;
    window.editor.onDidChangeModelContent(() => setTimeout(gradeOnce, 0));
    setTimeout(gradeOnce, 50); // initial grade
    return true;
  }

  // Re-grade when preview reloads
  preview?.addEventListener('load', () => setTimeout(gradeOnce, 0));

  // Keep trying until Monaco is ready
  const editorWait = setInterval(() => {
    if (attachToEditor()) clearInterval(editorWait);
  }, 100);

  // If Lucide loads after us, “upgrade” badges to SVG automatically
  const lucideWait = setInterval(() => {
    if (window.lucide && (window.lucide.icons || window.lucide.createIcons)) {
      clearInterval(lucideWait);
      setTimeout(gradeOnce, 0);
    }
  }, 200);

  // Re-grade on layout changes
  window.addEventListener('resize', () => setTimeout(gradeOnce, 0));
})();
