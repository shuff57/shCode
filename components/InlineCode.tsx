// Lesson text outside the markdown pipeline — quiz questions, step titles, step
// hints — is still AUTHORED with markdown inline code (`typeof null`, `let a = 5;`),
// because that is the convention every reading uses. Rendered as a bare string it
// reaches the student as literal backticks around the one part of the sentence that
// is code, which is exactly backwards.
//
// Returns React nodes rather than html, so there is nothing to sanitize. An odd
// trailing backtick stays literal instead of swallowing the rest of the line.
export function withInlineCode(text: string) {
  const parts = String(text ?? '').split(/`([^`]+)`/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <code
        key={i}
        style={{
          background: '#21222c',
          border: '1px solid #44475a',
          borderRadius: 3,
          padding: '1px 5px',
          fontSize: '0.92em',
          color: '#f1fa8c',
        }}
      >
        {part}
      </code>
    ) : (
      part
    )
  );
}
