import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useStudy } from "../../context/StudyContext";
import { openAdminWhatsApp, openTelegramChannel } from "../../utils/helpers";

export function SideDrawer({
  isOpen,
  onClose,
  onOpenMultiExam,
  onOpenQuickNotes,
  onOpenExtraRev,
  onOpenBulkImport,
  onOpenWhatsNew,
  onStartTour
}) {
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentUser } = useStudy();

  if (!isOpen) return null;

  const downloadBackup = () => {
    if (!currentUser) return;
    const a = document.createElement("a");
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentUser, null, 2));
    a.download = `target_track_backup_${currentUser.mobile}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end anim-fade" onClick={onClose}>
      <div
        className="w-72 max-w-[82vw] h-full one-card rounded-none rounded-l-3xl p-5 flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div
            className="flex items-center justify-between border-b pb-3"
            style={{ borderColor: "var(--border-col)" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm">
                🎯
              </div>
              <div>
                <div className="text-xs font-extrabold">TARGET TRACK OS</div>
                <div className="text-[10px] muted-text">One UI 9 Quick Menu</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full subtle-pill text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 text-xs font-bold">
            <button
              onClick={() => { onClose(); onOpenMultiExam(); }}
              className="w-full subtle-pill p-3 text-left flex items-center gap-2.5 hover:border-indigo-500"
            >
              <span>🎯</span> <span>Multiple Exam Switcher</span>
            </button>
            <button
              onClick={() => { onClose(); onOpenQuickNotes(); }}
              className="w-full subtle-pill p-3 text-left flex items-center gap-2.5 hover:border-indigo-500"
            >
              <span>🗂️</span> <span>Quick Formula & Key Folders</span>
            </button>
            <button
              onClick={() => { onClose(); onOpenExtraRev(); }}
              className="w-full subtle-pill p-3 text-left flex items-center gap-2.5 hover:border-indigo-500"
            >
              <span>⚡</span> <span>+ Add Extra Revision</span>
            </button>
            <button
              onClick={() => { onClose(); onOpenBulkImport(); }}
              className="w-full subtle-pill p-3 text-left flex items-center gap-2.5 hover:border-indigo-500"
            >
              <span>📥</span> <span>Excel / Word Bulk Import</span>
            </button>
            <button
              onClick={() => { onClose(); onOpenWhatsNew(); }}
              className="w-full subtle-pill p-3 text-left flex items-center gap-2.5 hover:border-indigo-500"
            >
              <span>✨</span> <span>What's New Features</span>
            </button>
            <button
              onClick={() => { onClose(); onStartTour(); }}
              className="w-full subtle-pill p-3 text-left flex items-center gap-2.5 hover:border-indigo-500"
            >
              <span>🧭</span> <span>Interactive App Guide Tour</span>
            </button>
            <button
              onClick={() => { toggleTheme(); }}
              className="w-full subtle-pill p-3 text-left flex items-center gap-2.5 hover:border-indigo-500"
            >
              <span>🎨</span> <span>Switch Theme ({theme === "cream" ? "Black" : "Cream"})</span>
            </button>
            <button
              onClick={downloadBackup}
              className="w-full subtle-pill p-3 text-left flex items-center gap-2.5 hover:border-indigo-500"
            >
              <span>💾</span> <span>Download Data Backup</span>
            </button>
            <button
              type="button"
              onClick={openTelegramChannel}
              className="w-full subtle-pill p-3 text-left flex items-center gap-2.5 text-indigo-500 hover:border-indigo-500"
            >
              <span>✈️</span> <span>Telegram (@thetarget_MCQ)</span>
            </button>
            <button
              onClick={() => openAdminWhatsApp("Hello Target Track Team, I need help with my account.")}
              className="w-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 rounded-2xl p-3 text-left flex items-center gap-2.5"
            >
              <span>💬</span> <span>WhatsApp Admin Support</span>
            </button>
          </div>
        </div>

        <div
          className="pt-3 border-t flex items-center justify-between"
          style={{ borderColor: "var(--border-col)" }}
        >
          <span className="text-[11px] font-mono muted-text">
            ID: {session?.mobile || "--"}
          </span>
          <button
            onClick={() => { onClose(); logout(); }}
            className="text-xs font-extrabold text-rose-500 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
