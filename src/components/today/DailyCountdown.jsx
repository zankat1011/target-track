import React, { useState, useEffect } from "react";
import { useStudy } from "../../context/StudyContext";
import { DAILY_LIGHT_PALETTES } from "../../utils/constants";

function calculateTimeLeft(examDate) {
  if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
    return { days: "--", hours: "--", mins: "--", secs: "--" };
  }
  const targetTime = new Date(examDate + "T00:00:00").getTime();
  const now = Date.now();
  const diffMs = Math.max(0, targetTime - now);

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    mins: String(mins).padStart(2, "0"),
    secs: String(secs).padStart(2, "0"),
  };
}

export function DailyCountdown({ onOpenMultiExam }) {
  const { currentUser } = useStudy();

  // Instant calculation on initial render - zero delay!
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(currentUser?.examDate));

  const dayIndex = new Date().getDay() % DAILY_LIGHT_PALETTES.length;
  const palette = DAILY_LIGHT_PALETTES[dayIndex];

  useEffect(() => {
    // Immediately calculate when mounted or exam date changes (0 ms delay)
    setTimeLeft(calculateTimeLeft(currentUser?.examDate));

    if (!currentUser?.examDate || !/^\d{4}-\d{2}-\d{2}$/.test(currentUser.examDate)) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(currentUser.examDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser?.examDate]);

  const formattedDate = React.useMemo(() => {
    if (!currentUser?.examDate) return "Set Exam Date";
    try {
      const dObj = new Date(currentUser.examDate + "T00:00:00");
      return dObj.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return currentUser.examDate;
    }
  }, [currentUser?.examDate]);

  return (
    <div
      id="dailyCountdownWidget"
      className="mb-3 rounded-3xl p-3.5 border shadow-sm transition-colors duration-200"
      style={{
        background: palette.bg,
        borderColor: palette.border,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          onClick={onOpenMultiExam}
          className="text-xs font-extrabold px-3 py-1 rounded-full bg-white/85 text-slate-900 shadow-sm flex items-center gap-1.5 truncate hover:bg-white transition"
        >
          <span>🎯</span>
          <span className="truncate">{currentUser?.exam || "General Prep"}</span>
          <span className="text-[10px] opacity-70">▾ Switch</span>
        </button>

        <div
          onClick={onOpenMultiExam}
          className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white/80 text-slate-800 cursor-pointer shrink-0 flex items-center gap-1 hover:bg-white transition"
        >
          <span>📅</span>
          <span>{formattedDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl py-1.5 px-1.5 shadow-sm border border-white/70">
          <div className="text-base font-extrabold text-slate-900 leading-tight font-mono tracking-wider">
            {timeLeft.days}
          </div>
          <div className="text-[8px] font-extrabold uppercase tracking-wider text-slate-600">DAYS</div>
        </div>
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl py-1.5 px-1.5 shadow-sm border border-white/70">
          <div className="text-base font-extrabold text-slate-900 leading-tight font-mono tracking-wider">
            {timeLeft.hours}
          </div>
          <div className="text-[8px] font-extrabold uppercase tracking-wider text-slate-600">HRS</div>
        </div>
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl py-1.5 px-1.5 shadow-sm border border-white/70">
          <div className="text-base font-extrabold text-slate-900 leading-tight font-mono tracking-wider">
            {timeLeft.mins}
          </div>
          <div className="text-[8px] font-extrabold uppercase tracking-wider text-slate-600">MINS</div>
        </div>
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl py-1.5 px-1.5 shadow-sm border border-white/70">
          <div className="text-base font-extrabold text-indigo-600 leading-tight font-mono tracking-wider">
            {timeLeft.secs}
          </div>
          <div className="text-[8px] font-extrabold uppercase tracking-wider text-indigo-600">SECS</div>
        </div>
      </div>
    </div>
  );
}
