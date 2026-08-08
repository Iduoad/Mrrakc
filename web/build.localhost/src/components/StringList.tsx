import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { FIELD, LABEL } from './fields';

/**
 * A list of plain strings — `metadata.tags`, `spec.comments`, the `places/…`
 * refs. Two shapes for two very different lengths of string:
 *
 * - `chips` (default): short values entered one at a time, shown inline.
 * - rows: one full-width input per value, for refs and sentences.
 *
 * `pattern` marks values the schema would reject, without blocking the edit —
 * a half-typed ref should not look like an error while you are typing it.
 */
export default function StringList({
  label, value, placeholder, hint, pattern, chips, multiline, onChange,
}: {
  label: string;
  value: string[];
  placeholder?: string;
  hint?: string;
  pattern?: RegExp;
  chips?: boolean;
  multiline?: boolean;
  onChange: (next: string[]) => void;
}) {
  const [entry, setEntry] = useState('');

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setEntry('');
  };

  const header = (
    <div className="mb-1 flex items-center justify-between">
      <span className={`${LABEL} mb-0`}>{label}</span>
      {!chips && (
        <button
          type="button"
          onClick={() => onChange([...value, ''])}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-terra transition-colors hover:bg-terra/10"
        >
          <Plus size={12} /> Add
        </button>
      )}
    </div>
  );

  if (chips) {
    return (
      <div>
        {header}
        {value.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {value.map((v) => (
              <span
                key={v}
                className="flex items-center gap-1 rounded-lg bg-clay/50 py-1 pl-2.5 pr-1 text-xs font-bold text-charcoal-light dark:bg-stone-800 dark:text-stone-300"
              >
                {v}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x !== v))}
                  className="rounded p-0.5 transition-colors hover:bg-clay"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          className={FIELD}
          value={entry}
          placeholder={placeholder}
          onChange={(e) => setEntry(e.target.value)}
          onBlur={() => add(entry)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(entry);
            }
          }}
        />
        {hint && <p className="mt-1 text-[11px] text-stone-400">{hint}</p>}
      </div>
    );
  }

  return (
    <div>
      {header}
      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-clay px-3 py-2 text-[11px] italic text-stone-400 dark:border-stone-700">
          None.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((v, i) => {
            const bad = !!pattern && !!v.trim() && !pattern.test(v.trim());
            const set = (next: string) =>
              onChange(value.map((x, j) => (j === i ? next : x)));
            return (
              <div key={i} className="flex gap-2">
                {multiline ? (
                  <textarea
                    className={`${FIELD} min-w-0 flex-1 resize-y leading-relaxed`}
                    rows={2}
                    value={v}
                    placeholder={placeholder}
                    onChange={(e) => set(e.target.value)}
                  />
                ) : (
                  <input
                    className={`${FIELD} min-w-0 flex-1 font-mono text-xs ${bad ? 'border-amber-400' : ''}`}
                    value={v}
                    placeholder={placeholder}
                    onChange={(e) => set(e.target.value)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="h-fit shrink-0 rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {hint && <p className="mt-1 text-[11px] text-stone-400">{hint}</p>}
    </div>
  );
}
