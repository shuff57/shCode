import type { Requirement } from '../lib/types';

import LessonNumberLinks, { type SourceHrefs } from './LessonNumberLinks';

export default function RequirementCard({
  req,
  hrefs,
}: {
  req: Requirement;
  // Resolved once by the list above, not here: this card renders per criterion.
  hrefs: SourceHrefs;
}) {
  // Border color plus the visible Passed / Not yet word encode pass/fail — green if passed, red if
  // failed, muted grey if neither (not yet graded / running). Keep the
  // "pass"/"fail" class names so any existing CSS hooks still work.
  const classes = ['requirement', 'mb-4'];
  if (req.status === 'passed') classes.push('pass');
  if (req.status === 'failed') classes.push('fail');

  const borderColor =
    req.status === 'passed' ? '#50fa7b' : req.status === 'failed' ? '#ff5555' : '#44475a';

  const status =
    req.status === 'passed'
      ? { text: 'Passed', icon: '\u2713', color: '#50fa7b' }
      : req.status === 'failed'
        ? { text: 'Not yet', icon: '\u2717', color: '#ff7b7b' }
        : { text: '', icon: '', color: '#8393c4' };

  return (
    <div
      className={classes.join(' ')}
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <h3 className="text-xl">
        {req.title}
        {/* Colour alone said pass/fail; say it in words too. role=status on just
            this word means a Run only announces the cards whose result changed
            (a live region announces text that changes, not the whole card). */}
        <span
          role="status"
          className="req-status"
          style={{ color: status.color, marginLeft: 10, fontSize: 14, fontWeight: 600 }}
        >
          {status.text ? (
            <>
              <span aria-hidden="true">{status.icon} </span>
              {status.text}
            </>
          ) : null}
        </span>
      </h3>
      <p className="text-lg">
        <LessonNumberLinks text={req.description} hrefs={hrefs} />
      </p>
      {req.messages && req.messages.length > 0 && (
        <ul>
          {/* A criterion's failure hint is copied into messages by lib/grader.ts,
              and hints are where most of these lesson pointers actually live, so
              the messages get the same treatment as the description. */}
          {req.messages.map((m, i) => (
            <li key={i}>
              <LessonNumberLinks text={m} hrefs={hrefs} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
