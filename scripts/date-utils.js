export const SITE_TIME_ZONE = 'America/New_York';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SITE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

export function connecticutDate(now = new Date()) {
  const parts = Object.fromEntries(dateFormatter.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function validDateOnly(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function addDateDays(value, days) {
  if (!validDateOnly(value)) throw new Error('Invalid calendar date');
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function actionExpired(endDate, today = connecticutDate()) {
  return Boolean(endDate && endDate < today);
}
