// Booking durations, time ranges and overlap detection.
// Times are compared as absolute minutes (day index * 1440 + minutes) so a
// booking that runs past midnight still blocks the next morning correctly.

import { formatTime } from './dateUtils';

export const DEFAULT_DURATION = 60;
export const MAX_DURATION = 12 * 60;

export const getDurationMins = (appt) =>
  typeof appt?.durationMins === 'number' && appt.durationMins > 0
    ? appt.durationMins
    : DEFAULT_DURATION;

const pad = (n) => String(n).padStart(2, '0');

export const toMinutes = (time) => {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

const dayIndex = (date) => {
  const [y, m, d] = String(date).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};

export const absStart = (date, time) => dayIndex(date) * 1440 + toMinutes(time);

export const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

// Upcoming bookings other than `candidate`, as absolute ranges sorted by start
const busyRanges = (candidate, appointments) =>
  appointments
    .filter((a) => a.status === 'upcoming' && a.id !== candidate.id && a.date && a.time)
    .map((a) => {
      const s = absStart(a.date, a.time);
      return { appt: a, s, e: s + getDurationMins(a) };
    })
    .sort((x, y) => x.s - y.s);

// First upcoming booking that overlaps the candidate's time window, or null
export const findConflict = (candidate, appointments) => {
  if (!candidate?.date || !candidate?.time) return null;
  const s = absStart(candidate.date, candidate.time);
  const e = s + getDurationMins(candidate);
  const hit = busyRanges(candidate, appointments).find((b) => rangesOverlap(s, e, b.s, b.e));
  return hit ? hit.appt : null;
};

// Earliest start at or after the candidate's time (same day) with room for
// its full duration. Returns "HH:mm" or null if the rest of the day is full.
export const findNextFreeStart = (candidate, appointments) => {
  if (!candidate?.date || !candidate?.time) return null;
  const dayStart = dayIndex(candidate.date) * 1440;
  const dur = getDurationMins(candidate);
  const busy = busyRanges(candidate, appointments);
  let start = absStart(candidate.date, candidate.time);

  for (let guard = 0; guard < 500; guard += 1) {
    const clash = busy.find((b) => rangesOverlap(start, start + dur, b.s, b.e));
    if (!clash) return start < dayStart + 1440 ? minutesToTime(start - dayStart) : null;
    start = clash.e;
    if (start >= dayStart + 1440) return null;
  }
  return null;
};

export const DURATION_OPTIONS = Array.from({ length: MAX_DURATION / 30 }, (_, i) => (i + 1) * 30);

export const formatDurationLabel = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  return `${h} hr${m ? ` ${m} min` : ''}`;
};

export const endTimeOf = (time, durationMins) => minutesToTime(toMinutes(time) + durationMins);

// "2:00 – 4:00 PM", "11:00 AM – 1:00 PM", "10:00 PM – 1:00 AM (next day)"
export const formatTimeRange = (time, durationMins) => {
  if (!time) return '';
  const startMins = toMinutes(time);
  const endMins = startMins + durationMins;
  const start = formatTime(time);
  const end = formatTime(minutesToTime(endMins));
  const sameHalf = (startMins < 720) === (endMins % 1440 < 720) && endMins < 1440;
  const startShort = sameHalf ? start.replace(/\s?(AM|PM)$/, '') : start;
  return `${startShort} – ${end}${endMins > 1440 ? ' (next day)' : ''}`;
};
