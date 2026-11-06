import React, { useState } from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO } from "../../utils/helpers";

const DEFAULT_CUSTOM_HABITS = [
  { id: "hb_ca", label: "📰 Current Affairs" },
  { id: "hb_voc", label: "🔤 શબ્દભંડોળ" },
  { id: "hb_mcq", label: "🎯 25 MCQ" },
];

export function DailyHabits() {
  const { currentUser, updateCurrentUser, triggerCelebration } = useStudy();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newHabitText, setNewHabitText] = useState("");

  const td = todayISO();
  const habits =
    Array.isArray(currentUser?.customHabits) && currentUser.customHabits.length > 0
      ? currentUser.customHabits
      : DEFAULT_CUSTOM_HABITS;

  const dailyHabitsLog = currentUser?.dailyHabitsLog || {};
  const todayMap = dailyHabitsLog[td] || {};

  let doneCount = 0;
  habits.forEach((h) => {
    if (todayMap[h.id]) doneCount++;
  });

  const toggleHabit = (habitId) => {
    const isNowDone = !todayMap[habitId];
    updateCurrentUser((user) => {
      if (!Array.isArray(user.customHabits) || user.customHabits.length === 0) {
        user.customHabits = [...DEFAULT_CUSTOM_HABITS];
      }
      if (!user.dailyHabitsLog) user.dailyHabitsLog = {};
      if (!user.dailyHabitsLog[td]) user.dailyHabitsLog[td] = {};
      user.dailyHabitsLog[td][habitId] = isNowDone;
    });

    if (isNowDone) {
      triggerCelebration("⚡ Daily Habit Done!", "નિયમિતતા જ સફળતાની ચાવી છે!");
    }
  };

  const handleAddHabit = (e) => {
    e?.preventDefault();
    const txt = newHabitText.trim();
    if (!txt) return;

    updateCurrentUser((user) => {
      if (!Array.isArray(user.customHabits) || user.customHabits.length === 0) {
        user.customHabits = [...DEFAULT_CUSTOM_HABITS];
      }
      user.customHabits.push({
        id: `hb_${Date.now()}`,
        label: txt,
      });
    });

    setNewHabitText("");
    triggerCelebration("✅ નવો નિયમ ઉમેરાયો!", txt);
  };

  const handleDeleteHabit = (habitId) => {
    updateCurrentUser((user) => {
      const currentList =
        Array.isArray(user.customHabits) && user.customHabits.length > 0
          ? user.customHabits
          : [...DEFAULT_CUSTOM_HABITS];
      user.customHabits = currentList.filter((h) => h.id !== habitId);
    });
  };

  const handleEditHabit = (h) => {
    const nw = prompt("તમારો ગોલ સુધારો:", h.label);
    if (nw && nw.trim()) {
      updateCurrentUser((user) => {
        const currentList =
          Array.isArray(user.customHabits) && user.customHabits.length > 0
            ? user.customHabits
            : [...DEFAULT_CUSTOM_HABITS];
        const item = currentList.find((x) => x.id === h.id);
        if (item) item.label = nw.trim();
        user.customHabits = currentList;
      });
    }
  };

  return (
    <div className="one-card p-3.5 space-y-2.5 border-l-4 border-l-emerald-500 anim-fade">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-extrabold">⚡ રોજની અનિવાર્ય આદતો (Daily Goals)</div>
          <div className="text-[10px] muted-text">તમારા રોજના નિયમો જાતે ઉમેરો અને ટિક કરો</div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            id="dailyHabitsProgBadge"
            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500"
          >
            {doneCount}/{habits.length} Done
          </span>
          <button
            type="button"
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="subtle-pill px-2 py-1 text-[10px] font-extrabold text-indigo-500 hover:border-indigo-500 transition"
          >
            {drawerOpen ? "Close" : "+ Add / Edit"}
          </button>
        </div>
      </div>

      {/* Main Habit Buttons List */}
      <div id="dailyHabitsContainer" className="flex flex-wrap gap-1.5">
        {habits.map((h) => {
          const isDone = !!todayMap[h.id];
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => toggleHabit(h.id)}
              className={`px-3 py-2 rounded-2xl text-[11px] font-extrabold transition border ${
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

      {/* Add & Manage Custom Habits Drawer */}
      {drawerOpen && (
        <div
          id="habitEditDrawer"
          className="pt-2 border-t space-y-2 anim-fade"
          style={{ borderColor: "var(--border-col)" }}
        >
          <form onSubmit={handleAddHabit} className="flex gap-1.5">
            <input
              id="newCustomHabitInput"
              type="text"
              placeholder="નવો ગોલ લખો (e.g. 📰 Current Affairs, 🏃 5KM Run)"
              value={newHabitText}
              onChange={(e) => setNewHabitText(e.target.value)}
              className="flex-1 theme-input px-3 py-1.5 text-xs font-semibold"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs shrink-0 shadow-sm transition"
            >
              + ઉમેરો
            </button>
          </form>

          <div id="habitManageList" className="flex flex-wrap gap-1.5 pt-1">
            {habits.map((h) => (
              <div
                key={h.id}
                className="one-card px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5"
              >
                <span>{h.label}</span>
                <button
                  type="button"
                  onClick={() => handleEditHabit(h)}
                  className="text-indigo-500 hover:underline px-0.5"
                  title="Edit Goal"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteHabit(h.id)}
                  className="text-rose-500 font-extrabold hover:text-rose-600 px-0.5"
                  title="Delete Goal"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
