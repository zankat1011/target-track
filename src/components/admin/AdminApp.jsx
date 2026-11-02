import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useStudy } from "../../context/StudyContext";
import {
  todayISO,
  addDaysISO,
  getValidityRemainingDays,
  nowFormattedTimestamp,
} from "../../utils/helpers";

export function AdminApp() {
  const { logout } = useAuth();
  const { toggleTheme } = useTheme();
  const { db, commitDb, syncWithCloud, cloudStatus, triggerCelebration } = useStudy();

  const [activePage, setActivePage] = useState("dashboard"); // 'dashboard' | 'users' | 'tools' | 'feedback'
  const [userDataView, setUserDataView] = useState("active"); // 'active' | 'deleted'
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [unlockedUsers, setUnlockedUsers] = useState({});
  const [inspectedMobile, setInspectedMobile] = useState(null);
  const [inspectedSubAccordion, setInspectedSubAccordion] = useState({});

  // Broadcast states
  const [bannerText, setBannerText] = useState(db.broadcast || "");
  const [popupTitle, setPopupTitle] = useState(db.popupBroadcast?.title || "");
  const [popupMsg, setPopupMsg] = useState(db.popupBroadcast?.message || "");

  // Feedback reply states
  const [replyDrafts, setReplyDrafts] = useState({});

  const usersArr = Object.values(db.users || {});
  const deletedArr = db.deletedData || [];
  const feedbacks = db.feedbacks || [];

  // Toggle user inline edit
  const toggleUserEdit = (mobile) => {
    setUnlockedUsers((prev) => ({ ...prev, [mobile]: !prev[mobile] }));
  };

  // Save edited user details
  const handleSaveUserDetails = (mobile, e) => {
    e?.preventDefault();
    const nameInput = document.getElementById(`admEditName_${mobile}`)?.value?.trim();
    const examInput = document.getElementById(`admEditExam_${mobile}`)?.value?.trim();
    const expInput = document.getElementById(`admEditExp_${mobile}`)?.value;

    const nextUsers = { ...db.users };
    const u = nextUsers[mobile];
    if (u) {
      if (nameInput) u.name = nameInput;
      if (examInput) u.exam = examInput;
      if (expInput) u.planExpiryDate = expInput;
    }
    commitDb({ ...db, users: nextUsers });
    toggleUserEdit(mobile);
    triggerCelebration("✅ User Updated!", u?.name);
  };

  // Quick Plan Assignment
  const handleAssignPlan = (mobile, days, planLabel) => {
    const nextUsers = { ...db.users };
    const u = nextUsers[mobile];
    if (u) {
      u.status = "approved";
      u.planName = planLabel;
      u.planStartDate = todayISO();
      u.planExpiryDate = addDaysISO(todayISO(), days);
    }
    commitDb({ ...db, users: nextUsers });
    triggerCelebration("🎁 Plan Assigned!", `${u?.name} ➔ ${planLabel}`);
  };

  // Adjust validity (+/- days)
  const handleAdjustValidity = (mobile, deltaDays) => {
    const nextUsers = { ...db.users };
    const u = nextUsers[mobile];
    if (u) {
      const base = u.planExpiryDate && u.planExpiryDate > todayISO() ? u.planExpiryDate : todayISO();
      u.planExpiryDate = addDaysISO(base, deltaDays);
    }
    commitDb({ ...db, users: nextUsers });
  };

  // Toggle block / unblock
  const handleToggleBlock = (mobile) => {
    const nextUsers = { ...db.users };
    const u = nextUsers[mobile];
    if (u) {
      u.status = u.status === "approved" ? "blocked" : "approved";
    }
    commitDb({ ...db, users: nextUsers });
  };

  // Archive student account to deleted vault
  const handleArchiveAccount = (mobile) => {
    const u = db.users[mobile];
    if (!u) return;
    if (!confirm(`શું તમારે ${u.name} (${u.mobile}) ને Active Users માંથી ખસેડીને Deleted Vault માં મોકલવા છે?`)) return;

    const nextDeleted = [
      {
        archiveId: `arch_${Date.now()}`,
        deletedAt: nowFormattedTimestamp(),
        deletedBy: "Admin (Archived Account)",
        mobile: u.mobile,
        name: u.name,
        exam: u.exam,
        fullAccountBackup: JSON.parse(JSON.stringify(u)),
        snapshot: {
          subjects: u.subjects || [],
          logs: u.logs || [],
          revisions: u.revisions || [],
          tests: u.tests || [],
        },
      },
      ...deletedArr,
    ];

    const nextUsers = { ...db.users };
    delete nextUsers[mobile];

    commitDb({ ...db, users: nextUsers, deletedData: nextDeleted });
    triggerCelebration("🗑️ Moved to Old Vault!", u.name);
  };

  // Restore deleted data
  const handleRestoreDeleted = (item) => {
    const nextUsers = { ...db.users };
    if (item.fullAccountBackup) {
      nextUsers[item.mobile] = item.fullAccountBackup;
    } else if (nextUsers[item.mobile] && item.snapshot) {
      const u = nextUsers[item.mobile];
      u.subjects = item.snapshot.subjects || [];
      u.logs = item.snapshot.logs || [];
      u.revisions = item.snapshot.revisions || [];
      u.tests = item.snapshot.tests || [];
    }

    const nextDeleted = deletedArr.filter((x) => x.archiveId !== item.archiveId);
    commitDb({ ...db, users: nextUsers, deletedData: nextDeleted });
    triggerCelebration("♻️ Data Restored!", item.name);
  };

  // Permanent Delete
  const handlePermanentDelete = (archiveId) => {
    if (!confirm("⚠️ કાયમ માટે (Permanently) ડિલીટ કરવું છે? આ ડેટા ફરી ક્યારેય પાછો નહીં મળે.")) return;
    const nextDeleted = deletedArr.filter((x) => x.archiveId !== archiveId);
    commitDb({ ...db, deletedData: nextDeleted });
  };

  // Empty Deleted Vault
  const handleEmptyVault = () => {
    if (!confirm("🚨 Deleted Vault નો બધો જ ડેટા કાયમ માટે ડિલીટ કરવો છે?")) return;
    commitDb({ ...db, deletedData: [] });
  };

  // Save Banner Broadcast
  const handleSaveBanner = () => {
    commitDb({ ...db, broadcast: bannerText.trim() });
    triggerCelebration("📢 Banner Broadcast Posted!", "બધા વિદ્યાર્થીઓને સૂચના દેખાશે.");
  };

  // Save Popup Broadcast
  const handleSavePopup = () => {
    if (!popupMsg.trim()) return alert("Pop-up મેસેજ લખો.");
    commitDb({
      ...db,
      popupBroadcast: {
        id: `pbc_${Date.now()}`,
        title: popupTitle.trim() || "📢 અગત્યની સૂચના",
        message: popupMsg.trim(),
        date: todayISO(),
      },
    });
    triggerCelebration("🚀 Pop-up Broadcast Sent!", "દરેક યુઝરને સ્ક્રીન પર Pop-up દેખાશે.");
  };

  const handleClearPopup = () => {
    commitDb({ ...db, popupBroadcast: null });
    setPopupTitle("");
    setPopupMsg("");
    triggerCelebration("🗑️ Pop-up Cleared!", "Pop-up Broadcast બંધ કરવામાં આવ્યું.");
  };

  // Bulk extend validity
  const handleBulkExtend = (extraDays) => {
    if (!confirm(`બધા જ વિદ્યાર્થીઓની વેલિડિટીમાં +${extraDays} દિવસ ઉમેરવા છે?`)) return;
    const nextUsers = { ...db.users };
    Object.values(nextUsers).forEach((u) => {
      const base = u.planExpiryDate && u.planExpiryDate > todayISO() ? u.planExpiryDate : todayISO();
      u.planExpiryDate = addDaysISO(base, extraDays);
    });
    commitDb({ ...db, users: nextUsers });
    triggerCelebration("🎁 Bonus Validity Added!", `+${extraDays} Days added to all users.`);
  };

  // Send 1-to-1 reply to bug report
  const handleSendBugReply = (fbId) => {
    const f = feedbacks.find((x) => x.id === fbId);
    if (!f) return;
    const replyText = (replyDrafts[fbId] || "").trim();
    if (!replyText) return alert("પહેલા રિપ્લાય મેસેજ લખો.");

    f.adminReply = replyText;
    f.repliedAt = nowFormattedTimestamp();

    const nextUsers = { ...db.users };
    const target = nextUsers[f.mobile];
    if (target) {
      if (!Array.isArray(target.directMessages)) target.directMessages = [];
      target.directMessages.unshift({
        id: `dm_${Date.now()}`,
        date: nowFormattedTimestamp(),
        text: `🛠️ [Re: ${f.message}]\n${replyText}`,
        seen: false,
      });
    }

    commitDb({ ...db, feedbacks: [...feedbacks], users: nextUsers });
    setReplyDrafts((prev) => ({ ...prev, [fbId]: "" }));
    triggerCelebration("📩 1-to-1 Reply Sent!", `${f.studentName} ને મેસેજ મળી જશે.`);
  };

  const handleCopyReport = (msg) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg).then(() => {
        triggerCelebration("📋 Copied!", "રિપોર્ટ ટેક્સ્ટ કોપી થઈ ગઈ છે.");
      });
    } else {
      prompt("Copy Report Text:", msg);
    }
  };

  const handleDeleteFeedback = (fbId) => {
    const next = feedbacks.filter((f) => f.id !== fbId);
    commitDb({ ...db, feedbacks: next });
  };

  // Database Export & Import
  const handleExportDB = () => {
    const a = document.createElement("a");
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    a.download = `target_track_master_${todayISO()}.json`;
    a.click();
  };

  const handleImportDB = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imp = JSON.parse(event.target.result);
        commitDb(imp);
        triggerCelebration("✅ Master DB Restored!", "Cloud Updated");
      } catch {
        alert("અમાન્ય Master DB ફાઈલ.");
      }
    };
    reader.readAsText(file);
  };

  // Filtered Users
  const filteredUsers = usersArr.filter((u) => {
    const q = searchQ.toLowerCase().trim();
    const matchQ = !q || (u.name || "").toLowerCase().includes(q) || (u.mobile || "").includes(q);
    if (!matchQ) return false;

    const rem = getValidityRemainingDays(u);
    if (statusFilter === "PAID") return u.status === "approved" && rem > 5;
    if (statusFilter === "TRIAL") return u.status === "approved" && rem > 0 && rem <= 5;
    if (statusFilter === "EXPIRED") return u.status !== "approved" || rem <= 0;
    return true;
  });

  const inspectedUser = inspectedMobile ? db.users[inspectedMobile] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between one-card p-4 border-l-4 border-l-indigo-600">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-extrabold">🛡️ TARGET TRACK — ADMIN OS</h1>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
              {cloudStatus}
            </span>
          </div>
          <p className="text-[10px] muted-text">Multi-Page Management Console</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => syncWithCloud(true)}
            className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition"
          >
            🔄 Sync
          </button>
          <button
            onClick={toggleTheme}
            className="text-xs font-extrabold px-2.5 py-1.5 rounded-full subtle-pill"
          >
            ☀️/🌙
          </button>
          <button
            onClick={logout}
            className="subtle-pill text-xs font-bold px-3 py-1.5 hover:bg-rose-500/10 text-rose-500"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Admin Nav Tabs */}
      <div className="grid grid-cols-4 gap-1.5 subtle-pill p-1">
        {[
          { id: "dashboard", label: "📊 Overview" },
          { id: "users", label: "👥 Users" },
          { id: "tools", label: "📢 Broadcast" },
          { id: "feedback", label: "🛠️ Reports" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePage(tab.id)}
            className={`py-2 rounded-xl text-xs font-extrabold transition ${
              activePage === tab.id ? "bg-indigo-600 text-white shadow-sm" : "muted-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= PAGE 1: DASHBOARD ================= */}
      {activePage === "dashboard" && (
        <div className="space-y-3.5 anim-fade">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="one-card p-3.5">
              <div className="text-[10px] font-bold muted-text">Total Students</div>
              <div className="text-xl font-extrabold mt-0.5">{usersArr.length}</div>
            </div>
            <div className="one-card p-3.5">
              <div className="text-[10px] font-bold muted-text">5D Trial / Exp</div>
              <div className="text-xl font-extrabold text-amber-500 mt-0.5">
                {usersArr.filter((u) => getValidityRemainingDays(u) <= 5 || u.status !== "approved").length}
              </div>
            </div>
            <div className="one-card p-3.5">
              <div className="text-[10px] font-bold muted-text">Paid Active</div>
              <div className="text-xl font-extrabold text-emerald-500 mt-0.5">
                {usersArr.filter((u) => u.status === "approved" && getValidityRemainingDays(u) > 5).length}
              </div>
            </div>
            <div className="one-card p-3.5">
              <div className="text-[10px] font-bold muted-text">Feedback Inbox</div>
              <div className="text-xl font-extrabold text-indigo-500 mt-0.5">{feedbacks.length}</div>
            </div>
          </div>

          {/* Top Students Leaderboard */}
          <div className="one-card p-4 space-y-2.5">
            <h2 className="text-xs font-extrabold">🔥 Top Active Students Leaderboard</h2>
            <div className="space-y-1.5">
              {usersArr
                .map((u) => {
                  let p = 0;
                  (u.subjects || []).forEach((s) =>
                    (s.chapters || []).forEach((c) => { p += Number(c.donePages || 0); })
                  );
                  return { name: u.name, mobile: u.mobile, pages: p, tests: (u.tests || []).length };
                })
                .sort((a, b) => b.pages - a.pages)
                .slice(0, 8)
                .map((r, i) => (
                  <div key={r.mobile} className="subtle-pill px-3 py-2 flex items-center justify-between text-xs">
                    <span>
                      <b>#{i + 1} {r.name}</b> <span className="font-mono muted-text">({r.mobile})</span>
                    </span>
                    <span className="font-extrabold text-indigo-500">
                      {r.pages}p Read • {r.tests} Tests
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= PAGE 2: USERS MANAGEMENT ================= */}
      {activePage === "users" && (
        <div className="space-y-3.5 anim-fade">
          <div className="grid grid-cols-2 gap-2 subtle-pill p-1">
            <button
              onClick={() => setUserDataView("active")}
              className={`py-2 rounded-xl text-xs font-extrabold transition ${
                userDataView === "active" ? "bg-indigo-600 text-white shadow-sm" : "muted-text"
              }`}
            >
              🟢 Active Student Data
            </button>
            <button
              onClick={() => setUserDataView("deleted")}
              className={`py-2 rounded-xl text-xs font-extrabold transition ${
                userDataView === "deleted" ? "bg-rose-600 text-white shadow-sm" : "muted-text"
              }`}
            >
              🗑️ Deleted Vault ({deletedArr.length})
            </button>
          </div>

          {/* ACTIVE USERS SECTION */}
          {userDataView === "active" && (
            <div className="one-card p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-xs font-extrabold">👥 Active Student Accounts</h2>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="🔍 Search Name or Mobile..."
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    className="theme-input px-3 py-1.5 text-xs font-semibold flex-1 sm:w-48"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="theme-input px-2.5 py-1.5 text-xs font-bold"
                  >
                    <option value="ALL">All</option>
                    <option value="PAID">Paid</option>
                    <option value="TRIAL">Trial</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredUsers.length === 0 ? (
                  <div className="text-xs muted-text text-center py-4">No matching active students found.</div>
                ) : (
                  filteredUsers.map((u) => {
                    const isApp = u.status === "approved";
                    const remDays = getValidityRemainingDays(u);
                    const isLife = remDays > 2000;
                    const isUnlocked = !!unlockedUsers[u.mobile];

                    let totC = 0, doneC = 0, totP = 0;
                    (u.subjects || []).forEach((s) =>
                      (s.chapters || []).forEach((c) => {
                        totC++;
                        if (c.completed) doneC++;
                        totP += Number(c.donePages || 0);
                      })
                    );

                    return (
                      <div
                        key={u.mobile}
                        className={`subtle-pill p-3.5 space-y-2.5 ${
                          isUnlocked ? "border-2 border-indigo-500" : ""
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-extrabold">{u.name}</span>
                              <span className="text-xs font-mono font-bold text-indigo-500">{u.mobile}</span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  isApp && remDays > 0
                                    ? "bg-emerald-500/20 text-emerald-500"
                                    : "bg-rose-500/20 text-rose-500"
                                }`}
                              >
                                {isApp
                                  ? isLife
                                    ? "♾️ LIFETIME"
                                    : `${remDays}d Left (${u.planName || "Plan"})`
                                  : "LOCKED"}
                              </span>
                            </div>
                            <div className="text-[11px] muted-text mt-1">
                              Exam: <b>{u.exam}</b> • Chapters: <b>{doneC}/{totC}</b> ({totP}p) • Valid Till:{" "}
                              <b>{u.planExpiryDate || "--"}</b>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => toggleUserEdit(u.mobile)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${
                                isUnlocked ? "bg-amber-500 text-white" : "one-card text-indigo-500"
                              }`}
                            >
                              {isUnlocked ? "🔒 Done" : "✎ Edit"}
                            </button>
                            <button
                              onClick={() => setInspectedMobile(u.mobile)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl transition"
                            >
                              📊 Report
                            </button>
                          </div>
                        </div>

                        {/* Inline Edit Drawer */}
                        {isUnlocked && (
                          <div
                            className="pt-2.5 border-t space-y-2.5 anim-fade"
                            style={{ borderColor: "var(--border-col)" }}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <input
                                id={`admEditName_${u.mobile}`}
                                type="text"
                                defaultValue={u.name}
                                placeholder="Name"
                                className="theme-input px-2.5 py-1.5 text-xs font-bold"
                              />
                              <input
                                id={`admEditExam_${u.mobile}`}
                                type="text"
                                defaultValue={u.exam}
                                placeholder="Exam"
                                className="theme-input px-2.5 py-1.5 text-xs font-bold"
                              />
                              <input
                                id={`admEditExp_${u.mobile}`}
                                type="date"
                                defaultValue={u.planExpiryDate || todayISO()}
                                className="theme-input px-2.5 py-1.5 text-xs font-bold"
                              />
                              <button
                                onClick={(e) => handleSaveUserDetails(u.mobile, e)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-1.5 rounded-xl transition"
                              >
                                💾 Save
                              </button>
                            </div>

                            <div className="flex items-center justify-between flex-wrap gap-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  onClick={() => handleAssignPlan(u.mobile, 5, "5-Day Free Trial")}
                                  className="one-card text-xs font-bold px-2.5 py-1 rounded-lg"
                                >
                                  5D Trial
                                </button>
                                <button
                                  onClick={() => handleAssignPlan(u.mobile, 180, "₹99 (6 Months)")}
                                  className="bg-indigo-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-lg"
                                >
                                  +6M (₹99)
                                </button>
                                <button
                                  onClick={() => handleAssignPlan(u.mobile, 365, "₹149 (1 Year)")}
                                  className="bg-emerald-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-lg"
                                >
                                  +1Y (₹149)
                                </button>
                                <button
                                  onClick={() => handleAssignPlan(u.mobile, 36500, "₹999 Lifetime")}
                                  className="bg-amber-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-lg"
                                >
                                  ♾️ ₹999 Life
                                </button>
                                <button
                                  onClick={() => handleAdjustValidity(u.mobile, -15)}
                                  className="one-card text-rose-500 text-xs font-extrabold px-2 py-1 rounded-lg"
                                >
                                  −15d
                                </button>
                                <button
                                  onClick={() => handleAdjustValidity(u.mobile, 15)}
                                  className="one-card text-emerald-500 text-xs font-extrabold px-2 py-1 rounded-lg"
                                >
                                  +15d
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleBlock(u.mobile)}
                                  className="bg-amber-500/15 text-amber-500 text-xs font-extrabold px-2.5 py-1 rounded-lg"
                                >
                                  {u.status === "approved" ? "🚫 Block" : "✓ Unblock"}
                                </button>
                                <button
                                  onClick={() => handleArchiveAccount(u.mobile)}
                                  className="bg-rose-500/15 text-rose-500 text-xs font-extrabold px-2.5 py-1 rounded-lg hover:bg-rose-500/25"
                                >
                                  🗑️ Move to Old Vault
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* DELETED VAULT SECTION */}
          {userDataView === "deleted" && (
            <div className="one-card p-4 space-y-3 border-2 border-rose-500/40">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-extrabold text-rose-500">🗑️ Deleted / Old Data Archive</h2>
                  <p className="text-[10px] muted-text">
                    યુઝરે Clear કરેલો અથવા Admin એ Archive કરેલો જૂનો ડેટા
                  </p>
                </div>
                {deletedArr.length > 0 && (
                  <button
                    onClick={handleEmptyVault}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition"
                  >
                    🔥 Delete All Permanently
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {deletedArr.length === 0 ? (
                  <div className="text-xs muted-text text-center py-4">Deleted Vault ખાલી છે.</div>
                ) : (
                  deletedArr.map((item) => {
                    const subCount = (item.snapshot?.subjects || []).length;
                    const logCount = (item.snapshot?.logs || []).length;
                    return (
                      <div
                        key={item.archiveId}
                        className="subtle-pill p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l-4 border-l-rose-500"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold">{item.name || "Student"}</span>
                            <span className="text-xs font-mono font-bold text-indigo-500">
                              📞 {item.mobile}
                            </span>
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500">
                              {item.deletedBy || "Deleted"}
                            </span>
                          </div>
                          <div className="text-[10px] muted-text mt-1">
                            🕒 Deleted At: <b>{item.deletedAt}</b> • 📚 Subjects: <b>{subCount}</b> • 📖 Logs:{" "}
                            <b>{logCount}</b>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleRestoreDeleted(item)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition"
                          >
                            ♻️ Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(item.archiveId)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition"
                          >
                            ✕ Permanent Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* INSPECT STUDENT REPORT MODAL */}
          {inspectedUser && (
            <div className="one-card p-5 border-2 border-indigo-500 space-y-4 anim-fade">
              <div
                className="flex items-center justify-between border-b pb-2.5"
                style={{ borderColor: "var(--border-col)" }}
              >
                <h3 className="text-sm font-extrabold text-indigo-500">
                  📊 {inspectedUser.name} ({inspectedUser.mobile}) — Student Report
                </h3>
                <button
                  onClick={() => setInspectedMobile(null)}
                  className="text-xs font-extrabold px-3 py-1 rounded-full subtle-pill hover:border-indigo-500"
                >
                  ✕ Close
                </button>
              </div>

              {/* Subject Breakdown with Accordions */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold">📚 Subject Progress & Chapters</div>
                {(inspectedUser.subjects || []).map((s) => {
                  const isOpen = !!inspectedSubAccordion[s.id];
                  const sDone = (s.chapters || []).filter((c) => c.completed).length;
                  return (
                    <div key={s.id} className="subtle-pill overflow-hidden">
                      <div
                        onClick={() =>
                          setInspectedSubAccordion((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                        }
                        className="p-3 flex items-center justify-between cursor-pointer select-none"
                      >
                        <span className="font-extrabold text-xs">
                          {isOpen ? "▼" : "▶"} {s.name}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">
                          {sDone}/{(s.chapters || []).length} પૂર્ણ
                        </span>
                      </div>

                      {isOpen && (
                        <div
                          className="px-3 pb-3 pt-1 border-t space-y-1 anim-fade text-xs"
                          style={{ borderColor: "var(--border-col)" }}
                        >
                          {(s.chapters || []).map((c) => (
                            <div key={c.id} className="flex justify-between py-1 border-b last:border-none">
                              <span>{c.completed ? "✅" : "⏳"} {c.name}</span>
                              <span className="muted-text">
                                Read: <b>{c.donePages}p</b> • Rev: <b className="text-emerald-500">{c.revisedPages || 0}p</b>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Recent Logs */}
              <div className="subtle-pill p-3 space-y-1">
                <div className="font-extrabold text-emerald-500 mb-1 text-xs">Recent Study & Revision Logs:</div>
                {(inspectedUser.logs || []).slice(-8).reverse().map((l) => (
                  <div key={l.id} className="flex justify-between py-1 border-b text-[11px] last:border-none">
                    <span>
                      <b>{l.date}</b> — {l.subjectName} ➔ {l.chapterName}
                    </span>
                    <span className="font-extrabold text-emerald-500">+{l.pages}p</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= PAGE 3: BROADCAST & TOOLS ================= */}
      {activePage === "tools" && (
        <div className="space-y-3.5 anim-fade">
          {/* Banner Broadcast */}
          <div className="one-card p-4 space-y-2.5">
            <div className="text-xs font-extrabold">📢 Global Top Banner Broadcast</div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="બધા વિદ્યાર્થીઓને એપમાં ઉપર બેનર સૂચના બતાવો..."
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                className="flex-1 theme-input px-3 py-2 text-xs"
              />
              <button
                onClick={handleSaveBanner}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition"
              >
                Post
              </button>
            </div>
          </div>

          {/* Pop-up Broadcast */}
          <div className="one-card p-4 space-y-2.5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold">🔔 Pop-up Broadcast Announcement</div>
                <div className="text-[10px] muted-text">
                  યુઝર એપ ખોલે ત્યારે સ્ક્રીન વચ્ચે Pop-up બોક્સમાં જાહેરાત બતાવો
                </div>
              </div>
              {db.popupBroadcast && (
                <button onClick={handleClearPopup} className="text-[10px] font-extrabold text-rose-500">
                  Clear Pop-up
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Pop-up ટાઈટલ (e.g. નવી ટેસ્ટ સીરીઝ જાહેરાત)"
              value={popupTitle}
              onChange={(e) => setPopupTitle(e.target.value)}
              className="w-full theme-input px-3 py-2 text-xs font-bold"
            />
            <textarea
              rows="2"
              placeholder="Pop-up મેસેજ અહીં લખો..."
              value={popupMsg}
              onChange={(e) => setPopupMsg(e.target.value)}
              className="w-full theme-input p-3 text-xs font-semibold"
            />
            <button
              onClick={handleSavePopup}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold py-2.5 rounded-xl shadow-sm transition"
            >
              🚀 Send Pop-up Broadcast to All Users
            </button>
          </div>

          {/* Bulk Extend */}
          <div className="one-card p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-extrabold">🎁 Gift Bonus Validity to All Active Users</div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleBulkExtend(5)}
                className="subtle-pill px-3 py-1.5 text-xs font-extrabold text-emerald-500 hover:border-emerald-500"
              >
                +5 Days All
              </button>
              <button
                onClick={() => handleBulkExtend(30)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-extrabold transition"
              >
                +30 Days All
              </button>
            </div>
          </div>

          {/* Database Backup & Restore */}
          <div className="one-card p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-extrabold">💾 Master Database JSON Backup</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportDB}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl font-bold transition"
              >
                ⬇ Export
              </button>
              <label className="text-xs subtle-pill px-3.5 py-2 font-bold cursor-pointer hover:border-indigo-500 transition">
                ⬆ Restore
                <input type="file" accept=".json" className="hidden" onChange={handleImportDB} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ================= PAGE 4: BUG REPORTS & 1-TO-1 REPLY ================= */}
      {activePage === "feedback" && (
        <div className="space-y-3.5 anim-fade">
          <div className="one-card p-4 space-y-2.5">
            <h2 className="text-xs font-extrabold mb-2.5">
              🛠️ Student Bug Reports & Feature Requests (1-to-1 Reply)
            </h2>

            {feedbacks.length === 0 ? (
              <div className="text-xs muted-text py-3 text-center">No reports or requests yet.</div>
            ) : (
              feedbacks.map((f) => (
                <div key={f.id} className="subtle-pill p-3.5 space-y-2.5 text-xs border-l-4 border-l-indigo-500">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 text-[10px]">
                          {f.type}
                        </span>
                        <span className="font-extrabold text-sm">👤 {f.studentName || "Student"}</span>
                        <a href={`tel:${f.mobile}`} className="font-mono font-extrabold text-emerald-500 underline">
                          📞 {f.mobile}
                        </a>
                        <span className="text-[10px] muted-text">• {f.date}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <p className="font-semibold text-xs break-words flex-1">{f.message}</p>
                        <button
                          onClick={() => handleCopyReport(f.message)}
                          title="Copy Text"
                          className="one-card px-2.5 py-1 rounded-xl text-[10px] font-extrabold text-indigo-500 shrink-0 hover:border-indigo-500"
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFeedback(f.id)}
                      className="text-rose-500 font-bold px-2 py-1 rounded-lg hover:bg-rose-500/10"
                    >
                      🗑
                    </button>
                  </div>

                  {f.adminReply && (
                    <div className="one-card px-3 py-2 rounded-xl text-[11px] border-l-2 border-l-emerald-500">
                      <span className="font-extrabold text-emerald-500">✓ Replied ({f.repliedAt || ""}):</span>{" "}
                      {f.adminReply}
                    </div>
                  )}

                  {/* 1-to-1 Direct Reply Input */}
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder={`Reply 1-to-1 directly to ${f.studentName} (${f.mobile})...`}
                      value={replyDrafts[f.id] || ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [f.id]: e.target.value }))
                      }
                      className="flex-1 theme-input px-3 py-1.5 text-xs font-semibold"
                    />
                    <button
                      onClick={() => handleSendBugReply(f.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-[11px] shrink-0 transition"
                    >
                      📩 Send 1-to-1 Reply
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
