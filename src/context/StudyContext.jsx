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
    sellerName: "વિજય પરમાર (CCE Topper)",
    sellerBio: "CCE Group A & B Rank 14 • 3 વર્ષનો અનુભવ • 1,200+ વિદ્યાર્થીઓ દ્વારા પસંદ",
    sellerUpi: "cce.topper@upi",
    exam: "CCE (Group A & B)",
    subject: "Reasoning & Mental Ability",
    type: "Handwritten Notes",
    originalPrice: 99,
    price: 49,
    isBundle: false,
    sellerPlan: "commission_10", // 'commission_10' | 'fixed_500'
    adminCommissionPct: 10,
    adminFee: 5,
    sellerPayout: 44,
    totalPages: 140,
    samplePagesCount: 6,
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    demoImages: [
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80"
    ],
    sampleDemoText: "✓ Syllogism 10-Second Short Tricks\n✓ Blood Relations Family Tree Formula\n✓ Seating Arrangement Matrix Methods\n✓ Coding-Decoding Direct Shortcuts\n✓ 50+ Solved CCE Previous Questions with Handwritten Explanations",
    sampleDemoUrl: "https://drive.google.com",
    fullDownloadUrl: "https://drive.google.com",
    status: "Approved",
    createdAt: "01 Nov, 10:00 am",
    salesCount: 24,
    rating: 4.9,
    ratings: [
      { id: "r_1", studentMobile: "9900011122", studentName: "કિશન પટેલ", rating: 5, comment: "રીઝનિંગમાં સમય બચાવવા માટે શ્રેષ્ઠ શોર્ટકટ્સ છે!", date: "02 Nov, 08:30 pm", hidden: false },
      { id: "r_2", studentMobile: "9900011123", studentName: "પ્રિયા શાહ", rating: 5, comment: "Handwriting એકદમ ક્લીન અને વાંચવામાં સરળ છે.", date: "04 Nov, 11:20 am", hidden: false }
    ]
  },
  {
    id: "book_guj_history_top",
    title: "🏛️ ગુજરાતનો સંપૂર્ણ ઈતિહાસ & વારસો — Short Handwritten Capsule",
    authorAnon: "GPSC Interviewee #31",
    sellerMobile: "9876543211",
    sellerName: "ભાવિક દેસાઈ (GPSC Ranker)",
    sellerBio: "GPSC Class 1-2 Prelims & Mains Qualified • ગુજરાત ઈતિહાસ એક્સપર્ટ",
    sellerUpi: "gpsc.topper@upi",
    exam: "GPSC Class 1-2",
    subject: "ગુજરાતનો ઈતિહાસ & સંસ્કૃતિ",
    type: "Handwritten Notes",
    originalPrice: 120,
    price: 59,
    isBundle: false,
    sellerPlan: "commission_10",
    adminCommissionPct: 10,
    adminFee: 6,
    sellerPayout: 53,
    totalPages: 185,
    samplePagesCount: 8,
    coverImage: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80",
    demoImages: [
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80"
    ],
    sampleDemoText: "✓ મૈત્રક, સોલંકી અને વાઘેલા કાળ ટાઈમલાઈન ચાર્ટ્સ\n✓ ગુજરાતના મહત્વના શિલાલેખ અને સ્થાપત્ય યાદ રાખવાની ટ્રીક્સ\n✓ આદિવાસી મેળાઓ, લોકનૃત્યો અને હસ્તકળા ક્વિક ટેબલ\n✓ GPSC Class 1-2 માટે અતિ-મહત્વના ૨૫૦+ પોઈન્ટર્સ",
    sampleDemoUrl: "https://drive.google.com",
    fullDownloadUrl: "https://drive.google.com",
    status: "Approved",
    createdAt: "02 Nov, 03:30 pm",
    salesCount: 19,
    rating: 5.0,
    ratings: [
      { id: "r_3", studentMobile: "9900011124", studentName: "અંકિત જોષી", rating: 5, comment: "ટાઈમલાઈન ચાર્ટ્સ ખૂબ જ મદદરૂપ બન્યા!", date: "03 Nov, 02:15 pm", hidden: false }
    ]
  },
  {
    id: "book_const_polity_top",
    title: "⚖️ ભારતનું બંધારણ (Constitution) 2026 Latest Amendment Notes",
    authorAnon: "PSI Ranker #07",
    sellerMobile: "9876543212",
    sellerName: "ધ્રુવિલ રાવલ (PSI Selection)",
    sellerBio: "Police PSI 2023 Selected • કાયદો અને બંધારણ સ્પેશિયાલિસ્ટ",
    sellerUpi: "psi.ranker@upi",
    exam: "Police PSI / Constable",
    subject: "ભારતનું બંધારણ & રાજવ્યવસ્થા",
    type: "Handwritten Notes",
    originalPrice: 80,
    price: 39,
    isBundle: false,
    sellerPlan: "commission_10",
    adminCommissionPct: 10,
    adminFee: 4,
    sellerPayout: 35,
    totalPages: 120,
    samplePagesCount: 5,
    coverImage: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
    demoImages: [
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80"
    ],
    sampleDemoText: "✓ મૂળભૂત અધિકારો (કલમ ૧૨ થી ૩૫) ફાસ્ટ રિવિઝન ટ્રીક\n✓ રાષ્ટ્રપતિ, રાજ્યપાલ અને ન્યાયતંત્ર તુલનાત્મક ચાર્ટ\n✓ ૧૦૬મો બંધારણીય સુધારો અને તાજેતરના સુપ્રીમ ચુકાદાઓ\n✓ PSI & Constable ખાસ ૫૦૦+ વન-લાઇનર્સ",
    sampleDemoUrl: "https://drive.google.com",
    fullDownloadUrl: "https://drive.google.com",
    status: "Approved",
    createdAt: "03 Nov, 11:15 am",
    salesCount: 31,
    rating: 4.8,
    ratings: [
      { id: "r_4", studentMobile: "9900011125", studentName: "મહેશ ચૌધરી", rating: 5, comment: "બંધારણની કલમો યાદ રાખવા માટે સુપરબ!", date: "04 Nov, 07:10 pm", hidden: false }
    ]
  },
  {
    id: "book_combo_all_in_one",
    title: "🔥 CCE & PSI ટોપર્સ સ્પેશિયલ ૩-ઇન-૧ મહા-કોમ્બો બંડલ (રીઝનિંગ + ઈતિહાસ + બંધારણ)",
    authorAnon: "Target Track Verified Toppers Duo",
    sellerMobile: "9876543210",
    sellerName: "વિજય પરમાર (CCE Topper)",
    sellerBio: "CCE Group A & B Rank 14 • 3 વર્ષનો અનુભવ • 1,200+ વિદ્યાર્થીઓ દ્વારા પસંદ",
    sellerUpi: "cce.topper@upi",
    exam: "CCE / GPSC / PSI (All-in-One)",
    subject: "સંપૂર્ણ ૩ વિષય કોમ્બો",
    type: "Mega Bundle Pack",
    originalPrice: 199,
    price: 99,
    isBundle: true,
    bundleItems: [
      "🎯 CCE Master Reasoning Notes (140 Pages)",
      "🏛️ ગુજરાતનો સંપૂર્ણ ઈતિહાસ Capsule (185 Pages)",
      "⚖️ ભારતનું બંધારણ Latest Amendments (120 Pages)"
    ],
    sellerPlan: "fixed_500", // 0% commission VIP Seller
    adminCommissionPct: 0,
    adminFee: 0,
    sellerPayout: 99,
    totalPages: 445,
    samplePagesCount: 15,
    coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    demoImages: [
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80"
    ],
    sampleDemoText: "✓ ત્રણેય ટોપર નોટ્સ એક જ પેકમાં ૩૩% થી વધુ ડિસ્કાઉન્ટ સાથે\n✓ ૪૪૫+ પેજીસનું સંપૂર્ણ સંકલન\n✓ લાઈફટાઈમ ડાઉનલોડ મર્યાદા (૨ વખત ડાઉનલોડ સપોર્ટ)\n✓ CCE, GPSC અને પોલીસ તમામ પરીક્ષાઓ માટે રામબાણ",
    sampleDemoUrl: "https://drive.google.com",
    fullDownloadUrl: "https://drive.google.com",
    status: "Approved",
    createdAt: "04 Nov, 09:00 am",
    salesCount: 42,
    rating: 5.0,
    ratings: [
      { id: "r_5", studentMobile: "9900011126", studentName: "કલ્પેશ વાઘેલા", rating: 5, comment: "ત્રણેય વિષય એક જ પેકમાં મળી ગયા, પૈસા વસૂલ છે!", date: "05 Nov, 04:40 pm", hidden: false }
    ]
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
        if (!Array.isArray(parsed.marketplacePayouts)) parsed.marketplacePayouts = [];
        if (!Array.isArray(parsed.marketplaceSubscriptions)) parsed.marketplaceSubscriptions = [];
        if (!Array.isArray(parsed.sellerApplications)) parsed.sellerApplications = [];
        if (!Array.isArray(parsed.sellerTickets)) parsed.sellerTickets = [];
        if (!parsed.deletedIds || typeof parsed.deletedIds !== "object") parsed.deletedIds = {};
        if (!parsed.lastUpdatedAt) parsed.lastUpdatedAt = 0;
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
    marketplaceOrders: [],
    marketplacePayouts: [],
    marketplaceSubscriptions: [],
    sellerApplications: [],
    sellerTickets: [],
    deletedIds: {},
    lastUpdatedAt: 0
  };
}

// Safe user state merge with lastResetAt and lastUpdatedAt timestamp lock
const mergeUserSafely = (localUser, cloudUser) => {
  if (!localUser) return cloudUser;
  if (!cloudUser) return localUser;

  // CRITICAL FIX: If localUser has been reset/cleared (lastResetAt higher),
  // do NOT reload old subjects/logs/tests from cloud!
  const localReset = Number(localUser.lastResetAt || 0);
  const cloudReset = Number(cloudUser.lastResetAt || 0);

  if (localReset > cloudReset) {
    return localUser; // Keep wiped clean state and overwrite cloud
  }
  if (cloudReset > localReset) {
    return cloudUser;
  }

  // Normal state: respect latest modification timestamp
  const localUpdated = Number(localUser.lastUpdatedAt || 0);
  const cloudUpdated = Number(cloudUser.lastUpdatedAt || 0);
  return localUpdated >= cloudUpdated ? localUser : cloudUser;
};

// Filter out tombstoned items that were deleted permanently
const filterOutDeletedItems = (list = [], deletedIdsMap = {}) => {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => {
    const id = item?.id || item?.archiveId;
    return !id || !deletedIdsMap[id];
  });
};

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

  // Save DB to LocalStorage and push to Firebase with Tombstone deletedIds Registry
  const commitDb = useCallback((newDb, newlyDeletedId = null) => {
    const stamped = {
      ...newDb,
      lastUpdatedAt: Date.now(),
      deletedIds: {
        ...(newDb.deletedIds || db.deletedIds || {}),
        ...(newlyDeletedId ? { [newlyDeletedId]: Date.now() } : {}),
      },
    };
    stamped.marketplaceOrders = filterOutDeletedItems(stamped.marketplaceOrders, stamped.deletedIds);
    stamped.marketplaceBooks = filterOutDeletedItems(stamped.marketplaceBooks, stamped.deletedIds);
    stamped.marketplacePayouts = filterOutDeletedItems(stamped.marketplacePayouts, stamped.deletedIds);
    stamped.sellerApplications = filterOutDeletedItems(stamped.sellerApplications, stamped.deletedIds);
    stamped.sellerTickets = filterOutDeletedItems(stamped.sellerTickets, stamped.deletedIds);
    stamped.feedbacks = filterOutDeletedItems(stamped.feedbacks, stamped.deletedIds);

    setDb(stamped);
    const str = JSON.stringify(stamped);
    try {
      localStorage.setItem(DB_KEY, str);
      localStorage.setItem(DB_MIRROR_KEY, str);
    } catch (e) {
      console.error("Local storage error:", e);
    }
    if (!isDemoMode && navigator.onLine) {
      saveCloudDatabase(stamped, session, isDemoMode);
    }
  }, [db.deletedIds, session, isDemoMode]);

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
        // If local state was updated more recently than cloud, do not let cloud overwrite!
        const localTime = Number(prev.lastUpdatedAt || 0);
        const cloudTime = Number(cloudData.lastUpdatedAt || 0);
        if (localTime > cloudTime) {
          return prev;
        }

        const mergedDeletedIds = {
          ...(prev.deletedIds || {}),
          ...(cloudData.deletedIds || {}),
        };

        const merged = {
          ...prev,
          deletedIds: mergedDeletedIds,
          lastUpdatedAt: Math.max(localTime, cloudTime),
        };

        if (cloudData.users) {
          Object.keys(cloudData.users).forEach((mob) => {
            const cloudUser = normalizeUserObject(cloudData.users[mob]);
            const localUser = merged.users[mob];
            merged.users[mob] = mergeUserSafely(localUser, cloudUser);
          });
        }
        if (Array.isArray(cloudData.feedbacks)) {
          merged.feedbacks = filterOutDeletedItems(cloudData.feedbacks, mergedDeletedIds);
        }
        if (typeof cloudData.broadcast === "string") merged.broadcast = cloudData.broadcast;
        if (Array.isArray(cloudData.deletedData)) merged.deletedData = cloudData.deletedData;
        merged.popupBroadcast = cloudData.popupBroadcast || null;
        if (Array.isArray(cloudData.marketplaceBooks)) {
          merged.marketplaceBooks = filterOutDeletedItems(cloudData.marketplaceBooks, mergedDeletedIds);
          if (merged.marketplaceBooks.length === 0 && !mergedDeletedIds["book_cce_reasoning_top"]) {
            merged.marketplaceBooks = DEFAULT_MARKETPLACE_BOOKS;
          }
        }
        if (Array.isArray(cloudData.marketplaceOrders)) {
          merged.marketplaceOrders = filterOutDeletedItems(cloudData.marketplaceOrders, mergedDeletedIds);
        }
        if (Array.isArray(cloudData.marketplacePayouts)) {
          merged.marketplacePayouts = filterOutDeletedItems(cloudData.marketplacePayouts, mergedDeletedIds);
        }
        if (Array.isArray(cloudData.marketplaceSubscriptions)) {
          merged.marketplaceSubscriptions = cloudData.marketplaceSubscriptions;
        }
        if (Array.isArray(cloudData.sellerApplications)) {
          merged.sellerApplications = filterOutDeletedItems(cloudData.sellerApplications, mergedDeletedIds);
        }
        if (Array.isArray(cloudData.sellerTickets)) {
          merged.sellerTickets = filterOutDeletedItems(cloudData.sellerTickets, mergedDeletedIds);
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
      user.lastUpdatedAt = Date.now();

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

    const resetStamp = Date.now();

    const archiveItem = {
      archiveId: `arch_${resetStamp}`,
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
      clearedUser.lastResetAt = resetStamp;
      clearedUser.lastUpdatedAt = resetStamp;
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
