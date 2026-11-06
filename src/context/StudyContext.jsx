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
        return parsed;
      } catch (e) {}
    }
  }
  return { users: {}, feedbacks: [], deletedData: [], broadcast: "", popupBroadcast: null };
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
