/** Removes parenthetical segments (supports nested parentheses) for display. */
export function formatVenueForDisplay(location: string | null | undefined): string | null {
  if (location == null) {
    return null;
  }
  let result = location;
  let prev = "";
  while (result !== prev) {
    prev = result;
    result = result.replace(/\([^()]*\)/g, " ");
  }
  result = result.replace(/\s+/g, " ").trim();
  return result === "" ? null : result;
}
