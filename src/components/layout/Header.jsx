import React from "react";
import { useStudy } from "../../context/StudyContext";

export function Header({ onOpenDrawer }) {
  const { db, currentUser, cloudStatus } = useStudy();

  return (
    <header className="mb-3 space-y-2">
      {/* Broadcast Banner */}
      {db.broadcast && db.broadcast.trim() && (
        <div className="one-card p-3 bg-indigo-600/10 border-indigo-500/40 flex items-center justify-between gap-2 anim-fade">
          <div className="text-xs font-bold text-indigo-500 flex items-center gap-1.5">
            <span>📢</span>
            <span>{db.broadcast}</span>
          </div>
        </div>
      )}

      {/* Clean Minimal Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm shrink-0">
            🎯
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold tracking-tight truncate">TARGET TRACK</h1>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 shrink-0">
                {cloudStatus}
              </span>
            </div>
            <p className="text-[10px] muted-text font-medium truncate">
              {currentUser ? `${currentUser.name} • ${currentUser.exam || "Study OS"}` : "Smart Study OS"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenDrawer}
            title="More Options"
            className="text-sm font-extrabold w-9 h-9 rounded-2xl one-card flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
