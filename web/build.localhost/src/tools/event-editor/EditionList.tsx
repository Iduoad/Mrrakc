import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import LinkList from '../../components/LinkList';
import ProvincePicker from '../../components/ProvincePicker';
import StringList from '../../components/StringList';
import { FIELD, LABEL, TextArea } from '../../components/fields';
import { EDITION_STATUS, type Edition } from '../../data/schema';
import { PLACE_REF } from './event';

/**
 * `spec.editions[]` — every field the schema defines for an edition.
 *
 * Only `year` is required, deliberately: a record with just a year is honest,
 * a guessed date is not. Dates are free text because the schema accepts
 * `YYYY`, `YYYY-MM` or `YYYY-MM-DD`, and a partial date beats invented
 * precision.
 *
 * `provinces` and `places` override the host ones for a single edition — the
 * year a festival moved city. They stay folded away, since fewer than a fifth
 * of editions in the dataset use them.
 */

const DATE_HINT = 'YYYY, YYYY-MM or YYYY-MM-DD';

function EditionCard({ edition, onChange, onRemove }: {
  edition: Edition;
  onChange: (next: Edition) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<Edition>) => onChange({ ...edition, ...patch });
  const extras = (edition.links?.length ?? 0) + (edition.notes ? 1 : 0)
    + (edition.provinces?.length ?? 0) + (edition.places?.length ?? 0);

  return (
    <div className="rounded-xl border border-clay bg-sand/30 p-3 dark:border-stone-700 dark:bg-stone-800/40">
      <div className="flex items-end gap-2">
        <div className="w-[5.5rem] shrink-0">
          <label className={LABEL}>Year</label>
          <input
            type="number"
            className={FIELD}
            value={edition.year || ''}
            min={1800}
            max={2100}
            onChange={(e) => set({ year: Number(e.target.value) })}
          />
        </div>
        <div className="w-[4.5rem] shrink-0">
          <label className={LABEL}>Nº</label>
          <input
            type="number"
            className={FIELD}
            value={edition.edition ?? ''}
            min={1}
            placeholder="—"
            onChange={(e) => set({
              edition: e.target.value === '' ? undefined : Number(e.target.value),
            })}
          />
        </div>
        <div className="min-w-0 flex-1">
          <label className={LABEL}>Start</label>
          <input
            className={`${FIELD} font-mono text-xs`}
            value={edition.startDate ?? ''}
            placeholder={DATE_HINT}
            onChange={(e) => set({ startDate: e.target.value || undefined })}
          />
        </div>
        <div className="min-w-0 flex-1">
          <label className={LABEL}>End</label>
          <input
            className={`${FIELD} font-mono text-xs`}
            value={edition.endDate ?? ''}
            placeholder={DATE_HINT}
            onChange={(e) => set({ endDate: e.target.value || undefined })}
          />
        </div>
        <div className="w-[7rem] shrink-0">
          <label className={LABEL}>Status</label>
          <select
            className={FIELD}
            value={edition.status ?? ''}
            onChange={(e) => set({
              status: (e.target.value || undefined) as Edition['status'],
            })}
          >
            <option value="">held</option>
            {EDITION_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={onRemove}
          title="Remove edition"
          className="shrink-0 rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 flex items-center gap-1 text-[11px] font-bold text-charcoal-light transition-colors hover:text-terra dark:text-stone-400"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Details{!open && extras > 0 ? ` (${extras})` : ''}
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-clay pt-3 dark:border-stone-700">
          <LinkList
            label="Links for this edition"
            value={edition.links ?? []}
            compact
            onChange={(links) => set({ links })}
          />
          <TextArea
            label="Notes"
            rows={2}
            value={edition.notes ?? ''}
            placeholder="Anything specific to this edition — a cancellation reason, a venue change…"
            onChange={(notes) => set({ notes: notes || undefined })}
          />
          <ProvincePicker
            label="Provinces (only if different from the host)"
            hint="Leave empty to inherit the event's host provinces."
            value={edition.provinces ?? []}
            onChange={(provinces) => set({ provinces: provinces.length ? provinces : undefined })}
          />
          <StringList
            label="Venue places"
            value={edition.places ?? []}
            placeholder="places/<province>/<id>"
            pattern={PLACE_REF}
            hint="Refs into data/places, when the venue exists there."
            onChange={(places) => set({ places: places.length ? places : undefined })}
          />
        </div>
      )}
    </div>
  );
}

export default function EditionList({ value, onChange }: {
  value: Edition[];
  onChange: (next: Edition[]) => void;
}) {
  // A new row defaults to the year after the latest one on the list, which is
  // the direction you fill editions in most of the time.
  const nextYear = value.length
    ? Math.max(...value.map((e) => e.year || 0)) + 1
    : new Date().getFullYear();

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-clay px-4 py-6 text-center text-sm italic text-stone-400 dark:border-stone-700">
          No editions recorded.
        </p>
      )}

      {value.map((edition, i) => (
        <EditionCard
          key={i}
          edition={edition}
          onChange={(next) => onChange(value.map((e, j) => (j === i ? next : e)))}
          onRemove={() => onChange(value.filter((_, j) => j !== i))}
        />
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, { year: nextYear }])}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-clay py-2 text-xs font-bold text-terra transition-colors hover:bg-terra/5 dark:border-stone-700"
      >
        <Plus size={14} /> Add edition
      </button>
    </div>
  );
}
