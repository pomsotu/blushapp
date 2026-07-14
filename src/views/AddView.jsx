import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import ConflictModal from '../components/ConflictModal';

const durationOptions = [
  { label: '1 hr', value: 60 },
  { label: '1.5 hr', value: 90 },
  { label: '2 hr', value: 120 },
  { label: '2.5 hr', value: 150 },
  { label: '3 hr', value: 180 },
  { label: '3.5 hr', value: 210 },
  { label: '4 hr+', value: 240 }
];

export default function AddView({ editAppt, onSave, onCancel }) {
  const addAppointment = useAppStore((state) => state.addAppointment);
  const updateAppointment = useAppStore((state) => state.updateAppointment);
  const completeAppointment = useAppStore((state) => state.completeAppointment);
  const cancelAppointment = useAppStore((state) => state.cancelAppointment);
  const checkConflict = useAppStore((state) => state.checkConflict);

  const isEditing = !!editAppt;

  // Form states
  const [tab, setTab] = useState('business');
  
  // Business fields
  const [clientName, setClientName] = useState('');
  const [service, setService] = useState('braiding');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMins, setDurationMins] = useState(60);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  // Personal fields
  const [title, setTitle] = useState('');

  // UI state
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState(null);

  // Load edit data
  useEffect(() => {
    if (isEditing) {
      setTab(editAppt.type);
      setDate(editAppt.date);
      setTime(editAppt.time);
      setNotes(editAppt.notes || '');

      if (editAppt.type === 'business') {
        setClientName(editAppt.clientName || '');
        setService(editAppt.service || 'braiding');
        setDurationMins(editAppt.durationMins || 60);
        setPrice(editAppt.price || '');
      } else {
        setTitle(editAppt.title || '');
      }
    } else {
      // Default to today
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [editAppt, isEditing]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validations
    if (tab === 'business' && !clientName.trim()) return;
    if (tab === 'personal' && !title.trim()) return;
    if (!date || !time) return;

    // Package data
    const apptData = {
      type: tab,
      date,
      time,
      notes: notes.trim() || null
    };

    if (tab === 'business') {
      apptData.clientName = clientName.trim();
      apptData.service = service;
      apptData.durationMins = Number(durationMins);
      apptData.price = price !== '' ? Number(price) : null;
    } else {
      apptData.title = title.trim();
    }

    if (isEditing) {
      apptData.id = editAppt.id;
    }

    // Check conflict
    const conflictExists = checkConflict(apptData);
    if (conflictExists) {
      setPendingSaveData(apptData);
      setShowConflictModal(true);
    } else {
      executeSave(apptData);
    }
  };

  const executeSave = (apptData) => {
    if (isEditing) {
      updateAppointment(editAppt.id, apptData);
    } else {
      addAppointment(apptData);
    }

    setShowConflictModal(false);
    setIsSuccess(true);
    
    setTimeout(() => {
      setIsSuccess(false);
      onSave();
    }, 2000);
  };

  // Actions for edit mode
  const handleComplete = () => {
    completeAppointment(editAppt.id);
    onSave();
  };

  const handleCancel = () => {
    if (window.confirm('Cancel this appointment? This will move it to history.')) {
      cancelAppointment(editAppt.id);
      onSave();
    }
  };

  if (isSuccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 py-12 bg-pink-soft/30 animate-in fade-in duration-300">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-primary to-pink-deep flex items-center justify-center text-white text-3xl shadow-[0_8px_30px_rgba(219,39,119,0.3)] mb-6 border-4 border-white animate-bounce">
          ✓
        </div>
        <h2 className="font-serif italic text-2xl font-black text-pink-deep mb-2">
          {isEditing ? 'Updated!' : 'Booked! 🌸'}
        </h2>
        <p className="font-sans text-gray-400 font-bold text-sm text-center">
          Saved and reminders are set 💅
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-soft via-pink-primary to-pink-deep pt-6 pb-6 px-6 text-white shadow-md flex-shrink-0 flex items-center justify-between">
        <h1 className="font-serif italic text-[24px] font-extrabold tracking-wide drop-shadow-sm">
          {isEditing ? 'Edit Appointment' : 'New Appointment'}
        </h1>
        <button 
          onClick={onCancel}
          className="bg-white/20 border-none rounded-xl px-3 py-1.5 text-xs font-black text-white hover:bg-white/30 cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-5 pt-5 flex flex-col gap-5 flex-1 pb-10">
        
        {/* Type Toggle Tab (Hidden in Edit mode to keep type immutable) */}
        {!isEditing && (
          <div className="bg-pink-soft/40 p-1 rounded-2xl flex border border-pink-100/50">
            <button
              type="button"
              onClick={() => setTab('business')}
              className={`flex-1 py-3 rounded-xl border-none font-sans text-xs font-black transition-all cursor-pointer ${
                tab === 'business'
                  ? 'bg-white text-pink-deep shadow-[0_2px_8px_rgba(219,39,119,0.06)]'
                  : 'text-gray-400 hover:text-pink-deep/80'
              }`}
            >
              💅 Business Booking
            </button>
            <button
              type="button"
              onClick={() => setTab('personal')}
              className={`flex-1 py-3 rounded-xl border-none font-sans text-xs font-black transition-all cursor-pointer ${
                tab === 'personal'
                  ? 'bg-white text-pink-deep shadow-[0_2px_8px_rgba(219,39,119,0.06)]'
                  : 'text-gray-400 hover:text-pink-deep/80'
              }`}
            >
              🌸 Personal Schedule
            </button>
          </div>
        )}

        {/* Business Form Fields */}
        {tab === 'business' ? (
          <div className="flex flex-col gap-4">
            
            {/* Client Name */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                Client Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Sola"
                required
                className="w-full bg-white border border-pink-100 rounded-xl p-3 text-sm font-semibold outline-none focus:border-pink-primary transition-all text-gray-700 shadow-sm shadow-pink-100/10"
              />
            </div>

            {/* Service Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                Service
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'braiding', label: '🌀 Braiding' },
                  { value: 'nails', label: '💅 Nails' },
                  { value: 'both', label: '✨ Both' }
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setService(s.value)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 cursor-pointer transition-all ${
                      service === s.value
                        ? 'border-pink-primary bg-pink-soft/30 text-pink-deep'
                        : 'border-pink-50/50 bg-white text-gray-400 hover:border-pink-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-white border border-pink-100 rounded-xl p-3 text-sm font-semibold outline-none focus:border-pink-primary transition-all text-gray-700 shadow-sm"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full bg-white border border-pink-100 rounded-xl p-3 text-sm font-semibold outline-none focus:border-pink-primary transition-all text-gray-700 shadow-sm"
                />
              </div>
            </div>

            {/* Price & Duration Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Price ($)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 80"
                  className="w-full bg-white border border-pink-100 rounded-xl p-3 text-sm font-semibold outline-none focus:border-pink-primary transition-all text-gray-700 shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Duration
                </label>
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full bg-white border border-pink-100 rounded-xl p-3 text-sm font-semibold outline-none focus:border-pink-primary transition-all text-gray-700 shadow-sm"
                >
                  {durationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Knotless braids, medium length, light pink extensions"
                rows={3}
                className="w-full bg-white border border-pink-100 rounded-xl p-3 text-sm font-semibold outline-none focus:border-pink-primary transition-all text-gray-700 shadow-sm resize-none"
              />
            </div>

          </div>
        ) : (
          /* Personal Form Fields */
          <div className="flex flex-col gap-4">
            
            {/* Title / Objective */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                What's it for?
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Doctor's appointment"
                required
                className="w-full bg-white border border-pink-100 rounded-xl p-3 text-sm font-semibold outline-none focus:border-pink-primary transition-all text-gray-700 shadow-sm shadow-pink-100/10"
              />
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-white border border-pink-100 rounded-xl p-3 text-sm font-semibold outline-none focus:border-pink-primary transition-all text-gray-700 shadow-sm"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full bg-white border border-pink-100 rounded-xl p-3 text-sm font-semibold outline-none focus:border-pink-primary transition-all text-gray-700 shadow-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra details..."
                rows={3}
                className="w-full bg-white border border-pink-100 rounded-xl p-3 text-sm font-semibold outline-none focus:border-pink-primary transition-all text-gray-700 shadow-sm resize-none"
              />
            </div>

          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-auto pt-4">
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-primary to-pink-deep text-white font-extrabold text-sm shadow-lg shadow-pink-primary/20 hover:opacity-95 transition-all border-none cursor-pointer"
          >
            {isEditing ? 'Save Changes ✨' : 'Save Booking ✨'}
          </button>

          {isEditing && (
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
                onClick={handleCancel}
                className="w-full py-3 rounded-2xl bg-red-50 text-red-500 font-extrabold text-xs transition-all border border-red-200/50 cursor-pointer"
              >
                Cancel Appointment ❌
              </button>
            </div>
          )}
        </div>

      </form>

      {/* Conflict Dialog */}
      <ConflictModal
        isOpen={showConflictModal}
        onConfirm={() => executeSave(pendingSaveData)}
        onCancel={() => {
          setShowConflictModal(false);
          setPendingSaveData(null);
        }}
      />

    </div>
  );
}
