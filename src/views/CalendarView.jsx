import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import CalendarGrid from '../components/CalendarGrid';
import ApptCard from '../components/ApptCard';

export default function CalendarView({ onEditAppt }) {
  const appointments = useAppStore((state) => state.appointments);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter appointments for the selected day
  const dayAppointments = appointments
    .filter((a) => a.date === selectedDateStr && a.status === 'upcoming')
    .sort((a, b) => a.time.localeCompare(b.time));

  // Determine date label
  const isSelectedToday = selectedDateStr === todayStr;
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isSelectedTomorrow = selectedDateStr === tomorrow.toISOString().split('T')[0];

  const dateLabel = isSelectedToday
    ? 'Today'
    : isSelectedTomorrow
    ? 'Tomorrow'
    : selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

  return (
    <div className="flex flex-col min-h-full">
      {/* Header Container */}
      <div className="bg-gradient-to-r from-pink-soft via-pink-primary to-pink-deep pt-6 pb-6 px-6 text-white shadow-md mb-4 flex-shrink-0">
        <h1 className="font-serif italic text-[24px] font-extrabold tracking-wide drop-shadow-sm">
          My Schedule
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
            <span className="font-sans text-[11px] font-bold text-gray-400">Business Booking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
            <span className="font-sans text-[11px] font-bold text-gray-400">Personal Event</span>
          </div>
        </div>

        {/* Day Detail divider */}
        <hr className="border-pink-100/60 my-1" />

        {/* List for selected day */}
        <div className="flex flex-col gap-3">
          <div className="font-sans text-[11px] font-black text-pink-deep/50 uppercase tracking-widest px-1">
            {dateLabel}
          </div>

          {dayAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-[0_4px_16px_rgba(244,114,182,0.03)] border border-pink-100/50">
              <div className="text-2xl mb-1">🌸</div>
              <div className="font-sans text-xs text-gray-400 font-bold leading-normal">
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
