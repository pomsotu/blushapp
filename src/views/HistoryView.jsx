import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const formatTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

const serviceLabels = {
  braiding: 'Hair Braiding',
  nails: 'Nail Art',
  both: 'Hair & Nails'
};

export default function HistoryView() {
  const appointments = useAppStore((state) => state.appointments);
  const [filter, setFilter] = useState('all');

  // Filter history (completed or cancelled)
  const pastAppts = appointments
    .filter((a) => a.status !== 'upcoming')
    .filter((a) => filter === 'all' || a.type === filter)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Compute completed count and total earnings
  const completedAppts = appointments.filter((a) => a.status === 'completed');
  const completedCount = completedAppts.length;
  
  const totalEarned = completedAppts
    .filter((a) => a.type === 'business')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  return (
    <div className="flex flex-col min-h-full">
      
      {/* Header Container */}
      <div className="bg-gradient-to-r from-pink-soft via-pink-primary to-pink-deep pt-6 pb-8 px-6 text-white shadow-md flex-shrink-0">
        <h1 className="font-serif italic text-[24px] font-extrabold tracking-wide drop-shadow-sm mb-4">
          History
        </h1>

        {/* Stats Row */}
        <div className="flex gap-3">
          <div className="glass-card rounded-2xl p-4 flex-1 flex flex-col justify-between">
            <span className="font-sans text-[9px] font-black uppercase tracking-widest text-pink-100">
              COMPLETED
            </span>
            <div className="mt-2">
              <div className="font-sans text-[22px] font-black leading-none">{completedCount}</div>
              <div className="font-sans text-[11px] font-bold text-white/95 mt-1">appointments</div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 flex-1 flex flex-col justify-between">
            <span className="font-sans text-[9px] font-black uppercase tracking-widest text-pink-100">
              TOTAL EARNED
            </span>
            <div className="mt-2">
              <div className="font-sans text-[22px] font-black leading-none">${totalEarned}</div>
              <div className="font-sans text-[11px] font-bold text-white/95 mt-1">all time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main List Body */}
      <div className="px-5 pt-5 flex flex-col gap-4 flex-1 pb-10">
        
        {/* Filters */}
        <div className="bg-pink-soft/40 p-1 rounded-2xl flex border border-pink-100/50">
          {[
            { value: 'all', label: 'All' },
            { value: 'business', label: '💅 Business' },
            { value: 'personal', label: '🌸 Personal' }
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`flex-1 py-2 rounded-xl border-none font-sans text-xs font-black transition-all cursor-pointer ${
                filter === item.value
                  ? 'bg-white text-pink-deep shadow-[0_1px_5px_rgba(219,39,119,0.06)]'
                  : 'text-gray-500 hover:text-pink-deep/85 font-extrabold'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* History List */}
        {pastAppts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-[0_4px_16px_rgba(244,114,182,0.03)] border border-pink-100/50 my-4">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-sans text-sm text-gray-500 font-bold leading-normal">
              No past appointments yet, Tari!
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pastAppts.map((appt) => {
              const isP = appt.type === 'personal';
              const borderLeftColor = isP ? 'border-l-violet-400' : 'border-l-pink-primary';
              const dateLabel = new Date(`${appt.date}T00:00:00`).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={appt.id}
                  className={`bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-[0_2px_10px_rgba(244,114,182,0.02)] border border-pink-100/30 border-l-[3.5px] ${borderLeftColor}`}
                >
                  {/* Status Indicator */}
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${
                    appt.status === 'completed' 
                      ? 'bg-green-50 text-green-500' 
                      : 'bg-red-50 text-red-500'
                  }`}>
                    {appt.status === 'completed' ? '✓' : '✗'}
                  </div>

                  {/* Main Details */}
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-bold text-gray-800 text-[13px] leading-tight truncate">
                      {isP ? appt.title : appt.clientName}
                    </div>
                    <div className="font-sans text-[10px] text-gray-500 mt-1 font-bold">
                      {dateLabel} · {formatTime(appt.time)}
                      {!isP && ` · ${serviceLabels[appt.service] || appt.service}`}
                    </div>
                  </div>

                  {/* Price / Status */}
                  <div className="text-right flex-shrink-0">
                    {appt.price != null && !isP && (
                      <div className={`font-sans font-extrabold text-[13px] ${
                        appt.status === 'completed' ? 'text-pink-deep' : 'text-gray-500'
                      }`}>
                        ${appt.price}
                      </div>
                    )}
                    <div className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${
                      appt.status === 'completed' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {appt.status}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
