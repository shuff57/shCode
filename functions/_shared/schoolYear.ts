// School-year helpers. A "school year" runs from July 1 through June 30;
// July picks up the *next* year's label because that's when planning
// happens, even though classes start in late August.

function currentSchoolYear(now: Date = new Date()): string {
  const month = now.getUTCMonth(); // 0-11
  const year = now.getUTCFullYear();
  const startYear = month >= 6 ? year : year - 1; // July (6) flips
  return `${startYear}-${startYear + 1}`;
}

export function getSchoolYear(now: Date = new Date()): string {
  return currentSchoolYear(now);
}

// Epoch ms for June 30 23:59:59Z of the school year's end. Used as the
// enrollments.expires_at default so rosters auto-clear every summer.
export function getCurrentExpirationDate(now: Date = new Date()): number {
  const year = currentSchoolYear(now);
  const endYear = parseInt(year.split('-')[1], 10);
  return Date.UTC(endYear, 5, 30, 23, 59, 59); // month 5 = June
}
