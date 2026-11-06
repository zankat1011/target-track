import React from "react";

export function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: "today", label: "આજે", icon: "🏠" },
    { id: "syllabus", label: "સિલેબસ", icon: "📚" },
    { id: "marketplace", label: "બુક બજાર", icon: "📖" },
    { id: "tests", label: "એનાલિસિસ", icon: "📊" },
    { id: "profile", label: "એકાઉન્ટ", icon: "👤" },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 backdrop-blur-lg border-t"
      style={{
        backgroundColor: "var(--bg-nav)",
        borderColor: "var(--border-col)",
      }}
    >
      <div className="max-w-md mx-auto grid grid-cols-5 py-2 px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center py-1 transition ${
                isActive ? "text-indigo-500 font-extrabold" : "muted-text"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="text-[9px] sm:text-[10px] font-extrabold mt-0.5 truncate px-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
