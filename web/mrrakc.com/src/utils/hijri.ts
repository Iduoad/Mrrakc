// Hijri -> Gregorian month approximation using the Umm al-Qura calendar
// shipped with Intl. Runs at build time (Bun has full ICU); the result drifts
// ~11 days per year, so each deploy refreshes the placement.

const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
});

export function getHijriParts(date: Date): { hy: number; hm: number; hd: number } {
    const parts = hijriFormatter.formatToParts(date);
    const num = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10);
    return { hy: num('year'), hm: num('month'), hd: num('day') };
}

const h2gCache = new Map<string, { month: number; year: number }>();

/**
 * Gregorian month containing the next occurrence (on/after `from`) of the given
 * hijri month/day. `hijriDay` defaults to 15 (month midpoint) so a day-less
 * anchor lands in the Gregorian month covering most of that hijri month.
 */
export function hijriToGregorianMonth(hijriMonth: number, hijriDay = 15, from = new Date()): { month: number; year: number } {
    const day = Math.min(hijriDay, 29);
    const key = `${hijriMonth}-${day}-${from.getFullYear()}-${from.getMonth()}`;
    const cached = h2gCache.get(key);
    if (cached) return cached;

    const d = new Date(from);
    for (let i = 0; i < 400; i++) {
        const { hm, hd } = getHijriParts(d);
        if (hm === hijriMonth && hd === day) {
            const result = { month: d.getMonth() + 1, year: d.getFullYear() };
            h2gCache.set(key, result);
            return result;
        }
        d.setDate(d.getDate() + 1);
    }
    const fallback = { month: from.getMonth() + 1, year: from.getFullYear() };
    h2gCache.set(key, fallback);
    return fallback;
}
