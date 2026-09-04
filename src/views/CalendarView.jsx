import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import CalendarGrid from '../components/CalendarGrid';
import ApptCard from '../components/ApptCard';
import { getOshawaTodayStr, TIMEZONE } from '../utils/dateUtils';

export default function CalendarView({ onEditAppt }) {
  const appointments = useAppStore((state) => state.appointments);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDateStr = getOshawaTodayStr(selectedDate);
  const todayStr = getOshawaTodayStr(new Date());

  // Filter appointments for the selected day
  const dayAppointments = appointments
    .filter((a) => a.date === selectedDateStr && a.status === 'upcoming')
    .sort((a, b) => a.time.localeCompare(b.time));

  // Determine date label
  const isSelectedToday = selectedDateStr === todayStr;
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isSelectedTomorrow = selectedDateStr === getOshawaTodayStr(tomorrow);

  const dateLabel = isSelectedToday
    ? 'Today'
    : isSelectedTomorrow
    ? 'Tomorrow'
    : selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: TIMEZONE
      });

  return (
    <div className="flex flex-col min-h-full">
      {/* Header Container */}
      <div className="bg-gradient-to-br from-pink-primary via-[#EC4899] to-pink-deep pt-7 pb-6 px-6 text-white shadow-[0_8px_25px_rgba(219,39,119,0.18)] rounded-b-[28px] mb-5 flex-shrink-0">
        <h1 className="font-serif italic text-[26px] font-black tracking-wide drop-shadow-sm text-white">
          My Schedule 📅
        </h1>
      </div>

      {/* Grid wrapper */}
      <div className="px-5 flex flex-col gap-4">
        {/* Render calendar grid component */}
        <CalendarGrid selectedDate={selectedDate} onSelectDay={setSelectedDate} />

        {/* Legend */}
        <div className="flex gap-4 px-2 items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-primary" />
            <span className="font-sans text-[11px] font-bold text-gray-500">Business Booking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
            <span className="font-sans text-[11px] font-bold text-gray-500">Personal Event</span>
          </div>
        </div>

        {/* Day Detail divider */}
        <hr className="border-pink-100/60 my-1" />

        {/* List for selected day */}
        <div className="flex flex-col gap-3">
          <div className="font-sans text-[11px] font-black text-pink-deep/75 uppercase tracking-widest px-1">
            {dateLabel}
          </div>

          {dayAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-[0_4px_16px_rgba(244,114,182,0.03)] border border-pink-100/50">
              <div className="text-2xl mb-1">🌸</div>
              <div className="font-sans text-xs text-gray-500 font-bold leading-normal">
                Nothing scheduled for this day. Free time! ✨
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {dayAppointments.map((appt) => (
                <ApptCard key={appt.id} appt={appt} onClick={() => onEditAppt(appt)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
