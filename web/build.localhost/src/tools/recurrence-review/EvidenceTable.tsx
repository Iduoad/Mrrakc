import { AlertTriangle } from 'lucide-react';
import { monthLabel, type Evidence } from './analyze';

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-500">
      {label}
    </div>
    <div className="font-mono text-sm">{value}</div>
  </div>
);

/** The editions the verdict is drawn from, so the reviewer can judge it. */
export default function EvidenceTable({ evidence: ev }: { evidence: Evidence }) {
  const drift = ev.medianDrift === null ? '—'
    : `${ev.medianDrift > 0 ? '+' : ''}${ev.medianDrift} d/yr`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Held"
          value={ev.heldYears.length ? `${ev.heldYears.length} (${ev.heldYears[0]}–${ev.heldYears.at(-1)})` : '—'}
        />
        <Stat label="Gaps" value={ev.intervals.length ? ev.intervals.join(', ') : '—'} />
        <Stat
          label="Median length"
          value={ev.medianDuration === null ? '—' : `${ev.medianDuration} d`}
        />
        <Stat label="Start drift" value={drift} />
      </div>

      {ev.editions.length === 0 ? (
        <p className="py-6 text-center text-sm italic text-stone-400">No editions recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-clay text-[10px] uppercase tracking-widest text-charcoal-light dark:border-stone-800 dark:text-stone-500">
              <tr>
                <th className="py-2 pr-3 font-bold">Year</th>
                <th className="py-2 pr-3 font-bold">Start</th>
                <th className="py-2 pr-3 font-bold">End</th>
                <th className="py-2 pr-3 font-bold">Days</th>
                <th className="py-2 font-bold">Months</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {ev.editions.map((e, i) => (
                <tr
                  key={`${e.year}-${i}`}
                  className={`border-b border-clay/40 last:border-0 dark:border-stone-800/60 ${
                    e.cancelled ? 'text-stone-400 line-through' : ''
                  }`}
                >
                  <td className="py-1.5 pr-3">{e.year}</td>
                  <td className="py-1.5 pr-3">{e.start?.raw ?? '—'}</td>
                  <td className="py-1.5 pr-3">{e.end?.raw ?? '—'}</td>
                  <td className="py-1.5 pr-3">{e.durationDays ?? '—'}</td>
                  <td className="py-1.5">
                    {e.months.map(monthLabel).join(', ') || '—'}
                    {e.problems.length > 0 && (
                      <span
                        className="ml-2 inline-flex items-center gap-1 font-sans text-red-600"
                        title={e.problems.join('; ')}
                      >
                        <AlertTriangle size={12} /> {e.problems.join('; ')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
