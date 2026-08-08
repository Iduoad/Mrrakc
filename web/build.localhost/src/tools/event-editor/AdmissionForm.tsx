import { Plus, Trash2 } from 'lucide-react';
import { FIELD, LABEL } from '../../components/fields';
import { AUDIENCE, EVENT_ADMISSION_MODALITY, type Event } from '../../data/schema';

type Admission = NonNullable<Event['spec']['admission']>;
type Option = Admission['options'][number];

const emptyOption = (): Option => ({
  title: '',
  modality: 'ticket',
  audience: 'all',
  entranceFee: -1,
});

/**
 * `spec.admission.options` — how you get in, one row per way.
 *
 * `entranceFee` is in MAD, and `-1` means "priced but the amount is not
 * recorded", which the schema allows and the dataset uses widely. It is
 * spelled out rather than left as a bare number, because -1 and 0 are easy to
 * mix up and mean opposite things.
 */
export default function AdmissionForm({ value, onChange }: {
  value: Option[];
  onChange: (next: Option[]) => void;
}) {
  const patch = (i: number, fields: Partial<Option>) =>
    onChange(value.map((o, j) => (j === i ? { ...o, ...fields } : o)));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-clay px-4 py-6 text-center text-sm italic text-stone-400 dark:border-stone-700">
          No admission recorded. The whole block is optional — leave it out if you do not know.
        </p>
      )}

      {value.map((option, i) => (
        <div
          key={i}
          className="flex items-end gap-2 rounded-xl border border-clay bg-sand/30 p-3 dark:border-stone-700 dark:bg-stone-800/40"
        >
          <div className="min-w-0 flex-1">
            <label className={LABEL}>Title</label>
            <input
              className={FIELD}
              value={option.title}
              placeholder="Free public stages"
              onChange={(e) => patch(i, { title: e.target.value })}
            />
          </div>
          <div className="w-[8.5rem] shrink-0">
            <label className={LABEL}>Modality</label>
            <select
              className={FIELD}
              value={option.modality}
              onChange={(e) => patch(i, { modality: e.target.value as Option['modality'] })}
            >
              {EVENT_ADMISSION_MODALITY.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="w-[7.5rem] shrink-0">
            <label className={LABEL}>Audience</label>
            <select
              className={FIELD}
              value={option.audience}
              onChange={(e) => patch(i, { audience: e.target.value as Option['audience'] })}
            >
              {AUDIENCE.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="w-[9rem] shrink-0">
            <label className={LABEL}>Fee (MAD)</label>
            <div className="flex gap-1">
              <input
                type="number"
                className={FIELD}
                min={-1}
                value={option.entranceFee}
                disabled={option.entranceFee === -1}
                onChange={(e) => patch(i, { entranceFee: Number(e.target.value) })}
              />
              <button
                type="button"
                onClick={() => patch(i, { entranceFee: option.entranceFee === -1 ? 0 : -1 })}
                title="-1 means the amount is not recorded"
                className={`shrink-0 rounded-lg border px-2 text-[10px] font-bold transition-colors ${
                  option.entranceFee === -1
                    ? 'border-terra bg-terra text-white'
                    : 'border-clay text-stone-400 hover:border-terra dark:border-stone-700'
                }`}
              >
                n/a
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            title="Remove option"
            className="shrink-0 rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, emptyOption()])}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-clay py-2 text-xs font-bold text-terra transition-colors hover:bg-terra/5 dark:border-stone-700"
      >
        <Plus size={14} /> Add admission option
      </button>
    </div>
  );
}
