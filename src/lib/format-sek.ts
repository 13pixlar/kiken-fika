/** Whole SEK, Swedish grouping (e.g. 1 234 kr). */
export function formatSekInteger(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount);
}
