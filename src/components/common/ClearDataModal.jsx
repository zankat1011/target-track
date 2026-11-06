import React, { useState, useEffect } from "react";

export function ClearDataModal({ isOpen, onClose, onConfirm }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmText("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecute = () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setError("⚠️ કન્ફર્મ કરવા માટે નીચેના બોક્સમાં DELETE લખો.");
      return;
    }
    setError("");
    onConfirm();
    setConfirmText("");
    setStep(1);
    onClose();
  };

  const handleClose = () => {
    setConfirmText("");
    setError("");
    setStep(1);
    onClose();
  };

  return (
    <div
      id="clearDataModal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 anim-fade"
    >
      <div className="w-full max-w-xs one-card p-5 space-y-3.5 text-center border-2 border-rose-500 shadow-2xl anim-fade">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto text-2xl font-extrabold">
          ⚠️
        </div>

        {/* STEP 1 VIEW */}
        {step === 1 && (
          <div id="clearStep1Box" className="space-y-3 anim-fade">
            <h3 className="text-sm font-extrabold text-rose-500">Step 1/2: Reset All Data?</h3>
            <p className="text-[11px] muted-text leading-relaxed">
              શું તમે ખરેખર તમારા બધા Subjects, Chapters, Exams, Countdown Timer અને Focus Timer સંપૂર્ણપણે કાઢી નાખવા માંગો છો?
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="subtle-pill py-2.5 text-xs font-extrabold hover:border-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-2xl text-xs font-extrabold shadow-sm transition"
              >
                Yes, Next ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 VIEW */}
        {step === 2 && (
          <div id="clearStep2Box" className="space-y-3 anim-fade">
            <h3 className="text-sm font-extrabold text-rose-600">Step 2/2: Final Confirmation</h3>
            <p className="text-[11px] muted-text leading-relaxed">
              કન્ફર્મ કરવા માટે નીચેના બોક્સમાં <b className="text-rose-500">DELETE</b> લખો:
            </p>
            <input
              id="clearDataConfirmInput"
              type="text"
              placeholder="Type DELETE"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (error) setError("");
              }}
              className="w-full theme-input px-3 py-2 text-xs font-extrabold text-center uppercase border-rose-500 focus:ring-2 focus:ring-rose-500"
              autoFocus
            />
            {error && <div className="text-[10px] font-extrabold text-rose-500">{error}</div>}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="subtle-pill py-2.5 text-xs font-extrabold hover:border-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecute}
                className="bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-2xl text-xs font-extrabold shadow-sm transition"
              >
                🗑️ Wipe All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
