'use client';
import type { Requirement } from '../lib/types';
import RequirementCard from './RequirementCard';
import { useSourceHrefs } from './LessonNumberLinks';

export default function RequirementsSection({
  requirements,
}: {
  requirements: Requirement[];
}) {
  // Once for the whole list, not once per card: this section renders 764
  // cards across the course, and a lookup each would be 764 of them.
  const hrefs = useSourceHrefs(
    requirements.flatMap((r) => [r.description ?? '', r.hint ?? '']),
  );

  return (
    <section>
      <h2>Requirements to Pass</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {requirements.map((req) => (
          <RequirementCard key={req.id} req={req} hrefs={hrefs} />
        ))}
      </div>
    </section>
  );
}
