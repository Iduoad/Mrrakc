import type { ReactNode } from 'react';

/**
 * The plain form controls the event tools share. Deliberately thin: a label, an
 * input, and the app's field styling — anything smarter belongs in the tool.
 */

export const FIELD = 'w-full rounded-lg border border-clay bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-terra dark:border-stone-700 dark:bg-stone-800';
export const LABEL = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-charcoal-light dark:text-stone-500';

export function Field({ label, hint, children }: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className={LABEL}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] leading-snug text-stone-400">{hint}</p>}
    </div>
  );
}

export function TextInput({ label, value, placeholder, hint, mono, onChange }: {
  label: string;
  value: string;
  placeholder?: string;
  hint?: ReactNode;
  mono?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className={`${FIELD} ${mono ? 'font-mono' : ''}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({ label, value, placeholder, hint, rows = 3, onChange }: {
  label: string;
  value: string;
  placeholder?: string;
  hint?: ReactNode;
  rows?: number;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        className={`${FIELD} resize-y leading-relaxed`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function SelectInput<T extends string>({
  label, value, options, optional, placeholder, hint, onChange,
}: {
  label: string;
  value: T | undefined;
  options: readonly T[];
  optional?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  onChange: (v: T | undefined) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <select
        className={FIELD}
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
      >
        {optional && <option value="">{placeholder ?? '— not set —'}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

export function NumberInput({ label, value, min, max, placeholder, hint, onChange }: {
  label: string;
  value: number | undefined;
  min?: number;
  max?: number;
  placeholder?: string;
  hint?: ReactNode;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        className={FIELD}
        value={value ?? ''}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </Field>
  );
}
