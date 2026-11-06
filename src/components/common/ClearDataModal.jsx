import React, { useState } from "react";

export function ClearDataModal({ isOpen, onClose, onConfirm }) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleExecute = () => {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setError("⚠️ કન્ફર્મ કરવા માટે બોક્સમાં DELETE લખો.");
      return;
    }
    setError("");
    onConfirm();
    setConfirmText("");
    onClose();
  };

  const handleClose = () => {
    setConfirmText("");
    setError("");
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
        <h3 className="text-sm font-extrabold text-rose-500">Clear All My Data?</h3>
        <p className="text-[11px] muted-text leading-relaxed">
          તમારા બધા વિષયો, ચેપ્ટર્સ, રિવિઝન અને ટેસ્ટ માર્ક્સ ડિલીટ થઈ જશે. કન્ફર્મ કરવા નીચે{" "}
          <b className="text-rose-500">DELETE</b> લખો:
        </p>
        <input
          type="text"
          placeholder="Type DELETE here"
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
            🗑️ Confirm Reset
          </button>
        </div>
      </div>
    </div>
  );
}
