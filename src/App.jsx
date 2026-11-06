import React, { useState, Suspense, lazy } from "react";
import { useAuth } from "./context/AuthContext";
import { useStudy } from "./context/StudyContext";
import { getValidityRemainingDays, openAdminWhatsApp } from "./utils/helpers";

// Layout & Common (Eager Loaded for Instant Render & LCP)
import { Header } from "./components/layout/Header";
import { BottomNav } from "./components/layout/BottomNav";
import { SideDrawer } from "./components/layout/SideDrawer";
import { DesktopSidebar } from "./components/layout/DesktopSidebar";
import { DesktopTopBar } from "./components/layout/DesktopTopBar";
import { ToastAndConfetti } from "./components/common/ToastAndConfetti";
import { PwaInstallBanner } from "./components/common/PwaInstallBanner";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

// Core Primary Screens (Eager loaded)
import { AuthScreen } from "./components/auth/AuthScreen";
import { TodayTab } from "./components/today/TodayTab";
import { SyllabusTab } from "./components/syllabus/SyllabusTab";
import { ProfileTab } from "./components/profile/ProfileTab";

// Top Widgets
import { DailyCountdown } from "./components/today/DailyCountdown";
import { KpiCards } from "./components/today/KpiCards";

// Code-Split Heavy Screens & Modals (Loaded on demand to drop LCP to <1s)
const AdminApp = lazy(() =>
  import("./components/admin/AdminApp").then((m) => ({ default: m.AdminApp }))
);
const MarketplaceTab = lazy(() =>
  import("./components/marketplace/MarketplaceTab").then((m) => ({ default: m.MarketplaceTab }))
);
const AnalysisTab = lazy(() =>
  import("./components/analysis/AnalysisTab").then((m) => ({ default: m.AnalysisTab }))
);

const MultiExamModal = lazy(() =>
  import("./components/modals/MultiExamModal").then((m) => ({ default: m.MultiExamModal }))
);
const QuickNotesModal = lazy(() =>
  import("./components/modals/QuickNotesModal").then((m) => ({ default: m.QuickNotesModal }))
);
const ExtraRevModal = lazy(() =>
  import("./components/modals/ExtraRevModal").then((m) => ({ default: m.ExtraRevModal }))
);
const BulkImportModal = lazy(() =>
  import("./components/modals/BulkImportModal").then((m) => ({ default: m.BulkImportModal }))
);
const WhatsNewModal = lazy(() =>
  import("./components/modals/WhatsNewModal").then((m) => ({ default: m.WhatsNewModal }))
);
const AppTourModal = lazy(() =>
  import("./components/modals/AppTourModal").then((m) => ({ default: m.AppTourModal }))
);
const ChapLockModal = lazy(() =>
  import("./components/modals/ChapLockModal").then((m) => ({ default: m.ChapLockModal }))
);
const PopupBroadcastModal = lazy(() =>
  import("./components/modals/PopupBroadcastModal").then((m) => ({ default: m.PopupBroadcastModal }))
);
const MarketplaceModal = lazy(() =>
  import("./components/marketplace/MarketplaceModal").then((m) => ({ default: m.MarketplaceModal }))
);

export function App() {
  const { session, isDemoMode, exitDemo } = useAuth();
  const { currentUser } = useStudy();

  const [activeTab, setActiveTab] = useState("today"); // 'today' | 'syllabus' | 'tests' | 'profile' | 'marketplace'

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

  // Admin session -> Show Admin App (Lazy loaded)
  if (session?.role === "admin") {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-extrabold text-sm muted-text">⚡ Loading Admin...</div>}>
          <AdminApp />
          <ToastAndConfetti />
        </Suspense>
      </ErrorBoundary>
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
          onOpenMarketplace={() => setActiveTab("marketplace")}
          onOpenQuickNotes={() => setQuickNotesOpen(true)}
          onOpenExtraRev={() => setExtraRevOpen(true)}
          onOpenBulkImport={() => setBulkImportOpen(true)}
          onStartTour={() => setTourOpen(true)}
          onOpenMultiExam={() => setMultiExamOpen(true)}
        />

        {/* Right Main Desktop Content Area */}
        <main className="flex-1 min-w-0 p-6 xl:p-8 max-w-7xl mx-auto overflow-y-auto">
          {/* Desktop Top Navigation Bar (Instant Render for Top LCP) */}
          <DesktopTopBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenMarketplace={() => setActiveTab("marketplace")}
            onOpenQuickNotes={() => setQuickNotesOpen(true)}
            onOpenMultiExam={() => setMultiExamOpen(true)}
          />

          {/* Countdown Clock (ONLY on Today Tab) */}
          {activeTab === "today" && (
            <div className="mb-4">
              <DailyCountdown onOpenMultiExam={() => setMultiExamOpen(true)} />
            </div>
          )}

          {/* Top 4 KPI Boxes - Wide 4-Column Desktop Grid (Only on Today & Syllabus tabs) */}
          {activeTab !== "marketplace" && (
            <div className="mb-6">
              <KpiCards onKpiClick={handleKpiClick} />
            </div>
          )}

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
                onOpenMarketplace={() => setActiveTab("marketplace")}
              />
            )}

            {activeTab === "marketplace" && (
              <Suspense fallback={<div className="p-8 text-center muted-text font-bold text-xs">🛍️ Loading Book Bazaar...</div>}>
                <MarketplaceTab onBackToSyllabus={() => setActiveTab("syllabus")} />
              </Suspense>
            )}

            {activeTab === "tests" && (
              <Suspense fallback={<div className="p-8 text-center muted-text font-bold text-xs">📊 Loading Analytics...</div>}>
                <AnalysisTab />
              </Suspense>
            )}

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

        {/* 2. Top 4 KPI Boxes (Hidden on marketplace for clean reading experience) */}
        {activeTab !== "marketplace" && (
          <KpiCards onKpiClick={handleKpiClick} />
        )}

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
            onOpenMarketplace={() => setActiveTab("marketplace")}
          />
        )}

        {activeTab === "marketplace" && (
          <Suspense fallback={<div className="p-8 text-center muted-text font-bold text-xs">🛍️ Loading Book Bazaar...</div>}>
            <MarketplaceTab onBackToSyllabus={() => setActiveTab("syllabus")} />
          </Suspense>
        )}

        {activeTab === "tests" && (
          <Suspense fallback={<div className="p-8 text-center muted-text font-bold text-xs">📊 Loading Analytics...</div>}>
            <AnalysisTab />
          </Suspense>
        )}

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
      {/* Shared Modals & Overlays (Lazy Loaded on demand)             */}
      {/* ============================================================ */}
      <Suspense fallback={null}>
        {marketplaceOpen && (
          <MarketplaceModal
            isOpen={marketplaceOpen}
            onClose={() => setMarketplaceOpen(false)}
          />
        )}

        <SideDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onOpenMultiExam={() => setMultiExamOpen(true)}
          onOpenQuickNotes={() => setQuickNotesOpen(true)}
          onOpenExtraRev={() => setExtraRevOpen(true)}
          onOpenBulkImport={() => setBulkImportOpen(true)}
          onOpenWhatsNew={() => setWhatsNewOpen(true)}
          onStartTour={() => setTourOpen(true)}
          onOpenMarketplace={() => {
            setDrawerOpen(false);
            setActiveTab("marketplace");
          }}
        />

        {multiExamOpen && (
          <MultiExamModal
            isOpen={multiExamOpen}
            onClose={() => setMultiExamOpen(false)}
          />
        )}

        {quickNotesOpen && (
          <QuickNotesModal
            isOpen={quickNotesOpen}
            onClose={() => setQuickNotesOpen(false)}
          />
        )}

        {extraRevOpen && (
          <ExtraRevModal
            isOpen={extraRevOpen}
            onClose={() => setExtraRevOpen(false)}
          />
        )}

        {bulkImportOpen && (
          <BulkImportModal
            isOpen={bulkImportOpen}
            onClose={() => setBulkImportOpen(false)}
          />
        )}

        {whatsNewOpen && (
          <WhatsNewModal
            isOpen={whatsNewOpen}
            onClose={() => setWhatsNewOpen(false)}
          />
        )}

        {tourOpen && (
          <AppTourModal
            isOpen={tourOpen}
            onClose={() => setTourOpen(false)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {lockedChapToReopen && (
          <ChapLockModal
            chapter={lockedChapToReopen}
            isOpen={!!lockedChapToReopen}
            onClose={() => setLockedChapToReopen(null)}
          />
        )}

        <PopupBroadcastModal />
      </Suspense>

      <PwaInstallBanner />
      <ToastAndConfetti />
    </div>
  );
}

export default App;
