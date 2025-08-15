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
    <section className="p-4">
      <div
        id="requirementsSummary"
        aria-live="polite"
        className="mb-2 flex justify-between items-center"
      >
        <span>
          {summary.passed}/{summary.total} passed
        </span>
        <button onClick={onRerun} className="px-2 py-1 border rounded">
          Re-run tests
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {requirements.map((req) => (
          <RequirementCard key={req.id} req={req} />
        ))}
      </div>
    </section>
  );
}
