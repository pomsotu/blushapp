import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import PriceListSheet from '../components/PriceListSheet';
import ServiceLine from '../components/ServiceLine';
import ConfirmDialog from '../components/ConfirmDialog';
import { findOption, optionLine } from '../data/priceList';
import { getOshawaTodayStr, formatTime } from '../utils/dateUtils';
import {
  SERVICE_KINDS,
  MAX_ITEMS,
  newItemId,
  getServiceItems,
  formatMoney
} from '../utils/services';
import {
  DURATION_OPTIONS,
  formatDurationLabel,
  formatTimeRange,
  findConflict,
  findNextFreeStart,
  getDurationMins
} from '../utils/schedule';

const blankItem = (kind = 'hair') => ({ id: newItemId(), kind, name: '', price: '' });

const toFormItems = (appt) =>
  getServiceItems(appt).map((i) => ({
    id: i.id,
    kind: i.kind,
    name: i.name,
    price: typeof i.price === 'number' ? String(i.price) : '',
    catalog: i.catalog,
    qty: i.qty
  }));

const parsePrice = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const statusCopy = {
  completed: {
    title: 'Completed',
    body: 'You can still change the services and prices. Your earnings in History update to match.',
    action: 'Move back to upcoming'
  },
  cancelled: {
    title: 'Cancelled',
    body: 'This booking is in History as cancelled.',
    action: 'Restore booking'
  }
};

const labelClass = 'font-sans text-[11px] font-extrabold text-gray-500 uppercase tracking-wider';
const fieldClass =
  'w-full bg-white border border-pink-100 rounded-xl p-3 text-sm font-semibold outline-none focus:border-pink-primary transition-all text-gray-700 shadow-sm';

const whoOf = (appt) => (appt.type === 'business' ? appt.clientName : appt.title);

const prettyDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export default function AddView({ editAppt, prefill, onSave, onCancel }) {
  const addAppointment = useAppStore((state) => state.addAppointment);
  const updateAppointment = useAppStore((state) => state.updateAppointment);
  const completeAppointment = useAppStore((state) => state.completeAppointment);
  const cancelAppointment = useAppStore((state) => state.cancelAppointment);
  const reopenAppointment = useAppStore((state) => state.reopenAppointment);
  const deleteAppointment = useAppStore((state) => state.deleteAppointment);
  const showToast = useAppStore((state) => state.showToast);
  const appointments = useAppStore((state) => state.appointments);

  const isEditing = !!editAppt;
  // Read the live status so "Move back to upcoming" updates the form in place
  const liveStatus = isEditing
    ? (appointments.find((a) => a.id === editAppt.id)?.status || editAppt.status)
    : 'upcoming';
  const isPast = liveStatus !== 'upcoming';

  // Form states
  const [tab, setTab] = useState('business');
  const [clientName, setClientName] = useState('');
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMins, setDurationMins] = useState(60);
  const [notes, setNotes] = useState('');

  // UI state
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPriceList, setShowPriceList] = useState(false);
  const [confirming, setConfirming] = useState(null); // 'cancel' | 'delete' | null

  // Load edit data (or a prefilled slot tapped on the calendar)
  useEffect(() => {
    if (isEditing) {
      setTab(editAppt.type);
      setDate(editAppt.date);
      setTime(editAppt.time);
      setNotes(editAppt.notes || '');
      setDurationMins(getDurationMins(editAppt));

      if (editAppt.type === 'business') {
        setClientName(editAppt.clientName || '');
        setItems(toFormItems(editAppt));
      } else {
        setTitle(editAppt.title || '');
      }
    } else {
      setDate(prefill?.date || getOshawaTodayStr());
      if (prefill?.time) setTime(prefill.time);
    }
  }, [editAppt, isEditing, prefill]);

  // Custom service names she has used before, per service type (newest first),
  // so hair lines only suggest past hair services and so on
  const recentByKind = useMemo(() => {
    const out = {};
    const seen = new Set();
    [...appointments]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .forEach((a) => {
        (a.items || []).forEach((i) => {
          if (!i.name || i.catalog || findOption(i.kind, i.name)) return;
          const key = `${i.kind}:${i.name.toLowerCase()}`;
          if (seen.has(key)) return;
          seen.add(key);
          (out[i.kind] = out[i.kind] || []).push({ name: i.name, price: i.price });
        });
      });
    Object.keys(out).forEach((k) => { out[k] = out[k].slice(0, 8); });
    return out;
  }, [appointments]);

  const total = Math.round(items.reduce((sum, i) => sum + (parsePrice(i.price) ?? 0), 0) * 100) / 100;
  const hasAnyPrice = items.some((i) => parsePrice(i.price) !== null);
  const totalLabel = hasAnyPrice ? formatMoney(total) : '—';

  // ---- Service line operations ----
  const patchItem = (id, patch) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const addBlank = (kind) =>
    setItems((prev) => (prev.length < MAX_ITEMS ? [...prev, blankItem(kind)] : prev));

  // Pick an option from a line's dropdown (null = custom service)
  const pickOption = (id, option) => {
    if (!option) {
      patchItem(id, { catalog: undefined, qty: undefined });
      return;
    }
    const line = optionLine(option, 1);
    patchItem(id, { catalog: option.name, qty: 1, name: line.name, price: String(line.price) });
  };

  const setLineQty = (item, qty) => {
    const option = findOption(item.kind, item.catalog);
    if (!option) return;
    const q = Math.max(1, Math.min(20, qty));
    const line = optionLine(option, q);
    patchItem(item.id, { qty: q, name: line.name, price: String(line.price) });
  };

  // How many of a price-list option are on the booking right now
  const countFor = (option) =>
    items
      .filter((i) => i.catalog === option.name)
      .reduce((n, i) => n + (option.perNail ? i.qty || 1 : 1), 0);

  const addFromPriceList = (option, kind) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.catalog === option.name);
      if (option.perNail && existing) {
        const qty = Math.min(20, (existing.qty || 1) + 1);
        const line = optionLine(option, qty);
        return prev.map((i) => (i.id === existing.id ? { ...i, qty, name: line.name, price: String(line.price) } : i));
      }
      const line = optionLine(option, 1);
      const item = { id: newItemId(), kind, name: line.name, price: String(line.price), catalog: option.name, qty: 1 };
      return prev.length < MAX_ITEMS ? [...prev, item] : prev;
    });
  };

  const removeFromPriceList = (option) => {
    setItems((prev) => {
      const matches = prev.filter((i) => i.catalog === option.name);
      if (matches.length === 0) return prev;
      const last = matches[matches.length - 1];
      if (option.perNail && (last.qty || 1) > 1) {
        const qty = last.qty - 1;
        const line = optionLine(option, qty);
        return prev.map((i) => (i.id === last.id ? { ...i, qty, name: line.name, price: String(line.price) } : i));
      }
      return prev.filter((i) => i.id !== last.id);
    });
  };

  // ---- Scheduling / overlap ----
  const candidate = { id: editAppt?.id, date, time, durationMins };
  const conflict = !isPast && date && time ? findConflict(candidate, appointments) : null;
  // Bookings saved before overlap checks existed can still be edited in place
  const slotUnchanged =
    isEditing &&
    editAppt.date === date &&
    editAppt.time === time &&
    getDurationMins(editAppt) === durationMins;
  const isBlocked = !!conflict && !slotUnchanged;
  const nextFree = isBlocked ? findNextFreeStart(candidate, appointments) : null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (tab === 'business' && !clientName.trim()) return;
    if (tab === 'personal' && !title.trim()) return;
    if (!date || !time || isBlocked) return;

    const apptData = {
      type: tab,
      date,
      time,
      durationMins: Number(durationMins),
      notes: notes.trim() || null
    };

    if (tab === 'business') {
      apptData.clientName = clientName.trim();
      apptData.items = items.map((i) => ({
        id: i.id,
        kind: i.kind,
        name: i.name,
        price: parsePrice(i.price),
        catalog: i.catalog,
        qty: i.qty
      }));
    } else {
      apptData.title = title.trim();
    }

    if (isEditing) {
      updateAppointment(editAppt.id, { ...apptData, id: editAppt.id });
    } else {
      addAppointment(apptData);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onSave();
    }, 2000);
  };

  const handleComplete = () => {
    completeAppointment(editAppt.id);
    onSave();
  };

  const handleCancel = () => {
    setConfirming(null);
    cancelAppointment(editAppt.id);
    onSave();
  };

  const handleDelete = () => {
    const who = whoOf(editAppt) || 'Booking';
    setConfirming(null);
    if (deleteAppointment(editAppt.id)) {
      showToast({
        id: Date.now(),
        title: 'Booking deleted',
        body: `${who} on ${prettyDate(editAppt.date)} was removed from all records.`
      });
    }
    onSave();
  };

  // Summary of the saved booking, shown in the confirmation pop-ups
  const confirmDetails = isEditing ? (
    <>
      <div className="text-gray-900">{whoOf(editAppt)}</div>
      <div className="font-semibold text-gray-600">
        {prettyDate(editAppt.date)} · {formatTimeRange(editAppt.time, getDurationMins(editAppt))}
        {editAppt.type === 'business' && typeof editAppt.price === 'number' ? ` · ${formatMoney(editAppt.price)}` : ''}
      </div>
    </>
  ) : null;

  if (isSuccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 py-12 bg-pink-soft/30 animate-in fade-in duration-300">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-primary to-pink-deep flex items-center justify-center text-white text-3xl shadow-[0_8px_30px_rgba(219,39,119,0.3)] mb-6 border-4 border-white animate-bounce">
          ✓
        </div>
        <h2 className="font-serif italic text-2xl font-black text-pink-deep mb-2">
          {isEditing ? 'Updated!' : 'Booked! 🌸'}
        </h2>
        <p className="font-sans text-gray-500 font-extrabold text-sm text-center">
          {isPast ? 'Changes saved to History' : `${formatTimeRange(time, durationMins)} · reminders are set 💅`}
        </p>
      </div>
    );
  }

  // Date, time, duration and the overlap check, shared by both booking types
  const scheduleFields = (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="appt-date" className={labelClass}>Date</label>
          <input id="appt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="appt-time" className={labelClass}>Start time</label>
          <input id="appt-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="appt-duration" className={labelClass}>Duration</label>
          <select
            id="appt-duration"
            value={durationMins}
            onChange={(e) => setDurationMins(Number(e.target.value))}
            className={fieldClass}
          >
            {DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>{formatDurationLabel(m)}</option>
            ))}
            {!DURATION_OPTIONS.includes(durationMins) && (
              <option value={durationMins}>{formatDurationLabel(durationMins)}</option>
            )}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Time slot</span>
          <div
            data-testid="time-slot"
            className={`rounded-xl p-3 text-sm font-black tabular-nums border ${
              isBlocked
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-pink-soft/50 border-pink-100 text-pink-deep'
            }`}
          >
            {time ? formatTimeRange(time, durationMins) : 'Pick a start time'}
          </div>
        </div>
      </div>

      {conflict && (
        <div
          role="alert"
          data-testid="overlap-alert"
          className={`rounded-xl p-3 border flex flex-col gap-2 ${
            isBlocked ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <p className={`font-sans text-xs font-bold leading-snug ${isBlocked ? 'text-red-700' : 'text-amber-800'}`}>
            {isBlocked ? 'This time is taken. ' : 'Heads up: '}
            {whoOf(conflict)} is booked {formatTimeRange(conflict.time, getDurationMins(conflict))}
            {conflict.date !== date ? ' (previous day)' : ''}.
          </p>
          {isBlocked && (
            nextFree ? (
              <button
                type="button"
                data-testid="use-next-free"
                onClick={() => setTime(nextFree)}
                className="self-start px-3 py-2 rounded-lg bg-white border border-red-200 text-red-700 font-extrabold text-xs cursor-pointer hover:border-red-400 focus-visible:outline-2 focus-visible:outline-pink-primary"
              >
                Next free time: {formatTime(nextFree)}
              </button>
            ) : (
              <p className="font-sans text-xs font-semibold text-red-700/80">
                The rest of this day is full for a {formatDurationLabel(durationMins)} booking. Try an earlier time or another day.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );

  const notesField = (placeholder) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="appt-notes" className={labelClass}>Notes (optional)</label>
      <textarea
        id="appt-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={`${fieldClass} resize-none`}
      />
    </div>
  );

  return (
    <div className="flex flex-col min-h-full">

      {/* Header */}
      <div className="bg-gradient-to-br from-pink-primary via-[#EC4899] to-pink-deep pt-7 pb-6 px-6 text-white shadow-[0_8px_25px_rgba(219,39,119,0.18)] rounded-b-[28px] mb-2 flex-shrink-0 flex items-center justify-between">
        <h1 className="font-serif italic text-[24px] font-black tracking-wide drop-shadow-sm text-white">
          {isEditing ? 'Edit Appointment' : 'New Appointment 🌸'}
        </h1>
        <button
          onClick={onCancel}
          className="bg-white/20 border-none rounded-xl px-3 py-1.5 text-xs font-black text-white hover:bg-white/30 cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-5 pt-5 flex flex-col gap-5 flex-1 pb-10">

        {/* Status banner for bookings already in History */}
        {isEditing && isPast && statusCopy[liveStatus] && (
          <div
            data-testid="status-banner"
            className={`rounded-2xl p-3.5 border flex flex-col gap-3 ${
              liveStatus === 'completed'
                ? 'bg-green-50/70 border-green-200/70'
                : 'bg-red-50/60 border-red-200/60'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-black bg-white ${
                  liveStatus === 'completed' ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {liveStatus === 'completed' ? '✓' : '✗'}
              </span>
              <div className="min-w-0">
                <div className={`font-sans text-[13px] font-black ${liveStatus === 'completed' ? 'text-green-800' : 'text-red-700'}`}>
                  {statusCopy[liveStatus].title}
                </div>
                <p className={`font-sans text-xs font-semibold leading-snug mt-0.5 ${liveStatus === 'completed' ? 'text-green-900/75' : 'text-red-900/70'}`}>
                  {statusCopy[liveStatus].body}
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="reopen-appt"
              onClick={() => reopenAppointment(editAppt.id)}
              className="w-full py-2.5 rounded-xl bg-white text-gray-700 font-extrabold text-xs border border-gray-200 hover:border-pink-primary hover:text-pink-deep transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-pink-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 14L4 9l5-5" />
                <path d="M4 9h11a5 5 0 010 10h-3" />
              </svg>
              {statusCopy[liveStatus].action}
            </button>
          </div>
        )}

        {/* Type Toggle Tab (Hidden in Edit mode to keep type immutable) */}
        {!isEditing && (
          <div className="bg-pink-soft/40 p-1 rounded-2xl flex border border-pink-100/50">
            {[
              { value: 'business', label: '💅 Business Booking' },
              { value: 'personal', label: '🌸 Personal Schedule' }
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={`flex-1 py-3 rounded-xl border-none font-sans text-xs font-black transition-all cursor-pointer ${
                  tab === t.value
                    ? 'bg-white text-pink-deep shadow-[0_2px_8px_rgba(219,39,119,0.06)]'
                    : 'text-gray-500 hover:text-pink-deep/85 font-extrabold'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'business' ? (
          <div className="flex flex-col gap-4">

            {/* Client Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="appt-client" className={labelClass}>Client Name</label>
              <input
                id="appt-client"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Sola"
                required
                className={`${fieldClass} shadow-pink-100/10`}
              />
            </div>

            {/* Services (itemized scope of work) */}
            <fieldset className="flex flex-col gap-2 border-none p-0 m-0 min-w-0" data-testid="services-editor">
              <legend className={`${labelClass} mb-1.5 p-0`}>Services</legend>

              {items.length === 0 && (
                <div
                  data-testid="services-empty"
                  className="rounded-xl border-2 border-dashed border-pink-200 bg-white/60 px-4 py-4 text-center font-sans text-xs font-bold text-gray-500 leading-relaxed"
                >
                  No services yet. Pick from the price list, or add a hair, nails or other service below.
                </div>
              )}

              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {items.map((item, index) => (
                  <ServiceLine
                    key={item.id}
                    item={item}
                    index={index}
                    recent={recentByKind[item.kind] || []}
                    onPick={(option) => pickOption(item.id, option)}
                    onChange={(patch) => patchItem(item.id, patch)}
                    onQty={(q) => setLineQty(item, q)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </ul>

              <button
                type="button"
                data-testid="open-price-list"
                onClick={() => setShowPriceList(true)}
                className="w-full py-3 rounded-xl bg-pink-soft/70 hover:bg-pink-soft text-pink-deep font-black text-[13px] border border-pink-200/70 cursor-pointer transition-all flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-pink-primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 6h12M8 12h12M8 18h12" />
                  <circle cx="4" cy="6" r="1" fill="currentColor" />
                  <circle cx="4" cy="12" r="1" fill="currentColor" />
                  <circle cx="4" cy="18" r="1" fill="currentColor" />
                </svg>
                Price list
              </button>

              {items.length < MAX_ITEMS && (
                <div className="flex gap-2">
                  {Object.entries(SERVICE_KINDS).map(([key, k]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => addBlank(key)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-black border-2 border-dashed border-pink-200 bg-white/60 text-pink-deep hover:bg-pink-soft/40 hover:border-pink-primary cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-pink-primary"
                    >
                      + {k.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-baseline justify-between pr-1 pt-1">
                <span className={labelClass}>Total</span>
                <span data-testid="services-total" className="font-sans text-lg font-black text-pink-deep tabular-nums">
                  {totalLabel}
                </span>
              </div>
            </fieldset>

            {scheduleFields}
            {notesField('e.g. Knotless braids, medium length, light pink extensions')}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="appt-title" className={labelClass}>What's it for?</label>
              <input
                id="appt-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Doctor's appointment"
                required
                className={`${fieldClass} shadow-pink-100/10`}
              />
            </div>
            {scheduleFields}
            {notesField('Any extra details...')}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-auto pt-4">
          <button
            type="submit"
            disabled={isBlocked}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-primary to-pink-deep text-white font-extrabold text-sm shadow-lg shadow-pink-primary/20 hover:opacity-95 transition-all border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isBlocked ? 'Pick a free time to save' : isEditing ? 'Save Changes ✨' : 'Save Booking ✨'}
          </button>

          {isEditing && !isPast && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={handleComplete}
                className="w-full py-3 rounded-2xl bg-green-50 text-green-600 font-extrabold text-xs transition-all border border-green-200/50 cursor-pointer"
              >
                Mark as Completed ✅
              </button>
              <button
                type="button"
                onClick={() => setConfirming('cancel')}
                className="w-full py-3 rounded-2xl bg-red-50 text-red-500 font-extrabold text-xs transition-all border border-red-200/50 cursor-pointer"
              >
                Cancel Appointment ❌
              </button>
            </div>
          )}

          {isEditing && (
            <button
              type="button"
              data-testid="delete-appt"
              onClick={() => setConfirming('delete')}
              className="mt-4 self-center flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-transparent border-none text-red-600 hover:bg-red-50 font-extrabold text-xs cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-red-500"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              </svg>
              Delete permanently
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        isOpen={confirming === 'delete'}
        title="Delete this booking for good?"
        message="It will be removed from your calendar, History, earnings and reports, and its reminders will stop. This can't be undone."
        details={confirmDetails}
        confirmLabel="Delete permanently"
        cancelLabel="Keep booking"
        onConfirm={handleDelete}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        isOpen={confirming === 'cancel'}
        title="Cancel this appointment?"
        message="It moves to History as cancelled and its reminders stop. You can restore it later from History."
        details={confirmDetails}
        tone="neutral"
        confirmLabel="Cancel appointment"
        cancelLabel="Keep appointment"
        onConfirm={handleCancel}
        onCancel={() => setConfirming(null)}
      />

      <PriceListSheet
        isOpen={showPriceList}
        countFor={countFor}
        onAdd={addFromPriceList}
        onRemove={removeFromPriceList}
        totalLabel={totalLabel}
        onClose={() => setShowPriceList(false)}
      />
    </div>
  );
}
