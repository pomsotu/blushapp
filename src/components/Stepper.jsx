import React from 'react';

const Icon = ({ d }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

// − value + control. With `allowZero`, the minus button stays enabled at
// `min` so the caller can treat it as "remove".
export default function Stepper({ value, min = 0, max = 99, onChange, label, allowZero = false }) {
  const canDec = allowZero ? value > 0 : value > min;
  const canInc = value < max;
  const btn =
    'w-9 h-9 rounded-full flex items-center justify-center border-none cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-pink-primary disabled:opacity-35 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center gap-1 bg-pink-soft/60 rounded-full p-0.5" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDec}
        aria-label={`Decrease ${label}`}
        className={`${btn} bg-white text-pink-deep hover:bg-pink-50 active:scale-95`}
      >
        <Icon d="M5 12h14" />
      </button>
      <span className="min-w-6 text-center font-sans text-[14px] font-black text-pink-deep tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canInc}
        aria-label={`Increase ${label}`}
        className={`${btn} bg-pink-deep text-white hover:bg-pink-600 active:scale-95`}
      >
        <Icon d="M12 5v14M5 12h14" />
      </button>
    </div>
  );
}
