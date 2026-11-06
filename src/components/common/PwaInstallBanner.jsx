import React, { useState, useEffect } from "react";

const INSTALL_DISMISS_KEY = "TT_PWA_BANNER_DISMISSED_UNTIL";

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (standalone) return;

    // Check if user dismissed it within the last 7 days
    const dismissedUntil = Number(localStorage.getItem(INSTALL_DISMISS_KEY) || 0);
    if (Date.now() < dismissedUntil) return;

    // Also show at most once per browser session
    if (sessionStorage.getItem("TT_PWA_SHOWN_ONCE")) return;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      sessionStorage.setItem("TT_PWA_SHOWN_ONCE", "1");
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  if (!visible || !deferredPrompt) return null;

  const handleInstallClick = async () => {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === "accepted") {
      localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now() + 365 * 86400000));
    }
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    // Hide for 7 days when user clicks X
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now() + 7 * 86400000));
    setVisible(false);
  };

  return (
    <div
      id="pwaInstallBanner"
      className="fixed bottom-20 inset-x-3.5 max-w-md mx-auto z-50 one-card p-3 border-2 border-indigo-600 shadow-2xl flex items-center justify-between gap-2.5 anim-fade"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-base shrink-0">
          📲
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold truncate">Target Track App ઇન્સ્ટોલ કરો</div>
          <div className="text-[10px] muted-text truncate">ઝડપી અને ઓફલાઇન ઉપયોગ માટે</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow-sm transition"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="w-7 h-7 rounded-full subtle-pill text-xs font-bold flex items-center justify-center"
          title="7 દિવસ માટે બંધ કરો"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
