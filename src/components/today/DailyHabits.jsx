import React from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO } from "../../utils/helpers";
import { DEFAULT_HABITS } from "../../utils/constants";

export function DailyHabits() {
  const { currentUser, updateCurrentUser, triggerCelebration } = useStudy();

  const td = todayISO();
  const dailyHabitsLog = currentUser?.dailyHabitsLog || {};
  const todayMap = dailyHabitsLog[td] || {};

  let doneCount = 0;
  DEFAULT_HABITS.forEach((h) => {
    if (todayMap[h.key]) doneCount++;
  });

  const toggleHabit = (habitKey) => {
    const isNowDone = !todayMap[habitKey];
    updateCurrentUser((user) => {
      if (!user.dailyHabitsLog) user.dailyHabitsLog = {};
      if (!user.dailyHabitsLog[td]) user.dailyHabitsLog[td] = {};
      user.dailyHabitsLog[td][habitKey] = isNowDone;
    });

    if (isNowDone) {
      triggerCelebration("⚡ Daily Habit Done!", "નિયમિતતા જ સફળતાની ચાવી છે!");
    }
  };

  return (
    <div className="one-card p-3.5 space-y-2 border-l-4 border-l-emerald-500 anim-fade">
      <div className="flex items-center justify-between">
        <div className="text-xs font-extrabold">⚡ રોજની અનિવાર્ય આદતો (Daily Must-Do Habits)</div>
        <span
          id="dailyHabitsProgBadge"
          className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500"
        >
          {doneCount}/3 Done
        </span>
      </div>
      <div id="dailyHabitsContainer" className="grid grid-cols-3 gap-1.5">
        {DEFAULT_HABITS.map((h) => {
          const isDone = !!todayMap[h.key];
          return (
            <button
              key={h.key}
              type="button"
              onClick={() => toggleHabit(h.key)}
              className={`p-2 rounded-2xl text-[10px] font-extrabold transition border text-center truncate ${
                isDone
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "subtle-pill muted-text hover:border-emerald-500"
              }`}
            >
              {isDone ? "✓ " : "○ "}
              {h.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
