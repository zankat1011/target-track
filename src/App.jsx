import React, { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useStudy } from "./context/StudyContext";
import { getValidityRemainingDays, openAdminWhatsApp } from "./utils/helpers";

// Layout & Common
import { Header } from "./components/layout/Header";
import { BottomNav } from "./components/layout/BottomNav";
import { SideDrawer } from "./components/layout/SideDrawer";
import { DesktopSidebar } from "./components/layout/DesktopSidebar";
import { DesktopTopBar } from "./components/layout/DesktopTopBar";
import { ToastAndConfetti } from "./components/common/ToastAndConfetti";
import { PwaInstallBanner } from "./components/common/PwaInstallBanner";

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
import { MarketplaceModal } from "./components/marketplace/MarketplaceModal";

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
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);

  // If no session & not in demo mode -> Show Auth screen
  if (!session && !isDemoMode) {
    return (
      <>
        <AuthScreen onStartTour={() => setTourOpen(true)} />
        <PwaInstallBanner />
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
        <PwaInstallBanner />
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
    <div className="min-h-screen selection:bg-indigo-600 selection:text-white">
      {/* Demo Sticky Bar */}
      {isDemoMode && (
        <div className="sticky top-0 z-40 bg-amber-500 text-white px-4 py-2 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
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

      {/* ============================================================ */}
      {/* 1. DESKTOP / PC / LAPTOP VIEW (Screens >= 1024px)              */}
      {/* ============================================================ */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left Sticky Sidebar */}
        <DesktopSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenMarketplace={() => setMarketplaceOpen(true)}
          onOpenQuickNotes={() => setQuickNotesOpen(true)}
          onOpenExtraRev={() => setExtraRevOpen(true)}
          onOpenBulkImport={() => setBulkImportOpen(true)}
          onStartTour={() => setTourOpen(true)}
          onOpenMultiExam={() => setMultiExamOpen(true)}
        />

        {/* Right Main Desktop Content Area */}
        <main className="flex-1 min-w-0 p-6 xl:p-8 max-w-7xl mx-auto overflow-y-auto">
          {/* Desktop Top Navigation Bar */}
          <DesktopTopBar
            activeTab={activeTab}
            onOpenMarketplace={() => setMarketplaceOpen(true)}
            onOpenQuickNotes={() => setQuickNotesOpen(true)}
            onOpenMultiExam={() => setMultiExamOpen(true)}
          />

          {/* Countdown Clock (ONLY on Today Tab) */}
          {activeTab === "today" && (
            <div className="mb-4">
              <DailyCountdown onOpenMultiExam={() => setMultiExamOpen(true)} />
            </div>
          )}

          {/* Top 4 KPI Boxes - Wide 4-Column Desktop Grid */}
          <div className="mb-6">
            <KpiCards onKpiClick={handleKpiClick} />
          </div>

          {/* Tab Content Panes */}
          <div className="space-y-6">
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
                onOpenMarketplace={() => setMarketplaceOpen(true)}
              />
            )}

            {activeTab === "tests" && <AnalysisTab />}

            {activeTab === "profile" && (
              <ProfileTab
                onOpenMultiExam={() => setMultiExamOpen(true)}
                onOpenBulkImport={() => setBulkImportOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* ============================================================ */}
      {/* 2. MOBILE & TABLET VIEW (Screens < 1024px)                     */}
      {/* ============================================================ */}
      <div className="block lg:hidden max-w-md mx-auto px-3.5 pt-3.5 pb-24">
        <Header onOpenDrawer={() => setDrawerOpen(true)} />

        {/* 1. Timer (Daily Countdown) - ONLY on Today ("આજે") page */}
        {activeTab === "today" && (
          <DailyCountdown onOpenMultiExam={() => setMultiExamOpen(true)} />
        )}

        {/* 2. Top 4 KPI Boxes */}
        <KpiCards onKpiClick={handleKpiClick} />

        {/* 3. Mobile Tab Contents */}
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
            onOpenMarketplace={() => setMarketplaceOpen(true)}
          />
        )}

        {activeTab === "tests" && <AnalysisTab />}

        {activeTab === "profile" && (
          <ProfileTab
            onOpenMultiExam={() => setMultiExamOpen(true)}
            onOpenBulkImport={() => setBulkImportOpen(true)}
          />
        )}

        {/* Mobile Sticky Bottom Nav Bar */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* ============================================================ */}
      {/* Shared Modals & Overlays (Available on both Mobile & Desktop) */}
      {/* ============================================================ */}
      <MarketplaceModal
        isOpen={marketplaceOpen}
        onClose={() => setMarketplaceOpen(false)}
      />

      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenMultiExam={() => setMultiExamOpen(true)}
        onOpenQuickNotes={() => setQuickNotesOpen(true)}
        onOpenExtraRev={() => setExtraRevOpen(true)}
        onOpenBulkImport={() => setBulkImportOpen(true)}
        onOpenWhatsNew={() => setWhatsNewOpen(true)}
        onStartTour={() => setTourOpen(true)}
        onOpenMarketplace={() => setMarketplaceOpen(true)}
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
      <PwaInstallBanner />
      <ToastAndConfetti />
    </div>
  );
}

export default App;
