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
      {requirements.map((req) => (
        <RequirementCard key={req.id} req={req} />
      ))}
    </section>
  );
}
