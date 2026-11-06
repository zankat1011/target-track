import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { DB_KEY, DB_MIRROR_KEY } from "../utils/constants";
import { useAuth } from "./AuthContext";
import {
  todayISO,
  addDaysISO,
  nowFormattedTimestamp,
  getDemoStudentObject,
  normalizeUserObject
} from "../utils/helpers";
import { fetchCloudDatabase, saveCloudDatabase } from "../services/firebase";

const StudyContext = createContext();

export const DEFAULT_MARKETPLACE_BOOKS = [
  {
    id: "book_cce_reasoning_top",
    title: "🎯 CCE Group A & B Master Reasoning Topper Handwritten Notes",
    authorAnon: "CCE 2024 Topper #14",
    sellerMobile: "9876543210",
    sellerName: "Topper Student",
    sellerUpi: "cce.topper@upi",
    exam: "CCE (Group A & B)",
    subject: "Reasoning & Mental Ability",
    type: "Handwritten Notes",
    price: 49,
    adminCommissionPct: 10,
    adminFee: 5,
    sellerPayout: 44,
    totalPages: 140,
    samplePagesCount: 6,
    sampleDemoText: "✓ Syllogism 10-Second Short Tricks\n✓ Blood Relations Family Tree Formula\n✓ Seating Arrangement Matrix Methods\n✓ Coding-Decoding Direct Shortcuts\n✓ 50+ Solved CCE Previous Questions with Handwritten Explanations",
    sampleDemoUrl: "https://drive.google.com",
    fullDownloadUrl: "https://drive.google.com",
    status: "Approved",
    createdAt: "01 Nov, 10:00 am",
    salesCount: 24,
    rating: 4.9,
  },
  {
    id: "book_guj_history_top",
    title: "🏛️ ગુજરાતનો સંપૂર્ણ ઈતિહાસ & વારસો — Short Handwritten Capsule",
    authorAnon: "GPSC Interviewee #31",
    sellerMobile: "9876543211",
    sellerName: "Topper Student 2",
    sellerUpi: "gpsc.topper@upi",
    exam: "GPSC Class 1-2",
    subject: "ગુજરાતનો ઈતિહાસ & સંસ્કૃતિ",
    type: "Handwritten Notes",
    price: 59,
    adminCommissionPct: 10,
    adminFee: 6,
    sellerPayout: 53,
    totalPages: 185,
    samplePagesCount: 8,
    sampleDemoText: "✓ મૈત્રક, સોલંકી અને વાઘેલા કાળ ટાઈમલાઈન ચાર્ટ્સ\n✓ ગુજરાતના મહત્વના શિલાલેખ અને સ્થાપત્ય યાદ રાખવાની ટ્રીક્સ\n✓ આદિવાસી મેળાઓ, લોકનૃત્યો અને હસ્તકળા ક્વિક ટેબલ\n✓ GPSC Class 1-2 માટે અતિ-મહત્વના ૨૫૦+ પોઈન્ટર્સ",
    sampleDemoUrl: "https://drive.google.com",
    fullDownloadUrl: "https://drive.google.com",
    status: "Approved",
    createdAt: "02 Nov, 03:30 pm",
    salesCount: 19,
    rating: 5.0,
  },
  {
    id: "book_const_polity_top",
    title: "⚖️ ભારતનું બંધારણ (Constitution) 2026 Latest Amendment Notes",
    authorAnon: "PSI Ranker #07",
    sellerMobile: "9876543212",
    sellerName: "Topper Student 3",
    sellerUpi: "psi.ranker@upi",
    exam: "Police PSI / Constable",
    subject: "ભારતનું બંધારણ & રાજવ્યવસ્થા",
    type: "Handwritten Notes",
    price: 39,
    adminCommissionPct: 10,
    adminFee: 4,
    sellerPayout: 35,
    totalPages: 120,
    samplePagesCount: 5,
    sampleDemoText: "✓ મૂળભૂત અધિકારો (કલમ ૧૨ થી ૩૫) ફાસ્ટ રિવિઝન ટ્રીક\n✓ રાષ્ટ્રપતિ, રાજ્યપાલ અને ન્યાયતંત્ર તુલનાત્મક ચાર્ટ\n✓ ૧૦૬મો બંધારણીય સુધારો અને તાજેતરના સુપ્રીમ ચુકાદાઓ\n✓ PSI & Constable ખાસ ૫૦૦+ વન-લાઇનર્સ",
    sampleDemoUrl: "https://drive.google.com",
    fullDownloadUrl: "https://drive.google.com",
    status: "Approved",
    createdAt: "03 Nov, 11:15 am",
    salesCount: 31,
    rating: 4.8,
  }
];

function loadLocalDB() {
  const keys = [DB_KEY, DB_MIRROR_KEY, "THE_TARGET_CLEAN_DB_V6", "THE_TARGET_CLEAN_DB_V5"];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (!parsed.feedbacks) parsed.feedbacks = [];
        if (!parsed.deletedData) parsed.deletedData = [];
        if (typeof parsed.broadcast !== "string") parsed.broadcast = "";
        if (!parsed.popupBroadcast) parsed.popupBroadcast = null;
        if (!parsed.users) parsed.users = {};
        if (!Array.isArray(parsed.marketplaceBooks) || parsed.marketplaceBooks.length === 0) {
          parsed.marketplaceBooks = DEFAULT_MARKETPLACE_BOOKS;
        }
        if (!Array.isArray(parsed.marketplaceOrders)) parsed.marketplaceOrders = [];
        return parsed;
      } catch (e) {}
    }
  }
  return {
    users: {},
    feedbacks: [],
    deletedData: [],
    broadcast: "",
    popupBroadcast: null,
    marketplaceBooks: DEFAULT_MARKETPLACE_BOOKS,
    marketplaceOrders: []
  };
}

export function StudyProvider({ children }) {
  const { session, isDemoMode } = useAuth();
  const [db, setDb] = useState(loadLocalDB);
  const [cloudStatus, setCloudStatus] = useState("🔒 Online");
  const [toast, setToast] = useState({ visible: false, title: "", desc: "" });
  const [confettiActive, setConfettiActive] = useState(false);

  // Trigger celebratory confetti & toast notification
  const triggerCelebration = useCallback((title, desc) => {
    setToast({ visible: true, title: title || "🎉 ખૂબ સરસ!", desc: desc || "તમારો ટાર્ગેટ આગળ વધી રહ્યો છે!" });
    setConfettiActive(true);
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3200);
    setTimeout(() => {
      setConfettiActive(false);
    }, 2600);
  }, []);

  // Save DB to LocalStorage and push to Firebase
  const commitDb = useCallback((newDb) => {
    setDb(newDb);
    const str = JSON.stringify(newDb);
    try {
      localStorage.setItem(DB_KEY, str);
      localStorage.setItem(DB_MIRROR_KEY, str);
    } catch (e) {
      console.error("Local storage error:", e);
    }
    if (!isDemoMode && navigator.onLine) {
      saveCloudDatabase(newDb, session, isDemoMode);
    }
  }, [session, isDemoMode]);

  // Sync from cloud
  const syncWithCloud = useCallback(async (manual = false) => {
    if (!navigator.onLine) {
      setCloudStatus("⚡ Offline Mode");
      return;
    }
    setCloudStatus("🔒 Syncing");
    const cloudData = await fetchCloudDatabase();
    if (cloudData) {
      setDb(prev => {
        const merged = { ...prev };
        if (cloudData.users) {
          Object.keys(cloudData.users).forEach(mob => {
            merged.users[mob] = normalizeUserObject(cloudData.users[mob]);
          });
        }
        if (Array.isArray(cloudData.feedbacks)) merged.feedbacks = cloudData.feedbacks;
        if (typeof cloudData.broadcast === "string") merged.broadcast = cloudData.broadcast;
        if (Array.isArray(cloudData.deletedData)) merged.deletedData = cloudData.deletedData;
        merged.popupBroadcast = cloudData.popupBroadcast || null;
        if (Array.isArray(cloudData.marketplaceBooks)) {
          merged.marketplaceBooks = cloudData.marketplaceBooks;
        } else if (!merged.marketplaceBooks || merged.marketplaceBooks.length === 0) {
          merged.marketplaceBooks = DEFAULT_MARKETPLACE_BOOKS;
        }
        if (Array.isArray(cloudData.marketplaceOrders)) {
          merged.marketplaceOrders = cloudData.marketplaceOrders;
        } else if (!merged.marketplaceOrders) {
          merged.marketplaceOrders = [];
        }

        const str = JSON.stringify(merged);
        localStorage.setItem(DB_KEY, str);
        localStorage.setItem(DB_MIRROR_KEY, str);
        return merged;
      });
      setCloudStatus("🔒 Online");
      if (manual) triggerCelebration("☁️ Cloud Synced!", "તાજો ડેટા લોડ થઈ ગયો છે.");
    } else {
      setCloudStatus(navigator.onLine ? "🔒 Online" : "⚡ Offline Mode");
    }
  }, [triggerCelebration]);

  // Periodic auto sync
  useEffect(() => {
    syncWithCloud(false);
    const interval = setInterval(() => {
      syncWithCloud(false);
    }, 25000);
    const handleOnline = () => { setCloudStatus("🔒 Online"); syncWithCloud(false); };
    const handleOffline = () => setCloudStatus("⚡ Offline Mode");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncWithCloud]);

  // Active student object
  const currentUser = useMemo(() => {
    if (isDemoMode) return getDemoStudentObject();
    if (!session || session.role !== "student") return null;
    const user = db.users[session.mobile];
    if (!user) return null;
    return normalizeUserObject(user);
  }, [isDemoMode, session, db.users]);

  // Update current user helper
  const updateCurrentUser = useCallback((updaterFn) => {
    if (isDemoMode) {
      alert("🔒 Demo Mode is Read-Only.");
      return;
    }
    if (!session || session.role !== "student" || !session.mobile) return;
    setDb(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const user = copy.users[session.mobile] || {};
      updaterFn(user);

      // Keep active exam in sync
      if (Array.isArray(user.exams)) {
        const curEx = user.exams.find(e => e.id === user.activeExamId);
        if (curEx) {
          curEx.name = user.exam || curEx.name;
          curEx.examDate = user.examDate || curEx.examDate;
          curEx.subjects = user.subjects || [];
        }
      }

      copy.users[session.mobile] = user;
      const str = JSON.stringify(copy);
      localStorage.setItem(DB_KEY, str);
      localStorage.setItem(DB_MIRROR_KEY, str);
      if (navigator.onLine) {
        saveCloudDatabase(copy, session, false);
      }
      return copy;
    });
  }, [isDemoMode, session]);

  // Synchronize common subject/chapter across multiple exams
  const syncCommonChapterProgressAcrossExams = useCallback((user, subName, chapObj) => {
    if (!user || !Array.isArray(user.exams) || !subName || !chapObj) return;
    const normSub = subName.trim().toLowerCase();
    const normChap = (chapObj.name || "").trim().toLowerCase();

    user.exams.forEach(ex => {
      if (ex.id === user.activeExamId) {
        ex.subjects = user.subjects;
        return;
      }
      (ex.subjects || []).forEach(s => {
        if ((s.name || "").trim().toLowerCase() === normSub) {
          (s.chapters || []).forEach(c => {
            if ((c.name || "").trim().toLowerCase() === normChap) {
              c.donePages = chapObj.donePages;
              c.revisedPages = chapObj.revisedPages;
              c.completed = chapObj.completed;
              c.completedDate = chapObj.completedDate || null;
            }
          });
        }
      });
    });
  }, []);

  // Clear Current User Data with Instant Cloud Wipe & Archive
  const clearCurrentUserData = useCallback(async () => {
    if (isDemoMode) {
      alert("🔒 Demo Mode is Read-Only.");
      return;
    }
    if (!session || session.role !== "student" || !session.mobile) return;

    const user = db.users[session.mobile];
    if (!user) return;

    const archiveItem = {
      archiveId: `arch_${Date.now()}`,
      deletedAt: nowFormattedTimestamp(),
      deletedBy: "Student (Self Clear)",
      mobile: user.mobile,
      name: user.name,
      exam: user.exam,
      snapshot: JSON.parse(
        JSON.stringify({
          subjects: user.subjects || [],
          logs: user.logs || [],
          revisions: user.revisions || [],
          tests: user.tests || [],
          quickNotes: user.quickNotes || [],
          exams: user.exams || [],
          dailyHabitsLog: user.dailyHabitsLog || {},
          customHabits: user.customHabits || []
        })
      )
    };

    const nextDb = JSON.parse(JSON.stringify(db));
    if (!Array.isArray(nextDb.deletedData)) nextDb.deletedData = [];
    nextDb.deletedData.unshift(archiveItem);

    const clearedUser = nextDb.users[session.mobile];
    if (clearedUser) {
      clearedUser.exam = "General Prep";
      clearedUser.examDate = "";
      clearedUser.subjects = [];
      clearedUser.logs = [];
      clearedUser.revisions = [];
      clearedUser.tests = [];
      clearedUser.quickNotes = [];
      clearedUser.dailyHabitsLog = {};
      clearedUser.customHabits = [];
      clearedUser.focusMinutes = 0;
      clearedUser.focusSessions = 0;
      clearedUser.directMessages = [];
      clearedUser.exams = [
        {
          id: "ex_main",
          name: "General Prep",
          examDate: "",
          subjects: []
        }
      ];
      clearedUser.activeExamId = "ex_main";
    }

    setDb(nextDb);
    const str = JSON.stringify(nextDb);
    try {
      localStorage.setItem(DB_KEY, str);
      localStorage.setItem(DB_MIRROR_KEY, str);
    } catch (e) {
      console.error(e);
    }

    if (navigator.onLine) {
      await saveCloudDatabase(nextDb, session, false);
    }
    triggerCelebration("🗑️ Complete Reset Done!", "તમારા વિષયો, પરીક્ષા તારીખ અને ટાઈમર બધું જ રીસેટ થઈ ગયું છે.");
  }, [isDemoMode, session, db, triggerCelebration]);

  return (
    <StudyContext.Provider
      value={{
        db,
        commitDb,
        cloudStatus,
        currentUser,
        updateCurrentUser,
        clearCurrentUserData,
        syncWithCloud,
        syncCommonChapterProgressAcrossExams,
        triggerCelebration,
        toast,
        confettiActive
      }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export const useStudy = () => useContext(StudyContext);
