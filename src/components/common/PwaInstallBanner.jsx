import React, { useState, useEffect } from "react";

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone) {
        setDismissed(false);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  if (isStandalone || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        "📲 એપ ઇન્સ્ટોલ કરવા માટે બ્રાઉઝરના ઉપરના 3 ટપકાં (⋮) મેનુ પર ક્લિક કરી 'Add to Home screen' અથવા 'Install App' દબાવો."
      );
    }
  };

  return (
    <div
      id="pwaInstallBanner"
      className="fixed bottom-20 inset-x-3.5 max-w-md mx-auto z-50 one-card p-3.5 border-2 border-indigo-600 shadow-2xl flex items-center justify-between gap-2.5 anim-fade"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0">
          📲
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold truncate">Install Target Track App</div>
          <div className="text-[10px] muted-text truncate">
            ઓફલાઇન વાપરવા અને હોમ-સ્ક્રીન પર ઉમેરવા ઇન્સ્ટોલ કરો
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl shadow-sm transition"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="w-7 h-7 rounded-full subtle-pill text-xs font-bold flex items-center justify-center hover:border-indigo-500"
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
