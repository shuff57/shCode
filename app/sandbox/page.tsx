import DocsSandbox from '../docs/q5play/[section]/DocsSandbox';

const STARTER_CODE = `// q5play sandbox — try it out!

function setup() {
  new Canvas(400, 400);
}

function draw() {
  background(40, 42, 54);
  fill(80, 250, 123);
  noStroke();
  circle(mouseX, mouseY, 40);
}
`;

export default function SandboxPage() {
  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: '1.6rem' }}>Sandbox</h1>
      <p style={{ marginTop: 0, opacity: 0.75, fontSize: '0.9rem' }}>
        A blank q5play canvas to try out ideas. Edit on the left, hit Run to see results.
      </p>
      <DocsSandbox initialCode={STARTER_CODE} />
    </div>
  );
}
