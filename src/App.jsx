import React, { useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';

// Views
import HomeView from './views/HomeView';
import CalendarView from './views/CalendarView';
import AddView from './views/AddView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';

// Components
import ApptCard from './components/ApptCard';

// Navigation SVG Icons
const HomeIco = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const CalIco = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M3 9h18M8 2v4M16 2v4" />
    <circle cx="8" cy="14" r="0.5" fill="currentColor" />
    <circle cx="12" cy="14" r="0.5" fill="currentColor" />
    <circle cx="16" cy="14" r="0.5" fill="currentColor" />
  </svg>
);

const AddIco = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const HistIco = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);

const SettingsIco = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [editingAppt, setEditingAppt] = useState(null);

  // Register PWA Service Worker & Request Notification Permission
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Blush Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }

    // Request notification permission if not asked yet
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleEditAppt = (appt) => {
    setEditingAppt(appt);
    setCurrentView('add');
  };

  const handleAddNewAppt = () => {
    setEditingAppt(null);
    setCurrentView('add');
  };

  // Render view router
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView onEditAppt={handleEditAppt} onAddAppt={handleAddNewAppt} />;
      case 'cal':
        return <CalendarView onEditAppt={handleEditAppt} />;
      case 'add':
        return (
          <AddView 
            editAppt={editingAppt} 
            onSave={() => {
              setEditingAppt(null);
              setCurrentView('home');
            }} 
            onCancel={() => {
              setEditingAppt(null);
              setCurrentView('home');
            }} 
          />
        );
      case 'hist':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView onEditAppt={handleEditAppt} onAddAppt={handleAddNewAppt} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-soft via-[#F3E8FF] to-pink-soft flex flex-col items-center justify-center p-0 sm:p-8 select-none">
      
      {/* Top Logo (Desktop only) */}
      <div className="hidden sm:block absolute top-6 z-20">
        <span className="font-serif italic text-[24px] text-pink-deep font-black tracking-wide">
          blush 🌸
        </span>
      </div>

      {/* Main Core Container */}
      <div className="relative w-full h-screen sm:w-[375px] sm:h-[812px] flex-shrink-0">
        
        {/* iPhone Bezel (Desktop only) */}
        <div className="hidden sm:block absolute inset-0 bg-[#1C1C1E] rounded-[48px] shadow-[0_40px_80px_rgba(219,39,119,0.18),0_0_0_1px_rgba(255,255,255,0.08)_inset]" />
        
        {/* Side physical buttons (Desktop only) */}
        <div className="hidden sm:block absolute left-[-3px] top-[108px] width-[3px] h-[30px] bg-[#2C2C2E] rounded-l-md" />
        <div className="hidden sm:block absolute left-[-3px] top-[154px] width-[3px] h-[54px] bg-[#2C2C2E] rounded-l-md" />
        <div className="hidden sm:block absolute left-[-3px] top-[216px] width-[3px] h-[54px] bg-[#2C2C2E] rounded-l-md" />
        <div className="hidden sm:block absolute right-[-3px] top-[138px] width-[3px] h-[68px] bg-[#2C2C2E] rounded-r-md" />

        {/* Screen Area (Full screen on mobile, nested inside bezel on desktop) */}
        <div className="absolute inset-0 sm:inset-3 bg-pink-soft/30 sm:rounded-[46px] overflow-hidden flex flex-col shadow-inner pt-2 sm:pt-8">
          
          {/* Desktop-only floating Dynamic Island bezel (Floats over the screen content on desktop only) */}
          <div className="hidden sm:block absolute left-1/2 top-[12px] -translate-x-1/2 w-[106px] h-[28px] bg-black rounded-[18px] z-30" />

          {/* View Container (Scrollable screen body) */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-6 bg-gradient-to-b from-pink-soft/20 via-[#FDF5FF] to-pink-soft/30">
            {renderView()}
          </div>

          {/* Bottom Sticky Navigation */}
          <div className="bg-white/80 backdrop-blur-md border-t border-pink-100/60 flex items-center pt-2.5 pb-2.5 sm:pb-3.5 relative z-10 flex-shrink-0 px-2">
            
            {/* Nav Items */}
            <button
              onClick={() => setCurrentView('home')}
              className={`flex-1 flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer transition-all ${
                currentView === 'home' ? 'text-pink-deep scale-105' : 'text-[#8E7E89] hover:text-pink-deep/80'
              }`}
            >
              <HomeIco active={currentView === 'home'} />
              <span className="font-sans text-[9px] font-black tracking-wide uppercase">Home</span>
            </button>

            <button
              onClick={() => setCurrentView('cal')}
              className={`flex-1 flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer transition-all ${
                currentView === 'cal' ? 'text-pink-deep scale-105' : 'text-[#8E7E89] hover:text-pink-deep/80'
              }`}
            >
              <CalIco active={currentView === 'cal'} />
              <span className="font-sans text-[9px] font-black tracking-wide uppercase">Calendar</span>
            </button>

            {/* Quick center Add button */}
            <div className="flex-1 flex justify-center -mt-8 relative">
              <button
                onClick={handleAddNewAppt}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-primary to-pink-deep flex items-center justify-center shadow-[0_6px_20px_rgba(219,39,119,0.35)] border-4 border-white transition-all transform hover:scale-105 cursor-pointer active:scale-95 z-20"
              >
                <AddIco />
              </button>
            </div>

            <button
              onClick={() => setCurrentView('hist')}
              className={`flex-1 flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer transition-all ${
                currentView === 'hist' ? 'text-pink-deep scale-105' : 'text-[#8E7E89] hover:text-pink-deep/80'
              }`}
            >
              <HistIco active={currentView === 'hist'} />
              <span className="font-sans text-[9px] font-black tracking-wide uppercase">History</span>
            </button>

            <button
              onClick={() => setCurrentView('settings')}
              className={`flex-1 flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer transition-all ${
                currentView === 'settings' ? 'text-pink-deep scale-105' : 'text-[#8E7E89] hover:text-pink-deep/80'
              }`}
            >
              <SettingsIco active={currentView === 'settings'} />
              <span className="font-sans text-[9px] font-black tracking-wide uppercase">Settings</span>
            </button>
          </div>

          {/* Bottom Home Indicator Bar (Desktop/Mock bezel only) */}
          <div className="hidden sm:flex bg-white justify-center pb-2 pt-1 flex-shrink-0">
            <div className="w-[110px] h-[4px] bg-[#E8DCE5] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
