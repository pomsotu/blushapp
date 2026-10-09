import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import CalendarGrid from '../components/CalendarGrid';
import DayTimeline from '../components/DayTimeline';
import { getOshawaTodayStr, TIMEZONE } from '../utils/dateUtils';
import { getDurationMins, formatDurationLabel } from '../utils/schedule';

export default function CalendarView({ onEditAppt, onAddAt, selectedDate: controlledDate, onSelectDate }) {
  const appointments = useAppStore((state) => state.appointments);
  // The selected day lives in App so it survives opening a booking and coming back
  const [localDate, setLocalDate] = useState(new Date());
  const selectedDate = controlledDate || localDate;
  const setSelectedDate = onSelectDate || setLocalDate;

  const selectedDateStr = getOshawaTodayStr(selectedDate);
  const todayStr = getOshawaTodayStr(new Date());

  // Upcoming bookings for the selected day (for the summary line)
  const dayAppointments = appointments.filter(
    (a) => a.date === selectedDateStr && a.status === 'upcoming'
  );
  const bookedMins = dayAppointments.reduce((sum, a) => sum + getDurationMins(a), 0);

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

      <div className="px-5 flex flex-col gap-4 pb-10">
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

        <hr className="border-pink-100/60 my-1" />

        {/* Selected day */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="font-sans text-[11px] font-black text-pink-deep/75 uppercase tracking-widest">
              {dateLabel}
            </h2>
            <span className="font-sans text-[11px] font-bold text-gray-500" data-testid="day-summary">
              {dayAppointments.length === 0
                ? 'Open all day · tap a time to book'
                : `${dayAppointments.length} booked · ${formatDurationLabel(bookedMins)}`}
            </span>
          </div>

          <DayTimeline
            date={selectedDateStr}
            isToday={isSelectedToday}
            appointments={appointments}
            onOpen={onEditAppt}
            onAddAt={(time) => onAddAt(selectedDateStr, time)}
          />
        </div>
      </div>
    </div>
  );
}
