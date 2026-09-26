import { addDateDays, connecticutDate, SITE_TIME_ZONE, validDateOnly } from './date-utils.js';

function dateOnlyLabel(value, options) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(new Date(`${value}T12:00:00Z`));
}

function timeLabel(date, options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_TIME_ZONE, hour: 'numeric', minute: '2-digit', ...options,
  }).format(date);
}

export function eventDates(event, now = new Date()) {
  let startDate;
  let endDate;
  let meta;
  if (validDateOnly(event.start?.date)) {
    startDate = event.start.date;
    const exclusiveEnd = event.end?.date;
    endDate = validDateOnly(exclusiveEnd) && exclusiveEnd > startDate ? addDateDays(exclusiveEnd, -1) : startDate;
    meta = endDate > startDate
      ? `${dateOnlyLabel(startDate, { month: 'short', day: 'numeric', year: 'numeric' })} – ${dateOnlyLabel(endDate, { month: 'short', day: 'numeric', year: 'numeric' })} · All day`
      : `${dateOnlyLabel(startDate, { weekday: 'long', ...(startDate.slice(0, 4) !== connecticutDate(now).slice(0, 4) ? { year: 'numeric' } : {}) })} · All day`;
  } else if (typeof event.start?.dateTime === 'string' && Number.isFinite(Date.parse(event.start.dateTime))) {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end?.dateTime);
    startDate = connecticutDate(start);
    endDate = Number.isFinite(end.getTime()) && end > start ? connecticutDate(end) : startDate;
    const hasEnd = Number.isFinite(end.getTime()) && end > start;
    const timeZone = new Intl.DateTimeFormat('en-US', { timeZone: SITE_TIME_ZONE, timeZoneName: 'short' }).formatToParts(start).find((part) => part.type === 'timeZoneName').value;
    if (endDate !== startDate) {
      meta = `${timeLabel(start, { month: 'short', day: 'numeric', year: 'numeric', timeZoneName: 'short' })} – ${timeLabel(end, { month: 'short', day: 'numeric', year: 'numeric', timeZoneName: 'short' })}`;
    } else {
      const weekday = dateOnlyLabel(startDate, { weekday: 'long', ...(startDate.slice(0, 4) !== connecticutDate(now).slice(0, 4) ? { year: 'numeric' } : {}) });
      const endZone = hasEnd ? new Intl.DateTimeFormat('en-US', { timeZone: SITE_TIME_ZONE, timeZoneName: 'short' }).formatToParts(end).find((part) => part.type === 'timeZoneName').value : timeZone;
      const times = hasEnd && endZone !== timeZone
        ? `${timeLabel(start)} ${timeZone} – ${timeLabel(end)} ${endZone}`
        : `${timeLabel(start)}${hasEnd ? ` – ${timeLabel(end)}` : ''} ${timeZone}`;
      meta = `${weekday} · ${times}`;
    }
  } else {
    return { date: '', month: '', day: '—', label: 'Date to be confirmed', meta: 'Date to be confirmed' };
  }
  return {
    date: startDate,
    month: dateOnlyLabel(startDate, { month: 'short' }),
    day: startDate.slice(-2),
    label: dateOnlyLabel(startDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    meta,
  };
}

export function calendarRequestUrl(config, { timeMin, pageToken = null }) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events`);
  url.search = new URLSearchParams({
    key: config.apiKey, timeMin, maxResults: '5', singleEvents: 'true', orderBy: 'startTime', timeZone: SITE_TIME_ZONE,
    ...(pageToken ? { pageToken } : {}),
  });
  return url;
}
