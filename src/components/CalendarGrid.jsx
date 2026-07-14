import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarGrid({ selectedDate, onSelectDay }) {
  const appointments = useAppStore((state) => state.appointments);
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [viewYear, setViewYear] = useState((selectedDate || today).getFullYear());
  const [viewMonth, setViewMonth] = useState((selectedDate || today).getMonth());

  // Navigation helpers
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calculation helpers
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

  const getDateStr = (dayNum) => {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgba(244,114,182,0.05)] border border-pink-100/60">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl bg-pink-soft/50 text-pink-deep hover:bg-pink-soft font-black text-[16px] transition-all flex items-center justify-center border border-white"
        >
          ‹
        </button>
        <div className="font-sans font-black text-[16px] text-gray-800">
          {MONTHS[viewMonth]} {viewYear}
        </div>
        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl bg-pink-soft/50 text-pink-deep hover:bg-pink-soft font-black text-[16px] transition-all flex items-center justify-center border border-white"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {DAYS.map((d) => (
          <div key={d} className="font-sans text-[11px] font-extrabold text-pink-deep/65 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-2">
        {/* Empty cells before month start */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Days of month */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const dayNum = i + 1;
          const dayDateStr = getDateStr(dayNum);
          
          // Check upcoming appointments for dots
          const dayAppts = appointments.filter(
            (a) => a.date === dayDateStr && a.status === 'upcoming'
          );
          const hasBusiness = dayAppts.some((a) => a.type === 'business');
          const hasPersonal = dayAppts.some((a) => a.type === 'personal');

          const isCurrentToday = dayDateStr === todayStr;
          const isSelected = selectedDate && 
            selectedDate.getFullYear() === viewYear && 
            selectedDate.getMonth() === viewMonth && 
            selectedDate.getDate() === dayNum;

          return (
            <div
              key={dayNum}
              onClick={() => onSelectDay(new Date(viewYear, viewMonth, dayNum))}
              className="flex flex-col items-center justify-center py-1 cursor-pointer group"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-sans text-[13px] font-bold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-br from-pink-primary to-pink-deep text-white shadow-md shadow-pink-primary/35 scale-105'
                    : isCurrentToday
                    ? 'bg-pink-soft/70 text-pink-deep border-2 border-pink-primary/40'
                    : 'text-gray-700 hover:bg-pink-soft/30 hover:text-pink-deep'
                }`}
              >
                {dayNum}
              </div>
              
              {/* Dot Indicators */}
              <div className="flex gap-1.5 mt-1 min-h-[5px] justify-center items-center">
                {hasBusiness && (
                  <span className="w-1 h-1 rounded-full bg-pink-primary" />
                )}
                {hasPersonal && (
                  <span className="w-1 h-1 rounded-full bg-violet-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
