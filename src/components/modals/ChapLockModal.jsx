import React from "react";
import { useStudy } from "../../context/StudyContext";

export function ChapLockModal({ chapter, isOpen, onClose }) {
  const { updateCurrentUser, syncCommonChapterProgressAcrossExams } = useStudy();

  if (!isOpen || !chapter) return null;

  const handleConfirmReopen = () => {
    updateCurrentUser((user) => {
      (user.subjects || []).forEach((s) => {
        const c = (s.chapters || []).find((x) => x.id === chapter.id);
        if (c) {
          c.completed = false;
          syncCommonChapterProgressAcrossExams(user, s.name, c);
          user.revisions = (user.revisions || []).filter(
            (r) => !(r.chapterId === c.id && r.revType === "master" && !r.done)
          );
        }
      });
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 anim-fade" onClick={onClose}>
      <div className="w-full max-w-xs one-card p-5 text-center space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto text-2xl">
          🔒
        </div>
        <h3 className="text-sm font-extrabold">{chapter.name} પૂર્ણ થઈ ગયું છે</h3>
        <p className="text-xs muted-text leading-relaxed">
          પૂર્ણ થયેલા ચેપ્ટરમાં પેજ ઉમેરવા કે ફેરફાર કરવા માટે તેને પહેલા <b>Reopen (પાછું ચાલુ)</b> કરવું પડશે.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={onClose} className="subtle-pill py-2.5 text-xs font-extrabold hover:border-indigo-500">
            Cancel
          </button>
          <button
            onClick={handleConfirmReopen}
            className="bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-2xl text-xs font-extrabold shadow-sm transition"
          >
            ↺ પાછું ચાલુ કરો
          </button>
        </div>
      </div>
    </div>
  );
}
