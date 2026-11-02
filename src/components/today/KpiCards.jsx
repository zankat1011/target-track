import React from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO, addDaysISO } from "../../utils/helpers";

export function KpiCards({ onKpiClick }) {
  const { currentUser } = useStudy();

  const metrics = React.useMemo(() => {
    if (!currentUser) return { totalChaps: 0, doneChaps: 0, readPages: 0, revPages: 0, streak: 0, todayPages: 0, testAvg: null, testCount: 0, dueRevCount: 0 };

    let totalChaps = 0, doneChaps = 0, readPages = 0, revPages = 0;
    (currentUser.subjects || []).forEach(s => {
      (s.chapters || []).forEach(c => {
        totalChaps++;
        if (c.completed) doneChaps++;
        const dp = Number(c.donePages || 0);
        const rp = Math.min(dp, Number(c.revisedPages || 0));
        readPages += dp;
        revPages += rp;
      });
    });

    const today = todayISO();
    const map = {};
    (currentUser.logs || []).forEach(l => {
      map[l.date] = (map[l.date] || 0) + Number(l.pages || 0);
    });

    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = addDaysISO(today, -i);
      if ((map[d] || 0) > 0) streak++;
      else if (i > 0) break;
    }

    const todayPages = map[today] || 0;

    let totSc = 0, totMx = 0;
    (currentUser.tests || []).forEach(t => {
      totSc += Number(t.scored || 0);
      totMx += Number(t.total || 0);
    });
    const testAvg = totMx > 0 ? Math.round((totSc / totMx) * 100) : null;

    const dueRevCount = (currentUser.revisions || []).filter(r => !r.done && r.dueDate <= today).length;

    return {
      totalChaps,
      doneChaps,
      readPages,
      revPages,
      streak,
      todayPages,
      testAvg,
      testCount: (currentUser.tests || []).length,
      dueRevCount
    };
  }, [currentUser]);

  return (
    <div id="tourTargetKpi" className="grid grid-cols-4 gap-2 mb-3.5">
      <button
        onClick={() => onKpiClick("completed")}
        className="one-card p-2.5 text-left active:scale-95 transition"
      >
        <div className="text-[9px] font-bold muted-text truncate">પૂર્ણ ચેપ્ટર</div>
        <div className="text-sm font-extrabold mt-0.5 truncate">
          {metrics.doneChaps}/{metrics.totalChaps}
        </div>
        <div className="text-[9px] text-indigo-500 font-bold truncate">
          {metrics.readPages}p વાંચ્યા
        </div>
      </button>

      <button
        onClick={() => onKpiClick("revision")}
        className="one-card p-2.5 text-left active:scale-95 transition"
      >
        <div className="text-[9px] font-bold muted-text truncate">આજનું રિવિઝન</div>
        <div className="text-sm font-extrabold text-amber-500 mt-0.5 truncate">
          {metrics.dueRevCount} બાકી
        </div>
        <div className="text-[9px] text-emerald-500 font-bold truncate">
          {metrics.revPages}p Rev
        </div>
      </button>

      <button
        onClick={() => onKpiClick("streak")}
        className="one-card p-2.5 text-left active:scale-95 transition"
      >
        <div className="text-[9px] font-bold muted-text truncate">સ્ટ્રીક</div>
        <div className="text-sm font-extrabold text-emerald-500 mt-0.5 truncate">
          {metrics.streak} 🔥
        </div>
        <div className="text-[9px] muted-text truncate">
          આજે: {metrics.todayPages}p
        </div>
      </button>

      <button
        onClick={() => onKpiClick("tests")}
        className="one-card p-2.5 text-left active:scale-95 transition"
      >
        <div className="text-[9px] font-bold muted-text truncate">ટેસ્ટ સરેરાશ</div>
        <div className="text-sm font-extrabold text-purple-500 mt-0.5 truncate">
          {metrics.testAvg !== null ? `${metrics.testAvg}%` : "--%"}
        </div>
        <div className="text-[9px] muted-text truncate">
          {metrics.testCount} ટેસ્ટ
        </div>
      </button>
    </div>
  );
}
