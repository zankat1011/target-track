import React, { useState } from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO } from "../../utils/helpers";

export function ActivityHistory() {
  const { currentUser, updateCurrentUser, syncCommonChapterProgressAcrossExams } = useStudy();
  const [filterDate, setFilterDate] = useState(todayISO);

  const unifiedItems = React.useMemo(() => {
    if (!currentUser) return [];
    const items = [];

    // Study & Edit Logs
    (currentUser.logs || []).forEach((l) => {
      if (l.isExtraRev) return;
      if (filterDate && l.date !== filterDate) return;
      let catType = "study";
      if (l.isEditHistory) catType = "edit";
      else if (l.isChapterFinish) catType = "finish";

      items.push({
        uid: `log_${l.id}`,
        rawId: l.id,
        itemKind: "log",
        catType,
        date: l.date,
        subjectName: l.subjectName,
        chapterName: l.chapterName,
        pages: l.pages,
        topicName: l.topicName,
        revised: l.revised,
        revisedAt: l.revisedAt,
        editNote: l.editNote || ""
      });
    });

    // Completed Revisions
    (currentUser.revisions || [])
      .filter((r) => r.done)
      .forEach((r) => {
        const dDate = r.doneDate || r.dueDate || todayISO();
        if (filterDate && dDate !== filterDate) return;
        items.push({
          uid: `rev_${r.id}`,
          rawId: r.id,
          itemKind: "rev",
          catType: "revision",
          date: dDate,
          subjectName: r.subjectName,
          chapterName: r.chapterName,
          pages: r.pagesCount || 0,
          stageLabel: r.stageLabel || "Revision",
          doneAt: r.doneAt || dDate,
          topicName: r.topicName || ""
        });
      });

    return items.reverse();
  }, [currentUser, filterDate]);

  // Stepper for completed revision pages
  const handleStepRevPages = (revId, delta) => {
    updateCurrentUser((user) => {
      const rev = (user.revisions || []).find((r) => r.id === revId);
      if (!rev) return;
      const oldP = Number(rev.pagesCount || 0);
      const newP = Math.max(1, oldP + delta);
      const diff = newP - oldP;
      rev.pagesCount = newP;

      if (rev.logId) {
        const linkedLog = (user.logs || []).find((l) => l.id === rev.logId);
        if (linkedLog) linkedLog.pages = newP;
      }
      const sub = (user.subjects || []).find((s) => s.id === rev.subjectId || s.name === rev.subjectName);
      const chap = sub?.chapters?.find((c) => c.id === rev.chapterId || c.name === rev.chapterName);
      if (chap) {
        chap.revisedPages = Math.min(Number(chap.donePages || newP), Math.max(0, Number(chap.revisedPages || 0) + diff));
        syncCommonChapterProgressAcrossExams(user, sub.name, chap);
      }
    });
  };

  // Reverse Revision Done
  const handleReverseRev = (revId) => {
    updateCurrentUser((user) => {
      const rev = (user.revisions || []).find((r) => r.id === revId);
      if (!rev || !rev.done) return;

      rev.done = false;
      rev.doneDate = null;
      rev.doneAt = null;

      const sub = (user.subjects || []).find((s) => s.id === rev.subjectId || s.name === rev.subjectName);
      const chap = sub?.chapters?.find((c) => c.id === rev.chapterId || c.name === rev.chapterName);
      const linkedLog = (user.logs || []).find((l) => l.id === rev.logId);

      if (linkedLog) {
        const otherDone = (user.revisions || []).some((r) => r.logId === linkedLog.id && r.done);
        if (!otherDone) {
          linkedLog.revised = false;
          linkedLog.revisedAt = null;
        }
      }

      if (chap) {
        const debit = Number(rev.pagesCount || (linkedLog ? linkedLog.pages : 0));
        chap.revisedPages = Math.max(0, Number(chap.revisedPages || 0) - debit);
        syncCommonChapterProgressAcrossExams(user, sub.name, chap);
      }
    });
  };

  // Edit Revision Entry
  const handleEditRev = (revId) => {
    const rev = (currentUser.revisions || []).find((r) => r.id === revId);
    if (!rev) return;
    const oldP = Number(rev.pagesCount || 0);
    const newPages = prompt("રિવિઝન પેજ સુધારો:", oldP);
    if (newPages === null) return;
    const parsed = Math.max(0, parseInt(newPages, 10) || 0);
    const newDate = prompt("રિવિઝન તારીખ સુધારો (YYYY-MM-DD):", rev.doneDate || todayISO());

    updateCurrentUser((user) => {
      const r = (user.revisions || []).find((x) => x.id === revId);
      if (!r) return;
      const diff = parsed - oldP;
      r.pagesCount = parsed;
      if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate.trim())) {
        r.doneDate = newDate.trim();
      }
      if (r.logId) {
        const linkedLog = (user.logs || []).find((l) => l.id === r.logId);
        if (linkedLog) linkedLog.pages = parsed;
      }
      const sub = (user.subjects || []).find((s) => s.id === r.subjectId || s.name === r.subjectName);
      const chap = sub?.chapters?.find((c) => c.id === r.chapterId || c.name === r.chapterName);
      if (chap) {
        chap.revisedPages = Math.min(Number(chap.donePages || parsed), Math.max(0, Number(chap.revisedPages || 0) + diff));
        syncCommonChapterProgressAcrossExams(user, sub.name, chap);
      }
    });
  };

  // Delete Revision Entry
  const handleDeleteRev = (revId) => {
    if (!confirm("આ રિવિઝન એન્ટ્રી ડિલીટ કરવી છે?")) return;
    updateCurrentUser((user) => {
      const rev = (user.revisions || []).find((r) => r.id === revId);
      if (!rev) return;
      const sub = (user.subjects || []).find((s) => s.id === rev.subjectId || s.name === rev.subjectName);
      const chap = sub?.chapters?.find((c) => c.id === rev.chapterId || c.name === rev.chapterName);
      if (chap) {
        chap.revisedPages = Math.max(0, Number(chap.revisedPages || 0) - Number(rev.pagesCount || 0));
        syncCommonChapterProgressAcrossExams(user, sub.name, chap);
      }
      if (rev.logId) {
        user.logs = (user.logs || []).filter((l) => l.id !== rev.logId);
      }
      user.revisions = (user.revisions || []).filter((r) => r.id !== revId);
    });
  };

  // Edit Daily Log
  const handleEditLog = (logId) => {
    const log = (currentUser.logs || []).find((l) => l.id === logId);
    if (!log) return;
    const oldP = Number(log.pages || 0);
    const newP = prompt("Edit Pages:", oldP);
    if (newP === null) return;
    const newDate = prompt("Edit Date (YYYY-MM-DD):", log.date);
    const parsed = Math.max(0, parseInt(newP, 10) || 0);
    const diff = parsed - oldP;

    updateCurrentUser((user) => {
      const l = (user.logs || []).find((x) => x.id === logId);
      if (!l) return;
      l.pages = parsed;
      l.editNote = `Edited (${oldP}p ➔ ${parsed}p)`;
      if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate.trim())) {
        l.date = newDate.trim();
      }
      const sub = (user.subjects || []).find((s) => s.id === l.subjectId);
      const chap = sub?.chapters?.find((c) => c.id === l.chapterId);
      if (chap && !l.isExtraRev) {
        chap.donePages = Math.max(0, Number(chap.donePages || 0) + diff);
        syncCommonChapterProgressAcrossExams(user, sub.name, chap);
      }
    });
  };

  // Delete Daily Log
  const handleDeleteLog = (logId) => {
    if (!confirm("Delete this study entry?")) return;
    updateCurrentUser((user) => {
      const idx = (user.logs || []).findIndex((l) => l.id === logId);
      if (idx === -1) return;
      const log = user.logs[idx];
      const sub = (user.subjects || []).find((s) => s.id === log.subjectId);
      const chap = sub?.chapters?.find((c) => c.id === log.chapterId);
      if (chap && !log.isExtraRev) {
        chap.donePages = Math.max(0, Number(chap.donePages || 0) - Number(log.pages || 0));
        if (log.revised) {
          chap.revisedPages = Math.max(0, Number(chap.revisedPages || 0) - Number(log.pages || 0));
        }
        syncCommonChapterProgressAcrossExams(user, sub.name, chap);
      }
      user.logs.splice(idx, 1);
      user.revisions = (user.revisions || []).filter((r) => r.logId !== logId);
    });
  };

  return (
    <div className="one-card p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold">🕒 રોજની એન્ટ્રી અને હિસ્ટ્રી</h2>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="theme-input text-[10px] font-bold px-2 py-1"
          />
          <button
            onClick={() => setFilterDate(todayISO())}
            className="subtle-pill px-2 py-1 text-[9px] font-extrabold text-indigo-500"
          >
            Today
          </button>
          <button
            onClick={() => setFilterDate("")}
            className="subtle-pill px-2 py-1 text-[9px] font-extrabold muted-text"
          >
            All
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-extrabold">
        <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">📘 વાંચન</span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">✅ પૂર્ણ રિવિઝન</span>
        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">🏆 ચેપ્ટર પૂર્ણ</span>
        <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-500">⚡ Extra / Edit</span>
      </div>

      <div className="space-y-2">
        {unifiedItems.length === 0 ? (
          <div className="text-xs muted-text text-center py-3 subtle-pill">
            {filterDate ? `${filterDate} ના રોજ કોઈ એન્ટ્રી નથી.` : "કોઈ એન્ટ્રી મળી નથી."}
          </div>
        ) : (
          unifiedItems.slice(0, 30).map((item) => {
            if (item.itemKind === "rev") {
              return (
                <div
                  key={item.uid}
                  className="subtle-pill p-3 flex items-center justify-between gap-2 border-l-4 border-l-emerald-500 bg-emerald-500/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                        ✅ પૂર્ણ રિવિઝન ({item.stageLabel})
                      </span>
                      <span className="text-[10px] font-mono font-bold muted-text">{item.date}</span>
                    </div>
                    <div className="text-xs font-extrabold truncate mt-1">
                      {item.subjectName} ➔ {item.chapterName}
                    </div>
                    <div className="text-[10px] text-emerald-500 font-bold mt-0.5">
                      🔄 {item.pages}p • 🕒 {item.doneAt}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center one-card px-1 py-0.5 rounded-xl">
                      <button
                        onClick={() => handleStepRevPages(item.rawId, -1)}
                        className="w-5 h-5 text-xs font-extrabold"
                      >
                        −
                      </button>
                      <span className="text-[10px] font-mono font-extrabold px-1">{item.pages}p</span>
                      <button
                        onClick={() => handleStepRevPages(item.rawId, 1)}
                        className="w-5 h-5 text-xs font-extrabold text-indigo-500"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => handleReverseRev(item.rawId)}
                      className="px-2 py-1 rounded-xl bg-amber-500/15 text-amber-500 font-extrabold text-[10px]"
                    >
                      ↩️ Reverse
                    </button>
                    <button
                      onClick={() => handleEditRev(item.rawId)}
                      className="px-2 py-1 rounded-full one-card text-xs"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDeleteRev(item.rawId)}
                      className="px-2 py-1 rounded-full bg-rose-500/15 text-rose-500 text-xs"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            }

            let borderClass = "border-l-4 border-l-indigo-500";
            let badge = (
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                📘 વાંચન
              </span>
            );
            if (item.catType === "finish") {
              borderClass = "border-l-4 border-l-amber-500 bg-amber-500/5";
              badge = (
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                  🏆 ચેપ્ટર પૂર્ણ
                </span>
              );
            } else if (item.catType === "edit") {
              borderClass = "border-l-4 border-l-purple-500 bg-purple-500/5";
              badge = (
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-purple-600 text-white">
                  ✎ Edit Log
                </span>
              );
            }

            return (
              <div key={item.uid} className={`subtle-pill p-3 flex items-center justify-between gap-2 ${borderClass}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {badge}
                    <span className="text-[10px] font-mono font-bold muted-text">{item.date}</span>
                    {item.revised && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500">
                        ✓ Rev Done
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-extrabold truncate mt-1">
                    {item.subjectName} ➔ {item.chapterName}
                  </div>
                  <div className="text-[10px] muted-text mt-0.5">
                    પેજ: <b className="text-indigo-500">+{item.pages}p</b>
                    {item.topicName ? ` • 📌 ${item.topicName}` : ""}
                    {item.editNote ? ` • ${item.editNote}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEditLog(item.rawId)}
                    className="px-2 py-1 rounded-full one-card text-xs"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDeleteLog(item.rawId)}
                    className="px-2 py-1 rounded-full bg-rose-500/15 text-rose-500 text-xs"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
