import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useStudy } from "../../context/StudyContext";
import { useTheme } from "../../context/ThemeContext";
import { openAdminWhatsApp, getValidityRemainingDays } from "../../utils/helpers";

export function DesktopSidebar({
  activeTab,
  onTabChange,
  onOpenQuickNotes,
  onOpenExtraRev,
  onOpenBulkImport,
  onStartTour,
  onOpenMultiExam,
}) {
  const { session, isDemoMode, logout, exitDemo } = useAuth();
  const { currentUser, cloudStatus } = useStudy();
  const { theme, toggleTheme } = useTheme();

  const valDays = getValidityRemainingDays(currentUser);
  const planLabel = valDays > 2000 ? "Lifetime Pro" : currentUser?.planName || "Active Plan";

  const navItems = [
    { id: "today", label: "આજે (Today)", icon: "🏠", desc: "Daily Logger & Habits" },
    { id: "syllabus", label: "સિલેબસ (Syllabus)", icon: "📚", desc: "Subjects & Vault" },
    { id: "marketplace", label: "બુક બજાર (Bazaar)", icon: "📖", desc: "Buy & Sell Notes", isNew: true },
    { id: "tests", label: "એનાલિસિસ (Analytics)", icon: "📊", desc: "Tests & Psychology" },
    { id: "profile", label: "એકાઉન્ટ (Profile)", icon: "👤", desc: "Focus Timer & Backup" },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col justify-between w-64 xl:w-72 shrink-0 h-screen sticky top-0 border-r p-5 overflow-y-auto z-30"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-col)",
      }}
    >
      {/* Top Branding & Student Profile */}
      <div className="space-y-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
            🎯
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight truncate">TARGET TRACK</h1>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                {cloudStatus}
              </span>
            </div>
            <p className="text-[10px] muted-text font-semibold truncate">Smart Study OS • PC Edition</p>
          </div>
        </div>

        {/* Student Mini Profile Box */}
        <div className="p-3 rounded-2xl subtle-pill space-y-1.5 border" style={{ borderColor: "var(--border-col)" }}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-black truncate">{currentUser?.name || "Student"}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">
              {planLabel}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] muted-text">
            <span>{currentUser?.exam || "General Prep"}</span>
            <button
              onClick={onOpenMultiExam}
              className="text-indigo-500 font-extrabold hover:underline"
            >
              Switch ➔
            </button>
          </div>
        </div>

        {/* Main Navigation Menu */}
        <nav className="space-y-1.5">
          <div className="text-[10px] font-extrabold uppercase muted-text px-2 py-1">મુખ્ય મેનૂ</div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-extrabold transition text-left group ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : item.isNew
                    ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{item.label}</div>
                </div>
                {item.isNew && !isActive && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shrink-0">
                    NEW
                  </span>
                )}
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0"></span>}
              </button>
            );
          })}
        </nav>

        {/* Quick Tools Section */}
        <div className="space-y-1 pt-2">
          <div className="text-[10px] font-extrabold uppercase muted-text px-2 py-1">ક્વિક ટૂલ્સ</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onOpenQuickNotes}
              className="subtle-pill p-2 rounded-xl text-[10px] font-bold hover:border-indigo-500 transition text-center truncate"
              title="Quick Notes"
            >
              ⚡ શોર્ટ-કી નોટ્સ
            </button>
            <button
              onClick={onOpenExtraRev}
              className="subtle-pill p-2 rounded-xl text-[10px] font-bold hover:border-indigo-500 transition text-center truncate"
              title="Extra Revision"
            >
              🔄 એક્સ્ટ્રા રિવિઝન
            </button>
            <button
              onClick={onOpenBulkImport}
              className="subtle-pill p-2 rounded-xl text-[10px] font-bold hover:border-indigo-500 transition text-center truncate"
              title="Bulk Import"
            >
              📥 Excel Import
            </button>
            <button
              onClick={onStartTour}
              className="subtle-pill p-2 rounded-xl text-[10px] font-bold hover:border-indigo-500 transition text-center truncate"
              title="Guide Tour"
            >
              🧭 ગાઇડ ટૂર
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions: Theme, WhatsApp, Logout */}
      <div className="pt-4 border-t space-y-2" style={{ borderColor: "var(--border-col)" }}>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex-1 subtle-pill py-2 text-xs font-bold flex items-center justify-center gap-1.5 hover:border-indigo-500"
          >
            <span>{theme === "black" ? "☀️ Light" : "🌙 Dark"}</span>
          </button>
          <button
            onClick={() => openAdminWhatsApp("Hello Target Track Support")}
            className="subtle-pill px-3 py-2 text-xs font-bold hover:border-emerald-500 text-emerald-500"
            title="WhatsApp Support"
          >
            💬 Support
          </button>
        </div>

        <button
          onClick={isDemoMode ? exitDemo : logout}
          className="w-full text-center text-xs font-extrabold text-rose-500 hover:text-rose-700 py-1.5 transition"
        >
          {isDemoMode ? "Exit Demo Mode" : "Logout (બહાર નીકળો)"}
        </button>
      </div>
    </aside>
  );
}
