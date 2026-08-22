import type { FileNode } from './types';

// ---- Find file by name recursively ----
function findFileByName(nodes: FileNode[], name: string): FileNode | null {
  for (const item of nodes) {
    if (item.type === 'file' && item.name.toLowerCase() === name.toLowerCase()) {
      return item;
    }
    if (item.type === 'folder' && item.children) {
      const found = findFileByName(item.children, name);
      if (found) return found;
    }
  }
  return null;
}

// ---- Find file by absolute path from root ----
function findFileByPath(nodes: FileNode[], absolutePath: string): FileNode | null {
  const segments = absolutePath.split('/').filter((p) => p.length > 0);
  let current: FileNode[] = nodes;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const match = current.find((n) => n.name === seg);
    if (!match) return null;
    if (i === segments.length - 1 && match.type === 'file') return match;
    if (match.type === 'folder' && match.children) current = match.children;
    else return null;
  }
  return null;
}

// ---- Resolve relative path ----
function resolvePath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/')) return relativePath;
  const baseSegments = basePath.split('/').filter((p) => p.length > 0);
  baseSegments.pop(); // remove filename
  for (const segment of relativePath.split('/')) {
    if (segment === '..') baseSegments.pop();
    else if (segment !== '.' && segment !== '') baseSegments.push(segment);
  }
  return '/' + baseSegments.join('/');
}

// Shared error/console reporter. Reads window.__previewSources (a map of
// filename -> source string) installed before student scripts run, so
// thrown errors can be reported with the offending file, line, col, and
// the source-line snippet. Sends both the legacy string-only
// 'preview-console' message and a structured 'preview-error' message.
const REPORTER_SCRIPT = `<script>
(function() {
  var send = function(type, args) {
    window.parent.postMessage({ source: 'preview-console', type: type, args: args }, '*');
  };
  ['log','warn','error','info'].forEach(function(t) {
    var fn = console[t];
    console[t] = function() {
      var a = Array.prototype.slice.call(arguments);
      send(t, a);
      fn.apply(console, a);
    };
  });
  function parseStudentFrame(stack) {
    if (!stack) return null;
    var sources = window.__previewSources || {};
    var lines = String(stack).split('\\n');
    var rx = /([A-Za-z_][\\w./-]*\\.js):(\\d+):(\\d+)/;
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(rx);
      if (m && Object.prototype.hasOwnProperty.call(sources, m[1])) {
        return { file: m[1], line: parseInt(m[2], 10), col: parseInt(m[3], 10) };
      }
    }
    return null;
  }
  function lineSnippet(file, line) {
    var src = (window.__previewSources || {})[file];
    if (!src || !line) return '';
    var arr = src.split('\\n');
    return (arr[line - 1] || '').replace(/^\\s+/, '').slice(0, 200);
  }
  function reportError(err, fallbackMsg, fbFile, fbLine, fbCol) {
    var loc = parseStudentFrame(err && err.stack);
    if (!loc && fbFile && (window.__previewSources || {})[fbFile]) {
      loc = { file: fbFile, line: fbLine || 0, col: fbCol || 0 };
    }
    var name = (err && err.name) || 'Error';
    var msg = (err && err.message) || fallbackMsg || String(err);
    var file = loc ? loc.file : null;
    var line = loc ? loc.line : null;
    var col = loc ? loc.col : null;
    try {
      window.parent.postMessage({
        source: 'preview-error',
        error: { name: name, message: msg, file: file, line: line, col: col, snippet: file ? lineSnippet(file, line) : '' }
      }, '*');
    } catch (e) {}
    var locStr = file ? file + ':' + line + (col ? ':' + col : '') : '';
    send('error', [name + ': ' + msg + (locStr ? '  (' + locStr + ')' : '')]);
  }
  window.addEventListener('error', function(e) {
    reportError(e.error, e.message, e.filename, e.lineno, e.colno);
  });
  window.addEventListener('unhandledrejection', function(e) {
    var r = e.reason;
    var err = (r && r.stack) ? r : new Error(r && r.message ? r.message : String(r));
    reportError(err, 'Unhandled promise rejection');
  });
})();
</script>`;

// ---- Build preview HTML ----
export function buildPreviewHtml(
  fileTree: FileNode[],
  fileContents: Record<string, string> // path -> content
): string {
  const htmlFile = findFileByName(fileTree, 'index.html');
  if (!htmlFile) return '<!DOCTYPE html><!-- index.html not found -->';

  let html = fileContents[htmlFile.path] ?? '';

  // Track inlined JS so the error handler can map stack frames back to source.
  const inlinedSources: Record<string, string> = {};

  // Inline CSS <link> tags
  const cssRegex = /<link[^>]*?href=(["'])(.+?\.css)\1[^>]*?\/?>/gi;
  html = html.replace(cssRegex, (_match, _quote, path) => {
    const absPath = resolvePath(htmlFile.path, path);
    const cssFile = findFileByPath(fileTree, absPath);
    if (cssFile && fileContents[cssFile.path] !== undefined) {
      return `<style>${fileContents[cssFile.path]}</style>`;
    }
    // Fallback: try by name
    const byName = findFileByName(fileTree, path.split('/').pop()!);
    if (byName && fileContents[byName.path] !== undefined) {
      return `<style>${fileContents[byName.path]}</style>`;
    }
    return `<!-- Could not resolve: ${path} -->`;
  });

  // Inline JS <script src> tags. Each inlined script gets a `//# sourceURL`
  // pragma so V8 attributes errors to "<filename>" with line numbers relative
  // to the student's source.
  const jsRegex = /<script[^>]*?src=(["'])(.+?\.js)\1[^>]*?>\s*<\/script>/gi;
  html = html.replace(jsRegex, (_match, _quote, path) => {
    const absPath = resolvePath(htmlFile.path, path);
    const jsFile = findFileByPath(fileTree, absPath);
    let resolved = jsFile && fileContents[jsFile.path] !== undefined ? fileContents[jsFile.path] : null;
    if (resolved == null) {
      const byName = findFileByName(fileTree, path.split('/').pop()!);
      if (byName && fileContents[byName.path] !== undefined) {
        resolved = fileContents[byName.path];
      }
    }
    if (resolved == null) return `<!-- Could not resolve: ${path} -->`;
    const label = path.split('/').pop() || path;
    inlinedSources[label] = resolved;
    return `<script>${resolved}\n//# sourceURL=${label}\n</script>`;
  });

  const sourcesInit = `<script>window.__previewSources = ${JSON.stringify(inlinedSources)};</script>`;
  const headInjection = sourcesInit + REPORTER_SCRIPT;

  if (html.includes('</head>')) {
    html = html.replace('</head>', headInjection + '</head>');
  } else {
    html = headInjection + html;
  }

  // Ensure DOCTYPE
  if (!html.trim().toLowerCase().startsWith('<!doctype')) {
    html = '<!DOCTYPE html>\n' + html;
  }

  return html;
}
