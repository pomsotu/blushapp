import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import ApptCard from '../components/ApptCard';
import { getOshawaTodayStr, parseAppointmentTime, TIMEZONE } from '../utils/dateUtils';
import { registerPushSubscription } from '../utils/pushManager';
import { scopeSummary, formatMoney } from '../utils/services';
import { getDurationMins } from '../utils/schedule';

export default function HomeView({ onEditAppt }) {
  const appointments = useAppStore((state) => state.appointments);
  const completeAppointment = useAppStore((state) => state.completeAppointment);
  const cancelAppointment = useAppStore((state) => state.cancelAppointment);
  const sendTestNotification = useAppStore((state) => state.sendTestNotification);

  // Notification permission prompt state
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'granted'
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        registerPushSubscription().catch(() => {});
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        let res = Notification.permission;
        if (res !== 'granted' && res !== 'denied') {
          const permPromise = Notification.requestPermission();
          if (permPromise && typeof permPromise.then === 'function') {
            res = await permPromise;
          } else {
            res = await new Promise((resolve) => Notification.requestPermission(resolve));
          }
        }
        setNotificationPermission(res);
        if (res === 'granted') {
          await registerPushSubscription().catch(() => {});
        }
      } catch {}
    }
    await sendTestNotification();
  };

  // Get current date strings formatted in Oshawa/Eastern Time
  const today = new Date();
  const todayStr = getOshawaTodayStr(today);
  const now = Date.now();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long', timeZone: TIMEZONE });
  const dateName = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: TIMEZONE });

  // Filter appointments
  const upcoming = appointments.filter((a) => a.status === 'upcoming');
  
  const todayAppts = upcoming
    .filter((a) => a.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));
    
  const upcomingAppts = upcoming
    .filter((a) => a.date > todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 4);

  // 1. Calculate 30-minute Pre-Appointment Alert item
  const startingSoonAppt = upcoming.find((appt) => {
    const startTime = parseAppointmentTime(appt.date, appt.time);
    const durationMins = getDurationMins(appt);
    const endTime = startTime + durationMins * 60 * 1000;
    
    // Starts within 30 minutes, or currently ongoing
    return now >= (startTime - 30 * 60 * 1000) && now <= endTime;
  });

  // 2. Calculate 2-Hour Post-Appointment Follow-up items (ended 2+ hours ago and still marked upcoming)
  const pendingFollowups = appointments.filter((appt) => {
    if (appt.status !== 'upcoming') return false;
    const startTime = parseAppointmentTime(appt.date, appt.time);
    const durationMins = getDurationMins(appt);
    const endTime = startTime + durationMins * 60 * 1000;
    
    return now >= (endTime + 2 * 60 * 60 * 1000);
  });

  // Calculate earnings for today's business bookings
  const earningsToday = todayAppts
    .filter((a) => a.type === 'business')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  return (
    <div className="flex flex-col min-h-full">
      
      {/* Header Container */}
      <div className="bg-gradient-to-br from-pink-primary via-[#EC4899] to-pink-deep pt-7 pb-8 px-6 text-white shadow-[0_8px_25px_rgba(219,39,119,0.18)] rounded-b-[28px] relative overflow-hidden flex-shrink-0">
        {/* Subtle decorative blossom overlays */}
        <div className="absolute right-[-15px] top-[-10px] text-white/10 text-8xl font-black pointer-events-none select-none">🌸</div>
        <div className="absolute left-[-25px] bottom-[-30px] text-white/5 text-8xl font-black pointer-events-none select-none">💅</div>

        <div className="font-sans text-[11px] font-black uppercase tracking-wider text-pink-100/90">
          {dayName}, {dateName}
        </div>
        <h1 className="font-serif italic text-[30px] font-black mt-0.5 tracking-wide drop-shadow-sm text-white">
          Hey Tari 🌸
        </h1>
        
        {/* Statistics Cards Row */}
        <div className="flex gap-3 mt-5">
          
          {/* Card 1: Bookings */}
          <div className="glass-card rounded-2xl p-4 flex-1 flex flex-col justify-between">
            <span className="font-sans text-[9px] font-black uppercase tracking-widest text-pink-100">
              TODAY'S BOOKINGS
            </span>
            <div className="mt-2.5">
              <div className="font-sans text-[26px] font-black leading-none">{todayAppts.length}</div>
              <div className="font-sans text-[11px] font-bold text-white/90 mt-1">appointments</div>
            </div>
          </div>
          
          {/* Card 2: Revenue */}
          <div className="glass-card rounded-2xl p-4 flex-1 flex flex-col justify-between">
            <span className="font-sans text-[9px] font-black uppercase tracking-widest text-pink-100">
              EST. EARNINGS
            </span>
            <div className="mt-2.5">
              <div className="font-sans text-[26px] font-black leading-none">{formatMoney(earningsToday)}</div>
              <div className="font-sans text-[11px] font-bold text-white/90 mt-1">today</div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Body Section */}
      <div className="px-5 pt-5 flex flex-col gap-5">
        
        {/* Enable Notifications Callout (if not yet granted) */}
        {notificationPermission === 'default' && (
          <div 
            onClick={handleEnableNotifications}
            className="bg-white rounded-2xl p-3.5 border border-pink-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-pink-50/50 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔔</span>
              <div>
                <div className="font-sans font-bold text-xs text-gray-800">Enable 30m & Follow-up Alerts</div>
                <div className="font-sans text-[10px] text-gray-500 font-bold">Tap here to allow notifications on this device</div>
              </div>
            </div>
            <span className="text-[10px] font-extrabold bg-pink-primary text-white px-2.5 py-1 rounded-full shadow-sm">Enable</span>
          </div>
        )}

        {/* Starting Soon Alert Banner */}
        {startingSoonAppt && (
          <div 
            onClick={() => onEditAppt(startingSoonAppt)}
            className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl p-3.5 text-white shadow-lg shadow-pink-500/25 flex items-center justify-between cursor-pointer transition-all hover:opacity-95"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">⏰</span>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-pink-100">Starting Soon · 30m Alert</div>
                <div className="text-[14px] font-black leading-tight">
                  {startingSoonAppt.type === 'business' ? startingSoonAppt.clientName : startingSoonAppt.title} at {startingSoonAppt.time}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-black bg-white/20 px-2.5 py-1 rounded-full">View ›</span>
          </div>
        )}

        {/* 2-Hour Post-Appointment Follow-ups Card */}
        {pendingFollowups.length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/90 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="font-sans text-[11px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>✨ Follow-up Reminder (2h+ ago)</span>
              </div>
              <span className="text-[10px] font-extrabold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                {pendingFollowups.length} action needed
              </span>
            </div>
            
            <p className="font-sans text-xs text-amber-900/90 font-semibold leading-relaxed">
              These appointments have passed. Please update the status so your records stay accurate:
            </p>

            <div className="flex flex-col gap-2.5">
              {pendingFollowups.map((appt) => (
                <div key={appt.id} className="bg-white rounded-xl p-3 border border-amber-200/60 shadow-sm flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-sans font-black text-[13px] text-gray-800">
                        {appt.type === 'business' ? appt.clientName : appt.title}
                      </div>
                      <div className="font-sans text-[10px] text-gray-500 font-bold mt-0.5 truncate">
                        {appt.date} · {appt.time} {appt.type === 'business' ? `· ${scopeSummary(appt) || 'No services added'}` : '(Personal)'}
                      </div>
                    </div>
                    {appt.price != null && appt.type === 'business' && (
                      <div className="font-sans font-black text-pink-deep text-[13px]">{formatMoney(appt.price)}</div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => completeAppointment(appt.id)}
                      className="flex-1 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-extrabold text-[11px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      ✓ Completed
                    </button>
                    <button
                      onClick={() => onEditAppt(appt)}
                      className="flex-1 py-1.5 rounded-lg bg-pink-soft/70 hover:bg-pink-soft text-pink-deep font-extrabold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      Edit services
                    </button>
                    <button
                      onClick={() => cancelAppointment(appt.id)}
                      className="flex-1 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-extrabold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      ✗ Cancelled
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Today's Section */}
        <div>
          <div className="font-sans text-[11px] font-black text-pink-deep/75 uppercase tracking-widest mb-3">
            Schedule Today
          </div>
          {todayAppts.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-[0_4px_16px_rgba(244,114,182,0.03)] border border-pink-100/50">
              <div className="text-3xl mb-2">🌸</div>
              <div className="font-sans text-sm text-gray-500 font-bold leading-normal">
                Nothing booked today, enjoy your free time Tari! ✨
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {todayAppts.map((appt) => (
                <ApptCard
                  key={appt.id}
                  appt={appt}
                  onClick={() => onEditAppt(appt)}
                  onComplete={() => completeAppointment(appt.id)}
                  onCancel={() => cancelAppointment(appt.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Coming Up Section */}
        {upcomingAppts.length > 0 && (
          <div>
            <div className="font-sans text-[11px] font-black text-pink-deep/75 uppercase tracking-widest mb-3">
              Coming Up
            </div>
            <div className="flex flex-col gap-3">
              {upcomingAppts.map((appt) => (
                <ApptCard
                  key={appt.id}
                  appt={appt}
                  showDate
                  onClick={() => onEditAppt(appt)}
                  onComplete={() => completeAppointment(appt.id)}
                  onCancel={() => cancelAppointment(appt.id)}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
