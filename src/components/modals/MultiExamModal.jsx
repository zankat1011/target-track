import React, { useState } from "react";
import { useStudy } from "../../context/StudyContext";

export function MultiExamModal({ isOpen, onClose }) {
  const { currentUser, updateCurrentUser, triggerCelebration } = useStudy();

  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [copySyllabus, setCopySyllabus] = useState(false);

  if (!isOpen) return null;

  const exams = currentUser?.exams || [];

  const handleAddNewExam = (e) => {
    e?.preventDefault();
    const exName = newName.trim();
    if (!exName) return alert("પરીક્ષાનું નામ લખો.");

    const newId = `ex_${Date.now()}`;
    updateCurrentUser((user) => {
      // Save current exam's syllabus state
      const curEx = (user.exams || []).find((x) => x.id === user.activeExamId);
      if (curEx) {
        curEx.subjects = JSON.parse(JSON.stringify(user.subjects || []));
      }

      const initialSubs = copySyllabus
        ? JSON.parse(JSON.stringify(user.subjects || []))
        : [];

      user.exams.push({
        id: newId,
        name: exName,
        examDate: newDate || "",
        subjects: initialSubs,
      });

      // Switch to new exam
      user.activeExamId = newId;
      user.exam = exName;
      user.examDate = newDate || "";
      user.subjects = initialSubs;
    });

    setNewName("");
    setNewDate("");
    setCopySyllabus(false);
    triggerCelebration("🎯 નવી પરીક્ષા ઉમેરાઈ!", exName);
    onClose();
  };

  const handleSwitchExam = (examId) => {
    updateCurrentUser((user) => {
      const curEx = (user.exams || []).find((x) => x.id === user.activeExamId);
      if (curEx) {
        curEx.name = user.exam;
        curEx.examDate = user.examDate;
        curEx.subjects = JSON.parse(JSON.stringify(user.subjects || []));
      }

      const target = (user.exams || []).find((x) => x.id === examId);
      if (!target) return;

      user.activeExamId = target.id;
      user.exam = target.name;
      user.examDate = target.examDate || "";
      user.subjects = JSON.parse(JSON.stringify(target.subjects || []));
    });
    onClose();
  };

  const handleDeleteExam = (examId) => {
    if (exams.length <= 1) return alert("ઓછામાં ઓછી એક પરીક્ષા હોવી જરૂરી છે.");
    if (!confirm("આ પરીક્ષા પ્રોફાઈલ ડિલીટ કરવી છે?")) return;

    updateCurrentUser((user) => {
      user.exams = (user.exams || []).filter((x) => x.id !== examId);
      if (user.activeExamId === examId) {
        const first = user.exams[0];
        user.activeExamId = first.id;
        user.exam = first.name;
        user.examDate = first.examDate || "";
        user.subjects = JSON.parse(JSON.stringify(first.subjects || []));
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 anim-fade" onClick={onClose}>
      <div className="w-full max-w-sm one-card p-5 space-y-3.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold">🎯 Multiple Exam Switcher</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full subtle-pill text-xs font-extrabold">
            ✕
          </button>
        </div>

        {/* Exam List */}
        <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
          {exams.map((ex) => {
            const isCurrent = ex.id === currentUser?.activeExamId;
            const subCount = (ex.subjects || []).length;
            let cTot = 0, cDone = 0;
            (ex.subjects || []).forEach((s) =>
              (s.chapters || []).forEach((c) => {
                cTot++;
                if (c.completed) cDone++;
              })
            );

            return (
              <div
                key={ex.id}
                className={`subtle-pill p-3 flex items-center justify-between gap-2 ${
                  isCurrent ? "border-2 border-indigo-600" : ""
                }`}
              >
                <div
                  onClick={() => handleSwitchExam(ex.id)}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold truncate">{ex.name}</span>
                    {isCurrent && (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] muted-text mt-0.5">
                    📅 {ex.examDate || "No Date"} • 📚 {subCount} વિષય ({cDone}/{cTot} પૂર્ણ)
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isCurrent && (
                    <button
                      onClick={() => handleSwitchExam(ex.id)}
                      className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white text-[10px] font-extrabold"
                    >
                      Switch
                    </button>
                  )}
                  {exams.length > 1 && (
                    <button
                      onClick={() => handleDeleteExam(ex.id)}
                      className="px-2 py-1 rounded-xl bg-rose-500/15 text-rose-500 text-xs font-bold hover:bg-rose-500/25"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Exam Box */}
        <form
          onSubmit={handleAddNewExam}
          className="subtle-pill p-3 space-y-2 border-t"
          style={{ borderColor: "var(--border-col)" }}
        >
          <div className="text-[10px] font-extrabold uppercase muted-text">+ નવી પરીક્ષા ઉમેરો</div>
          <input
            type="text"
            placeholder="પરીક્ષાનું નામ (e.g. GPSC / CCE)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full theme-input px-3 py-2 text-xs font-bold"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="theme-input px-3 py-2 text-xs font-bold"
            />
            <label className="subtle-pill px-2.5 py-2 flex items-center gap-1.5 text-[10px] font-extrabold cursor-pointer">
              <input
                type="checkbox"
                checked={copySyllabus}
                onChange={(e) => setCopySyllabus(e.target.checked)}
                className="accent-indigo-600"
              />
              <span>હાલના વિષય કોપી કરો</span>
            </label>
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-2xl text-xs shadow-sm transition"
          >
            + Add & Switch Exam
          </button>
        </form>
      </div>
    </div>
  );
}
