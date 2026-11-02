import React, { useState } from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO, nowFormattedTimestamp } from "../../utils/helpers";

export function ExtraRevModal({ isOpen, onClose }) {
  const { currentUser, updateCurrentUser, syncCommonChapterProgressAcrossExams, triggerCelebration } = useStudy();

  const [subId, setSubId] = useState("");
  const [chapId, setChapId] = useState("");
  const [mode, setMode] = useState("few"); // 'few' | 'full'
  const [pages, setPages] = useState(10);
  const [note, setNote] = useState("");

  const subjects = currentUser?.subjects || [];

  React.useEffect(() => {
    if (subjects.length > 0) {
      const sId = subId && subjects.some((s) => s.id === subId) ? subId : subjects[0].id;
      setSubId(sId);
      const chaps = subjects.find((s) => s.id === sId)?.chapters || [];
      if (chaps.length > 0) {
        setChapId(chaps[0].id);
      } else {
        setChapId("");
      }
    }
  }, [subjects, subId]);

  if (!isOpen) return null;

  const currentSub = subjects.find((s) => s.id === subId);
  const currentChap = currentSub?.chapters?.find((c) => c.id === chapId);

  const handleSaveExtraRev = (e) => {
    e?.preventDefault();
    if (!currentSub) return;

    const isFull = mode === "full";
    const rawP = Math.max(1, pages);
    const finalPages = isFull && currentChap && Number(currentChap.donePages || 0) > 0
      ? Number(currentChap.donePages)
      : rawP;

    const modeTag = isFull ? "📚 Full Chapter" : "📄 Few Pages";
    const finalNote = note ? `${modeTag} • ${note}` : `${modeTag} (+${finalPages}p)`;
    const stamp = nowFormattedTimestamp();
    const today = todayISO();

    updateCurrentUser((user) => {
      const sub = (user.subjects || []).find((s) => s.id === subId);
      const chap = sub?.chapters?.find((c) => c.id === chapId);

      if (chap) {
        chap.revisedPages = isFull
          ? Number(chap.donePages || finalPages)
          : Math.min(chap.donePages || finalPages, Number(chap.revisedPages || 0) + finalPages);
        syncCommonChapterProgressAcrossExams(user, sub.name, chap);
      }

      const logId = `ext_${Date.now()}`;
      user.logs.push({
        id: logId,
        date: today,
        subjectId: sub.id,
        subjectName: sub.name,
        chapterId: chap ? chap.id : "general",
        chapterName: chap ? chap.name : "Full Subject",
        topicName: finalNote,
        pages: finalPages,
        isExtraRev: true,
        revised: true,
        revisedAt: stamp,
      });

      user.revisions.push({
        id: `rev_${logId}`,
        logId,
        subjectId: sub.id,
        chapterId: chap ? chap.id : "general",
        pagesCount: finalPages,
        revType: "extra",
        subjectName: sub.name,
        chapterName: chap ? chap.name : "Full Subject",
        topicName: finalNote,
        stageLabel: isFull ? "📚 Extra Full Chap" : "📄 Extra Few Pages",
        studiedDate: today,
        dueDate: today,
        done: true,
        doneDate: today,
        doneAt: stamp,
      });
    });

    setNote("");
    triggerCelebration("⚡ Extra Revision સેવ થયું!", finalNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 anim-fade" onClick={onClose}>
      <div className="w-full max-w-sm one-card p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold">⚡ Extra Revision ઉમેરો</h3>
          <button onClick={onClose} className="text-xs font-extrabold muted-text hover:text-rose-500">
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveExtraRev} className="space-y-2.5">
          <select
            value={subId}
            onChange={(e) => setSubId(e.target.value)}
            className="w-full theme-input px-3 py-2 text-xs font-bold"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={chapId}
            onChange={(e) => setChapId(e.target.value)}
            className="w-full theme-input px-3 py-2 text-xs font-bold"
          >
            {(currentSub?.chapters || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.donePages || 0}p)
              </option>
            ))}
          </select>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 subtle-pill p-1">
            <button
              type="button"
              onClick={() => setMode("few")}
              className={`py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                mode === "few"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "muted-text hover:text-indigo-500"
              }`}
            >
              📄 થોડા પેજ (Few Pages)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("full");
                if (currentChap && Number(currentChap.donePages || 0) > 0) {
                  setPages(currentChap.donePages);
                }
              }}
              className={`py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                mode === "full"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "muted-text hover:text-emerald-500"
              }`}
            >
              📚 આખું ચેપ્ટર (Full Chap)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div
              className={`flex items-center justify-between theme-input px-1.5 py-1 ${
                mode === "full" ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setPages((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-xl subtle-pill font-extrabold text-sm"
              >
                −
              </button>
              <input
                type="number"
                value={pages}
                onChange={(e) => setPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-12 text-center bg-transparent text-xs font-extrabold outline-none"
              />
              <button
                type="button"
                onClick={() => setPages((p) => p + 1)}
                className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-extrabold text-sm"
              >
                +
              </button>
            </div>

            <input
              type="text"
              placeholder="નોંધ (Optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="theme-input px-3 py-2 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-2xl text-xs shadow-sm transition"
          >
            ✓ Save Extra Revision
          </button>
        </form>
      </div>
    </div>
  );
}
