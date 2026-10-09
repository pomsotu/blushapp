import React from 'react';
import { scopeSummary, formatMoney } from '../utils/services';
import { getDurationMins, endTimeOf } from '../utils/schedule';

const formatTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

const formatDuration = (mins) => {
  if (!mins) return '';
  const hrs = Math.floor(mins / 60);
  const rMins = mins % 60;
  return rMins ? `${hrs}h ${rMins}m` : `${hrs}h`;
};

// Booking card. Tapping the card opens it for editing; optional quick
// actions (Complete / Cancel) sit in their own row below.
export default function ApptCard({ appt, showDate = false, onClick, onComplete, onCancel }) {
  const who = appt.type === 'personal' ? appt.title : appt.clientName;
  const hasActions = appt.status === 'upcoming' && (onComplete || onCancel);
  const isPersonal = appt.type === 'personal';
  const accentColor = isPersonal ? 'text-violet-600' : 'text-pink-deep';
  const bgClass = isPersonal ? 'bg-lavender-soft/80' : 'bg-pink-soft/60';
  const borderLeftColor = isPersonal ? 'border-l-violet-400' : 'border-l-pink-primary';

  const dateLabel = showDate
    ? new Date(`${appt.date}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div
      data-testid="appt-card"
      className={`bg-white rounded-2xl shadow-[0_4px_16px_rgba(244,114,182,0.04)] border border-pink-100/60 border-l-[4px] ${borderLeftColor} transition-all duration-200 hover:shadow-[0_6px_20px_rgba(244,114,182,0.07)] overflow-hidden`}
    >
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Open ${who}, ${formatTime(appt.time)}` : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`p-4 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:bg-pink-50/30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pink-primary' : ''}`}
    >
      {/* Time Badge */}
      <div className={`${bgClass} rounded-xl px-2.5 py-1.5 min-w-[70px] text-center flex-shrink-0 border border-white/80`}>
        <div className={`font-sans text-[11px] font-black tracking-wide ${accentColor}`}>
          {formatTime(appt.time)}
        </div>
        <div className="font-sans text-[9.5px] font-bold text-gray-500 tabular-nums">
          to {formatTime(endTimeOf(appt.time, getDurationMins(appt)))}
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        {dateLabel && (
          <div className="text-[10px] font-extrabold text-pink-deep uppercase tracking-wider mb-0.5">
            {dateLabel}
          </div>
        )}
        <div className="font-sans font-bold text-gray-800 text-[14px] leading-tight truncate">
          {isPersonal ? appt.title : appt.clientName}
        </div>
        <div className="font-sans text-[11px] text-gray-500 mt-0.5 font-bold flex items-center gap-1 min-w-0">
          {isPersonal ? (
            <span>Personal 🌸 · {formatDuration(getDurationMins(appt))}</span>
          ) : (
            <span className="truncate">
              {scopeSummary(appt) || 'No services added'}
              {` · ${formatDuration(getDurationMins(appt))}`}
            </span>
          )}
        </div>
      </div>

      {/* Price / Status */}
      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
        {appt.price != null && !isPersonal && (
          <div className="font-sans font-extrabold text-[14px] text-pink-deep">
            {formatMoney(appt.price)}
          </div>
        )}
        
        {appt.status !== 'upcoming' && (
          <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            appt.status === 'completed' 
              ? 'bg-green-50 text-green-500 border border-green-100' 
              : 'bg-red-50 text-red-500 border border-red-100'
          }`}>
            {appt.status}
          </div>
        )}
      </div>
    </div>

      {hasActions && (
        <div className="flex border-t border-pink-100/70" data-testid="appt-quick-actions">
          {onComplete && (
            <button
              type="button"
              data-testid="quick-complete"
              onClick={onComplete}
              aria-label={`Mark ${who} completed`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-transparent border-none text-green-700 hover:bg-green-50 active:bg-green-100 font-extrabold text-[12px] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-green-600"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
              Complete
            </button>
          )}
          {onComplete && onCancel && <div className="w-px bg-pink-100/70" aria-hidden="true" />}
          {onCancel && (
            <button
              type="button"
              data-testid="quick-cancel"
              onClick={onCancel}
              aria-label={`Cancel ${who}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-transparent border-none text-gray-500 hover:text-red-600 hover:bg-red-50 active:bg-red-100 font-extrabold text-[12px] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-500"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
