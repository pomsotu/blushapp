import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getOshawaTodayStr } from '../utils/dateUtils';
import { registerPushSubscription } from '../utils/pushManager';

export default function SettingsView() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const exportData = useAppStore((state) => state.exportData);
  const importData = useAppStore((state) => state.importData);
  const sendTestNotification = useAppStore((state) => state.sendTestNotification);

  const fileInputRef = useRef(null);
  
  // Notification permission state
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [testAlertStatus, setTestAlertStatus] = useState('');

  // UI status states
  const [exportStatus, setExportStatus] = useState('');
  const [importStatus, setImportStatus] = useState({ success: null, message: '' });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        registerPushSubscription().catch(() => {});
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window)) {
      setPermission('unsupported');
      setTestAlertStatus('In-app alert & sound fired! 🌸 (Browser lacks Notification API)');
      await sendTestNotification();
      setTimeout(() => setTestAlertStatus(''), 5000);
      return;
    }

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
      setPermission(res);

      if (res === 'granted') {
        await registerPushSubscription().catch(() => {});
      }

      // ALWAYS trigger test alert so Tari gets instant visual, sound, and haptic feedback
      await sendTestNotification();

      if (res === 'granted') {
        setTestAlertStatus('Background alerts active! Sent test alert 🌸');
      } else if (res === 'denied') {
        setTestAlertStatus('In-app alert fired 🌸 (System alerts blocked in browser settings)');
      } else {
        setTestAlertStatus('In-app alert fired 🌸');
      }
    } catch (e) {
      console.warn('Notification permission error:', e);
      await sendTestNotification();
      setTestAlertStatus('In-app alert fired 🌸');
    }
    setTimeout(() => setTestAlertStatus(''), 5000);
  };

  const handleSendTestAlert = async () => {
    // Attempt permission request if still in default state
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        const permPromise = Notification.requestPermission();
        let res;
        if (permPromise && typeof permPromise.then === 'function') {
          res = await permPromise;
        } else {
          res = await new Promise((resolve) => Notification.requestPermission(resolve));
        }
        setPermission(res);
      } catch {}
    }

    // ALWAYS dispatch test notification immediately
    await sendTestNotification();

    const currentPerm = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
    if (currentPerm === 'granted') {
      setTestAlertStatus('Test alert sent! Check top banner & status bar 🌸');
    } else if (currentPerm === 'denied') {
      setTestAlertStatus('In-app alert fired 🌸 (OS alerts blocked in browser permissions)');
    } else {
      setTestAlertStatus('In-app alert sent! 🌸');
    }
    setTimeout(() => setTestAlertStatus(''), 5000);
  };

  const handleToggle = (key) => {
    updateSettings({ [key]: !settings[key] });
  };

  const handleExport = () => {
    try {
      const dataStr = exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const dateStr = getOshawaTodayStr();
      
      link.href = url;
      link.download = `blush_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportStatus('Backup downloaded! 🌸');
      setTimeout(() => setExportStatus(''), 3000);
    } catch {
      setExportStatus('Export failed ❌');
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const result = importData(content);
      
      if (result.success) {
        setImportStatus({ success: true, message: 'Schedule imported successfully! 💅' });
      } else {
        setImportStatus({ success: false, message: `Import failed: ${result.error}` });
      }
      
      // Clear input so same file can be selected again
      event.target.value = '';
      setTimeout(() => setImportStatus({ success: null, message: '' }), 4500);
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col min-h-full">
      
      {/* Header Container */}
      <div className="bg-gradient-to-br from-pink-primary via-[#EC4899] to-pink-deep pt-7 pb-6 px-6 text-white shadow-[0_8px_25px_rgba(219,39,119,0.18)] rounded-b-[28px] mb-2 flex-shrink-0">
        <h1 className="font-serif italic text-[26px] font-black tracking-wide drop-shadow-sm text-white">
          Settings ⚙️
        </h1>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-5 pb-8">
        
        {/* Phone Notifications Setup Card */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(244,114,182,0.03)] border border-pink-100/50 flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-pink-100 pb-2.5">
            <h2 className="font-serif italic text-lg text-pink-deep font-bold">
              Push Notifications
            </h2>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
              permission === 'granted'
                ? 'bg-green-50 text-green-600 border border-green-200/60'
                : permission === 'denied'
                ? 'bg-red-50 text-red-500 border border-red-200/60'
                : 'bg-pink-50 text-pink-deep border border-pink-200/60'
            }`}>
              {permission === 'granted' ? 'Active 🟢' : permission === 'denied' ? 'Blocked ⚠️' : 'Setup Needed 🔔'}
            </span>
          </div>

          <p className="font-sans text-gray-500 text-xs font-semibold leading-relaxed">
            Allow Blush to send alerts 30 mins before appointments and follow-ups 2 hours after to keep your schedule accurate.
          </p>

          <div className="flex flex-col gap-2">
            {permission !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-primary to-pink-deep text-white font-extrabold text-xs shadow-md shadow-pink-primary/20 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                🔔 Enable Notifications on this Device
              </button>
            )}

            <button
              onClick={handleSendTestAlert}
              className="w-full py-2.5 rounded-2xl bg-pink-soft/50 text-pink-deep hover:bg-pink-soft font-black text-xs transition-all border border-pink-100/40 cursor-pointer flex items-center justify-center gap-2"
            >
              🌸 Send Test Notification
            </button>

            {testAlertStatus && (
              <div className="text-center font-sans text-xs font-bold text-pink-deep animate-pulse mt-1">
                {testAlertStatus}
              </div>
            )}

            {permission === 'denied' && (
              <div className="bg-red-50 border border-red-200/80 rounded-xl p-3 text-[11px] text-red-900 font-medium leading-relaxed mt-1">
                <span className="font-bold">⚠️ Alerts blocked in browser:</span> Tap the tune/lock icon in your address bar → Permissions → Notifications → tap <b>Allow</b>, then tap Send Test Notification.
              </div>
            )}

            {typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches && !navigator.standalone && (
              <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 text-[11px] text-blue-950 font-medium leading-relaxed mt-1">
                <span className="font-bold">📲 iPhone / iPad Setup (iOS 16.4+):</span> To receive lockscreen alerts when the app is closed on iOS, tap the Safari <b>Share (↑)</b> button below → select <b>Add to Home Screen</b>, then launch Blush from your home screen.
              </div>
            )}

            {typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && (
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 font-medium leading-relaxed mt-1">
                <span className="font-bold">📱 Android Local WiFi Notice:</span> Android requires HTTPS for OS lockscreen alerts. In-app popups and chimes work everywhere. Deploying to Vercel provides full HTTPS lockscreen alerts.
              </div>
            )}
          </div>
        </div>

        {/* Reminder Settings Card */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(244,114,182,0.03)] border border-pink-100/50 flex flex-col gap-4">
          <h2 className="font-serif italic text-lg text-pink-deep font-bold border-b border-pink-100 pb-2">
            Reminder Schedule
          </h2>
          <p className="font-sans text-gray-500 text-xs font-semibold -mt-2 leading-relaxed">
            Choose when you want Tari to receive alerts for scheduled appointments:
          </p>

          <div className="flex flex-col gap-3">
            {[
              { 
                key: 'remind30m', 
                title: '⏰ 30 Minutes Before (Recommended)', 
                desc: 'Tari, your 3PM appointment starts in 30 mins 💅',
                badge: 'Primary'
              },
              { 
                key: 'remind2hAfter', 
                title: '✨ 2 Hours After (Follow-up)', 
                desc: 'Did your appointment finish? Tap to mark completed or cancelled',
                badge: 'Follow-up'
              },
              { 
                key: 'remind2h', 
                title: '⏰ 2 Hours Before', 
                desc: 'In 2 hours: Braiding for Sola. Get ready!' 
              },
              { 
                key: 'remind24h', 
                title: '⏰ 24 Hours Before', 
                desc: 'Tomorrow at 3PM: Braiding for Sola 🌸' 
              }
            ].map((opt) => (
              <div 
                key={opt.key}
                onClick={() => handleToggle(opt.key)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-pink-soft/10 transition-all cursor-pointer"
              >
                <div className="pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans font-bold text-gray-800 text-[13px]">{opt.title}</span>
                  </div>
                  <div className="font-sans text-[10px] text-gray-500 mt-0.5 font-bold leading-normal">{opt.desc}</div>
                </div>
                
                {/* Custom Toggle Switch */}
                <div className={`w-11 h-6 rounded-full p-0.5 flex-shrink-0 transition-all duration-200 ease-in-out ${
                  settings[opt.key] ? 'bg-pink-primary' : 'bg-gray-200'
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out transform ${
                    settings[opt.key] ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database Management Card */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(244,114,182,0.03)] border border-pink-100/50 flex flex-col gap-4">
          <h2 className="font-serif italic text-lg text-pink-deep font-bold border-b border-pink-100 pb-2">
            Backup & Sync
          </h2>
          
          <div className="bg-green-50 border border-green-200/70 rounded-2xl p-3 flex items-center gap-2.5">
            <span className="text-xl flex-shrink-0">🛡️</span>
            <div className="text-[11px] text-green-900 font-bold leading-tight">
              Automatic Data Protection Active
              <div className="font-medium text-green-800 text-[10px] mt-0.5">Your schedule is auto-saved to dual local storage vaults to prevent any data loss across updates.</div>
            </div>
          </div>

          <p className="font-sans text-gray-500 text-xs font-semibold leading-relaxed">
            Export a backup file anytime so Tari can save or transfer her schedule to another device:
          </p>

          <div className="flex flex-col gap-2.5">
            {/* Export */}
            <button
              onClick={handleExport}
              className="w-full py-3.5 rounded-2xl bg-pink-soft/50 text-pink-deep hover:bg-pink-soft font-black text-xs transition-all border border-pink-100/35 cursor-pointer flex items-center justify-center gap-2"
            >
              📥 Export Schedule Data (.json)
            </button>
            {exportStatus && (
              <div className="text-center font-sans text-xs font-bold text-green-600 animate-pulse">
                {exportStatus}
              </div>
            )}

            {/* Import */}
            <button
              onClick={handleImportClick}
              className="w-full py-3.5 rounded-2xl bg-white text-gray-700 hover:bg-gray-50 font-black text-xs transition-all border border-gray-300 cursor-pointer flex items-center justify-center gap-2"
            >
              📤 Import Schedule Backup
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            
            {importStatus.success !== null && (
              <div className={`text-center font-sans text-xs font-bold ${
                importStatus.success ? 'text-green-600' : 'text-red-500'
              }`}>
                {importStatus.message}
              </div>
            )}
          </div>
        </div>

        {/* Info footer */}
        <div className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider py-2">
          Blush PWA MVP · Built with love for Tari 🌸
        </div>

      </div>
    </div>
  );
}
