import React, { useState, useEffect } from "react";
import { TOUR_STEPS } from "../../utils/constants";

export function AppTourModal({ isOpen, onClose, onNavigateTab }) {
  const [currentStep, setCurrentStep] = useState(0);

  const clearSpotlights = () => {
    document.querySelectorAll(".tour-spotlight").forEach((el) => {
      el.classList.remove("tour-spotlight");
    });
  };

  useEffect(() => {
    if (!isOpen) {
      clearSpotlights();
      return;
    }

    const step = TOUR_STEPS[currentStep];
    if (step) {
      onNavigateTab(step.tab);
      clearSpotlights();

      const timer = setTimeout(() => {
        const el = document.getElementById(step.targetId);
        if (el) {
          el.classList.add("tour-spotlight");
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [isOpen, currentStep, onNavigateTab]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      clearSpotlights();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    clearSpotlights();
    onClose();
  };

  return (
    <div className="fixed inset-x-0 bottom-16 z-50 px-3.5 pointer-events-none anim-fade">
      <div className="w-full max-w-md mx-auto one-card p-4 space-y-2.5 border-2 border-indigo-600 shadow-2xl pointer-events-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
              Step {currentStep + 1}/{TOUR_STEPS.length}
            </span>
            <span className="text-[10px] font-bold text-indigo-500">
              👆 ઉપર હાઈલાઈટ કરેલો ભાગ જુઓ
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs font-extrabold muted-text hover:text-rose-500 px-2 py-0.5"
          >
            ✕ Skip
          </button>
        </div>

        <div>
          <h3 className="text-sm font-extrabold">{step.title}</h3>
          <p className="text-xs muted-text leading-relaxed mt-0.5">{step.desc}</p>
        </div>

        <div className="subtle-pill px-3 py-2 text-[11px] font-semibold text-indigo-500">
          {step.highlight}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handlePrev}
            style={{ visibility: currentStep === 0 ? "hidden" : "visible" }}
            className="subtle-pill px-3.5 py-1.5 text-xs font-extrabold hover:border-indigo-500"
          >
            ◀ Back
          </button>

          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition ${
                  i === currentStep ? "bg-indigo-600" : "bg-slate-400/40"
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-sm transition"
          >
            {currentStep === TOUR_STEPS.length - 1 ? "Finish ✓" : "Next ➔"}
          </button>
        </div>
      </div>
    </div>
  );
}
