import React, { useEffect, useRef, useState } from 'react';
import { sectionsForKind, priceLabel } from '../data/priceList';
import { formatMoney } from '../utils/services';

// Service name input with its options built in (combobox). Shows only the
// options for this service type, plus names she has used before for the same
// type. Typing filters the list; anything typed is kept as a custom service.
export default function ServiceNameField({ item, index, placeholder, recent = [], onType, onPickOption, onPickRecent }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(null); // null = show everything
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listId = `svc-list-${item.id}`;

  const q = (query || '').trim().toLowerCase();
  const matches = (name) => !q || name.toLowerCase().includes(q);

  const groups = [
    ...sectionsForKind(item.kind).map((section) => ({
      title: section.title,
      entries: section.items
        .filter((o) => matches(o.name))
        .map((o) => ({ key: `o:${o.name}`, name: o.name, price: priceLabel(o), pick: () => onPickOption(o), selected: item.catalog === o.name }))
    })),
    {
      title: 'Recently used',
      entries: recent
        .filter((r) => matches(r.name))
        .map((r) => ({
          key: `r:${r.name}`,
          name: r.name,
          price: typeof r.price === 'number' ? formatMoney(r.price) : '',
          pick: () => onPickRecent(r),
          selected: !item.catalog && item.name === r.name
        }))
    }
  ].filter((g) => g.entries.length > 0);

  const flat = groups.flatMap((g) => g.entries);
  const hasChoices = sectionsForKind(item.kind).some((s) => s.items.length) || recent.length > 0;
  const showList = open && hasChoices;

  // Close when tapping anywhere outside this field
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const openList = (withQuery = null) => {
    setQuery(withQuery);
    setActive(-1);
    setOpen(true);
  };

  const choose = (entry) => {
    entry.pick();
    setOpen(false);
    setQuery(null);
  };

  const onKeyDown = (e) => {
    if (!hasChoices) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showList) openList();
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && showList && active >= 0 && flat[active]) {
      e.preventDefault();
      choose(flat[active]);
    } else if (e.key === 'Escape' && showList) {
      e.preventDefault();
      setOpen(false);
    }
  };

  let flatIndex = -1;

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        role={hasChoices ? 'combobox' : undefined}
        aria-expanded={hasChoices ? showList : undefined}
        aria-controls={hasChoices ? listId : undefined}
        aria-autocomplete={hasChoices ? 'list' : undefined}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={`Service ${index + 1} name`}
        value={item.name}
        onChange={(e) => {
          onType(e.target.value);
          if (hasChoices) openList(e.target.value);
        }}
        onFocus={() => hasChoices && openList()}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={80}
        autoComplete="off"
        className={`w-full bg-pink-50/40 border border-pink-100/70 rounded-lg pl-2.5 py-2.5 text-sm font-semibold outline-none focus:border-pink-primary focus:bg-white transition-all text-gray-700 ${hasChoices ? 'pr-9' : 'pr-2.5'}`}
      />

      {hasChoices && (
        <button
          type="button"
          tabIndex={-1}
          data-testid="service-options-toggle"
          aria-label={`Show ${placeholder.toLowerCase()} options`}
          onClick={() => (showList ? setOpen(false) : openList())}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md flex items-center justify-center bg-transparent border-none text-pink-deep cursor-pointer hover:bg-pink-soft/60"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            className={`transition-transform duration-200 ${showList ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          data-testid="service-options"
          aria-label={`${placeholder} options`}
          className="absolute left-0 top-full mt-1 w-[calc(100%+100px)] max-w-[calc(100vw-56px)] max-h-64 overflow-y-auto no-scrollbar z-30 list-none m-0 p-1 bg-white rounded-xl border border-pink-200 shadow-[0_12px_32px_rgba(219,39,119,0.16)] blush-pop-in"
        >
          {flat.length === 0 && (
            <li className="px-3 py-2.5 font-sans text-xs font-semibold text-gray-500">
              No match. "{item.name}" will be saved as a custom service.
            </li>
          )}
          {groups.map((g) => (
            <li key={g.title} role="presentation">
              <div className="px-2.5 pt-2 pb-1 font-sans text-[10px] font-black uppercase tracking-widest text-pink-deep/70">
                {g.title}
              </div>
              <ul role="group" aria-label={g.title} className="list-none m-0 p-0">
                {g.entries.map((entry) => {
                  flatIndex += 1;
                  const i = flatIndex;
                  return (
                    <li
                      key={entry.key}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={entry.selected}
                      data-testid="service-option-item"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => choose(entry)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex items-center gap-2 px-2.5 py-2.5 rounded-lg cursor-pointer font-sans text-[13px] ${
                        i === active ? 'bg-pink-soft/70' : entry.selected ? 'bg-pink-soft/35' : ''
                      }`}
                    >
                      <span className={`flex-1 min-w-0 truncate ${entry.selected ? 'font-black text-pink-deep' : 'font-bold text-gray-800'}`}>
                        {entry.name}
                      </span>
                      <span className="font-extrabold text-[12px] text-pink-deep tabular-nums whitespace-nowrap">{entry.price}</span>
                      <span className="w-4 flex-shrink-0 text-pink-deep" aria-hidden="true">
                        {entry.selected && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5L20 7" />
                          </svg>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
