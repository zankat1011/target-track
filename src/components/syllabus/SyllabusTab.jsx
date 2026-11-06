import React, { useState } from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO } from "../../utils/helpers";
import { OFFICIAL_SYLLABUS_TEMPLATES } from "../../utils/constants";

export function SyllabusTab({ onOpenBulkImport, onOpenChapLock, onOpenMarketplace }) {
  const { currentUser, updateCurrentUser, syncCommonChapterProgressAcrossExams, triggerCelebration } = useStudy();

  const [newSubjectName, setNewSubjectName] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedVaultSubs, setExpandedVaultSubs] = useState({});
  const [openOldDrawerSubs, setOpenOldDrawerSubs] = useState({});

  // Chapter input draft states
  const [chapDrafts, setChapDrafts] = useState({});
  const [oldDateDrafts, setOldDateDrafts] = useState({});
  const [oldPageDrafts, setOldPageDrafts] = useState({});

  const subjects = currentUser?.subjects || [];

  // Toggle subject accordion
  const toggleSubject = (subId) => {
    setExpandedSubjects((prev) => ({ ...prev, [subId]: !prev[subId] }));
  };

  const setAllAccordion = (openState) => {
    const next = {};
    subjects.forEach((s) => { next[s.id] = openState; });
    setExpandedSubjects(next);
  };

  const toggleVaultSubject = (subId) => {
    setExpandedVaultSubs((prev) => ({ ...prev, [subId]: !prev[subId] }));
  };

  const toggleOldDrawer = (subId) => {
    setOpenOldDrawerSubs((prev) => ({ ...prev, [subId]: !prev[subId] }));
  };

  // Add Subject
  const handleAddSubject = (e) => {
    e?.preventDefault();
    if (!newSubjectName.trim()) return;
    const newId = `sub_${Date.now()}`;
    updateCurrentUser((user) => {
      user.subjects.push({ id: newId, name: newSubjectName.trim(), chapters: [] });
    });
    setExpandedSubjects((prev) => ({ ...prev, [newId]: true }));
    setNewSubjectName("");
  };

  // 1-Click Official Exam Syllabus Template Loader
  const loadOfficialSyllabusTemplate = (templateKey) => {
    const tpl = OFFICIAL_SYLLABUS_TEMPLATES[templateKey];
    if (!tpl) return;
    if (!window.confirm(`${templateKey} નો ઓફિશિયલ સિલેબસ (વિષયો અને ચેપ્ટર્સ) તમારા હાલના સિલેબસમાં ઉમેરવો છે?`)) return;

    let addedCount = 0;
    updateCurrentUser((user) => {
      if (!Array.isArray(user.subjects)) user.subjects = [];
      tpl.forEach((item) => {
        let sub = user.subjects.find((s) => s.name.toLowerCase() === item.name.toLowerCase());
        if (!sub) {
          sub = { id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: item.name, chapters: [] };
          user.subjects.push(sub);
        }
        item.chaps.forEach((chName) => {
          if (!sub.chapters.some((c) => c.name.toLowerCase() === chName.toLowerCase())) {
            sub.chapters.push({
              id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: chName,
              donePages: 0,
              revisedPages: 0,
              completed: false,
              topics: []
            });
            addedCount++;
          }
        });
      });
    });

    triggerCelebration(`📚 ${templateKey} સિલેબસ લોડ થયો!`, `${addedCount} ચેપ્ટર્સ સફળતાપૂર્વક ઉમેરાયા!`);
  };

  // Edit Subject
  const handleEditSubject = (sub) => {
    const val = prompt("Subject Name:", sub.name);
    if (!val || !val.trim()) return;
    updateCurrentUser((user) => {
      const s = (user.subjects || []).find((x) => x.id === sub.id);
      if (s) s.name = val.trim();
    });
  };

  // Delete Subject
  const handleDeleteSubject = (sub) => {
    if (!confirm(`આ વિષય "${sub.name}" અને તેના તમામ ચેપ્ટર/રિવિઝન ડિલીટ કરવા છે?`)) return;
    const chapIds = (sub.chapters || []).map((c) => c.id);
    updateCurrentUser((user) => {
      user.subjects = (user.subjects || []).filter((s) => s.id !== sub.id);
      user.revisions = (user.revisions || []).filter(
        (r) => r.subjectId !== sub.id && !chapIds.includes(r.chapterId) && r.subjectName !== sub.name
      );
      user.logs = (user.logs || []).filter(
        (l) => l.subjectId !== sub.id && !chapIds.includes(l.chapterId)
      );
    });
  };

  // Add Chapter
  const handleAddChapter = (subId, isOldCompleted) => {
    const name = (chapDrafts[subId] || "").trim();
    if (!name) return;

    let chosenDate = todayISO();
    let oldPages = 0;

    if (isOldCompleted) {
      if (oldDateDrafts[subId]) chosenDate = oldDateDrafts[subId];
      if (oldPageDrafts[subId]) oldPages = Math.max(0, parseInt(oldPageDrafts[subId], 10) || 0);
    }

    updateCurrentUser((user) => {
      const sub = (user.subjects || []).find((s) => s.id === subId);
      if (!sub) return;

      const newChap = {
        id: `ch_${Date.now()}`,
        name,
        donePages: oldPages,
        revisedPages: isOldCompleted ? oldPages : 0,
        completed: !!isOldCompleted,
        completedDate: isOldCompleted ? chosenDate : null,
        topics: [],
      };

      sub.chapters.push(newChap);

      if (isOldCompleted) {
        syncCommonChapterProgressAcrossExams(user, sub.name, newChap);
        // Schedule master revisions
        user.revisions = (user.revisions || []).filter(
          (r) => !(r.chapterId === newChap.id && r.revType === "master" && !r.done)
        );
        [
          { days: 0, label: "Day-1 Master" },
          { days: 7, label: "7-Day Master" },
          { days: 30, label: "30-Day Master" },
          { days: 60, label: "60-Day Master" },
        ].forEach((st) => {
          user.revisions.push({
            id: `mrev_${newChap.id}_${st.days}_${Date.now()}`,
            logId: `fin_${newChap.id}`,
            subjectId: sub.id,
            chapterId: newChap.id,
            pagesCount: Number(newChap.donePages || 0),
            revType: "master",
            subjectName: sub.name,
            chapterName: newChap.name,
            topicName: `✓ Full Chapter (${newChap.donePages}p)`,
            stageLabel: st.label,
            studiedDate: chosenDate,
            dueDate: chosenDate,
            done: false,
          });
        });
      }
    });

    setChapDrafts((prev) => ({ ...prev, [subId]: "" }));
    setOldPageDrafts((prev) => ({ ...prev, [subId]: "" }));
    if (isOldCompleted) {
      setOpenOldDrawerSubs((prev) => ({ ...prev, [subId]: false }));
      triggerCelebration("🏆 જૂનું ચેપ્ટર ઉમેરાયું!", `${name} (${oldPages}p)`);
    }
  };

  // Step Chapter Page
  const handleStepChapter = (subId, chapId, delta) => {
    updateCurrentUser((user) => {
      const sub = (user.subjects || []).find((s) => s.id === subId);
      const chap = sub?.chapters?.find((c) => c.id === chapId);
      if (!chap || chap.completed) return;
      chap.donePages = Math.max(0, Number(chap.donePages || 0) + delta);
      syncCommonChapterProgressAcrossExams(user, sub.name, chap);
    });
  };

  // Edit Chapter
  const handleEditChapter = (subId, chap) => {
    if (chap.completed) {
      onOpenChapLock(chap);
      return;
    }
    const val = prompt("ચેપ્ટરનું નામ સુધારો:", chap.name);
    if (!val || !val.trim()) return;
    const newRead = prompt("વાંચેલા પેજ (Read Pages) સુધારો:", chap.donePages || 0);
    const newRev = prompt("રિવિઝન થયેલા પેજ (Revised Pages) સુધારો:", chap.revisedPages || 0);

    updateCurrentUser((user) => {
      const sub = (user.subjects || []).find((s) => s.id === subId);
      const c = sub?.chapters?.find((x) => x.id === chap.id);
      if (!c) return;
      c.name = val.trim();
      if (newRead !== null) c.donePages = Math.max(0, parseInt(newRead, 10) || 0);
      if (newRev !== null) c.revisedPages = Math.min(c.donePages, Math.max(0, parseInt(newRev, 10) || 0));
      syncCommonChapterProgressAcrossExams(user, sub.name, c);
    });
  };

  // Delete Chapter
  const handleDeleteChapter = (subId, chap) => {
    if (chap.completed) {
      onOpenChapLock(chap);
      return;
    }
    if (!confirm(`આ ચેપ્ટર "${chap.name}" ડિલીટ કરવું છે?`)) return;
    updateCurrentUser((user) => {
      const sub = (user.subjects || []).find((s) => s.id === subId);
      if (sub) {
        sub.chapters = (sub.chapters || []).filter((c) => c.id !== chap.id);
      }
      user.revisions = (user.revisions || []).filter((r) => r.chapterId !== chap.id);
      user.logs = (user.logs || []).filter((l) => l.chapterId !== chap.id);
    });
  };

  // Toggle Chapter Complete / Reopen
  const handleToggleComplete = (subId, chap) => {
    updateCurrentUser((user) => {
      const sub = (user.subjects || []).find((s) => s.id === subId);
      const c = sub?.chapters?.find((x) => x.id === chap.id);
      if (!c) return;

      c.completed = !c.completed;
      if (c.completed) {
        c.completedDate = todayISO();
        syncCommonChapterProgressAcrossExams(user, sub.name, c);

        // Schedule Master revisions
        user.revisions = (user.revisions || []).filter(
          (r) => !(r.chapterId === c.id && r.revType === "master" && !r.done)
        );
        [
          { days: 0, label: "Day-1 Master" },
          { days: 7, label: "7-Day Master" },
          { days: 30, label: "30-Day Master" },
          { days: 60, label: "60-Day Master" },
        ].forEach((st) => {
          user.revisions.push({
            id: `mrev_${c.id}_${st.days}_${Date.now()}`,
            logId: `fin_${c.id}`,
            subjectId: sub.id,
            chapterId: c.id,
            pagesCount: Number(c.donePages || 0),
            revType: "master",
            subjectName: sub.name,
            chapterName: c.name,
            topicName: `✓ Full Chapter (${c.donePages}p)`,
            stageLabel: st.label,
            studiedDate: todayISO(),
            dueDate: todayISO(),
            done: false,
          });
        });
      } else {
        syncCommonChapterProgressAcrossExams(user, sub.name, c);
        user.revisions = (user.revisions || []).filter(
          (r) => !(r.chapterId === c.id && r.revType === "master" && !r.done)
        );
      }
    });

    if (!chap.completed) {
      triggerCelebration("🏆 ચેપ્ટર પૂર્ણ!", chap.name);
    }
  };

  let globalDoneChaps = 0;
  subjects.forEach((s) => {
    (s.chapters || []).forEach((c) => {
      if (c.completed) globalDoneChaps++;
    });
  });

  return (
    <div id="tab-syllabus" className="space-y-3.5 anim-fade">
      {/* 1. Add Subject Card */}
      <div id="tourTargetSyllabusAdd" className="one-card p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold">📚 નવો વિષય ઉમેરો</span>
          <button
            onClick={onOpenBulkImport}
            className="text-[10px] font-extrabold text-indigo-500 underline"
          >
            📥 Bulk Import (Excel/Word)
          </button>
        </div>
        <form onSubmit={handleAddSubject} className="flex gap-2">
          <input
            type="text"
            placeholder="દા.ત. ભારતનું બંધારણ"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            className="flex-1 theme-input px-3.5 py-2.5 text-xs font-semibold"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs shrink-0 shadow-sm transition"
          >
            + વિષય
          </button>
        </form>
      </div>

      {/* 1.5 NEW: 1-CLICK OFFICIAL EXAM SYLLABUS TEMPLATES */}
      <div className="one-card p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold">⚡ 1-Click તૈયાર સિલેબસ લોડ કરો (Templates)</span>
          <span className="text-[9px] font-bold muted-text">Auto-Add Subjects & Chapters</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => loadOfficialSyllabusTemplate("CCE")}
            className="subtle-pill px-3 py-1.5 text-[11px] font-extrabold text-indigo-500 shrink-0 hover:border-indigo-500 transition"
          >
            + CCE (Prelims + Mains)
          </button>
          <button
            type="button"
            onClick={() => loadOfficialSyllabusTemplate("GPSC")}
            className="subtle-pill px-3 py-1.5 text-[11px] font-extrabold text-emerald-500 shrink-0 hover:border-emerald-500 transition"
          >
            + GPSC Class 1-2
          </button>
          <button
            type="button"
            onClick={() => loadOfficialSyllabusTemplate("POLICE")}
            className="subtle-pill px-3 py-1.5 text-[11px] font-extrabold text-amber-500 shrink-0 hover:border-amber-500 transition"
          >
            + PSI / Constable
          </button>
        </div>
      </div>

      {/* Accordion Controls */}
      <div className="flex items-center justify-between px-2">
        <span className="text-[11px] font-bold muted-text">વિષય Open / Close</span>
        <div className="flex gap-2">
          <button
            onClick={() => setAllAccordion(true)}
            className="text-[11px] font-extrabold text-indigo-500 hover:underline"
          >
            Open All
          </button>
          <span className="muted-text">•</span>
          <button
            onClick={() => setAllAccordion(false)}
            className="text-[11px] font-extrabold muted-text hover:underline"
          >
            Close All
          </button>
        </div>
      </div>

      {/* 2. Subjects List */}
      <div className="space-y-2.5">
        {subjects.length === 0 ? (
          <div className="one-card p-6 text-center text-xs muted-text">
            ઉપરના બોક્સમાંથી પહેલો વિષય ઉમેરો.
          </div>
        ) : (
          subjects.map((sub, sIdx) => {
            const totalC = (sub.chapters || []).length;
            const doneC = (sub.chapters || []).filter((c) => c.completed).length;
            const totalP = (sub.chapters || []).reduce((a, c) => a + Number(c.donePages || 0), 0);
            const revP = (sub.chapters || []).reduce((a, c) => a + Number(c.revisedPages || 0), 0);
            const isOpen = !!expandedSubjects[sub.id];
            const showOldDrawer = !!openOldDrawerSubs[sub.id];
            const pct = totalC > 0 ? Math.round((doneC / totalC) * 100) : 0;

            return (
              <div
                key={sub.id}
                className={`one-card overflow-hidden transition-all ${
                  isOpen ? "ring-1 ring-indigo-500/30" : ""
                }`}
              >
                {/* Subject Header */}
                <div
                  onClick={() => toggleSubject(sub.id)}
                  className="p-4 cursor-pointer select-none space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-2xl subtle-pill flex items-center justify-center text-xs font-extrabold text-indigo-500 shrink-0">
                        {sIdx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold truncate">{sub.name}</h3>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full subtle-pill text-indigo-500 shrink-0">
                            {doneC}/{totalC} Ch
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] muted-text font-semibold mt-0.5 flex-wrap">
                          <span>
                            📖 Read: <b>{totalP}p</b>
                          </span>
                          <span>•</span>
                          <span>
                            ✅ Rev: <b className="text-emerald-500">{revP}p</b>
                          </span>
                          <span>•</span>
                          <span className="text-indigo-500 font-bold">{pct}% Done</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleEditSubject(sub)}
                        className="w-7 h-7 rounded-xl subtle-pill text-xs hover:border-indigo-500"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(sub)}
                        className="w-7 h-7 rounded-xl subtle-pill text-rose-500 text-xs hover:bg-rose-500/10"
                      >
                        🗑
                      </button>
                      <span
                        onClick={() => toggleSubject(sub.id)}
                        className="w-7 h-7 rounded-xl subtle-pill flex items-center justify-center text-[10px] font-extrabold muted-text"
                      >
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 subtle-pill overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Chapters Drawer */}
                {isOpen && (
                  <div
                    className="px-4 pb-4 pt-2 space-y-2 border-t anim-fade"
                    style={{ borderColor: "var(--border-col)" }}
                  >
                    {(sub.chapters || []).map((c, cIdx) => {
                      const rp = Math.min(c.donePages || 0, Number(c.revisedPages || 0));
                      return (
                        <div
                          key={c.id}
                          className={`subtle-pill p-3 space-y-2 ${
                            c.completed
                              ? "border-l-4 border-l-emerald-500"
                              : "border-l-4 border-l-indigo-500/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono font-bold muted-text">
                                  #{cIdx + 1}
                                </span>
                                <span className="text-xs font-extrabold truncate">{c.name}</span>
                                {c.completed ? (
                                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                                    ✓ પૂર્ણ ({c.completedDate || "Done"})
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                                    ચાલુ
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] muted-text mt-0.5 font-semibold">
                                📖 Read: <b>{c.donePages}p</b> • ✅ Revised:{" "}
                                <b className="text-emerald-500">{rp}p</b>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!c.completed ? (
                                <>
                                  <div className="flex items-center one-card px-1 py-0.5 rounded-xl">
                                    <button
                                      onClick={() => handleStepChapter(sub.id, c.id, -1)}
                                      className="w-5 h-5 text-xs font-extrabold"
                                    >
                                      −
                                    </button>
                                    <span className="text-[11px] font-mono font-extrabold px-1">
                                      {c.donePages}
                                    </span>
                                    <button
                                      onClick={() => handleStepChapter(sub.id, c.id, 1)}
                                      className="w-5 h-5 text-xs font-extrabold text-indigo-500"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => handleEditChapter(sub.id, c)}
                                    className="w-6 h-6 rounded-lg one-card text-[10px]"
                                    title="Edit"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={() => handleDeleteChapter(sub.id, c)}
                                    className="w-6 h-6 rounded-lg one-card text-rose-500 text-[10px]"
                                    title="Delete"
                                  >
                                    🗑
                                  </button>
                                  <button
                                    onClick={() => handleToggleComplete(sub.id, c)}
                                    className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                                  >
                                    ✓ પૂર્ણ
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleToggleComplete(sub.id, c)}
                                  className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold one-card text-amber-500"
                                >
                                  ↺ Reopen
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Chapter Form */}
                    <div className="subtle-pill p-3 space-y-2 mt-2">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="નવું ચેપ્ટર ઉમેરો..."
                          value={chapDrafts[sub.id] || ""}
                          onChange={(e) =>
                            setChapDrafts((prev) => ({ ...prev, [sub.id]: e.target.value }))
                          }
                          className="flex-1 theme-input px-3 py-2 text-xs font-semibold"
                        />
                        <button
                          onClick={() => handleAddChapter(sub.id, false)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shrink-0 shadow-sm"
                        >
                          + ઉમેરો
                        </button>
                        <button
                          onClick={() => toggleOldDrawer(sub.id)}
                          className="one-card px-2.5 py-2 rounded-xl text-[10px] font-extrabold text-emerald-500 shrink-0 hover:border-emerald-500"
                        >
                          📅 જૂનું પૂર્ણ?
                        </button>
                      </div>

                      {showOldDrawer && (
                        <div
                          className="pt-2 border-t flex items-center justify-between gap-2 flex-wrap anim-fade"
                          style={{ borderColor: "var(--border-col)" }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold muted-text">પૂર્ણ તારીખ:</span>
                            <input
                              type="date"
                              value={oldDateDrafts[sub.id] || todayISO()}
                              onChange={(e) =>
                                setOldDateDrafts((prev) => ({ ...prev, [sub.id]: e.target.value }))
                              }
                              className="theme-input px-2 py-1 text-[11px] font-bold"
                            />
                          </div>
                          <input
                            type="number"
                            placeholder="કુલ પેજ"
                            value={oldPageDrafts[sub.id] || ""}
                            onChange={(e) =>
                              setOldPageDrafts((prev) => ({ ...prev, [sub.id]: e.target.value }))
                            }
                            className="w-20 theme-input px-2.5 py-1 text-xs font-bold"
                          />
                          <button
                            onClick={() => handleAddChapter(sub.id, true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-[11px] shadow-sm"
                          >
                            ✓ જૂની તારીખે પૂર્ણ ઉમેરો
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Completed Chapters Vault */}
      <div id="completedChaptersVaultAnchor" className="one-card p-4 border-l-4 border-l-emerald-500">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-extrabold text-emerald-500">
            🏆 પૂર્ણ થયેલા ચેપ્ટર્સ (Completed Vault)
          </h2>
          <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500">
            {globalDoneChaps} પૂર્ણ
          </span>
        </div>

        <div className="space-y-2">
          {subjects.filter((s) => (s.chapters || []).some((c) => c.completed)).length === 0 ? (
            <div className="text-xs muted-text text-center py-2">
              હજુ કોઈ ચેપ્ટર પૂર્ણ થયું નથી.
            </div>
          ) : (
            subjects.map((s) => {
              const compChaps = (s.chapters || []).filter((c) => c.completed);
              if (compChaps.length === 0) return null;
              const isVaultOpen = !!expandedVaultSubs[s.id];
              const pct = Math.round((compChaps.length / s.chapters.length) * 100);

              return (
                <div key={s.id} className="subtle-pill overflow-hidden">
                  <div
                    onClick={() => toggleVaultSubject(s.id)}
                    className="p-3 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-emerald-500">
                        {isVaultOpen ? "▼" : "▶"}
                      </span>
                      <span className="text-xs font-extrabold">{s.name}</span>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                      🏆 {compChaps.length}/{s.chapters.length} પૂર્ણ ({pct}%)
                    </span>
                  </div>

                  {isVaultOpen && (
                    <div
                      className="px-3 pb-3 pt-1 space-y-1.5 border-t anim-fade"
                      style={{ borderColor: "var(--border-col)" }}
                    >
                      {compChaps.map((c) => {
                        const mDone = (currentUser.revisions || []).filter(
                          (r) => r.chapterId === c.id && r.revType === "master" && r.done
                        ).length;

                        return (
                          <div
                            key={c.id}
                            className="one-card px-3 py-2 rounded-2xl flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-emerald-500 truncate">
                                ✓ {c.name}
                              </div>
                              <div className="text-[10px] muted-text">
                                પૂર્ણ તારીખ: <b>{c.completedDate || "--"}</b> • {c.donePages}p
                              </div>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 shrink-0">
                              Master Rev: {mDone}/4
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
