import React from 'react';

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

const serviceLabels = {
  braiding: 'Hair Braiding 🌀',
  nails: 'Nail Art 💅',
  both: 'Hair & Nails ✨'
};

export default function ApptCard({ appt, compact = false, showDate = false, onClick }) {
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
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 flex items-center gap-4 shadow-[0_4px_16px_rgba(244,114,182,0.04)] border border-pink-100/60 border-l-[4px] ${borderLeftColor} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(244,114,182,0.07)] ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Time Badge */}
      <div className={`${bgClass} rounded-xl px-2.5 py-1.5 min-w-[70px] text-center flex-shrink-0 border border-white/80`}>
        <div className={`font-sans text-[11px] font-black tracking-wide ${accentColor}`}>
          {formatTime(appt.time)}
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
        <div className="font-sans text-[11px] text-gray-500 mt-0.5 font-bold flex items-center gap-1">
          {isPersonal ? (
            <span>Personal 🌸</span>
          ) : (
            <span>
              {serviceLabels[appt.service] || appt.service}
              {appt.durationMins ? ` · ${formatDuration(appt.durationMins)}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Price / Status */}
      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
        {appt.price != null && !isPersonal && (
          <div className="font-sans font-extrabold text-[14px] text-pink-deep">
            ${appt.price}
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
  );
}
