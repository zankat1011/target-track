import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useStudy } from "../../context/StudyContext";
import {
  ADMIN_MOBILE,
  _K_ADM,
  _K_USR
} from "../../utils/constants";
import {
  secretHash,
  normalizeMobile,
  todayISO,
  addDaysISO,
  openAdminWhatsApp,
  openTelegramChannel,
  getValidityRemainingDays
} from "../../utils/helpers";
import { fetchRemoteStudentPin } from "../../services/firebase";

export function AuthScreen({ onStartTour }) {
  const { session, login, logout, startDemo } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { db, commitDb, syncWithCloud, cloudStatus } = useStudy();

  const [mobile, setMobile] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [name, setName] = useState("");
  const [exam, setExam] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanMobile = normalizeMobile(mobile);
  const isAdminMobile = cleanMobile === ADMIN_MOBILE;
  const isExistingStudent = cleanMobile.length === 10 && !!db.users[cleanMobile];

  // If user is already logged in but expired or pending
  const currentUser = session && session.role === "student" ? db.users[session.mobile] : null;
  const isExpired = currentUser && (currentUser.status !== "approved" || getValidityRemainingDays(currentUser) <= 0);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (cleanMobile.length !== 10) {
      setError("10 આંકડાનો મોબાઈલ નંબર નાખો.");
      return;
    }

    setLoading(true);

    // 1. Admin login check
    if (isAdminMobile) {
      if (!adminPass) {
        setLoading(false);
        setError("Admin Password નાખો.");
        return;
      }
      if (secretHash(adminPass) === _K_ADM) {
        login("admin", ADMIN_MOBILE);
        setLoading(false);
        return;
      } else {
        setLoading(false);
        setError("❌ ખોટો Admin Password!");
        return;
      }
    }

    // 2. Student PIN check
    if (!pin) {
      setLoading(false);
      setError("સાચો Platform Access PIN નાખો.");
      return;
    }

    let pinValid = secretHash(pin) === _K_USR;
    if (!pinValid && navigator.onLine) {
      const remotePin = await fetchRemoteStudentPin();
      if (remotePin && String(remotePin) === String(pin)) {
        pinValid = true;
      }
    }

    if (!pinValid) {
      setLoading(false);
      setError("સાચો Platform Access PIN નાખો.");
      return;
    }

    // Load or create student account
    let user = db.users[cleanMobile];
    if (!user) {
      const studentName = name.trim() || `Student ${cleanMobile.slice(-4)}`;
      const examName = exam.trim() || "GPSC / CCE";
      const td = todayISO();

      user = {
        mobile: cleanMobile,
        name: studentName,
        exam: examName,
        examDate: "",
        status: "approved",
        planName: "5-Day Free Trial",
        createdAt: td,
        planStartDate: td,
        planExpiryDate: addDaysISO(td, 5),
        dailyGoal: 20,
        focusMinutes: 0,
        focusSessions: 0,
        quickNotes: [],
        subjects: [],
        logs: [],
        revisions: [],
        tests: [],
        exams: [{ id: "ex_main", name: examName, examDate: "", subjects: [] }],
        activeExamId: "ex_main"
      };

      const newDb = { ...db, users: { ...db.users, [cleanMobile]: user } };
      commitDb(newDb);
      login("student", cleanMobile);
      setTimeout(() => onStartTour?.(), 400);
    } else {
      login("student", cleanMobile);
    }

    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto flex flex-col justify-center items-center px-4 py-6"
      style={{ backgroundColor: "var(--bg-main)" }}
    >
      <div className="w-full max-w-sm one-card p-6 anim-fade">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md">
              🎯
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight truncate">TARGET TRACK</h1>
              <p className="text-[11px] muted-text mt-0.5">Smart Study OS</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="text-xs font-extrabold w-9 h-9 rounded-full subtle-pill"
            >
              {theme === "cream" ? "🌙" : "☀️"}
            </button>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500">
              {cloudStatus}
            </span>
          </div>
        </div>

        {/* Form or Expired View */}
        {!isExpired ? (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold muted-text mb-1 ml-1">મોબાઈલ નંબર</label>
              <input
                type="tel"
                maxLength="11"
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full theme-input px-4 py-3 text-sm font-semibold"
              />
            </div>

            {isAdminMobile ? (
              <div>
                <label className="block text-[11px] font-bold text-amber-500 mb-1 ml-1">Admin Password</label>
                <input
                  type="password"
                  placeholder="Enter Admin Password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full theme-input border-amber-500 px-4 py-3 text-sm"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {!isExistingStudent && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold muted-text mb-1 ml-1">પૂરું નામ</label>
                      <input
                        type="text"
                        placeholder="તમારું પૂરું નામ"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full theme-input px-4 py-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold muted-text mb-1 ml-1">પરીક્ષા / તૈયારીનું નામ</label>
                      <input
                        type="text"
                        placeholder="e.g. GPSC / CCE / General Prep"
                        value={exam}
                        onChange={(e) => setExam(e.target.value)}
                        className="w-full theme-input px-4 py-3 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold muted-text mb-1 ml-1">પ્લેટફોર્મ PIN</label>
                  <input
                    type="password"
                    placeholder="Enter Platform Access PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full theme-input px-4 py-3 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => openAdminWhatsApp("Hello Admin, please share the Platform Access PIN for Target Track.")}
                      className="subtle-pill py-2 px-2.5 text-[11px] font-extrabold text-emerald-600 flex items-center justify-center gap-1"
                    >
                      <span>💬</span> <span>Contact admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={openTelegramChannel}
                      className="subtle-pill py-2 px-2.5 text-[11px] font-extrabold text-indigo-600 flex items-center justify-center gap-1"
                    >
                      <span>✈️</span> <span>Telegram PIN</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-md transition disabled:opacity-60"
            >
              {loading ? "⏳ Loading..." : isExistingStudent ? "🔓 Login to Account" : "🎁 Start 5-Day Free Trial / Login"}
            </button>

            <button
              type="button"
              onClick={startDemo}
              className="w-full text-center text-xs font-bold text-indigo-500 underline pt-1"
            >
              👁️ Explore Demo Mode (Read-Only)
            </button>
          </form>
        ) : (
          <div className="space-y-3.5">
            <div className="text-center">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto text-xl mb-1.5">
                ⏳
              </div>
              <h2 className="text-sm font-extrabold">5-Day Free Trial પૂર્ણ થયો છે</h2>
              <p className="text-[11px] muted-text mt-0.5">આગળ વાપરવા પ્લાન પસંદ કરી Razorpay થી પેમેન્ટ કરો:</p>
            </div>

            <div className="subtle-pill p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="muted-text">Student:</span>
                <span className="font-bold">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted-text">Mobile:</span>
                <span className="font-mono font-bold text-indigo-500">{currentUser.mobile}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <a
                href="https://razorpay.me/@thetarget?amount=99"
                target="_blank"
                rel="noreferrer"
                className="subtle-pill p-2.5 block hover:border-indigo-500 transition"
              >
                <div className="text-[10px] font-bold muted-text">6 Months</div>
                <div className="text-base font-extrabold text-indigo-500 mt-0.5">₹99</div>
                <div className="text-[9px] font-extrabold bg-indigo-600 text-white rounded-full py-0.5 mt-1">
                  Razorpay ↗
                </div>
              </a>
              <a
                href="https://razorpay.me/@thetarget?amount=149"
                target="_blank"
                rel="noreferrer"
                className="subtle-pill p-2.5 border-2 border-indigo-500 relative block"
              >
                <span className="absolute -top-2 inset-x-2 bg-indigo-600 text-white text-[8px] font-extrabold rounded-full py-0.5">
                  POPULAR
                </span>
                <div className="text-[10px] font-bold muted-text mt-1">1 Year</div>
                <div className="text-base font-extrabold text-emerald-500 mt-0.5">₹149</div>
                <div className="text-[9px] font-extrabold bg-emerald-600 text-white rounded-full py-0.5 mt-1">
                  Razorpay ↗
                </div>
              </a>
              <a
                href="https://razorpay.me/@thetarget?amount=999"
                target="_blank"
                rel="noreferrer"
                className="subtle-pill p-2.5 border border-amber-500/40 block"
              >
                <div className="text-[10px] font-bold text-amber-500">Lifetime</div>
                <div className="text-base font-extrabold text-amber-500 mt-0.5">₹999</div>
                <div className="text-[9px] font-extrabold bg-amber-500 text-white rounded-full py-0.5 mt-1">
                  Razorpay ↗
                </div>
              </a>
            </div>

            <button
              onClick={() => openAdminWhatsApp("Hello Target Track Admin, I have completed my plan payment. Sharing my Payment Screenshot (SS):")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-2xl text-xs shadow-sm flex items-center justify-center gap-2"
            >
              <span>📸</span> <span>Share SS of Payment</span>
            </button>

            <button
              onClick={() => { startDemo(); setTimeout(() => onStartTour?.(), 300); }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2.5 rounded-2xl text-xs shadow-sm"
            >
              🧭 એપનો ડેમો અને ટૂર જુઓ (Interactive Demo Tour)
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => syncWithCloud(true)}
                className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs"
              >
                🔄 સ્ટેટસ ચેક કરો
              </button>
              <button
                onClick={logout}
                className="px-3.5 subtle-pill font-bold py-2.5 rounded-xl text-xs"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
