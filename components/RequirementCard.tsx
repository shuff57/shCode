import { Requirement } from '../lib/lessons';

export default function RequirementCard({ req }: { req: Requirement }) {
  const classes = ['requirement'];
  if (req.status === 'passed') classes.push('pass');
  if (req.status === 'failed') classes.push('fail');
  const statusChar =
    req.status === 'passed'
      ? '✓'
      : req.status === 'failed'
      ? '✗'
      : req.status === 'running'
      ? '…'
      : '•';
  return (
    <div className={classes.join(' ')} aria-live="polite">
      <h3>{req.title}</h3>
      <p>{req.description}</p>
      <div className="req-status">{statusChar}</div>
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
