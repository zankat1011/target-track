import React, { useState } from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO } from "../../utils/helpers";

export function BulkImportModal({ isOpen, onClose }) {
  const { currentUser, updateCurrentUser, triggerCelebration } = useStudy();

  const [mode, setMode] = useState("syllabus"); // 'syllabus' | 'tests'
  const [text, setText] = useState("");

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setText(event.target.result || "");
    };
    reader.readAsText(file);
  };

  const handleProcessImport = () => {
    const raw = text.trim();
    if (!raw) return alert("પહેલા ડેટા પેસ્ટ કરો અથવા ફાઈલ અપલોડ કરો.");

    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let count = 0;

    updateCurrentUser((user) => {
      lines.forEach((line) => {
        const parts = line.split(/\t|,|-/).map((p) => p.trim()).filter(Boolean);
        if (parts.length < 2) return;

        if (mode === "syllabus") {
          const subName = parts[0];
          const chapName = parts[1];
          const pages = parts[2] ? Math.max(0, parseInt(parts[2], 10) || 0) : 0;

          let sub = user.subjects.find((s) => s.name.toLowerCase() === subName.toLowerCase());
          if (!sub) {
            sub = {
              id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: subName,
              chapters: [],
            };
            user.subjects.push(sub);
          }

          if (!sub.chapters.some((c) => c.name.toLowerCase() === chapName.toLowerCase())) {
            const newChap = {
              id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: chapName,
              donePages: pages,
              revisedPages: 0,
              completed: false,
              topics: [],
            };

            // Sync from other exam profile if existing
            if (Array.isArray(user.exams)) {
              user.exams.forEach((ex) => {
                if (ex.id === user.activeExamId) return;
                const mSub = (ex.subjects || []).find(
                  (s) => (s.name || "").trim().toLowerCase() === subName.toLowerCase()
                );
                const mChap = mSub
                  ? (mSub.chapters || []).find(
                      (c) => (c.name || "").trim().toLowerCase() === chapName.toLowerCase()
                    )
                  : null;
                if (mChap) {
                  newChap.donePages = mChap.donePages || pages;
                  newChap.revisedPages = 0;
                  newChap.completed = !!mChap.completed;
                  newChap.completedDate = mChap.completedDate || null;
                }
              });
            }

            sub.chapters.push(newChap);
            count++;
          }
        } else {
          const subName = parts[0];
          const chapName = parts[1];
          const sc = parseFloat(parts[2]);
          const tot = parseFloat(parts[3] || "100");
          if (!isNaN(sc) && !isNaN(tot) && tot > 0) {
            user.tests.push({
              id: `tst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              date: todayISO(),
              testType: "chapter",
              title: chapName,
              subjects: [subName],
              chapters: [chapName],
              subjectName: subName,
              chapterName: chapName,
              scored: sc,
              total: tot,
            });
            count++;
          }
        }
      });
    });

    setText("");
    triggerCelebration("📥 Bulk Import પૂર્ણ!", `${count} રેકોર્ડ્સ સફળતાપૂર્વક ઉમેરાયા!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 anim-fade" onClick={onClose}>
      <div className="w-full max-w-md one-card p-5 space-y-3.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold">📥 Excel / CSV / Word Bulk Import</h3>
          <button onClick={onClose} className="text-xs font-extrabold muted-text hover:text-rose-500">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 subtle-pill p-1">
          <button
            onClick={() => setMode("syllabus")}
            className={`py-1.5 rounded-xl text-xs font-extrabold transition ${
              mode === "syllabus" ? "bg-indigo-600 text-white shadow-sm" : "muted-text"
            }`}
          >
            📚 Subjects & Chapters
          </button>
          <button
            onClick={() => setMode("tests")}
            className={`py-1.5 rounded-xl text-xs font-extrabold transition ${
              mode === "tests" ? "bg-indigo-600 text-white shadow-sm" : "muted-text"
            }`}
          >
            🎯 Test Marks
          </button>
        </div>

        <div className="subtle-pill p-2.5 text-[10px] muted-text leading-relaxed font-mono">
          {mode === "syllabus" ? (
            <span>Format:<br /><b>Subject Name, Chapter Name, Pages(Optional)</b></span>
          ) : (
            <span>Format:<br /><b>Subject Name, Chapter/Test Name, Scored, Total</b></span>
          )}
        </div>

        <textarea
          rows="5"
          placeholder="Excel કે Word માંથી કોપી કરીને અહીં પેસ્ટ કરો..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full theme-input p-3 text-xs font-mono"
        />

        <div className="flex items-center justify-between gap-2">
          <label className="subtle-pill px-3 py-2 text-xs font-extrabold cursor-pointer hover:border-indigo-500 transition">
            📂 Upload .CSV / .TXT
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
          </label>
          <button
            onClick={handleProcessImport}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-2xl text-xs shadow-sm transition"
          >
            ✓ Import All Data Now
          </button>
        </div>
      </div>
    </div>
  );
}
