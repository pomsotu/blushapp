import React from 'react';
import { useAppStore } from '../store/useAppStore';
import ApptCard from '../components/ApptCard';

export default function HomeView({ onEditAppt, onAddAppt }) {
  const appointments = useAppStore((state) => state.appointments);

  // Get current date strings
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateName = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  // Filter appointments
  const upcoming = appointments.filter((a) => a.status === 'upcoming');
  
  const todayAppts = upcoming
    .filter((a) => a.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));
    
  const upcomingAppts = upcoming
    .filter((a) => a.date > todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 4);

  // Calculate earnings for today's business bookings
  const earningsToday = todayAppts
    .filter((a) => a.type === 'business')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  return (
    <div className="flex flex-col min-h-full">
      
      {/* Header Container */}
      <div className="bg-gradient-to-r from-pink-soft via-pink-primary to-pink-deep pt-6 pb-8 px-6 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative blossom overlays */}
        <div className="absolute right-[-20px] top-[-10px] text-white/10 text-9xl font-black pointer-events-none select-none">🌸</div>
        <div className="absolute left-[-30px] bottom-[-40px] text-white/5 text-9xl font-black pointer-events-none select-none">💅</div>

        <div className="font-sans text-[11px] font-black uppercase tracking-wider text-pink-50/80">
          {dayName}, {dateName}
        </div>
        <h1 className="font-serif italic text-[32px] font-extrabold mt-1 tracking-wide drop-shadow-sm">
          Hey Tari 🌸
        </h1>
        
        {/* Statistics Cards Row */}
        <div className="flex gap-3 mt-6">
          
          {/* Card 1: Bookings */}
          <div className="glass-card rounded-2xl p-4 flex-1 flex flex-col justify-between">
            <span className="font-sans text-[9px] font-extrabold uppercase tracking-widest text-white/80">
              TODAY'S BOOKINGS
            </span>
            <div className="mt-2.5">
              <div className="font-sans text-[26px] font-black leading-none">{todayAppts.length}</div>
              <div className="font-sans text-[11px] font-bold text-white/70 mt-1">appointments</div>
            </div>
          </div>
          
          {/* Card 2: Revenue */}
          <div className="glass-card rounded-2xl p-4 flex-1 flex flex-col justify-between">
            <span className="font-sans text-[9px] font-extrabold uppercase tracking-widest text-white/80">
              EST. EARNINGS
            </span>
            <div className="mt-2.5">
              <div className="font-sans text-[26px] font-black leading-none">${earningsToday}</div>
              <div className="font-sans text-[11px] font-bold text-white/70 mt-1">today</div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Body Section */}
      <div className="px-5 pt-6 flex flex-col gap-6">
        
        {/* Today's Section */}
        <div>
          <div className="font-sans text-[11px] font-black text-pink-deep/50 uppercase tracking-widest mb-3">
            Schedule Today
          </div>
          {todayAppts.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-[0_4px_16px_rgba(244,114,182,0.03)] border border-pink-100/50">
              <div className="text-3xl mb-2">🌸</div>
              <div className="font-sans text-sm text-gray-400 font-bold leading-normal">
                Nothing booked today — enjoy the free time, Tari! ✨
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {todayAppts.map((appt) => (
                <ApptCard key={appt.id} appt={appt} onClick={() => onEditAppt(appt)} />
              ))}
            </div>
          )}
        </div>

        {/* Coming Up Section */}
        {upcomingAppts.length > 0 && (
          <div>
            <div className="font-sans text-[11px] font-black text-pink-deep/50 uppercase tracking-widest mb-3">
              Coming Up
            </div>
            <div className="flex flex-col gap-3">
              {upcomingAppts.map((appt) => (
                <ApptCard key={appt.id} appt={appt} showDate onClick={() => onEditAppt(appt)} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
