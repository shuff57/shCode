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

// ---- Build preview HTML ----
export function buildPreviewHtml(
  fileTree: FileNode[],
  fileContents: Record<string, string> // path -> content
): string {
  const htmlFile = findFileByName(fileTree, 'index.html');
  if (!htmlFile) return '<!DOCTYPE html><!-- index.html not found -->';

  let html = fileContents[htmlFile.path] ?? '';

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

  // Inline JS <script src> tags
  const jsRegex = /<script[^>]*?src=(["'])(.+?\.js)\1[^>]*?>\s*<\/script>/gi;
  html = html.replace(jsRegex, (_match, _quote, path) => {
    const absPath = resolvePath(htmlFile.path, path);
    const jsFile = findFileByPath(fileTree, absPath);
    if (jsFile && fileContents[jsFile.path] !== undefined) {
      return `<script>${fileContents[jsFile.path]}</script>`;
    }
    const byName = findFileByName(fileTree, path.split('/').pop()!);
    if (byName && fileContents[byName.path] !== undefined) {
      return `<script>${fileContents[byName.path]}</script>`;
    }
    return `<!-- Could not resolve: ${path} -->`;
  });

  // Inject console override
  const consoleOverride = `<script>
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
  window.onerror = function(m, s, l, c) {
    send('error', [m + ' (' + l + ':' + c + ')']);
  };
})();
</script>`;

  if (html.includes('</head>')) {
    html = html.replace('</head>', consoleOverride + '</head>');
  } else {
    html = consoleOverride + html;
  }

  // Ensure DOCTYPE
  if (!html.trim().toLowerCase().startsWith('<!doctype')) {
    html = '<!DOCTYPE html>\n' + html;
  }

  return html;
}
