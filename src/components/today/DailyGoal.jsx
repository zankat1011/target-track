import React from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO } from "../../utils/helpers";

export function DailyGoal() {
  const { currentUser, updateCurrentUser, triggerCelebration } = useStudy();

  const today = todayISO();
  const todayReadPages = React.useMemo(() => {
    return (currentUser?.logs || [])
      .filter((l) => l.date === today && !l.isExtraRev && !l.isEditHistory)
      .reduce((a, l) => a + Number(l.pages || 0), 0);
  }, [currentUser?.logs, today]);

  const todayRevisedPages = React.useMemo(() => {
    return (currentUser?.revisions || [])
      .filter((r) => r.done && r.doneDate === today)
      .reduce((a, r) => a + Number(r.pagesCount || 0), 0);
  }, [currentUser?.revisions, today]);

  const combinedGoalPages = todayReadPages + todayRevisedPages;
  const goal = Number(currentUser?.dailyGoal || 20);
  const goalPct = Math.min(100, Math.round((combinedGoalPages / goal) * 100));

  const handleChangeGoal = () => {
    const val = prompt("તમારો રોજનો કેટલા પેજ (વાંચન + રિવિઝન) નો ટાર્ગેટ રાખવો છે?", goal);
    if (val === null) return;
    const parsed = Math.max(1, parseInt(val, 10) || 20);
    updateCurrentUser((u) => {
      u.dailyGoal = parsed;
    });
    triggerCelebration("🎯 દૈનિક ટાર્ગેટ અપડેટ થયો!", `${parsed} પેજ પ્રતિ દિવસ`);
  };

  return (
    <div id="tourTargetGoal" className="one-card p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-extrabold">🎯 આજનો ટાર્ગેટ</div>
          <div className="text-[10px] muted-text">
            વાંચન: {todayReadPages}p + રિવિઝન: {todayRevisedPages}p = કુલ {combinedGoalPages}p
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-extrabold text-indigo-500">
            {combinedGoalPages} / {goal}p ({goalPct}%)
          </span>
          <button
            onClick={handleChangeGoal}
            className="subtle-pill px-2 py-1 text-[10px] font-extrabold hover:border-indigo-500"
          >
            ✎
          </button>
        </div>
      </div>
      <div className="w-full h-2 subtle-pill overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
          style={{ width: `${goalPct}%` }}
        />
      </div>
    </div>
  );
}
