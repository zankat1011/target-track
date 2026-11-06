import React, { useState, useEffect } from "react";
import { useStudy } from "../../context/StudyContext";
import { ClearDataModal } from "../common/ClearDataModal";
import { LegalPolicyModal } from "../modals/LegalPolicyModal";
import {
  todayISO,
  openAdminWhatsApp,
  openTelegramChannel,
  getValidityRemainingDays,
  nowFormattedTimestamp,
} from "../../utils/helpers";
import { LIVE_TEST_URL } from "../../utils/constants";

export function ProfileTab({ onOpenMultiExam, onOpenBulkImport }) {
  const { currentUser, updateCurrentUser, clearCurrentUserData, db, commitDb, triggerCelebration } = useStudy();

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

  // Clear Data Modal State
  const [showClearModal, setShowClearModal] = useState(false);

  // Legal Policy Modal State (Requirement 7)
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState("terms");

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
    const val = Math.max(1, Math.min(360, Number(mins) || 25));
    setPomoRunning(false);
    setPomoPreset(val);
    setPomoSeconds(val * 60);
  };

  const handleAdjustPomo = (delta) => {
    handleSetPomoPreset(pomoPreset + delta);
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

  // Safe Mobile Notification
  const showMobileSafeNotification = async (title, body) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎯</text></svg>",
            badge: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎯</text></svg>",
            vibrate: [200, 100, 200],
          });
          return;
        }
      }
      new Notification(title, { body });
    } catch (e) {
      console.error(e);
    }
  };

  // Browser Notification Enable
  const handleEnableNotification = async () => {
    if (!("Notification" in window)) {
      alert("તમારા બ્રાઉઝરમાં Notification સપોર્ટ નથી.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        setNotifGranted(true);
        await showMobileSafeNotification(
          "🎯 Target Track Alert Active!",
          "તમારા બાકી રિવિઝનના નોટિફિકેશન હવે નિયમિત મળશે."
        );
        triggerCelebration("🔔 Notifications Active!", "બાકી રિવિઝન માટે એલર્ટ મળશે.");
      } else {
        alert("⚠️ બ્રાઉઝર સેટિંગ્સમાંથી Notification પરમિશન Allow કરો.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Feedback
  const handleSubmitFeedback = (viaWhatsApp = false) => {
    if (!feedbackMsg.trim()) return alert("કૃપા કરીને તમારો મેસેજ કે સૂચન લખો.");
    const newFeedback = {
      id: `fb_${Date.now()}`,
      date: nowFormattedTimestamp(),
      studentName: currentUser?.name || "Student",
      mobile: currentUser?.mobile || "",
      type: feedbackType,
      status: "Pending", // 'Pending' | 'In Progress' | 'Resolved'
      message: feedbackMsg.trim(),
      adminReply: "",
      repliedAt: "",
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
      triggerCelebration("📩 રિપોર્ટ સબમિટ થયો!", "નીચે તમારી હિસ્ટ્રીમાં તેનું Live Status દેખાશે.");
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

  // Delete My Bug / Feature Report
  const handleDeleteMyReport = (fbId) => {
    if (!window.confirm("શું તમે આ રિપોર્ટ કાઢી નાખવા માંગો છો?")) return;
    const updated = (db.feedbacks || []).filter(
      (f) => !(f.id === fbId && f.mobile === currentUser?.mobile)
    );
    commitDb({
      ...db,
      feedbacks: updated,
    });
    triggerCelebration("🗑️ રિપોર્ટ ડિલીટ થયો", "તમારો રિપોર્ટ લિસ્ટમાંથી હટાવી દેવામાં આવ્યો છે.");
  };

  // Delete Individual Admin 1-to-1 Direct Message
  const handleDeleteDirectMessage = (msgToDelete, index) => {
    if (!window.confirm("શું તમે આ Admin મેસેજ કાઢી નાખવા માંગો છો?")) return;
    updateCurrentUser((u) => {
      u.directMessages = (u.directMessages || []).filter((m, i) => {
        if (msgToDelete.id && m.id) return m.id !== msgToDelete.id;
        if (msgToDelete.date && msgToDelete.text) {
          return !(m.date === msgToDelete.date && m.text === msgToDelete.text);
        }
        return i !== index;
      });
    });
    triggerCelebration("🗑️ મેસેજ ડિલીટ થયો", "Admin મેસેજ લિસ્ટમાંથી હટાવી દેવામાં આવ્યો છે.");
  };

  // Clear All Admin 1-to-1 Direct Messages
  const handleClearAllDirectMessages = () => {
    if (!window.confirm("શું તમે બધા Admin 1-to-1 મેસેજીસ સાફ કરવા માંગો છો?")) return;
    updateCurrentUser((u) => {
      u.directMessages = [];
    });
    triggerCelebration("🧹 બધા મેસેજીસ સાફ કર્યા", "તમારું મેસેજ ઇનબોક્સ ખાલી થઈ ગયું છે.");
  };

  // Clear All My Data (Working 2-Step In-App Modal)
  const handleClearAllData = () => {
    setShowClearModal(true);
  };

  const handleClearAllDataConfirm = () => {
    setPomoRunning(false);
    setPomoPreset(25);
    setPomoSeconds(25 * 60);
    clearCurrentUserData();
  };

  const valLeft = getValidityRemainingDays(currentUser);
  const isLifetime = valLeft > 2000;
  const planLabel = isLifetime
    ? "Lifetime Pro"
    : currentUser?.planName || (valLeft <= 5 ? "5D Free Trial" : "Pro Plan");

  // Direct 1-to-1 admin replies & User Bug/Feature reports
  const dms = currentUser?.directMessages || [];
  const myReports = (db.feedbacks || []).filter((f) => f.mobile === currentUser?.mobile);
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
          {/* Custom Any Minutes Box (-5, number, +5) */}
          <div
            className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl border"
            style={{ borderColor: "var(--border-col)" }}
          >
            <button
              type="button"
              onClick={() => handleAdjustPomo(-5)}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-white dark:bg-stone-800 text-xs font-black shadow-xs hover:border-indigo-500 transition"
              title="-5 mins"
            >
              −5
            </button>
            <input
              type="number"
              min="1"
              max="360"
              value={pomoPreset}
              onChange={(e) => handleSetPomoPreset(e.target.value)}
              className="w-12 text-center text-xs font-black bg-transparent border-0 focus:outline-none"
              title="Custom Minutes (game te minute)"
            />
            <span className="text-[10px] font-bold muted-text pr-1">m</span>
            <button
              type="button"
              onClick={() => handleAdjustPomo(5)}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-white dark:bg-stone-800 text-xs font-black shadow-xs hover:border-indigo-500 transition"
              title="+5 mins"
            >
              +5
            </button>
          </div>

          {[15, 25, 45, 60].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => handleSetPomoPreset(mins)}
              className={`subtle-pill px-2.5 py-1 text-[10px] font-extrabold transition ${
                pomoPreset === mins && !pomoRunning ? "border-indigo-500 text-indigo-500 font-black" : ""
              }`}
            >
              {mins}m
            </button>
          ))}

          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={handleTogglePomo}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow-sm transition"
            >
              {pomoRunning ? "⏸ Pause" : "▶ Start"}
            </button>
            <button
              type="button"
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

        {/* 1-to-1 Admin Direct Message Inbox */}
        {dms.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: "var(--border-col)" }}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-extrabold uppercase muted-text">
                Admin 1-to-1 Messages:
              </div>
              <button
                type="button"
                onClick={handleClearAllDirectMessages}
                className="text-[10px] font-extrabold text-rose-500 hover:text-rose-700 underline transition"
                title="બધા Admin મેસેજીસ સાફ કરો"
              >
                Clear All
              </button>
            </div>
            {dms.map((m, idx) => (
              <div key={m.id || idx} className="subtle-pill p-2.5 border-l-4 border-l-emerald-500 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-500">
                    💬 Admin Direct Message
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] muted-text">{m.date}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDirectMessage(m, idx)}
                      className="text-rose-500 hover:text-rose-700 p-0.5 text-xs transition"
                      title="આ મેસેજ કાઢી નાખો"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="font-semibold whitespace-pre-wrap leading-relaxed">{m.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* User Bug & Feature Report History + Live Status */}
        <div className="pt-2 border-t space-y-2" style={{ borderColor: "var(--border-col)" }}>
          <div className="text-[11px] font-extrabold uppercase muted-text">
            📋 My Bug & Feature Report History
          </div>
          {myReports.length === 0 ? (
            <div className="text-[11px] muted-text text-center py-2">
              તમે હજુ કોઈ Bug કે Feature Request મોકલી નથી.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
              {myReports.map((f) => {
                const st = f.status || (f.adminReply ? "Resolved" : "Pending");
                let stBadge = (
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                    ⏳ Pending
                  </span>
                );
                if (st === "In Progress") {
                  stBadge = (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">
                      ⚙️ Working On It
                    </span>
                  );
                } else if (st === "Resolved") {
                  stBadge = (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                      ✅ Resolved
                    </span>
                  );
                }

                return (
                  <div
                    key={f.id}
                    className={`subtle-pill p-3 space-y-2 text-xs border-l-4 ${
                      st === "Resolved" ? "border-l-emerald-500" : "border-l-indigo-500"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold text-indigo-500">
                        [{f.type}] • <span className="muted-text font-normal">{f.date}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {stBadge}
                        <button
                          type="button"
                          onClick={() => handleDeleteMyReport(f.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 text-xs transition"
                          title="આ રિપોર્ટ કાઢી નાખો"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="font-semibold text-xs leading-relaxed">{f.message}</div>
                    {f.adminReply ? (
                      <div className="one-card p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-emerald-500">
                            🛡️ Admin Response
                          </span>
                          <span className="text-[9px] muted-text">{f.repliedAt || ""}</span>
                        </div>
                        <div className="text-xs font-bold leading-relaxed">{f.adminReply}</div>
                      </div>
                    ) : (
                      <div className="text-[10px] muted-text italic">
                        Admin તરફથી જવાબની રાહ જોવાઈ રહી છે...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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

      {/* 8. Legal Policies & Rules (Requirement 7) */}
      <div className="one-card p-4 space-y-2.5 text-center">
        <h3 className="text-xs font-black uppercase muted-text">
          📜 પ્લેટફોર્મ નિયમો & કાનૂની નીતિઓ (Legal Policies)
        </h3>
        <p className="text-[10px] muted-text leading-relaxed">
          વિદ્યાર્થીઓ અને સેલર્સની સુરક્ષા તથા પારદર્શિતા માટે Target Track ની અધિકૃત માર્ગદર્શિકા:
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {[
            { id: "terms", label: "📜 Terms of Service" },
            { id: "refund", label: "💰 Refund Policy" },
            { id: "pricing", label: "🏷️ Pricing Policy" },
            { id: "disclaimer", label: "⚠️ Disclaimer" },
            { id: "privacy", label: "🔒 Privacy Policy" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setLegalModalTab(item.id);
                setLegalModalOpen(true);
              }}
              className="subtle-pill px-3 py-1.5 rounded-xl text-[10px] font-extrabold hover:border-indigo-500 hover:text-indigo-600 transition"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2-Step Clear All Data Modal */}
      <ClearDataModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearAllDataConfirm}
      />

      {/* Legal Policies Modal */}
      <LegalPolicyModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
}
