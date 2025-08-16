'use client';
import { Requirement } from '../lib/lessons';
import RequirementCard from './RequirementCard';

export default function RequirementsSection({
  requirements,
  onRerun,
  summary,
}: {
  requirements: Requirement[];
  onRerun: () => void;
  summary: { passed: number; total: number };
}) {
  return (
    <section>
      <h2>Requirements to Pass</h2>
      <div id="requirementsSummary" aria-live="polite">
        <span>
          {summary.passed}/{summary.total} passed
        </span>
        <button onClick={onRerun}>Re-run tests</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requirements.map((req) => (
          <RequirementCard key={req.id} req={req} />
        ))}
      </div>
    </section>
  );
}
