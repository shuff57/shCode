// Post-processes slidev-built HTML so the decks don't depend on Google Fonts
// (which is blocked by some school filters). Copies self-hosted Nunito Sans
// and Fira Code woff2 files from @fontsource/* into public/slides/_fonts/,
// writes a single fonts.css, then strips the external <link> and injects a
// <link> to the local stylesheet in every public/slides/**/{index,404}.html.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const slidesRoot = path.join(root, 'public', 'slides');
const fontsOutDir = path.join(slidesRoot, '_fonts');
const FONTS_HREF = '/slides/_fonts/fonts.css';

const FONTS = [
  { family: 'Nunito Sans', pkg: 'nunito-sans', weights: [400, 600] },
  { family: 'Fira Code',   pkg: 'fira-code',   weights: [400, 600] },
];

async function copyFonts() {
  await fs.mkdir(fontsOutDir, { recursive: true });
  const faces = [];
  for (const { family, pkg, weights } of FONTS) {
    for (const weight of weights) {
      const src = path.join(root, 'node_modules', '@fontsource', pkg, 'files', `${pkg}-latin-${weight}-normal.woff2`);
      const dstName = `${pkg}-${weight}.woff2`;
      await fs.copyFile(src, path.join(fontsOutDir, dstName));
      faces.push(
        `@font-face {\n` +
        `  font-family: '${family}';\n` +
        `  font-style: normal;\n` +
        `  font-weight: ${weight};\n` +
        `  font-display: swap;\n` +
        `  src: url('./${dstName}') format('woff2');\n` +
        `}`
      );
    }
  }
  await fs.writeFile(path.join(fontsOutDir, 'fonts.css'), faces.join('\n\n') + '\n');
}

const FONTS_LINK_RE = /\s*<link[^>]+href="https:\/\/fonts\.googleapis\.com\/[^"]*"[^>]*>/g;
const LOCAL_LINK = `<link rel="stylesheet" href="${FONTS_HREF}">`;

async function walkHtml(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === '_fonts') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkHtml(full)));
    else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

async function patchHtml(file) {
  const src = await fs.readFile(file, 'utf8');
  let next = src.replace(FONTS_LINK_RE, '');
  if (!next.includes(FONTS_HREF)) {
    next = next.replace('</head>', `  ${LOCAL_LINK}\n</head>`);
  }
  if (next !== src) {
    await fs.writeFile(file, next);
    console.log(`patched: ${path.relative(slidesRoot, file)}`);
    return true;
  }
  return false;
}

await copyFonts();
const htmlFiles = await walkHtml(slidesRoot);
let patched = 0;
for (const f of htmlFiles) if (await patchHtml(f)) patched++;
console.log(`strip-slide-externals: ${htmlFiles.length} html files, ${patched} patched; fonts in ${path.relative(root, fontsOutDir)}`);
