'use client';
import type { Requirement } from '../lib/types';
import RequirementCard from './RequirementCard';

export default function RequirementsSection({
  requirements,
}: {
  requirements: Requirement[];
}) {
  return (
    <section>
      <h2>Requirements to Pass</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {requirements.map((req) => (
          <RequirementCard key={req.id} req={req} />
        ))}
      </div>
    </section>
  );
}
