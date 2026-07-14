import React, { useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export default function SettingsView() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const exportData = useAppStore((state) => state.exportData);
  const importData = useAppStore((state) => state.importData);

  const fileInputRef = useRef(null);
  
  // UI status states
  const [exportStatus, setExportStatus] = useState('');
  const [importStatus, setImportStatus] = useState({ success: null, message: '' });

  const handleToggle = (key) => {
    updateSettings({ [key]: !settings[key] });
  };

  const handleExport = () => {
    try {
      const dataStr = exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.download = `blush_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportStatus('Backup downloaded! 🌸');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (e) {
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
      <div className="bg-gradient-to-r from-pink-soft via-pink-primary to-pink-deep pt-6 pb-6 px-6 text-white shadow-md flex-shrink-0">
        <h1 className="font-serif italic text-[24px] font-extrabold tracking-wide drop-shadow-sm">
          Settings
        </h1>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-6">
         {/* Reminder Settings Card */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(244,114,182,0.03)] border border-pink-100/50 flex flex-col gap-4">
          <h2 className="font-serif italic text-lg text-pink-deep font-bold border-b border-pink-100 pb-2">
            Reminder Intervals
          </h2>
          <p className="font-sans text-gray-500 text-xs font-semibold -mt-2 leading-relaxed">
            Blush schedules offline push alerts leading up to appointments. Select when you want Tari to be notified:
          </p>

          <div className="flex flex-col gap-3">
            {[
              { key: 'remind24h', title: '⏰ 24 Hours Before', desc: 'Tomorrow at 3PM: Braiding for Sola 🌸' },
              { key: 'remind2h', title: '⏰ 2 Hours Before', desc: 'In 2 hours: Braiding for Sola. Get ready!' },
              { key: 'remind30m', title: '⏰ 30 Minutes Before', desc: 'Tari! Your 3PM appointment starts in 30 mins 💅' }
            ].map((opt) => (
              <div 
                key={opt.key}
                onClick={() => handleToggle(opt.key)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-pink-soft/10 transition-all cursor-pointer"
              >
                <div>
                  <div className="font-sans font-bold text-gray-800 text-[13px]">{opt.title}</div>
                  <div className="font-sans text-[10px] text-gray-500 mt-0.5 font-bold">{opt.desc}</div>
                </div>
                
                {/* Custom Toggle Switch */}
                <div className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 ease-in-out ${
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
          <p className="font-sans text-gray-500 text-xs font-semibold -mt-2 leading-relaxed">
            Appointments are stored locally on this phone. Export a backup file periodically so Tari never loses her schedule!
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
        <div className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider py-4">
          Blush PWA MVP · Built with love for Tari 🌸
        </div>

      </div>
    </div>
  );
}
