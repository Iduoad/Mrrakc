import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { PROVINCES } from '../data/schema';
import { FIELD, LABEL } from './fields';

/**
 * Provinces as `province/<slug>` refs. The first one is the primary host, per
 * schema/events.json, so selection order is preserved rather than sorted.
 */
export default function ProvincePicker({ label = 'Host provinces', hint, value, onChange }: {
  label?: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const chosen = new Set(value);
    return PROVINCES
      .filter((p) => p.includes(q) && !chosen.has(`province/${p}`))
      .slice(0, 8);
  }, [query, value]);

  const add = (slug: string) => {
    onChange([...value, `province/${slug}`]);
    setQuery('');
  };

  return (
    <div>
      <label className={LABEL}>{label}</label>

      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((ref, i) => (
            <span
              key={ref}
              className="flex items-center gap-1 rounded-lg bg-terra/10 py-1 pl-2.5 pr-1 text-xs font-bold text-terra"
            >
              {ref.replace('province/', '')}
              {i === 0 && value.length > 1 && (
                <span className="text-[9px] font-normal uppercase opacity-60">primary</span>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== ref))}
                className="rounded p-0.5 transition-colors hover:bg-terra/20"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          className={FIELD}
          value={query}
          placeholder="Type to find a province…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) {
              e.preventDefault();
              add(matches[0]);
            }
          }}
        />
        {matches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-clay bg-white shadow-lg dark:border-stone-700 dark:bg-stone-800">
            {matches.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); add(p); }}
                  className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-terra/10"
                >
                  {p}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1 text-[11px] text-stone-400">
        {hint ?? 'First selected is the primary host.'}
      </p>
    </div>
  );
}
