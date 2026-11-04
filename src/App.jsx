import React, { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useStudy } from "./context/StudyContext";
import { getValidityRemainingDays, openAdminWhatsApp } from "./utils/helpers";

// Layout & Common
import { Header } from "./components/layout/Header";
import { BottomNav } from "./components/layout/BottomNav";
import { SideDrawer } from "./components/layout/SideDrawer";
import { ToastAndConfetti } from "./components/common/ToastAndConfetti";

// Screens
import { AuthScreen } from "./components/auth/AuthScreen";
import { AdminApp } from "./components/admin/AdminApp";
import { TodayTab } from "./components/today/TodayTab";
import { SyllabusTab } from "./components/syllabus/SyllabusTab";
import { AnalysisTab } from "./components/analysis/AnalysisTab";
import { ProfileTab } from "./components/profile/ProfileTab";

// Top Widgets
import { DailyCountdown } from "./components/today/DailyCountdown";
import { KpiCards } from "./components/today/KpiCards";

// Modals
import { MultiExamModal } from "./components/modals/MultiExamModal";
import { QuickNotesModal } from "./components/modals/QuickNotesModal";
import { ExtraRevModal } from "./components/modals/ExtraRevModal";
import { BulkImportModal } from "./components/modals/BulkImportModal";
import { WhatsNewModal } from "./components/modals/WhatsNewModal";
import { AppTourModal } from "./components/modals/AppTourModal";
import { ChapLockModal } from "./components/modals/ChapLockModal";
import { PopupBroadcastModal } from "./components/modals/PopupBroadcastModal";

export function App() {
  const { session, isDemoMode, exitDemo } = useAuth();
  const { currentUser } = useStudy();

  const [activeTab, setActiveTab] = useState("today"); // 'today' | 'syllabus' | 'tests' | 'profile'

  // Modal open states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [multiExamOpen, setMultiExamOpen] = useState(false);
  const [quickNotesOpen, setQuickNotesOpen] = useState(false);
  const [extraRevOpen, setExtraRevOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [lockedChapToReopen, setLockedChapToReopen] = useState(null);

  // If no session & not in demo mode -> Show Auth screen
  if (!session && !isDemoMode) {
    return (
      <>
        <AuthScreen onStartTour={() => setTourOpen(true)} />
        <ToastAndConfetti />
      </>
    );
  }

  // Admin session -> Show Admin App
  if (session?.role === "admin") {
    return (
      <>
        <AdminApp />
        <ToastAndConfetti />
      </>
    );
  }

  // Check validity for real student
  const valDays = getValidityRemainingDays(currentUser);
  if (!isDemoMode && currentUser && (currentUser.status !== "approved" || valDays <= 0)) {
    return (
      <>
        <AuthScreen onStartTour={() => setTourOpen(true)} />
        <ToastAndConfetti />
      </>
    );
  }

  // KPI card quick clicks
  const handleKpiClick = (target) => {
    if (target === "completed") {
      setActiveTab("syllabus");
      setTimeout(() => {
        document.getElementById("completedChaptersVaultAnchor")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else if (target === "revision") {
      setActiveTab("today");
      setTimeout(() => {
        document.getElementById("dueRevisionsCardAnchor")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else if (target === "streak") {
      setActiveTab("tests");
      setTimeout(() => {
        document.getElementById("streakGraphCardAnchor")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else if (target === "tests") {
      setActiveTab("tests");
    }
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-indigo-600 selection:text-white">
      {/* Demo Sticky Bar */}
      {isDemoMode && (
        <div className="sticky top-0 z-40 bg-amber-500 text-white px-4 py-2 shadow-md">
          <div className="max-w-md mx-auto flex items-center justify-between gap-2">
            <div className="text-xs font-extrabold truncate">
              👁️ DEMO MODE •{" "}
              <button onClick={() => setTourOpen(true)} className="underline">
                🧭 Guide Tour
              </button>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => openAdminWhatsApp("Hello Target Track, I want to buy full access plan.")}
                className="bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full hover:bg-emerald-800 transition"
              >
                💬 Buy Plan
              </button>
              <button
                onClick={exitDemo}
                className="bg-white text-amber-900 font-extrabold text-[10px] px-2.5 py-1 rounded-full hover:bg-amber-100 transition"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Student Shell */}
      <main className="max-w-md mx-auto px-3.5 pt-3.5">
        <Header onOpenDrawer={() => setDrawerOpen(true)} />

        {/* 1. Timer (Daily Countdown) - ONLY on Today ("આજે") page */}
        {activeTab === "today" && (
          <DailyCountdown onOpenMultiExam={() => setMultiExamOpen(true)} />
        )}

        {/* 2. Top 4 KPI Boxes - Visible on ALL pages ("આજે", "સિલેબસ", "એનાલિસિસ", "એકાઉન્ટ") */}
        <KpiCards onKpiClick={handleKpiClick} />

        {/* 3. Tab Contents */}
        {activeTab === "today" && (
          <TodayTab
            onOpenExtraRev={() => setExtraRevOpen(true)}
            onOpenQuickNotes={() => setQuickNotesOpen(true)}
            onOpenChapLock={(chap) => setLockedChapToReopen(chap)}
            onNavigateToSyllabus={() => setActiveTab("syllabus")}
          />
        )}

        {activeTab === "syllabus" && (
          <SyllabusTab
            onOpenBulkImport={() => setBulkImportOpen(true)}
            onOpenChapLock={(chap) => setLockedChapToReopen(chap)}
          />
        )}

        {activeTab === "tests" && <AnalysisTab />}

        {activeTab === "profile" && (
          <ProfileTab
            onOpenMultiExam={() => setMultiExamOpen(true)}
            onOpenBulkImport={() => setBulkImportOpen(true)}
          />
        )}

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </main>

      {/* Modals & Overlays */}
      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenMultiExam={() => setMultiExamOpen(true)}
        onOpenQuickNotes={() => setQuickNotesOpen(true)}
        onOpenExtraRev={() => setExtraRevOpen(true)}
        onOpenBulkImport={() => setBulkImportOpen(true)}
        onOpenWhatsNew={() => setWhatsNewOpen(true)}
        onStartTour={() => setTourOpen(true)}
      />

      <MultiExamModal
        isOpen={multiExamOpen}
        onClose={() => setMultiExamOpen(false)}
      />

      <QuickNotesModal
        isOpen={quickNotesOpen}
        onClose={() => setQuickNotesOpen(false)}
      />

      <ExtraRevModal
        isOpen={extraRevOpen}
        onClose={() => setExtraRevOpen(false)}
      />

      <BulkImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
      />

      <WhatsNewModal
        isOpen={whatsNewOpen}
        onClose={() => setWhatsNewOpen(false)}
      />

      <AppTourModal
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      <ChapLockModal
        chapter={lockedChapToReopen}
        isOpen={!!lockedChapToReopen}
        onClose={() => setLockedChapToReopen(null)}
      />

      <PopupBroadcastModal />
      <ToastAndConfetti />
    </div>
  );
}

export default App;
