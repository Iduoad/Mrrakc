import { stageOf, type EventDraft } from './draft';

/**
 * The hand-off: turning a pile of drafts into the message that starts a
 * research pass.
 *
 * The prompt stays deliberately thin. Everything about *how* to research an
 * event — the year-by-year protocol, ordinals, admission conventions,
 * validation — already lives in the `mrrakc-create-event` skill, and the drafts
 * themselves carry what is known about each event. Restating either here would
 * only give the agent a second, staler copy to disagree with. So the prompt
 * says which events, where their briefs are, and which skill to load.
 */

export const PROMPT_HEADLINE = 'Create the following mrrakc events:';

export const draftPath = (d: EventDraft) => `sources/new-events/${d.id}.json`;

/** One bullet per event: what it is called, and where its brief is. */
function line(d: EventDraft): string {
  const bullet = `- ${d.name || d.id} — ${draftPath(d)}`;
  // A draft past `draft` claims its entry has already been written, so asking
  // for it again would rewrite a record instead of creating one.
  return stageOf(d) === 'draft'
    ? bullet
    : `${bullet} (already marked “${stageOf(d)}” — enrich the existing data/events/${d.id}.json rather than recreating it)`;
}

export function buildPrompt(drafts: EventDraft[]): string {
  if (!drafts.length) return '';
  return [
    PROMPT_HEADLINE,
    '',
    ...drafts.map(line),
    '',
    'Each line is an event and the draft brief written for it: what is already',
    'known about it, which links to start from, and what to distrust. Read the',
    'draft first, then use the mrrakc-create-event skill to research the event',
    'and write data/events/<id>.json.',
  ].join('\n');
}
