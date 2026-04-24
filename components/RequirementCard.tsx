import type { Requirement } from '../lib/types';

export default function RequirementCard({ req }: { req: Requirement }) {
  // Border color alone encodes pass/fail — green if passed, red if
  // failed, muted grey if neither (not yet graded / running). Keep the
  // "pass"/"fail" class names so any existing CSS hooks still work.
  const classes = ['requirement', 'mb-4'];
  if (req.status === 'passed') classes.push('pass');
  if (req.status === 'failed') classes.push('fail');

  const borderColor =
    req.status === 'passed' ? '#50fa7b' : req.status === 'failed' ? '#ff5555' : '#44475a';

  return (
    <div
      className={classes.join(' ')}
      aria-live="polite"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <h3 className="text-xl">{req.title}</h3>
      <p className="text-lg">{req.description}</p>
      {req.messages && req.messages.length > 0 && (
        <ul>
          {req.messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
