import React, { useState } from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO } from "../../utils/helpers";

export function QuickNotesModal({ isOpen, onClose }) {
  const { currentUser, updateCurrentUser, triggerCelebration } = useStudy();

  const [activeSub, setActiveSub] = useState("ALL");
  const [activeChap, setActiveChap] = useState("ALL");
  const [subSelect, setSubSelect] = useState("General");
  const [chapSelect, setChapSelect] = useState("All Chapters");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  if (!isOpen) return null;

  const subjects = currentUser?.subjects || [];
  const quickNotes = currentUser?.quickNotes || [];

  const handleSaveNote = (e) => {
    e?.preventDefault();
    if (!text.trim()) return alert("નોંધ કે સૂત્ર લખો.");

    updateCurrentUser((user) => {
      if (!Array.isArray(user.quickNotes)) user.quickNotes = [];
      user.quickNotes.unshift({
        id: `qn_${Date.now()}`,
        subject: subSelect || "General",
        chapter: chapSelect || "All Chapters",
        noteType: "Formula & Key",
        title: title.trim() || "Formula / Key",
        text: text.trim(),
        date: todayISO(),
      });
    });

    setTitle("");
    setText("");
    triggerCelebration("🗂️ ફોલ્ડરમાં સેવ થયું!", `${subSelect} ➔ ${chapSelect}`);
  };

  const handleEditNote = (note) => {
    const newTxt = prompt("Edit Note / Formula:", note.text);
    if (newTxt && newTxt.trim()) {
      updateCurrentUser((user) => {
        const n = (user.quickNotes || []).find((x) => x.id === note.id);
        if (n) n.text = newTxt.trim();
      });
    }
  };

  const handleDeleteNote = (id) => {
    updateCurrentUser((user) => {
      user.quickNotes = (user.quickNotes || []).filter((n) => n.id !== id);
    });
  };

  const filteredNotes = quickNotes.filter((n) => {
    if (activeSub !== "ALL" && (n.subject || "General") !== activeSub) return false;
    if (activeChap !== "ALL" && (n.chapter || "All Chapters") !== activeChap) return false;
    return true;
  });

  const subjectsList = ["ALL", "General", ...subjects.map((s) => s.name)];
  const activeSubObj = subjects.find((s) => s.name === activeSub);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto px-3.5 py-4 anim-fade"
      style={{ backgroundColor: "var(--bg-main)" }}
    >
      <div className="max-w-md mx-auto space-y-3.5 pb-16">
        {/* Header */}
        <div className="one-card p-4 flex items-center justify-between sticky top-2 z-10 shadow-md">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl subtle-pill font-extrabold text-sm flex items-center justify-center"
            >
              ←
            </button>
            <div>
              <h2 className="text-sm font-extrabold">📌 Quick Formula & Key Folders</h2>
            </div>
          </div>
          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-500">
            {quickNotes.length} Notes
          </span>
        </div>

        {/* Add Note Card */}
        <form onSubmit={handleSaveNote} className="one-card p-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={subSelect}
              onChange={(e) => {
                setSubSelect(e.target.value);
                setChapSelect("All Chapters");
              }}
              className="theme-input px-3 py-2 text-xs font-bold"
            >
              <option value="General">🌐 General Folder</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  📚 {s.name}
                </option>
              ))}
            </select>

            <select
              value={chapSelect}
              onChange={(e) => setChapSelect(e.target.value)}
              className="theme-input px-3 py-2 text-xs font-bold"
            >
              <option value="All Chapters">📂 All Chapters</option>
              {subjects
                .find((s) => s.name === subSelect)
                ?.chapters?.map((c) => (
                  <option key={c.id} value={c.name}>
                    📖 {c.name}
                  </option>
                ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="ટાઈટલ / ટોપિક (Formula કે Key નું નામ)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full theme-input px-3 py-2 text-xs font-bold"
          />

          <textarea
            rows="2"
            placeholder="સૂત્ર, શોર્ટ-કી અથવા અગત્યની નોંધ લખો..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full theme-input p-3 text-xs font-semibold"
          />

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-2xl text-xs shadow-sm transition"
          >
            + ફોલ્ડરમાં સેવ કરો
          </button>
        </form>

        {/* Subject Filter Tabs Bar */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {subjectsList.map((sName) => {
            const count =
              sName === "ALL"
                ? quickNotes.length
                : quickNotes.filter((n) => (n.subject || "General") === sName).length;
            const active = activeSub === sName;
            return (
              <button
                key={sName}
                onClick={() => {
                  setActiveSub(sName);
                  setActiveChap("ALL");
                }}
                className={`px-3 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition ${
                  active
                    ? "bg-indigo-500/15 text-indigo-500 border border-indigo-500/40"
                    : "one-card muted-text"
                }`}
              >
                📁 {sName === "ALL" ? "All Subjects" : sName} ({count})
              </button>
            );
          })}
        </div>

        {/* Chapter Filter Tabs Bar (if a specific subject is active) */}
        {activeSubObj && (activeSubObj.chapters || []).length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {["ALL", ...(activeSubObj.chapters || []).map((c) => c.name)].map((cName) => {
              const active = activeChap === cName;
              return (
                <button
                  key={cName}
                  onClick={() => setActiveChap(cName)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition ${
                    active
                      ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/40"
                      : "subtle-pill muted-text"
                  }`}
                >
                  📖 {cName === "ALL" ? "All Chapters" : cName}
                </button>
              );
            })}
          </div>
        )}

        {/* Bento Grid Folder Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {filteredNotes.length === 0 ? (
            <div className="col-span-2 one-card p-6 text-center text-xs muted-text">
              આ ફોલ્ડરમાં હજુ કોઈ નોંધ નથી. ઉપરથી નવી નોંધ ઉમેરો.
            </div>
          ) : (
            filteredNotes.map((n) => (
              <div
                key={n.id}
                className="one-card p-3.5 flex flex-col justify-between space-y-2 border-t-4 border-t-indigo-500"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 truncate">
                      🔑 Formula & Key
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditNote(n)}
                        className="text-[10px] px-1.5 py-0.5 rounded subtle-pill hover:border-indigo-500"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-[10px] text-rose-500 font-bold px-1 hover:bg-rose-500/10 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-extrabold truncate">
                    {n.title || n.subject || "Note"}
                  </div>
                  <p className="text-[11px] muted-text leading-relaxed break-words whitespace-pre-wrap">
                    {n.text}
                  </p>
                </div>
                <div
                  className="pt-1.5 border-t text-[9px] font-bold muted-text truncate"
                  style={{ borderColor: "var(--border-col)" }}
                >
                  📁 {n.subject || "General"}{" "}
                  {n.chapter && n.chapter !== "All Chapters" ? `• ${n.chapter}` : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
