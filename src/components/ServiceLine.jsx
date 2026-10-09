import React from 'react';
import { SERVICE_KINDS } from '../utils/services';
import { findOption, priceLabel } from '../data/priceList';
import Stepper from './Stepper';
import ServiceNameField from './ServiceNameField';

// One service on a booking: a name field with that type's options built in,
// a price, and a nail-count stepper for per-nail add-ons.
export default function ServiceLine({ item, index, recent, onPick, onChange, onQty, onRemove }) {
  const kind = SERVICE_KINDS[item.kind] || SERVICE_KINDS.other;
  const option = findOption(item.kind, item.catalog);
  const qty = item.qty || 1;

  return (
    <li
      data-testid="service-item"
      className="relative bg-white border border-pink-100 rounded-xl pl-3 pr-1 py-2 shadow-sm flex flex-col gap-2 has-[[aria-expanded=true]]:z-30"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-pink-deep bg-pink-soft/70 rounded-full px-2 py-0.5 flex-shrink-0">
            {kind.label}
          </span>
          {option && (option.max || option.perNail) && (
            <span className="text-[10px] font-bold text-gray-500 truncate">{priceLabel(option)}</span>
          )}
        </span>
        <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.name || kind.defaultName}`}
            className="w-9 h-9 -my-1.5 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 bg-transparent border-none cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-pink-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
        </button>
      </div>

      <div className="flex gap-2 pr-2">
        <ServiceNameField
          item={item}
          index={index}
          placeholder={kind.defaultName}
          recent={recent}
          onType={(name) => onChange({ name, catalog: undefined, qty: undefined })}
          onPickOption={onPick}
          onPickRecent={(r) => onChange({
            name: r.name,
            price: typeof r.price === 'number' ? String(r.price) : item.price,
            catalog: undefined,
            qty: undefined
          })}
        />
        <div className="relative w-[92px] flex-shrink-0">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none" aria-hidden="true">$</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={item.price}
            onChange={(e) => onChange({ price: e.target.value })}
            placeholder="0"
            aria-label={`Service ${index + 1} price`}
            className="no-spinner w-full bg-pink-50/40 border border-pink-100/70 rounded-lg pl-6 pr-2 py-2.5 text-sm font-bold tabular-nums outline-none focus:border-pink-primary focus:bg-white transition-all text-gray-700"
          />
        </div>
      </div>

      {option?.perNail && (
        <div className="flex items-center justify-between pr-2">
          <span className="font-sans text-[11px] font-bold text-gray-500">
            How many nails
          </span>
          <Stepper
            value={qty}
            min={1}
            max={20}
            onChange={onQty}
            label={`${option.name} nail count`}
          />
        </div>
      )}
    </li>
  );
}
