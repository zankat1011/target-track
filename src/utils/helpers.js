import { SUPPORT_WA_ID, TG_CHANNEL } from "./constants";

export function secretHash(str) {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    out += (str.charCodeAt(i) + 17).toString(36);
  }
  return out;
}

export function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export function addDaysISO(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function daysBetween(d1, d2) {
  return Math.ceil((new Date(d2 + "T00:00:00") - new Date(d1 + "T00:00:00")) / 86400000);
}

export function nowFormattedTimestamp() {
  const d = new Date();
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + ", " +
         d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function normalizeMobile(val) {
  return (val || "").replace(/\D/g, "");
}

export function openAdminWhatsApp(customText) {
  const msg = encodeURIComponent(customText || "Hello Target Track Team");
  window.open("https://wa.me/" + SUPPORT_WA_ID + "?text=" + msg, "_blank");
}

export function openTelegramChannel() {
  const win = window.open(TG_CHANNEL, "_blank", "noopener,noreferrer");
  if (!win) window.location.href = TG_CHANNEL;
}

export function getValidityRemainingDays(user) {
  if (!user) return 0;
  if (!user.planExpiryDate) user.planExpiryDate = addDaysISO(user.createdAt || todayISO(), 5);
  return Math.max(0, daysBetween(todayISO(), user.planExpiryDate));
}

export function normalizeUserObject(u) {
  if (!u) return u;
  if (!Array.isArray(u.subjects)) u.subjects = [];
  u.subjects.forEach(s => {
    if (!Array.isArray(s.chapters)) s.chapters = [];
    s.chapters.forEach(c => {
      if (!Array.isArray(c.topics)) c.topics = [];
    });
  });
  if (!Array.isArray(u.logs)) u.logs = [];
  if (!Array.isArray(u.revisions)) u.revisions = [];
  if (!Array.isArray(u.tests)) u.tests = [];
  if (!Array.isArray(u.quickNotes)) u.quickNotes = [];
  if (!u.dailyHabitsLog || typeof u.dailyHabitsLog !== "object") u.dailyHabitsLog = {};
  if (typeof u.focusMinutes !== "number") u.focusMinutes = 0;
  if (typeof u.focusSessions !== "number") u.focusSessions = 0;
  return u;
}

export function getDemoStudentObject() {
  const td = todayISO();
  return {
    mobile: "DEMO",
    name: "Demo Aspirant",
    exam: "GPSC / CCE",
    examDate: addDaysISO(td, 45),
    status: "approved",
    planName: "5-Day Free Trial",
    planStartDate: td,
    planExpiryDate: addDaysISO(td, 5),
    dailyGoal: 20,
    focusMinutes: 50,
    focusSessions: 2,
    quickNotes: [
      { id: "qn1", subject: "ભારતનું બંધારણ", chapter: "આમુખ અને મૂળભૂત અધિકારો", noteType: "Quick Formula", title: "અનુચ્છેદ 32", text: "બંધારણીય ઇલાજોનો અધિકાર — બંધારણનો આત્મા" },
      { id: "qn2", subject: "ગણિત અને રીઝનિંગ", chapter: "ટકાવારી (Percentage)", noteType: "Short Key", title: "ચક્રવૃદ્ધિ વ્યાજ તફાવત", text: "2 વર્ષનો તફાવત = P(R/100)²" }
    ],
    subjects: [
      {
        id: "ds1",
        name: "ભારતનું બંધારણ",
        chapters: [
          { id: "dc1", name: "આમુખ અને મૂળભૂત અધિકારો", donePages: 22, revisedPages: 22, completed: true, completedDate: addDaysISO(td, -7), topics: [] },
          { id: "dc2", name: "રાષ્ટ્રપતિ અને સંસદ", donePages: 14, revisedPages: 6, completed: false, topics: [] }
        ]
      },
      {
        id: "ds2",
        name: "ગણિત અને રીઝનિંગ",
        chapters: [
          { id: "dc3", name: "ટકાવારી (Percentage)", donePages: 18, revisedPages: 18, completed: true, completedDate: addDaysISO(td, -3), topics: [] },
          { id: "dc4", name: "નફો અને ખોટ", donePages: 10, revisedPages: 5, completed: false, topics: [] }
        ]
      }
    ],
    logs: [
      { id: "dl1", date: addDaysISO(td, -2), subjectId: "ds1", subjectName: "ભારતનું બંધારણ", chapterId: "dc1", chapterName: "આમુખ અને મૂળભૂત અધિકારો", pages: 12, isChapterFinish: true, revised: true, revisedAt: "08:30 PM", revId: "dr2" },
      { id: "dl3", date: td, subjectId: "ds1", subjectName: "ભારતનું બંધારણ", chapterId: "dc2", chapterName: "રાષ્ટ્રપતિ અને સંસદ", pages: 8, isChapterFinish: false, revised: false }
    ],
    revisions: [
      { id: "dr1", logId: "dl3", subjectId: "ds1", chapterId: "dc2", subjectName: "ભારતનું બંધારણ", chapterName: "રાષ્ટ્રપતિ અને સંસદ", topicName: "Study (+8p)", pagesCount: 8, revType: "daily", stageLabel: "Day-1 Rev", studiedDate: td, dueDate: td, done: false },
      { id: "dr2", logId: "dl1", subjectId: "ds1", chapterId: "dc1", subjectName: "ભારતનું બંધારણ", chapterName: "આમુખ અને મૂળભૂત અધિકારો", topicName: "✓ Full Chapter (22p)", pagesCount: 22, revType: "master", stageLabel: "7-Day Master", studiedDate: addDaysISO(td, -8), dueDate: addDaysISO(td, -1), done: true, doneDate: td, doneAt: "Today, 09:15 AM" }
    ],
    tests: [
      { id: "dt1", date: addDaysISO(td, -4), testType: "chapter", title: "Polity Ch-1 Test", subjects: ["ભારતનું બંધારણ"], chapters: ["આમુખ અને મૂળભૂત અધિકારો"], subjectName: "ભારતનું બંધારણ", chapterName: "આમુખ અને મૂળભૂત અધિકારો", scored: 38, total: 50 },
      { id: "dt2", date: addDaysISO(td, -2), testType: "subject", title: "Maths Full Test", subjects: ["ગણિત અને રીઝનિંગ"], chapters: ["Full Subject"], subjectName: "ગણિત અને રીઝનિંગ", chapterName: "Full Subject", scored: 41, total: 50 }
    ],
    exams: [
      {
        id: "ex_main",
        name: "GPSC / CCE",
        examDate: addDaysISO(td, 45),
        subjects: [
          {
            id: "ds1",
            name: "ભારતનું બંધારણ",
            chapters: [
              { id: "dc1", name: "આમુખ અને મૂળભૂત અધિકારો", donePages: 22, revisedPages: 22, completed: true, completedDate: addDaysISO(td, -7), topics: [] },
              { id: "dc2", name: "રાષ્ટ્રપતિ અને સંસદ", donePages: 14, revisedPages: 6, completed: false, topics: [] }
            ]
          }
        ]
      }
    ],
    activeExamId: "ex_main"
  };
}
