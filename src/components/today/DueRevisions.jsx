import React from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO, daysBetween, nowFormattedTimestamp } from "../../utils/helpers";

export function DueRevisions({ onOpenExtraRev }) {
  const { currentUser, updateCurrentUser, syncCommonChapterProgressAcrossExams, triggerCelebration } = useStudy();

  const today = todayISO();
  const rawDueList = (currentUser?.revisions || []).filter((r) => !r.done && r.dueDate <= today);

  // Smart Merge revisions for the same chapter
  const mergedDueList = React.useMemo(() => {
    const map = {};
    rawDueList.forEach((r) => {
      const key = `${r.subjectId || r.subjectName}__${r.chapterId || r.chapterName}`;
      if (!map[key]) {
        map[key] = {
          ...r,
          mergedIds: [r.id],
          stageLabels: [r.stageLabel],
        };
      } else {
        map[key].mergedIds.push(r.id);
        if (!map[key].stageLabels.includes(r.stageLabel)) {
          map[key].stageLabels.push(r.stageLabel);
        }
        map[key].pagesCount = Math.max(Number(map[key].pagesCount || 0), Number(r.pagesCount || 0));
        if (r.revType === "master") map[key].revType = "master";
      }
    });
    return Object.values(map);
  }, [rawDueList]);

  const upcomingList = (currentUser?.revisions || [])
    .filter((r) => !r.done && r.dueDate > today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const handleMarkDone = (item) => {
    const stamp = nowFormattedTimestamp();
    updateCurrentUser((user) => {
      const ids = item.mergedIds || [item.id];
      const primaryId = ids[0];
      const rev = (user.revisions || []).find((r) => r.id === primaryId);
      if (!rev) return;

      rev.done = true;
      rev.doneDate = todayISO();
      rev.doneAt = stamp;

      const sub = (user.subjects || []).find((s) => s.id === rev.subjectId || s.name === rev.subjectName);
      const chap = sub?.chapters?.find((c) => c.id === rev.chapterId || c.name === rev.chapterName);
      const linkedLog = (user.logs || []).find((l) => l.id === rev.logId);

      if (linkedLog) {
        linkedLog.revised = true;
        linkedLog.revisedAt = stamp;
        linkedLog.lastRevId = rev.id;
      }

      if (rev.revType === "master" && chap) {
        chap.revisedPages = chap.donePages;
        (chap.topics || []).forEach((tp) => { tp.revisedPages = tp.readPages; });
        syncCommonChapterProgressAcrossExams(user, sub.name, chap);
      } else if (chap) {
        const credit = Number(rev.pagesCount || (linkedLog ? linkedLog.pages : 0));
        chap.revisedPages = Math.min(Number(chap.donePages || 0), Number(chap.revisedPages || 0) + credit);
        syncCommonChapterProgressAcrossExams(user, sub.name, chap);
      }

      // Remove secondary duplicate ids if any were merged
      if (ids.length > 1) {
        const extraIds = ids.slice(1);
        user.revisions = user.revisions.filter((r) => !extraIds.includes(r.id));
      }
    });

    triggerCelebration("✅ રિવિઝન પૂર્ણ!", `${item.chapterName} (${stamp})`);
  };

  const handleDelete = (item) => {
    if (!confirm("આજનું આ રિવિઝન લિસ્ટમાંથી ડિલીટ કરવું છે?")) return;
    const ids = item.mergedIds || [item.id];
    updateCurrentUser((user) => {
      user.revisions = (user.revisions || []).filter((r) => !ids.includes(r.id));
    });
  };

  return (
    <div id="dueRevisionsCardAnchor" className="one-card p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold">🔔 આજનું રિવિઝન (Due Revisions)</h2>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenExtraRev}
            className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-500 hover:bg-indigo-500/25 transition"
          >
            + Extra Rev
          </button>
          <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
            {mergedDueList.length}
          </span>
        </div>
      </div>

      {mergedDueList.length === 0 ? (
        <div className="text-xs muted-text text-center py-3 subtle-pill">
          આજે કોઈ રિવિઝન બાકી નથી! 🎉
        </div>
      ) : (
        <div className="space-y-2">
          {mergedDueList.map((r) => {
            const isMaster = r.revType === "master";
            const overdueDays = daysBetween(r.dueDate, today);
            const combinedStageLabel =
              r.stageLabels.length > 1
                ? `${r.stageLabels.join(" & ")} Revision`
                : r.stageLabel;

            return (
              <div
                key={r.id}
                className={`flex items-center justify-between subtle-pill p-3 gap-2 border-l-4 ${
                  isMaster ? "border-l-emerald-500" : "border-l-amber-500"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isMaster
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-amber-500/15 text-amber-500"
                      }`}
                    >
                      {combinedStageLabel}
                    </span>
                    {overdueDays > 0 && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500">
                        ↪️ Forwarded ({overdueDays}d)
                      </span>
                    )}
                    <span className="text-xs font-extrabold truncate">
                      {r.subjectName} ➔ {r.chapterName}
                    </span>
                  </div>
                  <div className="text-[10px] muted-text mt-0.5 font-medium truncate">
                    {r.topicName} • Studied: {r.studiedDate}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleMarkDone(r)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-sm transition"
                  >
                    ✓ Done
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    title="Delete Revision"
                    className="w-7 h-7 rounded-xl bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 font-extrabold text-xs flex items-center justify-center transition"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming Revisions Accordion */}
      <details className="mt-2.5 pt-2.5 border-t" style={{ borderColor: "var(--border-col)" }}>
        <summary className="text-xs font-bold muted-text cursor-pointer select-none">
          📅 આવનારા રિવિઝન (Upcoming 1-7-30-60 Schedule)
        </summary>
        <div className="mt-2 space-y-1.5">
          {upcomingList.length === 0 ? (
            <div className="text-[11px] muted-text">કોઈ આગામી રિવિઝન નથી.</div>
          ) : (
            upcomingList.slice(0, 12).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-[11px] subtle-pill px-3 py-1.5"
              >
                <span className="font-semibold truncate pr-2">
                  <b>[{r.stageLabel}]</b> {r.subjectName}: {r.chapterName}
                </span>
                <span className="font-mono muted-text shrink-0">{r.dueDate}</span>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
