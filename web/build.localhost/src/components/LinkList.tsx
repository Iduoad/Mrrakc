import { Plus, Trash2 } from 'lucide-react';
import { LINK_TYPES, type EventLink } from '../data/schema';
import { FIELD, LABEL } from './fields';

const emptyLink = (): EventLink => ({ url: '', title: '', type: 'website' });

/**
 * An editable list of typed links, matching schema/components/link.json.
 *
 * Used at two levels of an event: links about the event as a whole, and links
 * about one edition. The `type` is picked explicitly rather than guessed from
 * the host, so a draft carries the human's classification straight through.
 */
export default function LinkList({ label, value, compact, onChange }: {
  label: string;
  value: EventLink[];
  /** Tighter layout for the per-edition lists nested inside a card. */
  compact?: boolean;
  onChange: (next: EventLink[]) => void;
}) {
  const patch = (i: number, fields: Partial<EventLink>) =>
    onChange(value.map((l, j) => (j === i ? { ...l, ...fields } : l)));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={`${LABEL} mb-0`}>{label}</span>
        <button
          type="button"
          onClick={() => onChange([...value, emptyLink()])}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-terra transition-colors hover:bg-terra/10"
        >
          <Plus size={12} /> Add link
        </button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-clay px-3 py-2 text-[11px] italic text-stone-400 dark:border-stone-700">
          None yet.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((link, i) => (
            <div
              key={i}
              className={`flex gap-2 ${compact ? '' : 'rounded-xl border border-clay p-2 dark:border-stone-700'}`}
            >
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_minmax(0,14rem)_minmax(0,8rem)]">
                <input
                  className={`${FIELD} font-mono text-xs`}
                  value={link.url}
                  placeholder="https://…"
                  onChange={(e) => patch(i, { url: e.target.value })}
                />
                <input
                  className={FIELD}
                  value={link.title}
                  placeholder="Title"
                  onChange={(e) => patch(i, { title: e.target.value })}
                />
                <select
                  className={FIELD}
                  value={link.type}
                  onChange={(e) => patch(i, { type: e.target.value as EventLink['type'] })}
                >
                  {LINK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                title="Remove link"
                className="h-fit shrink-0 rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
