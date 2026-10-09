import React, { useEffect, useRef } from 'react';

// Centered confirmation pop-up for destructive or significant actions.
// Focus starts on the safe choice, Escape and the backdrop dismiss it.
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  details,
  confirmLabel,
  cancelLabel = 'Keep it',
  tone = 'danger',
  onConfirm,
  onCancel
}) {
  const cancelRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!isOpen) return undefined;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const danger = tone === 'danger';

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/40 blush-fade-in" onClick={onCancel} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        data-testid="confirm-dialog"
        className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-[0_24px_60px_rgba(31,31,31,0.25)] blush-pop-in"
      >
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
            danger ? 'bg-red-50 text-red-600' : 'bg-pink-soft text-pink-deep'
          }`}
          aria-hidden="true"
        >
          {danger ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          )}
        </div>

        <h2 id="confirm-title" className="font-sans text-[17px] font-black text-gray-900 leading-snug">
          {title}
        </h2>
        <p id="confirm-message" className="font-sans text-[13px] font-semibold text-gray-600 leading-relaxed mt-1.5">
          {message}
        </p>

        {details && (
          <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 font-sans text-[12.5px] font-bold text-gray-700 leading-snug">
            {details}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-5">
          <button
            type="button"
            data-testid="confirm-yes"
            onClick={onConfirm}
            className={`w-full py-3 rounded-2xl font-extrabold text-sm border-none cursor-pointer transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 ${
              danger
                ? 'bg-red-600 hover:bg-red-700 text-white focus-visible:outline-red-600'
                : 'bg-pink-deep hover:bg-pink-600 text-white focus-visible:outline-pink-primary'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            data-testid="confirm-no"
            onClick={onCancel}
            className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-sm border-none cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
