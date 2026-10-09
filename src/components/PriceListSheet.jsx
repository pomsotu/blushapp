import React, { useEffect, useRef } from 'react';
import { SERVICE_CATALOG, hasOptions, priceLabel } from '../data/priceList';
import { SERVICE_KINDS } from '../utils/services';
import Stepper from './Stepper';

// Bottom sheet with Tari's price list. Each option has a − / + stepper whose
// count reflects what is on the booking right now, so tapping − takes it off.
export default function PriceListSheet({ isOpen, countFor, onAdd, onRemove, totalLabel, onClose }) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus the close button and listen for Escape only when the sheet opens
  useEffect(() => {
    if (!isOpen) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const kinds = Object.keys(SERVICE_CATALOG).filter(hasOptions);

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/35 blush-fade-in" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-list-title"
        data-testid="price-list-sheet"
        className="relative bg-[#FFFDFE] rounded-t-[28px] max-h-[88%] flex flex-col shadow-[0_-12px_40px_rgba(219,39,119,0.18)] blush-sheet-in"
      >
        <div className="flex-shrink-0 px-5 pt-2.5 pb-3 border-b border-pink-100/70">
          <div className="w-10 h-1 rounded-full bg-pink-200 mx-auto mb-3" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h2 id="price-list-title" className="font-serif italic text-[22px] font-black text-pink-deep">
              T's Price List
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close price list"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-soft/60 text-pink-deep hover:bg-pink-soft border-none cursor-pointer focus-visible:outline-2 focus-visible:outline-pink-primary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <p className="font-sans text-[11px] font-bold text-gray-500 mt-1">
            Use + and − to add or take off services. You can change any price after.
          </p>
        </div>

        <div className="overflow-y-auto no-scrollbar px-5 pt-4 pb-4 flex flex-col gap-5">
          {kinds.map((kind) => (
            <div key={kind} className="flex flex-col gap-5">
              {kinds.length > 1 && (
                <div className="font-serif italic text-lg font-black text-pink-deep -mb-2">
                  {SERVICE_KINDS[kind].label}
                </div>
              )}
              {SERVICE_CATALOG[kind].filter((s) => s.items.length).map((section) => (
                <section key={section.id} aria-labelledby={`pl-${section.id}`}>
                  <h3
                    id={`pl-${section.id}`}
                    className="font-sans text-[11px] font-black text-pink-deep/80 uppercase tracking-widest mb-2"
                  >
                    {section.title}
                  </h3>
                  <ul className="list-none p-0 m-0 bg-white rounded-2xl border border-pink-100 divide-y divide-pink-50 overflow-hidden">
                    {section.items.map((opt) => {
                      const count = countFor(opt);
                      return (
                        <li
                          key={opt.name}
                          data-testid="price-option"
                          data-name={opt.name}
                          className={`flex items-center gap-3 pl-3.5 pr-2 py-2 transition-colors ${count ? 'bg-pink-soft/35' : ''}`}
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block font-sans text-[13px] font-bold text-gray-800">{opt.label}</span>
                            <span className="block font-sans text-[12px] font-extrabold text-pink-deep tabular-nums">
                              {priceLabel(opt)}
                            </span>
                          </span>
                          {count === 0 ? (
                            <button
                              type="button"
                              onClick={() => onAdd(opt, kind)}
                              aria-label={`Add ${opt.name}`}
                              className="w-9 h-9 mr-0.5 rounded-full flex items-center justify-center bg-pink-deep text-white hover:bg-pink-600 active:scale-95 border-none cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-primary"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            </button>
                          ) : (
                            <Stepper
                              value={count}
                              allowZero
                              max={20}
                              label={opt.name}
                              onChange={(next) => (next > count ? onAdd(opt, kind) : onRemove(opt, kind))}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {section.note && (
                    <p className="font-sans text-[11px] font-semibold text-gray-500 mt-2 leading-snug">{section.note}</p>
                  )}
                </section>
              ))}
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 px-5 pt-3 pb-safe border-t border-pink-100/70 bg-white/95">
          <button
            type="button"
            onClick={onClose}
            data-testid="price-list-done"
            className="w-full mb-2 py-3.5 rounded-2xl bg-gradient-to-r from-pink-primary to-pink-deep text-white font-extrabold text-sm border-none cursor-pointer flex items-center justify-between px-5 shadow-lg shadow-pink-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-primary"
          >
            <span>Done</span>
            <span className="tabular-nums">{totalLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
