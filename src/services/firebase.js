import { FIREBASE_CONFIG } from "../utils/constants";
import { normalizeUserObject } from "../utils/helpers";

const FIREBASE_DB_URL = FIREBASE_CONFIG.databaseURL;

function withTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(null), ms))
  ]);
}

export async function fetchCloudDatabase() {
  if (!navigator.onLine) return null;
  try {
    const res = await withTimeout(fetch(FIREBASE_DB_URL + "/targetApp.json"), 3500);
    if (!res || !res.ok) return null;
    const data = await res.json();
    if (!data) return null;

    if (data.users) {
      Object.keys(data.users).forEach(mob => {
        data.users[mob] = normalizeUserObject(data.users[mob]);
      });
    }
    return data;
  } catch (err) {
    console.warn("Cloud sync skipped:", err);
    return null;
  }
}

export async function saveCloudDatabase(db, currentSession, isDemoMode) {
  if (!navigator.onLine || isDemoMode || !db) return false;
  try {
    if (currentSession && currentSession.role === "student" && currentSession.mobile) {
      const m = currentSession.mobile;
      if (db.users && db.users[m]) {
        await withTimeout(fetch(FIREBASE_DB_URL + "/targetApp/users/" + m + ".json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(db.users[m])
        }), 3000);
      }
      if (db.feedbacks) {
        await withTimeout(fetch(FIREBASE_DB_URL + "/targetApp/feedbacks.json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(db.feedbacks || [])
        }), 3000);
      }
      if (db.deletedData) {
        await withTimeout(fetch(FIREBASE_DB_URL + "/targetApp/deletedData.json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(db.deletedData || [])
        }), 3000);
      }
      if (db.marketplaceBooks) {
        await withTimeout(fetch(FIREBASE_DB_URL + "/targetApp/marketplaceBooks.json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(db.marketplaceBooks || [])
        }), 3000);
      }
      if (db.marketplaceOrders) {
        await withTimeout(fetch(FIREBASE_DB_URL + "/targetApp/marketplaceOrders.json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(db.marketplaceOrders || [])
        }), 3000);
      }
    } else {
      await withTimeout(fetch(FIREBASE_DB_URL + "/targetApp.json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(db)
      }), 3000);
    }
    return true;
  } catch (err) {
    console.warn("Cloud push error:", err);
    return false;
  }
}

export async function fetchRemoteStudentPin() {
  if (!navigator.onLine) return null;
  try {
    const res = await withTimeout(fetch(FIREBASE_DB_URL + "/targetApp/studentPin.json"), 2500);
    if (res && res.ok) {
      return await res.json();
    }
  } catch (e) {}
  return null;
}
