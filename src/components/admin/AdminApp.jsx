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

  const [activePage, setActivePage] = useState("dashboard"); // 'dashboard' | 'users' | 'marketplace' | 'financials' | 'tools' | 'feedback'
  const [adminBazaarTab, setAdminBazaarTab] = useState("orders"); // 'orders' | 'payouts' | 'sellers' | 'books' | 'vip' | 'reviews'
  const [reportFilterTab, setReportFilterTab] = useState("pending"); // 'pending' | 'working' | 'resolved'
  const [finDateRange, setFinDateRange] = useState("all"); // 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'
  const [finFromDate, setFinFromDate] = useState("");
  const [finToDate, setFinToDate] = useState("");

  // 2-Step Verified Order Delete states (Requirement 6)
  const [adminOrderToDelete, setAdminOrderToDelete] = useState(null);
  const [adminDeleteStep, setAdminDeleteStep] = useState(1);
  const [adminDeleteVerifyText, setAdminDeleteVerifyText] = useState("");

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
    f.status = "Resolved";

    const nextUsers = { ...db.users };
    const target = nextUsers[f.mobile];
    if (target) {
      if (!Array.isArray(target.directMessages)) target.directMessages = [];
      target.directMessages.unshift({
        id: `dm_${Date.now()}`,
        date: nowFormattedTimestamp(),
        text: `🛠️ [${f.type} — Resolved]\nYour Report: "${f.message}"\n\n✅ Admin Reply: ${replyText}`,
        seen: false,
      });
    }

    commitDb({ ...db, feedbacks: [...feedbacks], users: nextUsers });
    setReplyDrafts((prev) => ({ ...prev, [fbId]: "" }));
    triggerCelebration("📩 1-to-1 Reply Sent!", `${f.studentName} ને મેસેજ મળી જશે.`);
  };

  const handleUpdateFeedbackStatus = (fbId, newStatus) => {
    const next = feedbacks.map((f) => {
      if (f.id === fbId) {
        return { ...f, status: newStatus };
      }
      return f;
    });
    commitDb({ ...db, feedbacks: next });
    triggerCelebration("Status Updated", `Report status set to ${newStatus}`);
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

  // Marketplace Admin Handlers
  const marketplaceBooks = db.marketplaceBooks || [];
  const marketplaceOrders = db.marketplaceOrders || [];
  const marketplacePayouts = db.marketplacePayouts || [];
  const marketplaceSubscriptions = db.marketplaceSubscriptions || [];
  const sellerApplications = db.sellerApplications || [];

  const handleApproveBook = (bookId) => {
    const nextBooks = marketplaceBooks.map((b) =>
      b.id === bookId ? { ...b, status: "Approved" } : b
    );
    commitDb({ ...db, marketplaceBooks: nextBooks });
    triggerCelebration("✅ Book Approved!", "હવે માર્કેટપ્લેસમાં બધા વિદ્યાર્થીઓ જોઈ શકશે.");
  };

  const handleRejectBook = (bookId) => {
    const reason = prompt(
      "રિજેક્ટ કરવાનું કારણ લખો:",
      "અધૂરી માહિતી અથવા સ્પષ્ટ સેમ્પલ પેજ નથી."
    );
    if (!reason) return;
    const nextBooks = marketplaceBooks.map((b) =>
      b.id === bookId ? { ...b, status: "Rejected", rejectReason: reason } : b
    );
    commitDb({ ...db, marketplaceBooks: nextBooks });
    triggerCelebration("❌ Book Rejected", "સ્ટેટસ અપડેટ થઈ ગયું.");
  };

  const handleDeleteBook = (bookId) => {
    if (!window.confirm("શું તમે આ બુક લિસ્ટિંગ સંપૂર્ણ કાઢી નાખવા માંગો છો?")) return;
    const nextBooks = marketplaceBooks.filter((b) => b.id !== bookId);
    commitDb({ ...db, marketplaceBooks: nextBooks });
  };

  const handleVerifyOrder = (orderId) => {
    const order = marketplaceOrders.find((o) => o.id === orderId);
    if (!order) return;

    const nextOrders = marketplaceOrders.map((o) =>
      o.id === orderId
        ? { ...o, status: "Verified", verifiedAt: nowFormattedTimestamp() }
        : o
    );

    // Update sales count on book
    const nextBooks = marketplaceBooks.map((b) =>
      b.id === order.bookId ? { ...b, salesCount: Number(b.salesCount || 0) + 1 } : b
    );

    // Send direct message to the buyer
    const nextUsers = { ...db.users };
    const buyer = nextUsers[order.buyerMobile];
    if (buyer) {
      if (!Array.isArray(buyer.directMessages)) buyer.directMessages = [];
      buyer.directMessages.unshift({
        id: `dm_${Date.now()}`,
        date: nowFormattedTimestamp(),
        text: `🎉 [Book Verified]\nતમારી બુક "${order.bookTitle}" નું પેમેન્ટ વેરિફાય થઈ ગયું છે!\nતમે માર્કેટપ્લેસ 'મારી ખરીદી' માંથી ડાઉનલોડ કરી શકો છો (મહત્તમ ૨ વખત ડાઉનલોડ ઉપલબ્ધ).`,
        seen: false,
      });
    }

    commitDb({
      ...db,
      marketplaceOrders: nextOrders,
      marketplaceBooks: nextBooks,
      users: nextUsers,
    });
    triggerCelebration("✅ Payment Verified!", `${order.buyerName} ને એક્સેસ મળી ગયું છે.`);
  };

  // Reset Download Limit for Student (Requirement 2)
  const handleResetDownloadCount = (orderId) => {
    if (!window.confirm("શું તમે આ વિદ્યાર્થીની ડાઉનલોડ મર્યાદા રીસેટ (0/2) કરવા માંગો છો?")) return;
    const nextOrders = marketplaceOrders.map((o) =>
      o.id === orderId ? { ...o, downloadCount: 0 } : o
    );
    commitDb({ ...db, marketplaceOrders: nextOrders });
    triggerCelebration("🔄 ડાઉનલોડ મર્યાદા રીસેટ!", "વિદ્યાર્થી ફરી ૨ વખત ડાઉનલોડ કરી શકશે.");
  };

  // Payout Handlers & Reversal (Requirement 1 & 3)
  const handleMarkPayoutPaid = (payoutId) => {
    const defaultUtr = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const utr = prompt("પેમેન્ટ પૂર્ણ કરતાં ટ્રાન્ઝેક્શન UTR નંબર દાખલ કરો:", defaultUtr);
    if (!utr) return;

    const nextPayouts = marketplacePayouts.map((p) =>
      p.id === payoutId
        ? {
            ...p,
            status: "Paid",
            paidAt: nowFormattedTimestamp(),
            adminUtr: utr.trim(),
          }
        : p
    );
    commitDb({ ...db, marketplacePayouts: nextPayouts });
    triggerCelebration("💸 પેઆઉટ ચૂકવાઈ ગયું!", `UTR: ${utr}`);
  };

  // REVERSE PAYMENT FEATURE (Requirement 3)
  const handleReversePayout = (payoutId) => {
    const target = marketplacePayouts.find((p) => p.id === payoutId);
    if (!target) return;
    if (
      !window.confirm(
        `⚠️ ચેતવણી: શું તમે આ ₹${target.amount} નું પેમેન્ટ રિવર્સ (પાછું ખેંચવા) માંગો છો?\nઆ રકમ સેલર (${target.sellerName}) ના વૉલેટમાં તરત જ ફરી જમા થઈ જશે.`
      )
    ) {
      return;
    }
    const nextPayouts = marketplacePayouts.map((p) =>
      p.id === payoutId
        ? {
            ...p,
            status: "Reversed",
            reversedAt: nowFormattedTimestamp(),
            note: "એડમિન દ્વારા રિવર્સ કરી વૉલેટમાં પુનઃ જમા કરેલ",
          }
        : p
    );
    commitDb({ ...db, marketplacePayouts: nextPayouts });
    triggerCelebration(
      "↩️ પેમેન્ટ રિવર્સ થયું!",
      `₹${target.amount} સેલરના વૉલેટમાં પાછા જમા થયા.`
    );
  };

  // VIP Subscription Activation (Requirement 8)
  const handleActivateVipSubscription = (subId) => {
    const targetSub = marketplaceSubscriptions.find((s) => s.id === subId);
    if (!targetSub) return;

    const nextSubs = marketplaceSubscriptions.map((s) =>
      s.id === subId
        ? {
            ...s,
            status: "active",
            activatedAt: nowFormattedTimestamp(),
            expiresAt: addDaysISO(todayISO(), 90), // 3 months validity
          }
        : s
    );

    // Update all books of this seller to 0% commission
    const nextBooks = marketplaceBooks.map((b) =>
      b.sellerMobile === targetSub.sellerMobile
        ? {
            ...b,
            sellerPlan: "fixed_500",
            adminCommissionPct: 0,
            adminFee: 0,
            sellerPayout: b.price,
          }
        : b
    );

    commitDb({
      ...db,
      marketplaceSubscriptions: nextSubs,
      marketplaceBooks: nextBooks,
    });
    triggerCelebration("👑 VIP સેલર પ્લાન સક્રિય!", "૩ મહિના માટે ૦% કમિશન પ્લાન શરૂ થયો.");
  };

  // Review & Rating Moderation (Requirement 6)
  const handleToggleHideReview = (bookId, reviewId) => {
    const nextBooks = marketplaceBooks.map((b) => {
      if (b.id === bookId) {
        const nextReviews = (b.ratings || []).map((r) =>
          r.id === reviewId ? { ...r, hidden: !r.hidden } : r
        );
        return { ...b, ratings: nextReviews };
      }
      return b;
    });
    commitDb({ ...db, marketplaceBooks: nextBooks });
    triggerCelebration("👁️ રિવ્યૂ સ્ટેટસ બદલાયું", "સફળતાપૂર્વક અપડેટ થયું.");
  };

  const handleDeleteReview = (bookId, reviewId) => {
    if (!window.confirm("શું તમે આ રેટિંગ/રિવ્યૂ કાયમ માટે કાઢી નાખવા માંગો છો?")) return;
    const nextBooks = marketplaceBooks.map((b) => {
      if (b.id === bookId) {
        const nextReviews = (b.ratings || []).filter((r) => r.id !== reviewId);
        const avg =
          nextReviews.length > 0
            ? (
                nextReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) /
                nextReviews.length
              ).toFixed(1)
            : 5.0;
        return { ...b, ratings: nextReviews, rating: Number(avg) };
      }
      return b;
    });
    commitDb({ ...db, marketplaceBooks: nextBooks });
    triggerCelebration("🗑️ રિવ્યૂ ડિલીટ થયો", "રેટિંગ સફળતાપૂર્વક હટાવી દીધું.");
  };

  // Seller Application Approvals (Requirement 2)
  const handleApproveSeller = (appId) => {
    const target = sellerApplications.find((a) => a.id === appId);
    if (!target) return;

    const nextApps = sellerApplications.map((a) =>
      a.id === appId
        ? { ...a, status: "Approved", approvedAt: nowFormattedTimestamp() }
        : a
    );

    // Send direct notification message to the student
    const nextUsers = { ...db.users };
    const applicant = nextUsers[target.applicantMobile];
    if (applicant) {
      if (!Array.isArray(applicant.directMessages)) applicant.directMessages = [];
      applicant.directMessages.unshift({
        id: `dm_${Date.now()}`,
        date: nowFormattedTimestamp(),
        text: `🎉 [સેલર એકાઉન્ટ મંજૂર]\nતમારી સેલર વેરિફિકેશન અરજી મંજૂર કરવામાં આવી છે!\nહવે તમે Target Book Bazaar માં તમારી નોટ્સ અને બુક્સ લિસ્ટ કરીને સીધી તમારા વૉલેટમાં કમાણી કરી શકો છો.`,
        seen: false,
      });
    }

    commitDb({ ...db, sellerApplications: nextApps, users: nextUsers });
    triggerCelebration("✅ સેલર મંજૂર થયો!", `${target.applicantName} (${target.applicantMobile})`);
  };

  const handleRejectSeller = (appId) => {
    const reason = prompt("રિજેક્ટ કરવાનું કારણ લખો:", "અધૂરી વિગતો અથવા અયોગ્ય સેમ્પલ.");
    if (!reason) return;

    const nextApps = sellerApplications.map((a) =>
      a.id === appId
        ? { ...a, status: "Rejected", rejectedAt: nowFormattedTimestamp(), rejectReason: reason }
        : a
    );
    commitDb({ ...db, sellerApplications: nextApps });
    triggerCelebration("❌ સેલર અરજી અસ્વીકાર", "સ્ટેટસ અપડેટ થઈ ગયું.");
  };

  // 2-Step Verified Order Deletion on Admin side (Requirement 6)
  const handleAdminConfirmDeleteOrder = () => {
    if (!adminOrderToDelete) return;
    if (adminDeleteVerifyText.trim().toUpperCase() !== "DELETE") {
      return alert("પુષ્ટિ કરવા માટે ખાનામાં બરાબર 'DELETE' લખો.");
    }
    const nextOrders = marketplaceOrders.filter((o) => o.id !== adminOrderToDelete.id);
    commitDb({ ...db, marketplaceOrders: nextOrders });
    setAdminOrderToDelete(null);
    setAdminDeleteStep(1);
    setAdminDeleteVerifyText("");
    triggerCelebration("🗑️ ઓર્ડર ડિલીટ થયો", "ઓર્ડર રેકોર્ડ કાયમ માટે હટાવી દીધો.");
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 subtle-pill p-1">
        {[
          { id: "dashboard", label: "📊 Overview" },
          { id: "users", label: "👥 Users" },
          { id: "marketplace", label: "📚 Book Bazaar" },
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

      {/* ================= PAGE 5: BOOK BAZAAR MANAGEMENT ================= */}
      {activePage === "marketplace" && (
        <div className="space-y-4 anim-fade">
          {/* Marketplace Stats */}
          {(() => {
            const pendingBooks = marketplaceBooks.filter((b) => b.status === "Pending");
            const pendingOrders = marketplaceOrders.filter((o) => o.status === "Pending Verification");
            const verifiedOrders = marketplaceOrders.filter((o) => o.status === "Verified");
            const pendingPayouts = marketplacePayouts.filter((p) => p.status === "Pending");
            const pendingVips = marketplaceSubscriptions.filter((s) => s.status === "Pending Verification");
            const totalCommissionEarned = verifiedOrders.reduce((acc, o) => acc + (Number(o.adminFee) || 0), 0);
            const totalVolume = verifiedOrders.reduce((acc, o) => acc + (Number(o.bookPrice) || 0), 0);

            // Collect all reviews across all books for moderation
            const allReviews = [];
            marketplaceBooks.forEach((b) => {
              (b.ratings || []).forEach((r) => {
                allReviews.push({ ...r, bookId: b.id, bookTitle: b.title });
              });
            });

            return (
              <div className="space-y-4">
                {/* 4 Overview Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="one-card p-3.5 space-y-1">
                    <div className="text-[10px] font-bold muted-text">કુલ પુસ્તકો</div>
                    <div className="text-xl font-extrabold">{marketplaceBooks.length}</div>
                    <div className="text-[9px] text-amber-500 font-extrabold">{pendingBooks.length} મંજૂરી બાકી</div>
                  </div>
                  <div className="one-card p-3.5 space-y-1">
                    <div className="text-[10px] font-bold muted-text">કુલ ઓર્ડર્સ</div>
                    <div className="text-xl font-extrabold text-indigo-500">{marketplaceOrders.length}</div>
                    <div className="text-[9px] text-indigo-500 font-extrabold">{pendingOrders.length} વેરિફાય બાકી</div>
                  </div>
                  <div className="one-card p-3.5 space-y-1">
                    <div className="text-[10px] font-bold muted-text">માર્કેટપ્લેસ ટર્નઓવર</div>
                    <div className="text-xl font-extrabold text-slate-800 dark:text-slate-200">₹{totalVolume}</div>
                    <div className="text-[9px] text-emerald-500 font-extrabold">કુલ સેલ વોલ્યુમ</div>
                  </div>
                  <div className="one-card p-3.5 space-y-1 border-l-4 border-l-emerald-500">
                    <div className="text-[10px] font-bold text-emerald-500">એડમિન કમિશન (10%)</div>
                    <div className="text-xl font-extrabold text-emerald-500">₹{totalCommissionEarned}</div>
                    <div className="text-[9px] text-emerald-500 font-extrabold">ચોખ્ખો નફો</div>
                  </div>
                </div>

                {/* Sub-Nav Bar inside Book Bazaar (Requirement 5) */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 subtle-pill p-1">
                  {[
                    { id: "orders", label: `🛒 ઓર્ડર્સ (${pendingOrders.length})` },
                    { id: "payouts", label: `💰 પેઆઉટ્સ (${pendingPayouts.length})` },
                    { id: "sellers", label: `🤝 સેલર્સ (${sellerApplications.filter((a) => a.status === "Pending").length})` },
                    { id: "books", label: `📚 બુક્સ (${pendingBooks.length})` },
                    { id: "vip", label: `👑 VIP પ્લાન (${pendingVips.length})` },
                    { id: "reviews", label: `⭐ રેટિંગ્સ (${allReviews.length})` },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setAdminBazaarTab(sub.id)}
                      className={`py-2 rounded-xl text-[10px] sm:text-xs font-black transition ${
                        adminBazaarTab === sub.id
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "muted-text hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* ================= SUB-TAB 1: ORDERS & DOWNLOAD AUDIT ================= */}
                {adminBazaarTab === "orders" && (
                  <div className="one-card p-4 space-y-3 border-l-4 border-l-indigo-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold">💳 ખરીદી પેમેન્ટ ચકાસણી & ઓર્ડર્સ</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">
                          {pendingOrders.length} બાકી
                        </span>
                      </div>
                    </div>

                    {marketplaceOrders.length === 0 ? (
                      <div className="text-xs muted-text text-center py-4">હજુ કોઈ ઓર્ડર આવ્યા નથી.</div>
                    ) : (
                      <div className="space-y-3">
                        {marketplaceOrders.map((ord) => {
                          const isVerified = ord.status === "Verified";
                          const dCount = Number(ord.downloadCount || 0);

                          return (
                            <div
                              key={ord.id}
                              className={`subtle-pill p-3.5 space-y-2 text-xs border-l-4 ${
                                isVerified ? "border-l-emerald-500" : "border-l-amber-500"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div>
                                  <span className="font-extrabold text-sm">{ord.bookTitle}</span>
                                  <div className="text-[10px] muted-text font-bold mt-0.5">
                                    Invoice: {ord.invoiceNo} • {ord.createdAt}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                      isVerified ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                                    }`}
                                  >
                                    {isVerified ? "✓ Verified & Active" : "⏳ Review Pending"}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5">
                                    ડાઉનલોડ: {dCount}/2
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t" style={{ borderColor: "var(--border-col)" }}>
                                <div>
                                  <span className="muted-text">ખરીદનાર વિદ્યાર્થી: </span>
                                  <b className="text-slate-800 dark:text-slate-200">{ord.buyerName}</b> ({ord.buyerMobile})
                                  <div className="mt-0.5 font-mono text-indigo-500 font-extrabold">UTR: {ord.buyerUtr}</div>
                                </div>
                                <div>
                                  <span className="muted-text">રકમ બ્રેકડાઉન: </span>
                                  <b>₹{ord.bookPrice}</b>
                                  <span className="text-emerald-500 font-extrabold block">
                                    એડમિન કમિશન: ₹{ord.adminFee} | સેલર વૉલેટ જમા: ₹{ord.sellerPayout}
                                  </span>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center justify-between pt-2 border-t text-[11px]" style={{ borderColor: "var(--border-col)" }}>
                                <div className="text-[10px] muted-text">
                                  Seller: <b>{ord.sellerMobile}</b> (UPI: {ord.sellerUpi})
                                </div>

                                <div className="flex items-center gap-2">
                                  {isVerified && (
                                    <button
                                      onClick={() => handleResetDownloadCount(ord.id)}
                                      className="subtle-pill px-2.5 py-1 text-[10px] font-bold text-amber-500 hover:border-amber-500"
                                      title="ડાઉનલોડ ગણતરી ફરીથી 0/2 કરો"
                                    >
                                      🔄 રીસેટ ડાઉનલોડ (0/2)
                                    </button>
                                  )}

                                  {!isVerified ? (
                                    <button
                                      onClick={() => handleVerifyOrder(ord.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition"
                                    >
                                      ✓ Verify & Unlock PDF
                                    </button>
                                  ) : (
                                    <span className="text-[11px] font-bold text-emerald-500">
                                      ✓ વેરિફાય થયેલ
                                    </span>
                                  )}

                                  <button
                                    onClick={() => {
                                      setAdminOrderToDelete(ord);
                                      setAdminDeleteStep(1);
                                      setAdminDeleteVerifyText("");
                                    }}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-500/10 transition"
                                    title="ઓર્ડર રેકોર્ડ ડિલીટ કરો"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ================= SUB-TAB 2: SELLER WALLET PAYOUTS & REVERSAL (Req 1 & 3) ================= */}
                {adminBazaarTab === "payouts" && (
                  <div className="one-card p-4 space-y-3 border-l-4 border-l-emerald-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold">💰 સેલર વૉલેટ પેઆઉટ ઉપાડ વિનંતીઓ</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                          {marketplacePayouts.length} વિનંતીઓ
                        </span>
                      </div>
                    </div>

                    {marketplacePayouts.length === 0 ? (
                      <div className="text-xs muted-text text-center py-4">હજુ સુધી કોઈ સેલરે પેઆઉટ વિનંતી કરી નથી.</div>
                    ) : (
                      <div className="space-y-3">
                        {marketplacePayouts.map((p) => {
                          const isPaid = p.status === "Paid";
                          const isReversed = p.status === "Reversed";

                          return (
                            <div
                              key={p.id}
                              className={`subtle-pill p-3.5 space-y-2 text-xs border-l-4 ${
                                isPaid
                                  ? "border-l-emerald-500"
                                  : isReversed
                                  ? "border-l-rose-500"
                                  : "border-l-amber-500"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div>
                                  <span className="font-extrabold text-sm">{p.sellerName} ({p.sellerMobile})</span>
                                  <div className="text-[10px] muted-text font-bold mt-0.5">
                                    વિનંતી તારીખ: {p.requestedAt} • UPI ID: <b className="font-mono text-indigo-500 select-all">{p.upiId}</b>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-black text-emerald-500">₹{p.amount}</span>
                                  <span
                                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                      isPaid
                                        ? "bg-emerald-500/15 text-emerald-500"
                                        : isReversed
                                        ? "bg-rose-500/15 text-rose-500"
                                        : "bg-amber-500/15 text-amber-500"
                                    }`}
                                  >
                                    {isPaid ? "✓ Paid" : isReversed ? "↩️ Reversed" : "⏳ Pending"}
                                  </span>
                                </div>
                              </div>

                              {isPaid && p.adminUtr && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                  ચૂકવણી UTR: {p.adminUtr} • તારીખ: {p.paidAt}
                                </div>
                              )}

                              {isReversed && (
                                <div className="text-[10px] text-rose-500 font-bold">
                                  રિવર્સલ નોંધ: {p.note || "પેમેન્ટ રિવર્સ કરી સેલરના વૉલેટમાં પુનઃ જમા કરેલ છે."} ({p.reversedAt})
                                </div>
                              )}

                              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--border-col)" }}>
                                {!isPaid && !isReversed && (
                                  <button
                                    onClick={() => handleMarkPayoutPaid(p.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded-xl text-xs shadow-xs"
                                  >
                                    💸 ચૂકવણી પૂર્ણ કરો (Mark Paid)
                                  </button>
                                )}

                                {isPaid && (
                                  <button
                                    onClick={() => handleReversePayout(p.id)}
                                    className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 font-black px-3.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1"
                                    title="જો ભૂલથી પેમેન્ટ માર્ક થઈ ગયું હોય તો રિવર્સ કરો"
                                  >
                                    <span>↩️</span>
                                    <span>રિવર્સ પેમેન્ટ (Reverse to Wallet)</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ================= SUB-TAB: SELLER ONBOARDING APPLICATIONS (Requirement 2) ================= */}
                {adminBazaarTab === "sellers" && (
                  <div className="one-card p-4 space-y-3 border-l-4 border-l-violet-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold">🤝 સેલર વેરિફિકેશન અરજીઓ (24-36 કલાક Review)</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-500">
                          {sellerApplications.filter((a) => a.status === "Pending").length} મંજૂરી બાકી
                        </span>
                      </div>
                    </div>

                    {sellerApplications.length === 0 ? (
                      <div className="text-xs muted-text text-center py-4">હજુ સુધી કોઈ સેલર અરજી આવી નથી.</div>
                    ) : (
                      <div className="space-y-3">
                        {sellerApplications.map((app) => {
                          const isApproved = app.status === "Approved";
                          const isRejected = app.status === "Rejected";

                          return (
                            <div
                              key={app.id}
                              className={`subtle-pill p-3.5 space-y-2 text-xs border-l-4 ${
                                isApproved
                                  ? "border-l-emerald-500"
                                  : isRejected
                                  ? "border-l-rose-500"
                                  : "border-l-amber-500"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div>
                                  <span className="font-extrabold text-sm">{app.applicantName}</span>
                                  <span className="text-[11px] muted-text font-mono ml-2">📞 {app.applicantMobile}</span>
                                  <div className="text-[10px] muted-text mt-0.5">
                                    શહેર/જિલ્લો: <b>{app.city || "—"}</b> • પરીક્ષા અનુભવ: <b>{app.examExperience || "—"}</b>
                                  </div>
                                </div>
                                <span
                                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                    isApproved
                                      ? "bg-emerald-500/15 text-emerald-500"
                                      : isRejected
                                      ? "bg-rose-500/15 text-rose-500"
                                      : "bg-amber-500/15 text-amber-500"
                                  }`}
                                >
                                  {isApproved
                                    ? "✓ મંજૂર થયેલ (Approved)"
                                    : isRejected
                                    ? "✗ અસ્વીકાર (Rejected)"
                                    : "⏳ 24-36 કલાક ચકાસણી બાકી"}
                                </span>
                              </div>

                              <div
                                className="text-[11px] pt-1.5 border-t grid grid-cols-1 sm:grid-cols-2 gap-2"
                                style={{ borderColor: "var(--border-col)" }}
                              >
                                <div>
                                  <span className="muted-text">UPI ID (પેઆઉટ માટે): </span>
                                  <b className="font-mono text-indigo-500 font-extrabold">{app.upiId}</b>
                                </div>
                                <div>
                                  <span className="muted-text">અરજી તારીખ: </span>
                                  <b>{app.appliedAt}</b>
                                </div>
                              </div>

                              {app.bio && (
                                <div className="text-[11px] muted-text italic bg-black/5 dark:bg-white/5 p-2 rounded-lg leading-relaxed">
                                  "{app.bio}"
                                </div>
                              )}

                              {isRejected && app.rejectReason && (
                                <div className="text-[11px] text-rose-500 font-semibold bg-rose-500/10 p-2 rounded-lg">
                                  અસ્વીકાર કારણ: {app.rejectReason}
                                </div>
                              )}

                              {!isApproved && !isRejected && (
                                <div
                                  className="flex items-center justify-end gap-2 pt-2 border-t"
                                  style={{ borderColor: "var(--border-col)" }}
                                >
                                  <button
                                    onClick={() => handleRejectSeller(app.id)}
                                    className="px-3 py-1.5 rounded-xl border border-rose-500 text-rose-500 hover:bg-rose-500/10 font-bold text-xs transition"
                                  >
                                    ❌ અસ્વીકાર કરો
                                  </button>
                                  <button
                                    onClick={() => handleApproveSeller(app.id)}
                                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition"
                                  >
                                    ✅ સેલર મંજૂર કરો (Seller Live)
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ================= SUB-TAB 3: BOOK APPROVALS & LIVE BOOKS ================= */}
                {adminBazaarTab === "books" && (
                  <div className="space-y-4">
                    {/* Pending Approvals */}
                    <div className="one-card p-4 space-y-3 border-l-4 border-l-amber-500">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold">📋 નવી પુસ્તક લિસ્ટિંગ મંજૂરી (Approvals)</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                          {pendingBooks.length} બાકી
                        </span>
                      </div>

                      {pendingBooks.length === 0 ? (
                        <div className="text-xs muted-text text-center py-4">કોઈ નવી બુક રિવ્યૂ માટે બાકી નથી.</div>
                      ) : (
                        <div className="space-y-3">
                          {pendingBooks.map((b) => (
                            <div key={b.id} className="subtle-pill p-4 space-y-2.5 text-xs border-2 border-amber-500/40">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div>
                                  <h4 className="font-black text-sm">{b.title}</h4>
                                  <div className="text-[10px] muted-text font-bold">
                                    {b.exam} • {b.subject} • {b.totalPages} પેજ {b.isBundle && "• 📦 કોમ્બો બંડલ"}
                                  </div>
                                </div>
                                <span className="text-base font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-xl self-start sm:self-auto">
                                  ₹{b.price} <span className="text-[10px] font-normal text-muted-text">(કમિશન: ₹{b.adminFee})</span>
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-1 text-[11px]">
                                <div className="font-extrabold text-slate-700 dark:text-slate-300">ડેમો સેમ્પલ પેજ વિગત:</div>
                                <div className="whitespace-pre-wrap muted-text leading-relaxed">{b.sampleDemoText || "કોઈ વિગત નથી"}</div>
                                {b.demoImages && b.demoImages.length > 0 && (
                                  <div className="flex gap-2 overflow-x-auto py-1">
                                    {b.demoImages.map((img, i) => (
                                      <img key={i} src={img} alt="Demo" className="w-12 h-12 object-cover rounded-lg border" />
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: "var(--border-col)" }}>
                                <div className="text-[10px] muted-text">
                                  Seller: <b>{b.sellerName}</b> ({b.sellerMobile}) • UPI: <b className="font-mono text-indigo-500">{b.sellerUpi}</b>
                                  {b.fileData ? (
                                    <span className="text-emerald-500 font-bold ml-2">✓ Direct PDF Uploaded</span>
                                  ) : b.fullDownloadUrl ? (
                                    <a href={b.fullDownloadUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-500 underline font-bold ml-2">
                                      📥 Cloud Link
                                    </a>
                                  ) : null}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleApproveBook(b.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition"
                                  >
                                    ✅ Approve & Go Live
                                  </button>
                                  <button
                                    onClick={() => handleRejectBook(b.id)}
                                    className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 font-bold px-3 py-1.5 rounded-xl text-xs transition"
                                  >
                                    ❌ Reject
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBook(b.id)}
                                    className="text-slate-400 hover:text-rose-500 p-1.5 text-xs transition"
                                    title="Delete"
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* All Live Books */}
                    <div className="one-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold">
                          🟢 લાઈવ પુસ્તકો & નોટ્સ ({marketplaceBooks.filter((b) => b.status === "Approved").length})
                        </span>
                      </div>

                      <div className="space-y-2">
                        {marketplaceBooks
                          .filter((b) => b.status === "Approved")
                          .map((b) => (
                            <div key={b.id} className="subtle-pill p-3 flex items-center justify-between gap-2 text-xs">
                              <div>
                                <span className="font-extrabold">{b.title}</span>
                                <div className="text-[10px] muted-text font-bold">
                                  ₹{b.price} • {b.exam} • વેચાણ: {b.salesCount || 0} વખત {b.isBundle && "• 📦 કોમ્બો"}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDeleteBook(b.id)}
                                  className="text-rose-500 hover:text-rose-700 p-1 text-xs"
                                  title="Delete Listing"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= SUB-TAB 4: VIP SELLER 0% COMMISSION SUBSCRIPTIONS (Req 8) ================= */}
                {adminBazaarTab === "vip" && (
                  <div className="one-card p-4 space-y-3 border-l-4 border-l-amber-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold">👑 VIP સેલર પ્લાન વિનંતીઓ (₹500 / ૩ મહિના 0% કમિશન)</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                          {marketplaceSubscriptions.length} વિનંતીઓ
                        </span>
                      </div>
                    </div>

                    {marketplaceSubscriptions.length === 0 ? (
                      <div className="text-xs muted-text text-center py-4">હજુ સુધી કોઈ VIP સબ્સ્ક્રિપ્શન વિનંતી આવી નથી.</div>
                    ) : (
                      <div className="space-y-3">
                        {marketplaceSubscriptions.map((sub) => {
                          const isActive = sub.status === "active";

                          return (
                            <div
                              key={sub.id}
                              className={`subtle-pill p-3.5 space-y-2 text-xs border-l-4 ${
                                isActive ? "border-l-emerald-500" : "border-l-amber-500"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div>
                                  <span className="font-extrabold text-sm">{sub.sellerName} ({sub.sellerMobile})</span>
                                  <div className="text-[10px] muted-text font-bold mt-0.5">
                                    પ્લાન: {sub.planName} (₹{sub.price}) • UTR: <b className="font-mono text-indigo-500">{sub.utr}</b>
                                  </div>
                                </div>
                                <span
                                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                    isActive ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                                  }`}
                                >
                                  {isActive ? "👑 Active (0% Cut)" : "⏳ Verification Pending"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t text-[11px]" style={{ borderColor: "var(--border-col)" }}>
                                <div className="text-[10px] muted-text">
                                  વિનંતી તારીખ: {sub.requestedAt} {isActive && `• માન્યતા: ${sub.expiresAt} સુધી`}
                                </div>

                                {!isActive && (
                                  <button
                                    onClick={() => handleActivateVipSubscription(sub.id)}
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-black px-4 py-1.5 rounded-xl text-xs shadow-xs"
                                  >
                                    👑 VIP સક્રિય કરો (૩ મહિના)
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ================= SUB-TAB 5: REVIEWS & RATINGS MODERATION (Req 6) ================= */}
                {adminBazaarTab === "reviews" && (
                  <div className="one-card p-4 space-y-3 border-l-4 border-l-amber-400">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold">⭐ વિદ્યાર્થી રેટિંગ્સ અને રિવ્યૂઝ મોડરેશન</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                          {allReviews.length} રિવ્યૂઝ
                        </span>
                      </div>
                    </div>

                    {allReviews.length === 0 ? (
                      <div className="text-xs muted-text text-center py-4">હજુ કોઈ રેટિંગ કે રિવ્યૂ આવ્યા નથી.</div>
                    ) : (
                      <div className="space-y-2.5">
                        {allReviews.map((rev) => (
                          <div
                            key={rev.id}
                            className={`subtle-pill p-3 space-y-1.5 text-xs border-l-4 ${
                              rev.hidden ? "border-l-slate-400 opacity-60" : "border-l-amber-500"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-extrabold text-sm">{rev.studentName}</span>
                                <span className="text-[10px] muted-text ml-1.5">({rev.studentMobile})</span>
                                <div className="text-[10px] text-indigo-500 font-bold">
                                  બુક: {rev.bookTitle}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-amber-500 font-black text-sm">
                                  {"★".repeat(rev.rating)}
                                </span>
                                {rev.hidden && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    Hidden
                                  </span>
                                )}
                              </div>
                            </div>

                            {rev.comment && (
                              <div className="font-semibold text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                "{rev.comment}"
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t text-[10px] muted-text" style={{ borderColor: "var(--border-col)" }}>
                              <span>તારીખ: {rev.date}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleHideReview(rev.bookId, rev.id)}
                                  className="text-indigo-500 hover:underline font-bold"
                                >
                                  {rev.hidden ? "👁️‍🗨️ શો કરો (Unhide)" : "👁️ હાઇડ કરો (Hide)"}
                                </button>
                                <button
                                  onClick={() => handleDeleteReview(rev.bookId, rev.id)}
                                  className="text-rose-500 hover:text-rose-700 font-bold"
                                >
                                  🗑️ ડિલીટ
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= PAGE: FINANCIAL AUDIT & HISAB-KITAB (Requirement 10) ================= */}
      {activePage === "financials" && (
        <div className="space-y-4 anim-fade">
          {(() => {
            const verifiedOrders = marketplaceOrders.filter((o) => o.status === "Verified");
            const completedPayouts = marketplacePayouts.filter((p) => p.status === "Completed");

            // Filter logic by date range
            const filteredOrders = verifiedOrders.filter((ord) => {
              if (finDateRange === "all") return true;
              const now = new Date();
              let ordTime = 0;
              if (ord.timestamp) ordTime = ord.timestamp;
              else if (ord.createdAt) {
                const parsed = Date.parse(ord.createdAt);
                if (!isNaN(parsed)) ordTime = parsed;
              }
              if (!ordTime) return true;
              const ordDate = new Date(ordTime);

              if (finDateRange === "today") {
                return ordDate.toDateString() === now.toDateString();
              }
              if (finDateRange === "yesterday") {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                return ordDate.toDateString() === y.toDateString();
              }
              if (finDateRange === "week") {
                const diffDays = (now - ordDate) / (1000 * 60 * 60 * 24);
                return diffDays <= 7 && diffDays >= 0;
              }
              if (finDateRange === "month") {
                const diffDays = (now - ordDate) / (1000 * 60 * 60 * 24);
                return diffDays <= 30 && diffDays >= 0;
              }
              if (finDateRange === "custom") {
                if (!finFromDate && !finToDate) return true;
                const fromTime = finFromDate ? new Date(finFromDate).setHours(0, 0, 0, 0) : 0;
                const toTime = finToDate ? new Date(finToDate).setHours(23, 59, 59, 999) : Infinity;
                return ordTime >= fromTime && ordTime <= toTime;
              }
              return true;
            });

            const totalTurnover = filteredOrders.reduce((sum, o) => sum + (Number(o.bookPrice) || 0), 0);
            const totalAdminProfit = filteredOrders.reduce((sum, o) => sum + (Number(o.adminFee) || 0), 0);
            const totalSellerShare = filteredOrders.reduce((sum, o) => sum + (Number(o.sellerPayout) || 0), 0);
            const totalDisbursed = completedPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            // Total unsettled seller liability = all sellers' current wallet balances
            const allSellerMobiles = Array.from(new Set(marketplaceOrders.map((o) => o.sellerMobile)));
            const pendingLiability = allSellerMobiles.reduce((acc, m) => {
              const u = db.users[m];
              const bal = Number(u?.sellerWallet?.balance || 0);
              return acc + (bal > 0 ? bal : 0);
            }, 0);

            // Group orders day-by-day for detailed audit table
            const dayGroups = {};
            filteredOrders.forEach((o) => {
              const dayKey = o.createdAt ? o.createdAt.split(",")[0] : "અન્ય તારીખ";
              if (!dayGroups[dayKey]) {
                dayGroups[dayKey] = {
                  date: dayKey,
                  ordersCount: 0,
                  grossVolume: 0,
                  adminCut: 0,
                  sellerCut: 0,
                  orders: [],
                };
              }
              dayGroups[dayKey].ordersCount += 1;
              dayGroups[dayKey].grossVolume += Number(o.bookPrice) || 0;
              dayGroups[dayKey].adminCut += Number(o.adminFee) || 0;
              dayGroups[dayKey].sellerCut += Number(o.sellerPayout) || 0;
              dayGroups[dayKey].orders.push(o);
            });
            const dayList = Object.values(dayGroups);

            return (
              <div className="space-y-4">
                {/* Header & Date Range Filter Pills */}
                <div className="one-card p-4 space-y-3 border-l-4 border-l-emerald-600">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-extrabold flex items-center gap-1.5">
                        <span>💰 હિસાબ-કિતાબ & નાણાકીય ઓડિટ રિપોર્ટ</span>
                      </h2>
                      <p className="text-[11px] muted-text mt-0.5">
                        દૈનિક વેચાણ, એડમિન 10% ચોખ્ખો નફો અને સેલર ચૂકવણીનું ચોક્કસ વિશ્લેષણ.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { id: "today", label: "📅 આજનો હિસાબ" },
                        { id: "yesterday", label: "⏪ ગઈકાલ" },
                        { id: "week", label: "📊 છેલ્લા ૭ દિવસ" },
                        { id: "month", label: "🗓️ આ મહિનો" },
                        { id: "all", label: "♾️ ઓલ-ટાઇમ" },
                        { id: "custom", label: "🎯 કસ્ટમ તારીખ" },
                      ].map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setFinDateRange(chip.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                            finDateRange === chip.id
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "subtle-pill text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Date Range Selectors */}
                  {finDateRange === "custom" && (
                    <div className="pt-2 border-t flex flex-wrap items-center gap-3 text-xs" style={{ borderColor: "var(--border-col)" }}>
                      <div className="flex items-center gap-1.5">
                        <span className="muted-text font-bold">શરૂઆત તારીખ:</span>
                        <input
                          type="date"
                          value={finFromDate}
                          onChange={(e) => setFinFromDate(e.target.value)}
                          className="theme-input px-2.5 py-1 text-xs font-semibold rounded-lg"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="muted-text font-bold">અંતિમ તારીખ:</span>
                        <input
                          type="date"
                          value={finToDate}
                          onChange={(e) => setFinToDate(e.target.value)}
                          className="theme-input px-2.5 py-1 text-xs font-semibold rounded-lg"
                        />
                      </div>
                      {(finFromDate || finToDate) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFinFromDate("");
                            setFinToDate("");
                          }}
                          className="text-[11px] font-bold text-rose-500 underline ml-auto"
                        >
                          રીસેટ ફિલ્ટર
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 5 KPI Cards for Financial Audit */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="one-card p-3.5 space-y-1">
                    <div className="text-[10px] font-bold muted-text">કુલ ટર્નઓવર (Gross)</div>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                      ₹{totalTurnover}
                    </div>
                    <div className="text-[9px] text-indigo-500 font-extrabold">{filteredOrders.length} ઓર્ડર્સ</div>
                  </div>

                  <div className="one-card p-3.5 space-y-1 border-l-4 border-l-emerald-500">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">એડમિન ચોખ્ખો નફો (10%)</div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹{totalAdminProfit}
                    </div>
                    <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">પ્લેટફોર્મ કમાણી</div>
                  </div>

                  <div className="one-card p-3.5 space-y-1">
                    <div className="text-[10px] font-bold muted-text">સેલર્સ હિસ્સો (90%)</div>
                    <div className="text-xl font-black text-violet-500">
                      ₹{totalSellerShare}
                    </div>
                    <div className="text-[9px] muted-text font-bold">વિદ્યાર્થી કમાણી</div>
                  </div>

                  <div className="one-card p-3.5 space-y-1">
                    <div className="text-[10px] font-bold muted-text">કુલ ચૂકવાયેલ રકમ</div>
                    <div className="text-xl font-black text-blue-500">
                      ₹{totalDisbursed}
                    </div>
                    <div className="text-[9px] text-blue-500 font-extrabold">પેઆઉટ્સ પૂર્ણ</div>
                  </div>

                  <div className="one-card p-3.5 space-y-1 col-span-2 sm:col-span-1 border-l-4 border-l-amber-500">
                    <div className="text-[10px] font-bold text-amber-500">બાકી વૉલેટ જવાબદારી</div>
                    <div className="text-xl font-black text-amber-500">
                      ₹{pendingLiability}
                    </div>
                    <div className="text-[9px] text-amber-500 font-extrabold">સેલર લેણું બાકી</div>
                  </div>
                </div>

                {/* Day-by-Day Itemized Analysis Table (Requirement 10) */}
                <div className="one-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold flex items-center gap-1.5">
                      <span>📅 તારીખ મુજબ દૈનિક હિસાબ (Day-by-Day Breakdown)</span>
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                      {dayList.length} દિવસો રેકોર્ડ
                    </span>
                  </div>

                  {dayList.length === 0 ? (
                    <div className="text-xs muted-text text-center py-6">
                      પસંદ કરેલ સમયગાળામાં કોઈ વેરિફાઈડ ઓર્ડર્સ મળ્યા નથી.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b text-[10px] uppercase font-black muted-text" style={{ borderColor: "var(--border-col)" }}>
                            <th className="py-2.5 px-3">તારીખ</th>
                            <th className="py-2.5 px-3 text-center">ઓર્ડર્સ સંખ્યા</th>
                            <th className="py-2.5 px-3 text-right">ગ્રોસ વેચાણ (₹)</th>
                            <th className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">એડમિન કમિશન (10%)</th>
                            <th className="py-2.5 px-3 text-right text-violet-500">સેલર જમા (90%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "var(--border-col)" }}>
                          {dayList.map((d, idx) => (
                            <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                              <td className="py-2.5 px-3 font-extrabold">{d.date}</td>
                              <td className="py-2.5 px-3 text-center font-bold">
                                <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 font-mono">
                                  {d.ordersCount}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-black">₹{d.grossVolume}</td>
                              <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                                +₹{d.adminCut}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-violet-500">
                                ₹{d.sellerCut}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 font-black text-xs bg-black/5 dark:bg-white/5" style={{ borderColor: "var(--border-col)" }}>
                            <td className="py-3 px-3 uppercase">કુલ સરવાળો (Total)</td>
                            <td className="py-3 px-3 text-center">{filteredOrders.length} ઓર્ડર્સ</td>
                            <td className="py-3 px-3 text-right">₹{totalTurnover}</td>
                            <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">₹{totalAdminProfit}</td>
                            <td className="py-3 px-3 text-right text-violet-500">₹{totalSellerShare}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Detailed Itemized Transactions Ledger */}
                <div className="one-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold flex items-center gap-1.5">
                      <span>📜 ઓર્ડરવાર વિસ્તૃત લેજર (Itemized Transactions)</span>
                    </span>
                    <span className="text-[10px] font-bold muted-text">{filteredOrders.length} વ્યવહારો</span>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div className="text-xs muted-text text-center py-4">કોઈ લેવડ-દેવડ નથી.</div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {filteredOrders.map((o) => (
                        <div
                          key={o.id}
                          className="subtle-pill p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold">{o.bookTitle}</span>
                              <span className="text-[10px] font-mono muted-text">#{o.invoiceNo}</span>
                            </div>
                            <div className="text-[10px] muted-text">
                              ખરીદનાર: <b>{o.buyerName}</b> ({o.buyerMobile}) • સેલર: <b>{o.sellerMobile}</b> • તારીખ: {o.createdAt}
                            </div>
                            <div className="text-[10px] font-mono text-indigo-500">UTR: {o.buyerUtr}</div>
                          </div>

                          <div className="text-right sm:shrink-0">
                            <div className="font-black text-sm">₹{o.bookPrice}</div>
                            <div className="text-[10px] text-emerald-500 font-extrabold">
                              કમિશન: ₹{o.adminFee} | સેલર: ₹{o.sellerPayout}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= PAGE 4: BUG REPORTS & 1-TO-1 REPLY (Requirement 11 Partition) ================= */}
      {activePage === "feedback" && (
        <div className="space-y-3.5 anim-fade">
          {(() => {
            const pendingList = feedbacks.filter(
              (f) => (f.status || (f.adminReply ? "Resolved" : "Pending")) === "Pending"
            );
            const workingList = feedbacks.filter((f) => f.status === "In Progress");
            const resolvedList = feedbacks.filter(
              (f) => (f.status || (f.adminReply ? "Resolved" : "Pending")) === "Resolved"
            );

            let displayList = pendingList;
            if (reportFilterTab === "working") displayList = workingList;
            if (reportFilterTab === "resolved") displayList = resolvedList;

            return (
              <div className="one-card p-4 space-y-3.5 border-l-4 border-l-indigo-600">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold">
                      🛠️ Student Bug Reports & Feature Requests (1-to-1 Direct Reply)
                    </h2>
                    <p className="text-[11px] muted-text mt-0.5">
                      વિદ્યાર્થીઓની ફરિયાદો અને સૂચનોને ૩ વિભાગમાં હેન્ડલ કરો.
                    </p>
                  </div>
                </div>

                {/* 3 Partition Tabs (Requirement 11) */}
                <div className="grid grid-cols-3 gap-1.5 subtle-pill p-1">
                  {[
                    { id: "pending", label: `⏳ પેન્ડિંગ (${pendingList.length})`, color: "text-amber-500" },
                    { id: "working", label: `⚙️ કામ ચાલુ છે (${workingList.length})`, color: "text-indigo-500" },
                    { id: "resolved", label: `✅ સોલ્વ થયેલ (${resolvedList.length})`, color: "text-emerald-500" },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setReportFilterTab(sub.id)}
                      className={`py-2 rounded-xl text-xs font-black transition ${
                        reportFilterTab === sub.id
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "muted-text hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {displayList.length === 0 ? (
                  <div className="text-xs muted-text py-8 text-center">
                    આ કેટેગરીમાં હાલ કોઈ રિપોર્ટ નથી.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayList.map((f) => {
                      const curStatus = f.status || (f.adminReply ? "Resolved" : "Pending");

                      return (
                        <div
                          key={f.id}
                          className={`subtle-pill p-3.5 space-y-2.5 text-xs border-l-4 ${
                            curStatus === "Resolved"
                              ? "border-l-emerald-500"
                              : curStatus === "In Progress"
                              ? "border-l-indigo-500"
                              : "border-l-amber-500"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 text-[10px]">
                                  {f.type}
                                </span>
                                <span
                                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                    curStatus === "Resolved"
                                      ? "bg-emerald-500/15 text-emerald-500"
                                      : curStatus === "In Progress"
                                      ? "bg-indigo-500/15 text-indigo-500"
                                      : "bg-amber-500/15 text-amber-500"
                                  }`}
                                >
                                  {curStatus === "Resolved"
                                    ? "✓ Resolved"
                                    : curStatus === "In Progress"
                                    ? "⚙️ In Progress"
                                    : "⏳ Pending"}
                                </span>
                                <span className="font-extrabold text-sm">👤 {f.studentName || "Student"}</span>
                                <a
                                  href={`tel:${f.mobile}`}
                                  className="font-mono font-extrabold text-emerald-500 underline"
                                >
                                  📞 {f.mobile}
                                </a>
                                <span className="text-[10px] muted-text">• {f.date}</span>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <p className="font-semibold text-xs break-words flex-1 leading-relaxed">
                                  {f.message}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleCopyReport(f.message)}
                                  title="Copy Text"
                                  className="one-card px-2.5 py-1 rounded-xl text-[10px] font-extrabold text-indigo-500 shrink-0 hover:border-indigo-500 transition"
                                >
                                  📋 Copy
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteFeedback(f.id)}
                              className="text-rose-500 font-bold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition"
                              title="રિપોર્ટ કાયમ માટે કાઢી નાખો"
                            >
                              🗑️
                            </button>
                          </div>

                          {/* Quick 1-Click Status Shift Buttons */}
                          <div className="flex items-center gap-1.5 pt-1 border-t text-[10px]" style={{ borderColor: "var(--border-col)" }}>
                            <span className="muted-text font-bold">સ્ટેટસ બદલો:</span>
                            {curStatus !== "Pending" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateFeedbackStatus(f.id, "Pending")}
                                className="px-2 py-0.5 rounded-lg border border-amber-500 text-amber-500 hover:bg-amber-500/10 font-bold transition"
                              >
                                ⏳ પેન્ડિંગ
                              </button>
                            )}
                            {curStatus !== "In Progress" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateFeedbackStatus(f.id, "In Progress")}
                                className="px-2 py-0.5 rounded-lg border border-indigo-500 text-indigo-500 hover:bg-indigo-500/10 font-bold transition"
                              >
                                ⚙️ કામ ચાલુ છે
                              </button>
                            )}
                            {curStatus !== "Resolved" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateFeedbackStatus(f.id, "Resolved")}
                                className="px-2 py-0.5 rounded-lg border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-bold transition"
                              >
                                ✅ સોલ્વ થયેલ
                              </button>
                            )}
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
                              type="button"
                              onClick={() => handleSendBugReply(f.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-[11px] shrink-0 transition"
                            >
                              📩 Send 1-to-1 Reply
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= 2-STEP VERIFIED ORDER DELETE MODAL (Requirement 6) ================= */}
      {adminOrderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm one-card p-5 space-y-4 border-2 border-rose-500 shadow-2xl anim-fade text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>

            {adminDeleteStep === 1 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-rose-500">ઓર્ડર ડિલીટ કરો (Step 1/2)</h3>
                <p className="text-xs muted-text leading-relaxed">
                  શું તમે ખરેખર ઓર્ડર <b>#{adminOrderToDelete.invoiceNo}</b> ("{adminOrderToDelete.bookTitle}") કાયમ માટે કાઢી નાખવા માંગો છો? આનાથી ઓર્ડર રેકોર્ડ હિસ્ટ્રીમાંથી દૂર થશે.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminOrderToDelete(null);
                      setAdminDeleteStep(1);
                      setAdminDeleteVerifyText("");
                    }}
                    className="subtle-pill py-2 text-xs font-bold"
                  >
                    રદ કરો (Cancel)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminDeleteStep(2)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2 rounded-xl text-xs"
                  >
                    આગળ વધો ➔
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-rose-500">અંતિમ પુષ્ટિ (Step 2/2)</h3>
                <p className="text-xs text-rose-500 font-bold leading-relaxed">
                  કન્ફર્મ કરવા નીચેના બોક્સમાં <span className="bg-rose-500/15 px-2 py-0.5 rounded font-mono">DELETE</span> ટાઈપ કરો:
                </p>
                <input
                  type="text"
                  value={adminDeleteVerifyText}
                  onChange={(e) => setAdminDeleteVerifyText(e.target.value)}
                  placeholder="DELETE લખો"
                  className="theme-input w-full px-3 py-2 text-center font-mono font-black text-rose-500 text-sm tracking-widest uppercase"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdminDeleteStep(1)}
                    className="subtle-pill py-2 text-xs font-bold"
                  >
                    ⬅️ પાછા જાઓ
                  </button>
                  <button
                    type="button"
                    onClick={handleAdminConfirmDeleteOrder}
                    disabled={adminDeleteVerifyText.trim().toUpperCase() !== "DELETE"}
                    className={`py-2 rounded-xl text-xs font-extrabold transition ${
                      adminDeleteVerifyText.trim().toUpperCase() === "DELETE"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-rose-600/30 text-white/50 cursor-not-allowed"
                    }`}
                  >
                    🗑️ કાયમ માટે કાઢી નાખો
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
