import React from "react";
import { useStudy } from "../../context/StudyContext";

export function ToastAndConfetti() {
  const { toast, confettiActive } = useStudy();

  const confettiPieces = React.useMemo(() => {
    if (!confettiActive) return null;
    const colors = ["#2B50EC", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"];
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + "vw",
      bg: colors[i % colors.length],
      duration: 1.4 + Math.random() * 1.2 + "s"
    }));
  }, [confettiActive]);

  return (
    <>
      {confettiPieces && (
        <div id="confettiContainer">
          {confettiPieces.map(p => (
            <div
              key={p.id}
              className="confetti-piece"
              style={{
                left: p.left,
                backgroundColor: p.bg,
                animationDuration: p.duration
              }}
            />
          ))}
        </div>
      )}

      {toast.visible && (
        <div className="fixed top-4 inset-x-4 max-w-sm mx-auto z-50 one-card p-3.5 bg-emerald-600 text-white border-none shadow-2xl flex items-center gap-3 anim-fade">
          <div className="text-2xl">🎉</div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-extrabold">{toast.title}</div>
            <div className="text-[11px] opacity-90 truncate">{toast.desc}</div>
          </div>
        </div>
      )}
    </>
  );
}
