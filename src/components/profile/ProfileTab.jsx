import React, { useState, useEffect } from "react";
import { useStudy } from "../../context/StudyContext";
import {
  todayISO,
  openAdminWhatsApp,
  openTelegramChannel,
  getValidityRemainingDays,
  nowFormattedTimestamp,
} from "../../utils/helpers";
import { LIVE_TEST_URL } from "../../utils/constants";

export function ProfileTab({ onOpenMultiExam, onOpenBulkImport }) {
  const { currentUser, updateCurrentUser, db, commitDb, triggerCelebration } = useStudy();

  // Profile Form States
  const [name, setName] = useState(currentUser?.name || "");
  const [exam, setExam] = useState(currentUser?.exam || "");
  const [examDate, setExamDate] = useState(currentUser?.examDate || "");

  // Pomodoro States
  const [pomoPreset, setPomoPreset] = useState(25);
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);

  // Feedback States
  const [feedbackType, setFeedbackType] = useState("Bug Report");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Notification State
  const [notifGranted, setNotifGranted] = useState(() => {
    return "Notification" in window && Notification.permission === "granted";
  });

  useEffect(() => {
    setName(currentUser?.name || "");
    setExam(currentUser?.exam || "");
    setExamDate(currentUser?.examDate || "");
  }, [currentUser]);

  // Pomodoro Timer effect
  useEffect(() => {
    let timer = null;
    if (pomoRunning) {
      timer = setInterval(() => {
        setPomoSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setPomoRunning(false);
            updateCurrentUser((u) => {
              u.focusMinutes = Number(u.focusMinutes || 0) + pomoPreset;
              u.focusSessions = Number(u.focusSessions || 0) + 1;
            });
            triggerCelebration(
              "⏱️ Focus Session પૂર્ણ!",
              `${pomoPreset} મિનિટનું સેશન પૂરું થયું!`
            );
            return pomoPreset * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pomoRunning, pomoPreset, updateCurrentUser, triggerCelebration]);

  const handleSetPomoPreset = (mins) => {
    setPomoRunning(false);
    setPomoPreset(mins);
    setPomoSeconds(mins * 60);
  };

  const handleTogglePomo = () => {
    setPomoRunning((prev) => !prev);
  };

  const handleResetPomo = () => {
    setPomoRunning(false);
    setPomoSeconds(pomoPreset * 60);
  };

  const pomoMinDisplay = String(Math.floor(pomoSeconds / 60)).padStart(2, "0");
  const pomoSecDisplay = String(pomoSeconds % 60).padStart(2, "0");

  // Save Profile
  const handleSaveProfile = (e) => {
    e?.preventDefault();
    updateCurrentUser((u) => {
      u.name = name.trim() || u.name;
      u.exam = exam.trim() || u.exam;
      u.examDate = examDate || "";
    });
    triggerCelebration("✅ પ્રોફાઈલ અપડેટ થઈ!", examDate ? `પરીક્ષા તારીખ: ${examDate}` : "General Prep Mode");
  };

  const handleClearExamDate = () => {
    setExamDate("");
    updateCurrentUser((u) => {
      u.examDate = "";
    });
  };

  // Browser Notification Enable
  const handleEnableNotification = () => {
    if (!("Notification" in window)) {
      alert("તમારા બ્રાઉઝરમાં Notification સપોર્ટ નથી.");
      return;
    }
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        setNotifGranted(true);
        triggerCelebration("🔔 Notifications Active!", "બાકી રિવિઝન માટે એલર્ટ મળશે.");
      } else {
        alert("નોટિફિકેશન પરમિશન નકારવામાં આવી છે. બ્રાઉઝર સેટિંગ્સમાંથી Allow કરો.");
      }
    });
  };

  // Submit Feedback
  const handleSubmitFeedback = (viaWhatsApp = false) => {
    if (!feedbackMsg.trim()) return alert("કૃપા કરીને તમારો મેસેજ કે સૂચન લખો.");
    const newFeedback = {
      id: `fb_${Date.now()}`,
      date: todayISO(),
      studentName: currentUser?.name || "Student",
      mobile: currentUser?.mobile || "",
      type: feedbackType,
      message: feedbackMsg.trim(),
    };

    commitDb({
      ...db,
      feedbacks: [newFeedback, ...(db.feedbacks || [])],
    });

    setFeedbackMsg("");
    if (viaWhatsApp) {
      openAdminWhatsApp(
        `*Target Track — ${feedbackType}*\nStudent: ${currentUser?.name} (${currentUser?.mobile})\nMessage: ${newFeedback.message}`
      );
    } else {
      triggerCelebration("📩 રિપોર્ટ મોકલાઈ ગયો!", "Admin ટૂંક સમયમાં ચેક કરશે.");
    }
  };

  // Download Backup
  const handleDownloadBackup = () => {
    if (!currentUser) return;
    const a = document.createElement("a");
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentUser, null, 2));
    a.download = `target_track_backup_${currentUser.mobile}.json`;
    a.click();
  };

  // Restore Backup
  const handleRestoreBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imp = JSON.parse(event.target.result);
        updateCurrentUser((u) => {
          u.subjects = imp.subjects || [];
          u.logs = imp.logs || [];
          u.revisions = imp.revisions || [];
          u.tests = imp.tests || [];
          u.quickNotes = imp.quickNotes || [];
          if (Array.isArray(imp.exams)) u.exams = imp.exams;
          if (imp.activeExamId) u.activeExamId = imp.activeExamId;
        });
        triggerCelebration("✅ Backup Restored!", "તમારો ડેટા પાછો આવી ગયો છે.");
      } catch {
        alert("અમાન્ય બેકઅપ ફાઈલ.");
      }
    };
    reader.readAsText(file);
  };

  // Clear All My Data (Strict 2-Step)
  const handleClearAllData = () => {
    const step1 = confirm(
      "⚠️ STEP 1/2 WARNING:\nશું તમે ખરેખર તમારો બધો જ અભ્યાસ ડેટા (Subjects, Chapters, Revisions, Tests, Notes) Clear કરવા માંગો છો?"
    );
    if (!step1) return;

    const step2 = prompt(
      "🚨 STEP 2/2 FINAL CONFIRMATION:\nતમારો બધો ડેટા રીસેટ કરવા માટે નીચે કેપિટલમાં DELETE લખો:"
    );
    if (step2 !== "DELETE") {
      alert("❌ ડેટા Clear કરવાની પ્રક્રિયા રદ કરવામાં આવી છે.");
      return;
    }

    // Archive snapshot to Admin vault
    const archiveItem = {
      archiveId: `arch_${Date.now()}`,
      deletedAt: nowFormattedTimestamp(),
      deletedBy: "Student (Self Clear)",
      mobile: currentUser.mobile,
      name: currentUser.name,
      exam: currentUser.exam,
      snapshot: JSON.parse(
        JSON.stringify({
          subjects: currentUser.subjects || [],
          logs: currentUser.logs || [],
          revisions: currentUser.revisions || [],
          tests: currentUser.tests || [],
          quickNotes: currentUser.quickNotes || [],
          exams: currentUser.exams || [],
        })
      ),
    };

    const nextDeleted = [archiveItem, ...(db.deletedData || [])];

    updateCurrentUser((u) => {
      u.subjects = [];
      u.logs = [];
      u.revisions = [];
      u.tests = [];
      u.quickNotes = [];
      u.focusMinutes = 0;
      u.focusSessions = 0;
      u.exams = [{ id: "ex_main", name: u.exam || "GPSC / CCE", examDate: u.examDate || "", subjects: [] }];
      u.activeExamId = "ex_main";
    });

    commitDb({ ...db, deletedData: nextDeleted });
    triggerCelebration("🗑️ Data Cleared!", "તમારું એકાઉન્ટ નવેસરથી રીસેટ થઈ ગયું છે.");
  };

  const valLeft = getValidityRemainingDays(currentUser);
  const isLifetime = valLeft > 2000;
  const planLabel = isLifetime
    ? "Lifetime Pro"
    : currentUser?.planName || (valLeft <= 5 ? "5D Free Trial" : "Pro Plan");

  // Direct 1-to-1 admin replies
  const dms = currentUser?.directMessages || [];
  const repliedReports = (db.feedbacks || []).filter(
    (f) => f.mobile === currentUser?.mobile && f.adminReply
  );

  return (
    <div id="tab-profile" className="space-y-3.5 anim-fade">
      {/* 1. Pomodoro Focus Timer */}
      <div className="one-card p-4 space-y-3 border-l-4 border-l-indigo-600">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold">⏱️ Smart Study Focus Timer</h2>
            <p className="text-[10px] muted-text">
              Total Focus: {currentUser?.focusMinutes || 0} Mins ({currentUser?.focusSessions || 0} Sessions)
            </p>
          </div>
          <span className="text-2xl font-mono font-extrabold text-indigo-500">
            {pomoMinDisplay}:{pomoSecDisplay}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[15, 25, 45, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => handleSetPomoPreset(mins)}
              className={`subtle-pill px-2.5 py-1 text-[10px] font-extrabold transition ${
                pomoPreset === mins && !pomoRunning ? "border-indigo-500 text-indigo-500" : ""
              }`}
            >
              {mins}m
            </button>
          ))}

          <div className="ml-auto flex gap-1.5">
            <button
              onClick={handleTogglePomo}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow-sm transition"
            >
              {pomoRunning ? "⏸ Pause" : "▶ Start"}
            </button>
            <button
              onClick={handleResetPomo}
              className="subtle-pill text-xs font-bold px-2.5 py-1.5 hover:border-indigo-500"
            >
              ↺
            </button>
          </div>
        </div>
      </div>

      {/* 2. Profile & Exam Date Form */}
      <div id="tourTargetProfile" className="one-card p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold">🎯 પ્રોફાઈલ અને પરીક્ષા તારીખ</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenMultiExam}
              className="text-[10px] font-extrabold text-indigo-500 underline"
            >
              + Multiple Exams
            </button>
            <button
              onClick={handleClearExamDate}
              className="text-[10px] font-bold text-rose-500"
            >
              Clear Date
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-2">
          <input
            type="text"
            placeholder="તમારું નામ"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full theme-input px-3.5 py-2.5 text-xs font-semibold"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="પરીક્ષા (e.g. GPSC)"
              value={exam}
              onChange={(e) => setExam(e.target.value)}
              className="theme-input px-3.5 py-2.5 text-xs font-semibold"
            />
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="theme-input px-3.5 py-2.5 text-xs font-semibold"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-2xl text-xs shadow-sm transition"
          >
            ✓ સેવ કરો
          </button>
        </form>
      </div>

      {/* 3. Membership & Plans Card */}
      <div className="one-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">
              {planLabel}
            </span>
            <h2 className="text-sm font-extrabold mt-1">Membership Status</h2>
          </div>
          <div className="text-right">
            <div className="text-base font-extrabold text-emerald-500">
              {isLifetime ? "♾️ Lifetime" : `${valLeft} Days`}
            </div>
            <div className="text-[10px] muted-text">
              Valid Till: <span>{isLifetime ? "Never Expires" : currentUser?.planExpiryDate || "--"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <a
            href="https://razorpay.me/@thetarget?amount=99"
            target="_blank"
            rel="noreferrer"
            className="subtle-pill p-2 block hover:border-indigo-500 transition"
          >
            <div className="text-[10px] font-bold muted-text">6 Months</div>
            <div className="text-sm font-extrabold text-indigo-500">₹99</div>
            <div className="text-[9px] font-extrabold text-white bg-indigo-600 rounded-full py-0.5 mt-1">
              Razorpay ↗
            </div>
          </a>
          <a
            href="https://razorpay.me/@thetarget?amount=149"
            target="_blank"
            rel="noreferrer"
            className="subtle-pill p-2 border border-indigo-500 block hover:border-indigo-600 transition"
          >
            <div className="text-[10px] font-bold text-indigo-500">1 Year</div>
            <div className="text-sm font-extrabold text-emerald-500">₹149</div>
            <div className="text-[9px] font-extrabold text-white bg-emerald-600 rounded-full py-0.5 mt-1">
              Razorpay ↗
            </div>
          </a>
          <a
            href="https://razorpay.me/@thetarget?amount=999"
            target="_blank"
            rel="noreferrer"
            className="subtle-pill p-2 border border-amber-500/50 block hover:border-amber-500 transition"
          >
            <div className="text-[10px] font-bold text-amber-500">Lifetime</div>
            <div className="text-sm font-extrabold text-amber-500">₹999</div>
            <div className="text-[9px] font-extrabold text-white bg-amber-500 rounded-full py-0.5 mt-1">
              Razorpay ↗
            </div>
          </a>
        </div>

        <button
          onClick={() =>
            openAdminWhatsApp(
              "Hello Target Track Admin, I have completed payment on Razorpay. Here is my Payment Screenshot (SS):"
            )
          }
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-2xl text-xs shadow-sm flex items-center justify-center gap-2 transition"
        >
          <span>📸</span> <span>Share SS of Payment</span>
        </button>

        <button
          onClick={() => openAdminWhatsApp("Hello Target Track, I want to upgrade my membership plan.")}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-2xl text-xs shadow-sm flex items-center justify-center gap-2 transition"
        >
          <span>💬</span> <span>Upgrade Plan on WhatsApp</span>
        </button>
      </div>

      {/* 4. Telegram & MCQ Practice Website */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={openTelegramChannel}
          className="one-card p-3.5 flex items-center justify-between border-l-4 border-l-indigo-500 text-left w-full hover:border-indigo-600 transition"
        >
          <div>
            <div className="text-[10px] font-extrabold text-indigo-500">✈️ Telegram</div>
            <div className="text-xs font-extrabold mt-0.5">@thetarget_MCQ</div>
          </div>
          <span className="text-xs">↗</span>
        </button>
        <a
          href={LIVE_TEST_URL}
          target="_blank"
          rel="noreferrer"
          className="one-card p-3.5 flex items-center justify-between border-l-4 border-l-purple-500 block hover:border-purple-600 transition"
        >
          <div>
            <div className="text-[10px] font-extrabold text-purple-500">🌐 MCQ Practice</div>
            <div className="text-xs font-extrabold mt-0.5">thetarget.in</div>
          </div>
          <span className="text-xs">↗</span>
        </a>
      </div>

      {/* 5. Notification API Alert Card */}
      <div className="one-card p-4 flex items-center justify-between gap-2 border-l-4 border-l-amber-500">
        <div>
          <h2 className="text-xs font-extrabold">🔔 Today's Revision Notification</h2>
          <p className="text-[10px] muted-text mt-0.5">
            {notifGranted ? "✅ નોટિફિકેશન એલર્ટ ચાલુ છે (Active)" : "બાકી રિવિઝન માટે બ્રાઉઝર નોટિફિકેશન ચાલુ કરો"}
          </p>
        </div>
        <button
          onClick={handleEnableNotification}
          className={`font-extrabold px-3 py-2 rounded-2xl text-[11px] shrink-0 shadow-sm transition ${
            notifGranted ? "bg-emerald-600 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"
          }`}
        >
          {notifGranted ? "✓ Enabled" : "🔔 Enable Alert"}
        </button>
      </div>

      {/* 6. Feedback & Bug Report + 1-to-1 Replies */}
      <div className="one-card p-4 space-y-2.5">
        <h2 className="text-sm font-extrabold">🛠️ Bug Report / Feature Request</h2>
        <div className="grid grid-cols-3 gap-1.5">
          <select
            value={feedbackType}
            onChange={(e) => setFeedbackType(e.target.value)}
            className="theme-input px-2.5 py-2 text-xs font-bold"
          >
            <option value="Bug Report">🐞 Bug</option>
            <option value="Feature Request">✨ Feature</option>
            <option value="Feedback">💡 Idea</option>
          </select>
          <input
            type="text"
            placeholder="તમારો મેસેજ અહીં લખો..."
            value={feedbackMsg}
            onChange={(e) => setFeedbackMsg(e.target.value)}
            className="col-span-2 theme-input px-3 py-2 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSubmitFeedback(false)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 rounded-2xl text-xs transition"
          >
            📩 Submit in App
          </button>
          <button
            onClick={() => handleSubmitFeedback(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded-2xl text-xs transition"
          >
            💬 Send on WhatsApp
          </button>
        </div>

        {/* 1-to-1 Admin Message Inbox */}
        {(dms.length > 0 || repliedReports.length > 0) && (
          <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: "var(--border-col)" }}>
            <div className="text-[10px] font-extrabold uppercase muted-text">
              Admin 1-to-1 Messages:
            </div>
            {dms.map((m) => (
              <div key={m.id} className="subtle-pill p-2.5 border-l-4 border-l-emerald-500 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-500">
                    💬 Admin Direct Message
                  </span>
                  <span className="text-[9px] muted-text">{m.date}</span>
                </div>
                <div className="font-semibold mt-1 whitespace-pre-wrap">{m.text}</div>
              </div>
            ))}
            {repliedReports.map((f) => (
              <div key={f.id} className="subtle-pill p-2.5 border-l-4 border-l-indigo-500 text-xs">
                <div className="text-[10px] muted-text">Your Report: "{f.message}"</div>
                <div className="font-extrabold text-indigo-500 mt-1">
                  ↪️ Admin Reply: {f.adminReply}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Data Backup, Restore & Clear All */}
      <div className="one-card p-4 space-y-2.5">
        <h2 className="text-sm font-extrabold">🛡️ ડેટા બેકઅપ અને મેનેજમેન્ટ</h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleDownloadBackup}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-2xl text-[11px] transition"
          >
            ⬇ Backup
          </button>
          <label className="subtle-pill font-bold py-2.5 rounded-2xl text-[11px] text-center cursor-pointer hover:border-indigo-500 transition">
            ⬆ Restore
            <input type="file" accept=".json" className="hidden" onChange={handleRestoreBackup} />
          </label>
          <button
            onClick={onOpenBulkImport}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-2xl text-[11px] transition"
          >
            📥 Excel Import
          </button>
        </div>

        <div className="pt-2 border-t" style={{ borderColor: "var(--border-col)" }}>
          <button
            onClick={handleClearAllData}
            className="w-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 font-extrabold py-2.5 rounded-2xl text-xs transition"
          >
            🗑️ Clear All My Data (2-Step Reset)
          </button>
        </div>
      </div>
    </div>
  );
}
