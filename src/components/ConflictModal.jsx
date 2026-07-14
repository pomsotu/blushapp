import React from 'react';

export default function ConflictModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/35 backdrop-blur-[4px]" 
        onClick={onCancel}
      />
      
      {/* Modal Box */}
      <div className="relative w-full max-w-sm bg-white/95 rounded-3xl p-6 shadow-2xl border border-pink-100/50 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          {/* Warning Icon Container */}
          <div className="w-16 h-16 rounded-full bg-pink-soft/80 flex items-center justify-center text-3xl mb-4 border border-white shadow-[0_4px_16px_rgba(244,114,182,0.15)]">
            ⚠️
          </div>
          
          <h3 className="font-serif italic text-xl font-bold text-pink-deep mb-2">
            Schedule Clash! 🌸
          </h3>
          
          <p className="font-sans text-gray-500 text-sm leading-relaxed mb-6 font-semibold">
            Heads up Tari — you already have another appointment scheduled during this time window. Still want to save this booking anyway?
          </p>
          
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-primary to-pink-deep text-white font-extrabold text-sm shadow-md shadow-pink-primary/20 hover:opacity-95 transition-all"
            >
              Go Back & Change Time 📅
            </button>
            
            <button
              onClick={onConfirm}
              className="w-full py-3 rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 font-bold text-sm transition-all border border-gray-200/50"
            >
              Save Anyway ✨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
