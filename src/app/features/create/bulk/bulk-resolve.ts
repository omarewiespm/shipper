/**
 * Smart resolver for bulk-upload reference fields. Turns a free-text cell into
 * exactly one canonical system value (by id) — or nothing. The candidate set is
 * always the closed system list, so a value can only ever resolve to something
 * that already exists; it can never mint a new product / vehicle type.
 */

export interface Candidate { id: string; label: string; hint?: string }

export interface Resolution {
  /** Matched candidate id, or null when the user must pick. */
  id: string | null;
  /** Canonical label we resolved to (echoed back into the grid). */
  label: string | null;
  /** How we matched — drives copy ("auto-matched" vs "needs review"). */
  via: 'exact' | 'alias' | 'token' | 'fuzzy' | 'empty' | 'unresolved';
  /** Best 1–3 suggestions to offer when unresolved / low confidence. */
  suggestions: Candidate[];
}

/** Lowercase, strip accents & punctuation, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9&\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sørensen–Dice similarity on character bigrams (0..1). */
export function diceCoefficient(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const ba = bigrams(x);
  const bb = bigrams(y);
  let overlap = 0;
  for (const [g, count] of ba) overlap += Math.min(count, bb.get(g) ?? 0);
  const total = (x.length - 1) + (y.length - 1);
  return (2 * overlap) / total;
}

/** Domain aliases keyed by field. Normalized alias → canonical label fragment. */
export type AliasMap = Record<string, string>;

const FUZZY_ACCEPT = 0.82;   // top score to auto-resolve
const FUZZY_MARGIN = 0.08;   // top must beat runner-up by this much

/**
 * Resolve `raw` against `candidates`. `aliases` maps a normalized alias to a
 * candidate label (or a substring of it) — checked before fuzzy matching.
 */
export function resolve(raw: string, candidates: Candidate[], aliases: AliasMap = {}): Resolution {
  const value = (raw ?? '').trim();
  if (!value) return { id: null, label: null, via: 'empty', suggestions: [] };

  const norm = normalize(value);
  const byNorm = candidates.map((c) => ({ c, n: normalize(c.label) }));

  // 1. Exact normalized match.
  const exact = byNorm.find((x) => x.n === norm);
  if (exact) return hit(exact.c, 'exact');

  // 2. Alias table → resolve to the candidate whose label contains the target.
  const aliasTarget = aliases[norm];
  if (aliasTarget) {
    const t = normalize(aliasTarget);
    const aliased = byNorm.find((x) => x.n === t || x.n.includes(t));
    if (aliased) return hit(aliased.c, 'alias');
  }

  // 3. Unique token-subset: input tokens ⊆ exactly one candidate's tokens.
  const inTokens = norm.split(' ').filter(Boolean);
  const subsetHits = byNorm.filter((x) => {
    const cand = new Set(x.n.split(' '));
    return inTokens.every((t) => cand.has(t));
  });
  if (subsetHits.length === 1) return hit(subsetHits[0].c, 'token');

  // 4. Fuzzy — accept only when confident AND clear of the runner-up.
  const scored = candidates
    .map((c) => ({ c, score: diceCoefficient(value, c.label) }))
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  const second = scored[1];
  if (top && top.score >= FUZZY_ACCEPT && (!second || top.score - second.score >= FUZZY_MARGIN)) {
    return hit(top.c, 'fuzzy');
  }

  // 5. Unresolved — hand the top suggestions to the review UI.
  return {
    id: null,
    label: null,
    via: 'unresolved',
    suggestions: scored.filter((s) => s.score > 0.3).slice(0, 3).map((s) => s.c),
  };
}

function hit(c: Candidate, via: Resolution['via']): Resolution {
  return { id: c.id, label: c.label, via, suggestions: [] };
}

/** Aliases for the two closed enum fields. Names are canonical fragments. */
export const VEHICLE_ALIASES: AliasMap = {
  reefer: 'Reefer', refrigerated: 'Reefer', 'reefer trailer': 'Reefer Trailer', chiller: 'Reefer', cold: 'Reefer',
  curtain: 'Curtain-side', 'curtain side': 'Curtain-side', tautliner: 'Curtain-side', tarpaulin: 'Curtain-side',
  flat: 'Flatbed', 'flat bed': 'Flatbed', flatbed: 'Flatbed', lowbed: 'Flatbed',
  box: 'Box 12m', 'box truck': 'Box 12m', dry: 'Box 12m', 'dry van': 'Box 12m',
  'cold truck': 'Reefer Trailer', 'reefer truck': 'Reefer Trailer',
};

export const PRODUCT_ALIASES: AliasMap = {
  'f b': 'Food & beverage', 'f&b': 'Food & beverage', food: 'Food & beverage', beverage: 'Food & beverage', 'food beverage': 'Food & beverage', 'food & beverage': 'Food & beverage', fmcg: 'Food & beverage',
  electronic: 'Electronics', electronics: 'Electronics', tech: 'Electronics',
  ceramic: 'Ceramic', tiles: 'Ceramic', tile: 'Ceramic',
  construction: 'Construction materials', building: 'Construction materials', cement: 'Construction materials', 'building materials': 'Construction materials',
  chemical: 'Chemicals', chemicals: 'Chemicals',
  general: 'General cargo', misc: 'General cargo', other: 'General cargo', 'general cargo': 'General cargo',
};
