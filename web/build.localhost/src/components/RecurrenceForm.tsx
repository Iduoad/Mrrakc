import {
  OBSERVANCES,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_PARTS,
  RECURRENCE_TYPES,
  SEASONS,
} from '../data/schema';
import { MONTH_NAMES, pruneToType, type Recurrence } from '../data/recurrence';

const FIELD = 'w-full rounded-lg border border-clay bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-terra dark:border-stone-700 dark:bg-stone-800';
const LABEL = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-500';

// Fields carrying a finding get a ring so the form and the findings list line up.
const flagged = (on: boolean) => (on ? 'rounded-xl ring-2 ring-amber-400/60 p-2 -m-2' : '');

function Select<T extends string>({
  label, value, options, optional, onChange, highlight,
}: {
  label: string;
  value: T | undefined;
  options: readonly T[];
  optional?: boolean;
  onChange: (v: T | undefined) => void;
  highlight?: boolean;
}) {
  return (
    <div className={flagged(!!highlight)}>
      <label className={LABEL}>{label}</label>
      <select
        className={FIELD}
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
      >
        {optional && <option value="">— not set —</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function NumberField({
  label, value, min, max, placeholder, onChange, highlight,
}: {
  label: string;
  value: number | undefined;
  min?: number;
  max?: number;
  placeholder?: string;
  onChange: (v: number | undefined) => void;
  highlight?: boolean;
}) {
  return (
    <div className={flagged(!!highlight)}>
      <label className={LABEL}>{label}</label>
      <input
        type="number"
        className={FIELD}
        value={value ?? ''}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </div>
  );
}

/**
 * `spec.recurrence` as a form, showing only the branch that the selected
 * calendar type actually uses.
 *
 * Shared: Recurrence Review edits a stored recurrence with `flaggedFields`
 * ringing the fields its findings point at; New Event authors one from scratch
 * and passes nothing.
 */
export default function RecurrenceForm({
  value, onChange, flaggedFields,
}: {
  value: Recurrence;
  onChange: (next: Recurrence) => void;
  flaggedFields?: Set<string>;
}) {
  const set = (patch: Partial<Recurrence>) => onChange({ ...value, ...patch });
  const hit = (field: string) => !!flaggedFields?.has(field);

  // Changing the calendar type rebuilds the record around the new branch, so
  // the old branch's fields are dropped rather than merely hidden.
  const setType = (type: Recurrence['type']) => onChange(pruneToType(value, type));

  const toggleMonth = (month: number) => {
    const current = value.months ?? [];
    const next = current.includes(month)
      ? current.filter((m) => m !== month)
      : [...current, month].sort((a, b) => a - b);
    set({ months: next.length ? next : undefined });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Frequency" value={value.frequency} options={RECURRENCE_FREQUENCIES}
          onChange={(v) => v && set({ frequency: v })} highlight={hit('frequency')}
        />
        <Select
          label="Calendar type" value={value.type} options={RECURRENCE_TYPES}
          onChange={(v) => v && setType(v)} highlight={hit('type')}
        />
      </div>

      {value.type === 'gregorian' && (
        <>
          <div className={flagged(hit('months'))}>
            <label className={LABEL}>Months</label>
            <div className="grid grid-cols-6 gap-1">
              {MONTH_NAMES.map((name, i) => {
                const month = i + 1;
                const on = value.months?.includes(month);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleMonth(month)}
                    className={`rounded-lg border px-1 py-1.5 text-xs font-bold transition-colors ${
                      on
                        ? 'border-terra bg-terra text-white'
                        : 'border-clay text-charcoal-light hover:border-terra dark:border-stone-700 dark:text-stone-400'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
          <Select
            label="Part of month" value={value.part} options={RECURRENCE_PARTS} optional
            onChange={(v) => set({ part: v })} highlight={hit('part')}
          />
        </>
      )}

      {value.type === 'hijri' && (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Hijri month" value={value.hijriMonth} min={1} max={12}
            onChange={(v) => set({ hijriMonth: v })} highlight={hit('hijriMonth')}
          />
          <NumberField
            label="Hijri day" value={value.hijriDay} min={1} max={30}
            onChange={(v) => set({ hijriDay: v })} highlight={hit('hijriDay')}
          />
          <div className="col-span-2">
            <Select
              label="Observance" value={value.observance} options={OBSERVANCES} optional
              onChange={(v) => set({ observance: v })} highlight={hit('observance')}
            />
          </div>
        </div>
      )}

      {value.type === 'seasonal' && (
        <Select
          label="Season" value={value.season} options={SEASONS} optional
          onChange={(v) => set({ season: v })} highlight={hit('season')}
        />
      )}

      <NumberField
        label="Typical duration (days)" value={value.typicalDurationDays} min={1}
        placeholder="not set"
        onChange={(v) => set({ typicalDurationDays: v })} highlight={hit('typicalDurationDays')}
      />

      <div className={flagged(hit('note'))}>
        <label className={LABEL}>Note</label>
        <textarea
          className={`${FIELD} min-h-[80px] resize-y leading-relaxed`}
          value={value.note ?? ''}
          placeholder="Free-text clarification, e.g. “last two weeks of July”"
          onChange={(e) => set({ note: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
