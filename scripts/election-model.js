import { connecticutDate } from './date-utils.js';

export const ELECTION_DAY = '2026-11-03';
export const EARLY_VOTING_START = '2026-10-19';
export const EARLY_VOTING_END = '2026-11-01';

export function electionState(now = new Date()) {
  const today = connecticutDate(now);
  // Calendar-day difference in Connecticut, independent of the browser timezone or DST.
  const days = Math.round((Date.parse(`${ELECTION_DAY}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return {
    days: days > 0 ? days : null,
    label: days > 0 ? (days === 1 ? 'day until' : 'days until') : days === 0 ? 'Today is' : '2026 midterms',
    heading: days >= 0 ? 'Election Day' : 'Election resources',
    earlyLabel: today < EARLY_VOTING_START ? 'CT early voting' : today <= EARLY_VOTING_END ? 'CT early voting is open' : 'CT early voting ended',
  };
}

export function updateElection(root = document, now = new Date()) {
  const card = root.querySelector('[data-election]');
  if (!card) return;
  const state = electionState(now);
  const count = card.querySelector('[data-election-days]');
  count.textContent = state.days === null ? '' : String(state.days);
  count.hidden = state.days === null;
  const label = card.querySelector('[data-election-label]');
  label.hidden = false;
  label.textContent = state.label;
  card.querySelector('#election-heading').textContent = state.heading;
  card.querySelector('[data-early-voting-label]').textContent = state.earlyLabel;
}
