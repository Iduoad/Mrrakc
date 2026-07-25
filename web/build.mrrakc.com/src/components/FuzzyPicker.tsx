import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { fuzzySearch } from '../utils/fuzzy';

interface Props<T> {
  items: T[];
  /** Text each item is matched/ranked against. */
  keyOf: (item: T) => string;
  /** Stable identity used to skip already-selected items. */
  idOf: (item: T) => string;
  /** Ids to exclude from results (already added). */
  excludeIds?: Set<string>;
  onSelect: (item: T) => void;
  placeholder?: string;
  /** Render a result row (defaults to the key text). */
  renderItem?: (item: T) => React.ReactNode;
  /** Called on focus, e.g. to mark the owning step active. */
  onFocus?: () => void;
}

// Generic fuzzy-search input with a results dropdown. Selecting a result calls
// onSelect and clears the query.
export function FuzzyPicker<T>({
  items, keyOf, idOf, excludeIds, onSelect, placeholder, renderItem, onFocus,
}: Props<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuzzySearch(query, items, keyOf, 12)
      .filter(r => !excludeIds?.has(idOf(r.item)))
      .slice(0, 8);
  }, [query, items, keyOf, idOf, excludeIds]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); onFocus?.(); }}
          placeholder={placeholder || 'Search…'}
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-clay dark:border-stone-700 bg-white dark:bg-stone-800 text-xs outline-none focus:ring-1 focus:ring-terra"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-clay dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl">
          {results.map(({ item }) => (
            <button
              key={idOf(item)}
              type="button"
              onClick={() => { onSelect(item); setQuery(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-terra/10 border-b border-clay/40 dark:border-stone-800 last:border-0"
            >
              {renderItem ? renderItem(item) : keyOf(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default FuzzyPicker;
