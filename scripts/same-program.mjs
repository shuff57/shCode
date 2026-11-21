// Do two JavaScript files mean the same program? Used by scripts/make-format-variants.py so that a style
// variant labelled "every card met" really does what the reference does.
//
//   node scripts/same-program.mjs <reference.js> <variant.js>     exit 0 = same program, 1 = different, 2 = cannot parse
//
// Both are parsed with TypeScript's parser and reduced to a dump of node kinds, names and literal VALUES, so
// quote style, spacing, line breaks and semicolons do not count, but meaning does: a line-end `;` removed before
// a line starting `[` or `(` joins two statements (a different tree), and a tab put inside a multi-line template
// literal changes the string (a different value). A block holding exactly one statement is read as that
// statement, so `if (a) { b(); }` and `if (a) b();` are the same.

import { readFileSync } from 'fs';
import ts from 'typescript';

function dump(code) {
  const sf = ts.createSourceFile('x.js', code, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
  if (sf.parseDiagnostics?.length) return null;
  const out = [];
  const visit = (node) => {
    if (ts.isBlock(node) && node.statements.length === 1 && node.parent && !ts.isFunctionLike(node.parent)
      && !ts.isTryStatement(node.parent) && !ts.isCatchClause(node.parent)) {
      visit(node.statements[0]);
      return;
    }
    out.push(ts.SyntaxKind[node.kind]);
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) out.push('=' + node.text);
    else if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isBigIntLiteral(node) || ts.isRegularExpressionLiteral(node)
      || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      out.push('=' + JSON.stringify(node.text));
    } else if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) out.push('=' + ts.SyntaxKind[node.operator]);
    else if (ts.isVariableDeclarationList(node)) out.push('=' + (node.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)));
    out.push('(');
    ts.forEachChild(node, visit);
    out.push(')');
  };
  // setParentNodes is off for speed, so give every node its parent on the way down.
  const link = (node) => { ts.forEachChild(node, (c) => { c.parent = node; link(c); }); };
  link(sf);
  visit(sf);
  return out.join(' ');
}

const [a, b] = process.argv.slice(2).map((p) => dump(readFileSync(p, 'utf8')));
if (a === null || b === null) process.exit(2);
process.exit(a === b ? 0 : 1);
