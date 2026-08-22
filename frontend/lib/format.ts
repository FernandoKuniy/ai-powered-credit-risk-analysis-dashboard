// Formatting helpers, so a probability is rendered the same way on the score screen, in the
// dashboard table and inside the detail panel rather than three slightly different
// `.toFixed()` calls drifting apart.

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** A model probability (0 to 1) as a percentage. Two decimals: a PD of 4.07% is not 4%. */
export function formatPd(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/** A rate (0 to 1) where one decimal is enough, like an approval rate across a portfolio. */
export function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** A threshold the user set with a slider, which only ever moves in whole percent steps. */
export function formatThreshold(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Backend enum values like `debt_consolidation` and `MORTGAGE` reach the UI raw.
 *
 * Lower-cased before title-casing, because the housing values arrive already upper-case and
 * title-casing them on their own leaves "MORTGAGE" shouting in the middle of a detail panel.
 * State codes and grade letters are rendered directly rather than through here, so nothing
 * that should stay upper-case passes through this.
 */
export function formatEnumLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * A probability restated as a count of people, because "4.07%" is a number most readers
 * cannot picture and "about 4 in every 100" is the same fact they can.
 */
export function describePd(pd: number): string {
  const perHundred = pd * 100;
  if (perHundred < 1) {
    return `Fewer than 1 borrower in 100 who look like this is expected to default.`;
  }
  const rounded = Math.round(perHundred);
  return `About ${rounded} ${rounded === 1 ? "borrower" : "borrowers"} in every 100 who look like this are expected to default.`;
}
