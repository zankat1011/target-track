import React from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO } from "../../utils/helpers";

export function DesktopTopBar({ activeTab, onOpenMarketplace, onOpenQuickNotes, onOpenMultiExam }) {
  const { currentUser, db } = useStudy();

  const titleMap = {
    today: { title: "આજનો દૈનિક અભ્યાસ (Today's Dashboard)", subtitle: "વાંચન લૉગ કરો, રિવિઝન સાયકલ પૂર્ણ કરો અને ડેઈલી સ્ટ્રીક જાળવો." },
    syllabus: { title: "સંપૂર્ણ અભ્યાસક્રમ (Syllabus & Chapters)", subtitle: "બધા વિષયોના ચેપ્ટર, પેજ અને પૂર્ણ થયેલા ચેપ્ટરનું વોલ્ટ." },
    tests: { title: "સ્માર્ટ એનાલિસિસ & ટેસ્ટ રેકોર્ડ (Analytics)", subtitle: "ટોપર માઇન્ડસેટ સાયકોલોજી, ૭-દિવસીય સાતત્ય અને ટેસ્ટ એવરેજ." },
    profile: { title: "પ્રોફાઈલ, ટાઈમર & ડેટા સેટિંગ્સ (Account)", subtitle: "સ્માર્ટ ફોકસ ટાઈમર, ડેટા બેકઅપ અને સુરક્ષિત મેનેજમેન્ટ." },
  };

  const curr = titleMap[activeTab] || titleMap.today;
  const todayFormatted = new Date().toLocaleDateString("gu-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="hidden lg:flex items-center justify-between mb-6 pb-4 border-b gap-4"
      style={{ borderColor: "var(--border-col)" }}
    >
      {/* Page Title & Gujarati Motivation */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black tracking-tight">{curr.title}</h2>
          <span className="text-[11px] font-bold muted-text">• {todayFormatted}</span>
        </div>
        <p className="text-xs muted-text font-medium mt-0.5">{curr.subtitle}</p>
      </div>

      {/* Right Desktop Quick Shortcuts */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Active Exam Pill */}
        <button
          onClick={onOpenMultiExam}
          className="one-card px-3 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-black hover:border-indigo-500 transition shadow-xs"
        >
          <span className="text-indigo-500">🎯</span>
          <span>{currentUser?.exam || "General Prep"}</span>
          <span className="text-[10px] text-indigo-500 underline font-bold">Switch</span>
        </button>

        {/* Book Bazaar Shortcut */}
        <button
          onClick={onOpenMarketplace}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3.5 py-1.5 rounded-2xl text-xs font-black shadow-sm transition flex items-center gap-1.5"
        >
          <span>📖</span>
          <span>બુક બજાર</span>
        </button>

        {/* Quick Notes Shortcut */}
        <button
          onClick={onOpenQuickNotes}
          className="subtle-pill px-3 py-1.5 rounded-2xl text-xs font-extrabold hover:border-indigo-500 transition flex items-center gap-1.5"
        >
          <span>⚡</span>
          <span>Quick Notes</span>
        </button>
      </div>
    </div>
  );
}
