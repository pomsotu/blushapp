import React, { useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';

// Views
import HomeView from './views/HomeView';
import CalendarView from './views/CalendarView';
import AddView from './views/AddView';
import HistoryView from './views/HistoryView';
import SettingsView from './views/SettingsView';

// Navigation SVG Icons
const HomeIco = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "1" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const CalIco = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M3 9h18M8 2v4M16 2v4" />
    <circle cx="8" cy="14" r="1" fill="currentColor" />
    <circle cx="12" cy="14" r="1" fill="currentColor" />
    <circle cx="16" cy="14" r="1" fill="currentColor" />
  </svg>
);

const AddIco = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const HistIco = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);

const SettingsIco = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [editingAppt, setEditingAppt] = useState(null);
  const activeToast = useAppStore((state) => state.activeToast);
  const dismissToast = useAppStore((state) => state.dismissToast);

  // Initial setup & notification checker
  useEffect(() => {
    useAppStore.getState().checkPendingNotifications();

    const interval = setInterval(() => {
      useAppStore.getState().checkPendingNotifications();
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        useAppStore.getState().checkPendingNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
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
        return <HomeView onEditAppt={handleEditAppt} />;
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
        return <HomeView onEditAppt={handleEditAppt} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF5F7] via-[#FDF2F8] to-[#F5F3FF] flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 select-none font-sans">
      
      {/* Desktop Ambient Header */}
      <div className="hidden sm:flex items-center gap-2 mb-3 text-pink-deep">
        <span className="font-serif italic text-2xl font-black tracking-tight">blush 🌸</span>
        <span className="text-xs font-extrabold uppercase tracking-widest text-pink-400 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100">Tari's Studio</span>
      </div>

      {/* Main Responsive Mobile-First App Shell */}
      <div className="w-full h-[100dvh] sm:w-[420px] sm:h-[860px] sm:max-h-[92vh] sm:rounded-[36px] bg-white sm:shadow-[0_20px_60px_rgba(219,39,119,0.12),0_1px_3px_rgba(0,0,0,0.04)] sm:border sm:border-pink-100/80 flex flex-col overflow-hidden relative">
        
        {/* Floating In-App Heads-Up Notification Banner */}
        {activeToast && (
          <div className="absolute top-4 left-4 right-4 z-50 transition-all transform ease-out duration-300">
            <div className="bg-gradient-to-r from-pink-600 via-pink-500 to-pink-600 text-white p-3.5 rounded-2xl shadow-[0_12px_28px_rgba(219,39,119,0.45)] border border-pink-200/50 flex items-center justify-between">
              <div className="flex items-center gap-3 pr-2 min-w-0">
                <span className="text-2xl flex-shrink-0">🌸</span>
                <div className="min-w-0">
                  <div className="font-sans font-black text-xs tracking-wide truncate">{activeToast.title}</div>
                  <div className="font-sans font-medium text-[11px] text-pink-50 mt-0.5 leading-snug line-clamp-2">{activeToast.body}</div>
                </div>
              </div>
              <button 
                type="button"
                onClick={dismissToast}
                className="text-white font-black text-xs px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer flex-shrink-0 border-none ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Scrollable View Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-gradient-to-b from-[#FFFDFE] to-pink-50/20">
          {renderView()}
        </div>

        {/* Docked Floating-Style Bottom Navigation */}
        <div className="bg-white/95 backdrop-blur-lg border-t border-pink-100/70 px-3 pt-2 pb-safe flex items-center justify-between relative z-30 flex-shrink-0 shadow-[0_-4px_20px_rgba(244,114,182,0.06)]">
          
          {/* 1. Home Tab */}
          <button
            data-testid="nav-home"
            onClick={() => setCurrentView('home')}
            className={`flex-1 flex flex-col items-center gap-1 py-1 bg-transparent border-none cursor-pointer transition-all ${
              currentView === 'home' ? 'text-pink-deep font-black scale-105' : 'text-gray-400 font-bold hover:text-pink-deep/70'
            }`}
          >
            <HomeIco active={currentView === 'home'} />
            <span className="text-[10px] tracking-wide uppercase">Home</span>
          </button>

          {/* 2. Calendar Tab */}
          <button
            data-testid="nav-cal"
            onClick={() => setCurrentView('cal')}
            className={`flex-1 flex flex-col items-center gap-1 py-1 bg-transparent border-none cursor-pointer transition-all ${
              currentView === 'cal' ? 'text-pink-deep font-black scale-105' : 'text-gray-400 font-bold hover:text-pink-deep/70'
            }`}
          >
            <CalIco active={currentView === 'cal'} />
            <span className="text-[10px] tracking-wide uppercase">Calendar</span>
          </button>

          {/* 3. Center Add Quick Action Button */}
          <div className="flex-1 flex justify-center -mt-7 relative">
            <button
              data-testid="nav-add"
              onClick={handleAddNewAppt}
              aria-label="New Appointment"
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-pink-primary via-[#F472B6] to-pink-deep text-white flex items-center justify-center shadow-[0_8px_20px_rgba(219,39,119,0.38)] border-4 border-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer z-40"
            >
              <AddIco />
            </button>
          </div>

          {/* 4. History Tab */}
          <button
            data-testid="nav-hist"
            onClick={() => setCurrentView('hist')}
            className={`flex-1 flex flex-col items-center gap-1 py-1 bg-transparent border-none cursor-pointer transition-all ${
              currentView === 'hist' ? 'text-pink-deep font-black scale-105' : 'text-gray-400 font-bold hover:text-pink-deep/70'
            }`}
          >
            <HistIco active={currentView === 'hist'} />
            <span className="text-[10px] tracking-wide uppercase">History</span>
          </button>

          {/* 5. Settings Tab */}
          <button
            data-testid="nav-settings"
            onClick={() => setCurrentView('settings')}
            className={`flex-1 flex flex-col items-center gap-1 py-1 bg-transparent border-none cursor-pointer transition-all ${
              currentView === 'settings' ? 'text-pink-deep font-black scale-105' : 'text-gray-400 font-bold hover:text-pink-deep/70'
            }`}
          >
            <SettingsIco active={currentView === 'settings'} />
            <span className="text-[10px] tracking-wide uppercase">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
