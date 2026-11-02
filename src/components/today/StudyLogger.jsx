import React, { useState, useEffect } from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO, addDaysISO } from "../../utils/helpers";

export function StudyLogger({ onOpenChapLock, onNavigateToSyllabus }) {
  const { currentUser, updateCurrentUser, syncCommonChapterProgressAcrossExams, triggerCelebration } = useStudy();

  const [date, setDate] = useState(todayISO);
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [selectedChapId, setSelectedChapId] = useState(null);
  const [pageDelta, setPageDelta] = useState(5);
  const [topicDrawerOpen, setTopicDrawerOpen] = useState(false);
  const [topicSelect, setTopicSelect] = useState("NONE");
  const [newTopicName, setNewTopicName] = useState("");

  const subjects = currentUser?.subjects || [];

  // Default select first subject and chapter
  useEffect(() => {
    if (subjects.length > 0) {
      if (!selectedSubId || !subjects.some(s => s.id === selectedSubId)) {
        setSelectedSubId(subjects[0].id);
      }
    } else {
      setSelectedSubId(null);
      setSelectedChapId(null);
    }
  }, [subjects, selectedSubId]);

  const activeSub = subjects.find(s => s.id === selectedSubId);
  const chapters = activeSub?.chapters || [];

  useEffect(() => {
    if (chapters.length > 0) {
      if (!selectedChapId || !chapters.some(c => c.id === selectedChapId)) {
        setSelectedChapId(chapters[0].id);
      }
    } else {
      setSelectedChapId(null);
    }
  }, [chapters, selectedChapId]);

  const activeChap = chapters.find(c => c.id === selectedChapId);

  const handleSelectChapter = (chap) => {
    setSelectedChapId(chap.id);
    if (chap.completed) {
      onOpenChapLock(chap);
    }
  };

  const handleSaveLog = (markFinished) => {
    if (!activeSub || !activeChap) return;

    if (activeChap.completed) {
      onOpenChapLock(activeChap);
      return;
    }

    const delta = markFinished ? pageDelta : Math.max(1, pageDelta);
    const chosenDate = date || todayISO();

    updateCurrentUser((user) => {
      const sub = (user.subjects || []).find((s) => s.id === activeSub.id);
      const chap = sub?.chapters?.find((c) => c.id === activeChap.id);
      if (!chap) return;

      if (!Array.isArray(chap.topics)) chap.topics = [];

      let topicLabel = "";
      let targetTopicId = null;

      if (topicDrawerOpen) {
        if (topicSelect === "NEW" && newTopicName.trim()) {
          const tName = newTopicName.trim();
          let tp = chap.topics.find((x) => x.name.toLowerCase() === tName.toLowerCase());
          if (tp) {
            tp.readPages = Number(tp.readPages || 0) + delta;
          } else {
            tp = { id: `tp_${Date.now()}`, name: tName, readPages: delta, revisedPages: 0 };
            chap.topics.push(tp);
          }
          topicLabel = tp.name;
          targetTopicId = tp.id;
        } else if (topicSelect !== "NONE" && topicSelect !== "NEW") {
          const tp = chap.topics.find((x) => x.id === topicSelect);
          if (tp) {
            tp.readPages = Number(tp.readPages || 0) + delta;
            topicLabel = tp.name;
            targetTopicId = tp.id;
          }
        }
      }

      chap.donePages = Number(chap.donePages || 0) + delta;
      const logId = `log_${Date.now()}`;

      user.logs.push({
        id: logId,
        date: chosenDate,
        subjectId: sub.id,
        subjectName: sub.name,
        chapterId: chap.id,
        chapterName: chap.name,
        topicId: targetTopicId,
        topicName: topicLabel,
        pages: delta,
        isChapterFinish: !!markFinished,
        revised: false,
        revisedAt: null
      });

      if (!markFinished) {
        const desc = topicLabel ? `${topicLabel} (+${delta}p)` : `Study (+${delta}p)`;
        [
          { days: 0, label: "Day-1 Rev" },
          { days: 7, label: "7-Day Rev" }
        ].forEach((st) => {
          user.revisions.push({
            id: `rev_${logId}_${st.days}`,
            logId,
            subjectId: sub.id,
            chapterId: chap.id,
            topicId: targetTopicId,
            pagesCount: delta,
            revType: "daily",
            subjectName: sub.name,
            chapterName: chap.name,
            topicName: desc,
            stageLabel: st.label,
            studiedDate: chosenDate,
            dueDate: addDaysISO(chosenDate, st.days),
            done: false
          });
        });

        syncCommonChapterProgressAcrossExams(user, sub.name, chap);
        triggerCelebration(`📖 +${delta} પેજ ઉમેરાયા!`, `${sub.name} ➔ ${chap.name}`);
      } else {
        chap.completed = true;
        chap.completedDate = chosenDate;

        // Clean out pending master revisions for this chapter before rescheduling
        user.revisions = user.revisions.filter((r) => !(r.chapterId === chap.id && r.revType === "master" && !r.done));

        [
          { days: 0, label: "Day-1 Master" },
          { days: 7, label: "7-Day Master" },
          { days: 30, label: "30-Day Master" },
          { days: 60, label: "60-Day Master" }
        ].forEach((st) => {
          user.revisions.push({
            id: `mrev_${chap.id}_${st.days}_${Date.now()}`,
            logId,
            subjectId: sub.id,
            chapterId: chap.id,
            pagesCount: Number(chap.donePages || 0),
            revType: "master",
            subjectName: sub.name,
            chapterName: chap.name,
            topicName: `✓ Full Chapter (${chap.donePages}p)`,
            stageLabel: st.label,
            studiedDate: chosenDate,
            dueDate: addDaysISO(chosenDate, st.days),
            done: false
          });
        });

        syncCommonChapterProgressAcrossExams(user, sub.name, chap);
        triggerCelebration("🏆 ચેપ્ટર પૂર્ણ!", `${chap.name} હવે 1-7-30-60D માસ્ટર પ્લાનમાં ઉમેરાયું!`);
      }
    });

    setNewTopicName("");
  };

  const isCustomDate = date !== todayISO();

  if (subjects.length === 0) {
    return (
      <div id="tourTargetLogger" className="one-card p-4 text-center py-6 subtle-pill border-dashed space-y-2">
        <p className="text-xs muted-text">શરૂઆત કરવા પહેલા તમારો વિષય ઉમેરો</p>
        <button
          onClick={onNavigateToSyllabus}
          className="text-xs font-extrabold bg-indigo-600 text-white px-4 py-2 rounded-full shadow-sm hover:bg-indigo-700 transition"
        >
          + સિલેબસમાં વિષય ઉમેરો
        </button>
      </div>
    );
  }

  const readP = Number(activeChap?.donePages || 0);
  const revP = Math.min(readP, Number(activeChap?.revisedPages || 0));
  const unrevP = Math.max(0, readP - revP);

  return (
    <div id="tourTargetLogger" className="one-card p-4 space-y-3">
      {/* Date & Title */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold">
          {isCustomDate ? `📅 ${date} ના રોજ શું ચાલ્યું?` : "આજે શું ચાલ્યું?"}
        </h2>
        <div className="flex items-center gap-1 subtle-pill px-2.5 py-1">
          <span className="text-xs">📅</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-[11px] font-extrabold outline-none w-[96px]"
          />
          {isCustomDate && (
            <button
              onClick={() => setDate(todayISO())}
              className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* 1. Subjects Pill Row */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-extrabold uppercase muted-text">1. વિષય (Subject)</span>
          <button onClick={onNavigateToSyllabus} className="text-[10px] font-bold text-indigo-500">
            + નવો વિષય
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {subjects.map((s) => {
            const active = s.id === selectedSubId;
            const doneCount = (s.chapters || []).filter((c) => c.completed).length;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSubId(s.id)}
                className={`px-3.5 py-2 rounded-2xl text-left shrink-0 transition border ${
                  active
                    ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500 shadow-sm"
                    : "subtle-pill hover:border-indigo-400"
                }`}
              >
                <div className="text-xs font-extrabold whitespace-nowrap">{s.name}</div>
                <div className="text-[9px] muted-text">{doneCount}/{(s.chapters || []).length} પૂર્ણ</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Chapters List */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-extrabold uppercase muted-text">2. ચેપ્ટર (Chapter)</span>
          <button
            onClick={() => setTopicDrawerOpen(!topicDrawerOpen)}
            className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full subtle-pill text-indigo-500 flex items-center gap-1 hover:border-indigo-500"
          >
            <span>+</span> <span>પેટા-ટોપિક</span>
          </button>
        </div>

        {chapters.length === 0 ? (
          <button
            onClick={onNavigateToSyllabus}
            className="text-xs font-bold text-indigo-500 py-2 text-left underline"
          >
            + આ વિષયમાં પહેલા ચેપ્ટર ઉમેરો
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
            {chapters.map((c, idx) => {
              const active = c.id === selectedChapId;
              const rp = Math.min(c.donePages || 0, c.revisedPages || 0);
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectChapter(c)}
                  className={`w-full px-3 py-2 rounded-2xl text-left flex items-center justify-between transition border ${
                    active
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-sm"
                      : "subtle-pill hover:border-emerald-400"
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold opacity-75">#{idx + 1}</span>
                    <span className="text-xs font-extrabold truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">
                      {c.donePages}p (Rev:{rp}p)
                    </span>
                    {c.completed && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600">
                        🔒 પૂર્ણ
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sub-Topic Drawer */}
      {topicDrawerOpen && (
        <div className="subtle-pill p-3 space-y-2 anim-fade">
          <select
            value={topicSelect}
            onChange={(e) => setTopicSelect(e.target.value)}
            className="w-full theme-input px-3 py-2 text-xs font-semibold"
          >
            <option value="NONE">-- No Sub-Topic --</option>
            <option value="NEW">+ New Sub-Topic</option>
            {(activeChap?.topics || []).map((tp) => (
              <option key={tp.id} value={tp.id}>
                🔄 {tp.name} ({tp.readPages}p)
              </option>
            ))}
          </select>
          {topicSelect === "NEW" && (
            <input
              type="text"
              placeholder="નવા ટોપિકનું નામ લખો..."
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              className="w-full theme-input px-3 py-2 text-xs"
            />
          )}
        </div>
      )}

      {/* Selected Stats & Stepper */}
      <div className="subtle-pill p-3 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-extrabold truncate">
            {activeChap ? `${activeChap.name} (${activeChap.completed ? "🔒 પૂર્ણ" : "ચાલુ"})` : "ચેપ્ટર પસંદ કરો"}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">
              📖 વાંચેલા: {readP}p
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
              ✅ રિવાઈઝ્ડ: {revP}p
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
              ⏳ બાકી: {unrevP}p
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 one-card p-1 rounded-2xl shrink-0">
          <button
            onClick={() => setPageDelta((prev) => Math.max(0, prev - 1))}
            className="w-8 h-8 rounded-xl subtle-pill font-extrabold text-sm"
          >
            −
          </button>
          <input
            type="number"
            value={pageDelta}
            onChange={(e) => setPageDelta(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-9 text-center bg-transparent text-xs font-extrabold outline-none"
          />
          <button
            onClick={() => setPageDelta((prev) => prev + 1)}
            className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold text-sm"
          >
            +
          </button>
        </div>
      </div>

      {/* 2 Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleSaveLog(false)}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-3 px-2 rounded-2xl text-xs shadow-sm transition leading-tight"
        >
          <div>+ પેજ ઉમેરો (ચાલુ)</div>
          <div className="text-[9px] font-normal opacity-85 mt-0.5">Today + 7-Day Revision</div>
        </button>
        <button
          onClick={() => handleSaveLog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-3 px-2 rounded-2xl text-xs shadow-sm transition leading-tight"
        >
          <div>✓ ચેપ્ટર પૂર્ણ (Finish)</div>
          <div className="text-[9px] font-normal opacity-85 mt-0.5">Full 1•7•30•60D Plan</div>
        </button>
      </div>
    </div>
  );
}
