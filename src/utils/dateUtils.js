// Timezone and Date utilities configured for Oshawa / Eastern Time (America/Toronto)
export const TIMEZONE = 'America/Toronto';

// Get YYYY-MM-DD string in Eastern Time (Oshawa, Canada)
export const getOshawaTodayStr = (d = new Date()) => {
  const date = d instanceof Date ? d : new Date(d);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
};

// Parse an appointment date and time into accurate epoch timestamp
export const parseAppointmentTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return Date.now();
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
};

// Format 24-hour time string into 12-hour AM/PM format
export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

// Format duration in minutes to human readable string
export const formatDuration = (mins) => {
  if (!mins) return '';
  const hrs = Math.floor(mins / 60);
  const rMins = mins % 60;
  return rMins ? `${hrs}h ${rMins}m` : `${hrs}h`;
};