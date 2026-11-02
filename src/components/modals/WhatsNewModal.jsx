import React from "react";
import { useStudy } from "../../context/StudyContext";
import { WHATS_NEW_VER } from "../../utils/constants";

export function WhatsNewModal({ isOpen, onClose }) {
  const { currentUser } = useStudy();

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (currentUser?.mobile) {
      localStorage.setItem(`${WHATS_NEW_VER}_${currentUser.mobile}`, "1");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 anim-fade" onClick={handleDismiss}>
      <div
        className="w-full max-w-sm one-card p-5 space-y-3.5 border-2 border-indigo-600"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg font-extrabold shadow-md">
              ✨
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">
                New Update
              </span>
              <h3 className="text-sm font-extrabold mt-0.5">Target Track — નવા ફીચર્સ</h3>
            </div>
          </div>
          <button onClick={handleDismiss} className="w-7 h-7 rounded-full subtle-pill text-xs font-extrabold">
            ✕
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="subtle-pill p-2.5 flex items-start gap-2">
            <span>🎯</span>
            <div>
              <b>Multiple Exam Management & Smart Sync:</b> એક કરતા વધારે પરીક્ષાના કાઉન્ટડાઉન ઉમેરો, એક્ઝામ સ્વીચ કરો અને કોમન સબ્જેક્ટ/ચેપ્ટરનો પ્રોગ્રેસ ઓટોમેટિક સિન્ક કરો.
            </div>
          </div>
          <div className="subtle-pill p-2.5 flex items-start gap-2">
            <span>⏳</span>
            <div>
              <b>Daily Light Countdown UI:</b> રોજ બદલાતા લાઈટ કલર સાથે Days, Hrs, Mins અને Exam Date દર્શાવતું નવું કાઉન્ટડાઉન.
            </div>
          </div>
          <div className="subtle-pill p-2.5 flex items-start gap-2">
            <span>🗂️</span>
            <div>
              <b>Quick Formula & Key Folders:</b> ફ્રન્ટ પેજ પરથી જ સબ્જેક્ટ અને ચેપ્ટર મુજબ અલગ ફોલ્ડરમાં શોર્ટ નોટ્સ અને સૂત્રો સાચવો.
            </div>
          </div>
          <div className="subtle-pill p-2.5 flex items-start gap-2">
            <span>🎨</span>
            <div>
              <b>Unified Color-Coded History:</b> વાંચન, પૂર્ણ કરેલા રિવિઝન અને એડિટની બધી જ હિસ્ટ્રી અલગ કલર કેટેગરી સાથે એક જ પાર્ટમાં.
            </div>
          </div>
          <div className="subtle-pill p-2.5 flex items-start gap-2">
            <span>⚡</span>
            <div>
              <b>Online + Offline Mode:</b> એપ હવે ઓનલાઇન અને ઓફલાઇન બંને મોડમાં કાર્યરત રહેશે.
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-2xl text-xs shadow-md transition"
        >
          🚀 ચાલો શરૂ કરીએ!
        </button>
      </div>
    </div>
  );
}
