import { useMemo, useRef, useState } from 'react';
import { Check, ClipboardCopy, X } from 'lucide-react';
import type { NotificationType } from '../../components/Notification';
import { stageOf, STAGE_LABEL, type EventDraft } from './draft';
import { buildPrompt } from './prompt';

/**
 * The generated research prompt, ready to be copied into an agent.
 *
 * Which events go in is a choice, not the whole folder: the drafts already
 * added are still listed, but unticked, so including one is deliberate. The
 * prompt is shown as editable text — it is a starting point, and the copy that
 * leaves here should be the one that was read.
 */
export default function PromptModal({ candidates, onClose, notify }: {
  candidates: EventDraft[];
  onClose: () => void;
  notify: (message: string, type?: NotificationType) => void;
}) {
  // Default to the ones nothing has been done to yet; if there are none, the
  // user opened this for the drafts they can see, so offer those.
  const [picked, setPicked] = useState<Set<string>>(() => {
    const waiting = candidates.filter((d) => stageOf(d) === 'draft');
    return new Set((waiting.length ? waiting : candidates).map((d) => d.id));
  });
  // The prompt follows the selection until it is typed in, at which point the
  // typing wins — losing someone's edit to a checkbox click would be worse
  // than a list they can see is stale. `null` means "still following".
  const [override, setOverride] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const chosen = useMemo(
    () => candidates.filter((d) => picked.has(d.id)),
    [candidates, picked],
  );
  const generated = useMemo(() => buildPrompt(chosen), [chosen]);
  const prompt = override ?? generated;
  const edited = override !== null;

  const promptRef = useRef<HTMLTextAreaElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be refused even on localhost; select the text so
      // the keyboard still works.
      promptRef.current?.select();
      notify('Could not reach the clipboard — the prompt is selected, copy it with ⌘/Ctrl+C.', 'error');
    }
  };

  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (!next.delete(id)) next.add(id);
    return next;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-clay bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900">
        <header className="flex items-start gap-4 border-b border-clay p-5 dark:border-stone-800">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg font-bold">Research prompt</h3>
            <p className="mt-0.5 text-xs text-charcoal-light dark:text-stone-400">
              Pick the drafts to hand over, then copy this into an agent working in this repo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 transition-colors hover:bg-clay/20 dark:hover:bg-stone-800"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((d) => {
              const on = picked.has(d.id);
              const stage = stageOf(d);
              return (
                <button
                  key={d.id}
                  onClick={() => toggle(d.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    on
                      ? 'border-terra bg-terra/10 text-terra'
                      : 'border-clay text-stone-400 hover:bg-clay/20 dark:border-stone-700 dark:hover:bg-stone-800'
                  }`}
                >
                  {on && <Check size={12} />}
                  <span className="max-w-[220px] truncate">{d.name || d.id}</span>
                  {stage !== 'draft' && (
                    <span className="font-normal opacity-60">{STAGE_LABEL[stage]}</span>
                  )}
                </button>
              );
            })}
          </div>

          <textarea
            ref={promptRef}
            value={prompt}
            onChange={(e) => setOverride(e.target.value)}
            rows={14}
            spellCheck={false}
            placeholder="Pick at least one draft."
            className="w-full resize-y rounded-xl border border-clay bg-sand/40 p-4 font-mono text-xs leading-relaxed outline-none focus:ring-1 focus:ring-terra dark:border-stone-700 dark:bg-stone-950/50"
          />
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-clay bg-sand/50 px-5 py-4 dark:border-stone-800 dark:bg-stone-950/50">
          <p className="text-xs text-stone-400">
            {chosen.length} event{chosen.length === 1 ? '' : 's'}
            {edited && ' · edited by hand, no longer following the selection'}
          </p>
          <div className="flex gap-2">
            {edited && (
              <button
                onClick={() => setOverride(null)}
                className="rounded-xl border border-clay px-4 py-2 text-sm font-bold transition-colors hover:bg-clay/20 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                Regenerate
              </button>
            )}
            <button
              onClick={copy}
              disabled={!prompt.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-terra px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-terra-dark disabled:opacity-40"
            >
              {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
