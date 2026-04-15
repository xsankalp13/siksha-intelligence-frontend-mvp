/**
 * Returns the current date as a "YYYY-MM-DD" string in the **local** timezone.
 *
 * ⚠️  Do NOT use `new Date().toISOString().slice(0, 10)` for this purpose!
 *     `.toISOString()` converts to UTC first, which shifts the date backward
 *     for users east of UTC (e.g., IST = UTC+5:30).
 *     At 02:00 AM IST on Apr 9, UTC is still Apr 8, causing a day mismatch
 *     between the date sent to the backend and what the UI displays.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
