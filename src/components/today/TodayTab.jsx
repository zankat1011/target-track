import React, { useState } from "react";
import { DailyHabits } from "./DailyHabits";
import { DailyGoal } from "./DailyGoal";
import { StudyLogger } from "./StudyLogger";
import { DueRevisions } from "./DueRevisions";
import { ActivityHistory } from "./ActivityHistory";
import { useStudy } from "../../context/StudyContext";
import { todayISO } from "../../utils/helpers";

export function TodayTab({
  onOpenExtraRev,
  onOpenQuickNotes,
  onOpenChapLock,
  onNavigateToSyllabus,
}) {
  const { currentUser, updateCurrentUser } = useStudy();
  const [quickNoteText, setQuickNoteText] = useState("");
  const [quickNoteSub, setQuickNoteSub] = useState("General");
  const [quickNoteFilter, setQuickNoteFilter] = useState("ALL");
  const [isListening, setIsListening] = useState(false);

  const startVoiceDictation = async () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      return alert(
        "🎙️ મોબાઈલ કીબોર્ડમાં રહેલા Google Mic (🎤) આઇકનનો ઉપયોગ કરો (આ WebView માં ડાયરેક્ટ માઈક બ્લોક છે)."
      );
    }
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (e) {
      return alert(
        "⚠️ માઈક્રોફોન પરમિશન Allow કરો (બ્રાઉઝર URL બારની બાજુમાં 🔒 Lock આઇકન પર ક્લિક કરી Microphone ચાલુ કરો)."
      );
    }

    try {
      const rec = new SpeechRec();
      rec.lang = "gu-IN";
      rec.continuous = false;
      rec.interimResults = false;
      setIsListening(true);
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuickNoteText((prev) => (prev ? prev.trim() + " " : "") + transcript);
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      rec.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const subjects = currentUser?.subjects || [];
  const quickNotes = currentUser?.quickNotes || [];

  const handleAddQuickNote = (e) => {
    e.preventDefault();
    if (!quickNoteText.trim()) return;
    updateCurrentUser((user) => {
      if (!Array.isArray(user.quickNotes)) user.quickNotes = [];
      user.quickNotes.unshift({
        id: `qn_${Date.now()}`,
        subject: quickNoteSub,
        chapter: "All Chapters",
        noteType: "Quick Formula",
        title: quickNoteSub,
        text: quickNoteText.trim(),
        date: todayISO(),
      });
    });
    setQuickNoteText("");
  };

  const handleDeleteQuickNote = (id) => {
    updateCurrentUser((user) => {
      user.quickNotes = (user.quickNotes || []).filter((n) => n.id !== id);
    });
  };

  const handleEditQuickNote = (note) => {
    const newTxt = prompt("Edit Note / Formula:", note.text);
    if (newTxt && newTxt.trim()) {
      updateCurrentUser((user) => {
        const n = (user.quickNotes || []).find((x) => x.id === note.id);
        if (n) n.text = newTxt.trim();
      });
    }
  };

  const filteredNotes = React.useMemo(() => {
    if (quickNoteFilter === "ALL") return quickNotes;
    return quickNotes.filter((n) => (n.subject || "General") === quickNoteFilter);
  }, [quickNotes, quickNoteFilter]);

  return (
    <div id="tab-today" className="space-y-3.5 anim-fade">
      {/* 0. Daily 3-Habit Checklist */}
      <DailyHabits />

      {/* 1. Daily Target Progress Bar */}
      <DailyGoal />

      {/* 4. Daily Study Logger */}
      <StudyLogger
        onOpenChapLock={onOpenChapLock}
        onNavigateToSyllabus={onNavigateToSyllabus}
      />

      {/* 6. Today's Due Revisions */}
      <DueRevisions onOpenExtraRev={onOpenExtraRev} />

      {/* 7. Quick Notes Card */}
      <div className="one-card p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold">📌 Quick Notes</h2>
          <div className="flex items-center gap-1.5">
            <select
              value={quickNoteFilter}
              onChange={(e) => setQuickNoteFilter(e.target.value)}
              className="theme-input px-2 py-1 text-[10px] font-bold"
            >
              <option value="ALL">All Notes</option>
              <option value="General">🌐 General</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={onOpenQuickNotes}
              className="text-[10px] font-extrabold px-2.5 py-1 rounded-full subtle-pill text-indigo-500 hover:border-indigo-500"
            >
              🗂️ Folders
            </button>
          </div>
        </div>

        <form onSubmit={handleAddQuickNote} className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            <select
              value={quickNoteSub}
              onChange={(e) => setQuickNoteSub(e.target.value)}
              className="theme-input px-2.5 py-2 text-xs font-bold"
            >
              <option value="General">🌐 General</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  📚 {s.name}
                </option>
              ))}
            </select>
            <div className="col-span-2 flex gap-1.5">
              <input
                type="text"
                placeholder="સૂત્ર કે શોર્ટ નોંધ લખો (અથવા 🎙️ માઈક વાપરો)..."
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                className="flex-1 theme-input px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={startVoiceDictation}
                className={`subtle-pill px-2.5 rounded-xl flex items-center justify-center shrink-0 hover:border-indigo-500 ${
                  isListening ? "ring-2 ring-rose-500 text-rose-500 animate-pulse" : ""
                }`}
                title="Voice Typing (Gujarati / English)"
              >
                🎙️
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 rounded-2xl text-xs transition shadow-sm"
          >
            + Save Quick Note
          </button>
        </form>

        <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
          {filteredNotes.length === 0 ? (
            <div className="text-[11px] muted-text text-center py-2">
              હજુ કોઈ શોર્ટ-નોટ કે સૂત્ર સેવ કર્યું નથી.
            </div>
          ) : (
            filteredNotes.slice(0, 6).map((n) => (
              <div
                key={n.id}
                className="subtle-pill px-3 py-2 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1 truncate">
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-500 mr-1">
                    {n.subject || "General"}
                  </span>
                  <span className="font-semibold">{n.text}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEditQuickNote(n)}
                    className="px-1.5 py-0.5 rounded one-card text-[10px]"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDeleteQuickNote(n.id)}
                    className="text-rose-500 font-bold text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 8. Unified Color-Coded Activity & History */}
      <ActivityHistory />
    </div>
  );
}
