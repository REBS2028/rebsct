import { actionExpired, connecticutDate } from './date-utils.js';

export function selectActions(records, today = connecticutDate()) {
  const active = records.filter((record) => !actionExpired(record.endDate, today));
  const featured = active.find((record) => record.isFeatured && (!record.featureStartDate || record.featureStartDate <= today));
  return {
    featured,
    others: active.filter((record) => record !== featured).sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id, 'en')),
  };
}
