import { Requirement } from '../lib/lessons';

const statusStyles: Record<string, string> = {
  passed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  running: 'bg-indigo-100 text-indigo-800',
  pending: 'bg-gray-100 text-gray-800',
};

export default function RequirementCard({ req }: { req: Requirement }) {
  return (
    <div className="p-2 border rounded relative" aria-live="polite">
      <div className={`absolute top-1 right-1 text-xs px-1 rounded ${statusStyles[req.status]}`}>
        {req.status === 'passed'
          ? '✓'
          : req.status === 'failed'
          ? '✗'
          : req.status === 'running'
          ? '…'
          : '•'}
      </div>
      <h4 className="font-semibold">{req.title}</h4>
      <p className="text-sm">{req.description}</p>
      {req.messages && req.messages.length > 0 && (
        <ul className="mt-1 text-sm text-red-600 list-disc ml-4">
          {req.messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
