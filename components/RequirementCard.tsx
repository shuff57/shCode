import { Requirement } from '../lib/lessons';
import { CircleCheck, CircleX, Circle, Loader2 } from 'lucide-react';

export default function RequirementCard({ req }: { req: Requirement }) {
  const classes = ['requirement', 'mb-4'];
  if (req.status === 'passed') classes.push('pass');
  if (req.status === 'failed') classes.push('fail');

  const statusIcon =
    req.status === 'passed' ? (
      <CircleCheck className="text-green-500" />
    ) : req.status === 'failed' ? (
      <CircleX className="text-red-500" />
    ) : req.status === 'running' ? (
      <Loader2 className="animate-spin" />
    ) : (
      <Circle />
    );

  return (
    <div className={classes.join(' ')} aria-live="polite">
      <h3 className="text-xl">{req.title}</h3>
      <p className="text-lg">{req.description}</p>
      <div className="req-status">{statusIcon}</div>
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
