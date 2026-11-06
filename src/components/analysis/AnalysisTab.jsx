import React, { useState } from "react";
import { useStudy } from "../../context/StudyContext";
import { todayISO, addDaysISO } from "../../utils/helpers";
import { LIVE_TEST_URL } from "../../utils/constants";

export function AnalysisTab() {
  const { currentUser, updateCurrentUser, triggerCelebration } = useStudy();

  const [subView, setSubView] = useState("overview"); // 'overview' | 'addtest' | 'chapters'

  // Add Test states
  const [testMode, setTestMode] = useState("chapter"); // 'chapter' | 'subject' | 'mock'
  const [testDate, setTestDate] = useState(todayISO);
  const [testTitle, setTestTitle] = useState("");
  const [scored, setScored] = useState("");
  const [total, setTotal] = useState("100");
  const [selectedSubIds, setSelectedSubIds] = useState([]);
  const [selectedChapKeys, setSelectedChapKeys] = useState([]);

  // Negative Marking & Cut-off Simulator states
  const [simAttempt, setSimAttempt] = useState("");
  const [simWrong, setSimWrong] = useState("");
  const [simNegRatio, setSimNegRatio] = useState("0.25");
  const [simCutoff, setSimCutoff] = useState("75");

  const simAttemptNum = parseFloat(simAttempt) || 0;
  const simWrongNum = parseFloat(simWrong) || 0;
  const simNegNum = parseFloat(simNegRatio) || 0.25;
  const simCutoffNum = parseFloat(simCutoff) || 75;
  const simRightNum = Math.max(0, simAttemptNum - simWrongNum);
  const simPenalty = +(simWrongNum * simNegNum).toFixed(2);
  const simNetScore = Math.max(0, +(simRightNum - simPenalty).toFixed(2));

  const handleSimAttemptChange = (val) => {
    setSimAttempt(val);
    const att = parseFloat(val) || 0;
    const wrg = parseFloat(simWrong) || 0;
    const neg = parseFloat(simNegRatio) || 0.25;
    if (att > 0) {
      const r = Math.max(0, att - wrg);
      const net = Math.max(0, +(r - wrg * neg).toFixed(2));
      setScored(net.toString());
    }
  };

  const handleSimWrongChange = (val) => {
    setSimWrong(val);
    const att = parseFloat(simAttempt) || 0;
    const wrg = parseFloat(val) || 0;
    const neg = parseFloat(simNegRatio) || 0.25;
    if (att > 0) {
      const r = Math.max(0, att - wrg);
      const net = Math.max(0, +(r - wrg * neg).toFixed(2));
      setScored(net.toString());
    }
  };

  const handleSimNegChange = (val) => {
    setSimNegRatio(val);
    const att = parseFloat(simAttempt) || 0;
    const wrg = parseFloat(simWrong) || 0;
    const neg = parseFloat(val) || 0.25;
    if (att > 0) {
      const r = Math.max(0, att - wrg);
      const net = Math.max(0, +(r - wrg * neg).toFixed(2));
      setScored(net.toString());
    }
  };

  // Test History filters
  const [histSubFilter, setHistSubFilter] = useState("ALL");
  const [histSortBy, setHistSortBy] = useState("latest");

  // Chapter Breakdown filter
  const [breakdownSubFilter, setBreakdownSubFilter] = useState("ALL");

  const subjects = currentUser?.subjects || [];
  const tests = currentUser?.tests || [];

  // Default select first subject if none selected
  React.useEffect(() => {
    if (subjects.length > 0 && selectedSubIds.length === 0) {
      setSelectedSubIds([subjects[0].id]);
    }
  }, [subjects, selectedSubIds]);

  const toggleTestSub = (subId) => {
    setSelectedSubIds((prev) =>
      prev.includes(subId) ? prev.filter((x) => x !== subId) : [...prev, subId]
    );
  };

  const toggleTestChap = (key) => {
    setSelectedChapKeys((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  // Add Test Score
  const handleAddTest = (e) => {
    e?.preventDefault();
    const sc = parseFloat(scored);
    const tot = parseFloat(total);
    if (isNaN(sc) || isNaN(tot) || tot <= 0) return alert("સાચા માર્ક્સ નાખો.");

    let activeSubs = [];
    let subDisplay = "All Subjects";
    let chapNames = [];
    let chapDisplay = "Grand Full Syllabus Mock";

    if (testMode === "mock") {
      activeSubs = subjects.map((s) => s.name);
      subDisplay = "All Subjects (Grand Mock)";
      chapDisplay = testTitle.trim() || "Grand Full Syllabus Mock";
      chapNames = [chapDisplay];
    } else if (testMode === "subject") {
      activeSubs = subjects.filter((s) => selectedSubIds.includes(s.id)).map((s) => s.name);
      subDisplay = activeSubs.length > 0 ? activeSubs.join(", ") : "Subject Test";
      chapDisplay = testTitle.trim() || "Full Subject Test";
      chapNames = ["Full Subject"];
    } else {
      activeSubs = subjects.filter((s) => selectedSubIds.includes(s.id)).map((s) => s.name);
      subDisplay = activeSubs.length > 0 ? activeSubs.join(", ") : "Subject";
      chapNames = selectedChapKeys.map((k) => k.split("::")[1]).filter(Boolean);
      chapDisplay = chapNames.length > 0 ? chapNames.join(" + ") : testTitle.trim() || "Chapter Test";
    }

    updateCurrentUser((user) => {
      user.tests.push({
        id: `tst_${Date.now()}`,
        date: testDate || todayISO(),
        testType: testMode,
        title: testTitle.trim() || chapDisplay,
        subjects: activeSubs.length > 0 ? activeSubs : ["General"],
        chapters: chapNames.length > 0 ? chapNames : [chapDisplay],
        subjectName: subDisplay,
        chapterName: chapDisplay,
        scored: sc,
        total: tot,
      });
    });

    setScored("");
    setTestTitle("");
    triggerCelebration(
      "🎯 ટેસ્ટ માર્ક્સ સેવ થયા!",
      `${sc} / ${tot} (${Math.round((sc / tot) * 100)}%)`
    );
  };

  const handleEditTest = (test) => {
    const newTitle = prompt("ટેસ્ટનું નામ સુધારો:", test.title || test.chapterName);
    const newSc = prompt("મેળવેલ માર્ક્સ (Scored Marks) સુધારો:", test.scored);
    const newTot = prompt("કુલ માર્ક્સ (Total Marks) સુધારો:", test.total);

    updateCurrentUser((user) => {
      const t = (user.tests || []).find((x) => x.id === test.id);
      if (!t) return;
      if (newTitle && newTitle.trim()) t.title = newTitle.trim();
      if (newSc !== null) t.scored = parseFloat(newSc) || t.scored;
      if (newTot !== null) t.total = Math.max(1, parseFloat(newTot) || t.total);
    });
  };

  const handleDeleteTest = (testId) => {
    if (!confirm("Delete this test score?")) return;
    updateCurrentUser((user) => {
      user.tests = (user.tests || []).filter((x) => x.id !== testId);
    });
  };

  // Calculations for Overview
  const {
    readinessScore,
    persona,
    advice,
    memRetention,
    mostRead,
    mostRev,
    leastRead,
    bestTest,
    subMetrics,
    weeklyBars,
    testSvgPoints,
    overallTestAvg,
  } = React.useMemo(() => {
    const today = todayISO();
    let totalChaps = 0, doneChaps = 0, totalPagesRead = 0, totalPagesRevised = 0;

    subjects.forEach((s) => {
      (s.chapters || []).forEach((c) => {
        totalChaps++;
        if (c.completed) doneChaps++;
        const dp = Number(c.donePages || 0);
        const rp = Math.min(dp, Number(c.revisedPages || 0));
        totalPagesRead += dp;
        totalPagesRevised += rp;
      });
    });

    const calcPct = (arr) => {
      let s = 0, m = 0;
      arr.forEach((x) => { s += Number(x.scored || 0); m += Number(x.total || 0); });
      return m > 0 ? Math.round((s / m) * 100) : null;
    };

    const sMetrics = subjects.map((s) => {
      const cTot = (s.chapters || []).length;
      const cDone = (s.chapters || []).filter((c) => c.completed).length;
      const pRead = (s.chapters || []).reduce((a, c) => a + Number(c.donePages || 0), 0);
      const pRev = (s.chapters || []).reduce((a, c) => a + Number(c.revisedPages || 0), 0);
      const revSessions = (currentUser?.revisions || []).filter(
        (r) => r.done && (r.subjectId === s.id || r.subjectName === s.name)
      ).length;
      const sTests = tests.filter(
        (t) => (t.subjects || []).includes(s.name) || (t.subjectName || "").includes(s.name)
      );
      const tAvg = calcPct(sTests);
      const chapPct = cTot > 0 ? Math.round((cDone / cTot) * 100) : 0;
      const readShare = totalPagesRead > 0 ? Math.round((pRead / totalPagesRead) * 100) : 0;
      return { id: s.id, name: s.name, cTot, cDone, pRead, pRev, revSessions, readShare, tAvg, testCount: sTests.length, chapPct };
    });

    let mRead = null, mRev = null, lRead = null, bTest = null;
    if (sMetrics.length > 0) {
      const byRead = [...sMetrics].sort((a, b) => b.pRead - a.pRead);
      const byRev = [...sMetrics].sort((a, b) => (b.pRev + b.revSessions * 3) - (a.pRev + a.revSessions * 3));
      mRead = byRead[0];
      mRev = byRev[0];
      lRead = byRead[byRead.length - 1];

      const tested = sMetrics.filter((x) => x.tAvg !== null).sort((a, b) => b.tAvg - a.tAvg);
      if (tested.length > 0) bTest = tested[0];
    }

    const revCovPct = totalPagesRead > 0 ? Math.round((totalPagesRevised / totalPagesRead) * 100) : 100;
    const dueToDate = (currentUser?.revisions || []).filter((r) => r.dueDate <= today).length;
    const doneRev = (currentUser?.revisions || []).filter((r) => r.done).length;
    const revRate = dueToDate > 0 ? Math.min(100, Math.round((doneRev / dueToDate) * 100)) : 100;
    const ovTestAvg = calcPct(tests);

    const chapCompRatio = totalChaps > 0 ? (doneChaps / totalChaps) * 100 : 0;
    const readiness = Math.round(
      chapCompRatio * 0.35 + revCovPct * 0.25 + revRate * 0.2 + (ovTestAvg || 50) * 0.2
    );
    const retention = Math.round(revCovPct * 0.6 + revRate * 0.4);

    const unrevPages = Math.max(0, totalPagesRead - totalPagesRevised);
    let pTitle = "🌱 Steady Starter (શરૂઆતનો તબક્કો)";
    let pAdvice = "રોજ નિયમિત પેજ ઉમેરવાનું ચાલુ રાખો અને જે ચેપ્ટર પૂરું થાય તેને તરત જ Finish માર્ક કરો.";

    if (unrevPages > 25 && revCovPct < 50) {
      pTitle = "⚡ Fast Reader, Low Revision";
      pAdvice = `તમે ${totalPagesRead} પેજ વાંચ્યા છે પણ ${unrevPages} પેજનું રિવિઝન બાકી છે! આજે જ જૂનું રિવિઝન પૂરું કરો.`;
    } else if (revCovPct >= 75 && (ovTestAvg || 0) >= 70) {
      pTitle = "🏆 Topper Mindset (સંતુલિત તૈયારી)";
      pAdvice = "જબરદસ્ત! તમારી વાંચવાની ઝડપ, રિવિઝન અને ટેસ્ટ માર્ક્સ ત્રણેય સંતુલિત છે.";
    }

    // 7-Day Consistency Bars
    const logMap = {};
    (currentUser?.logs || []).forEach((l) => {
      logMap[l.date] = (logMap[l.date] || 0) + Number(l.pages || 0);
    });

    let maxP = 10;
    const daysArr = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDaysISO(today, -i);
      const p = logMap[d] || 0;
      if (p > maxP) maxP = p;
      const shortDay = new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
      daysArr.push({ p, shortDay, isToday: d === today });
    }

    // Test Trend SVG Points
    const lastTests = tests.slice(-10);
    const pts = lastTests.map((t, idx) => {
      const pct = Math.min(100, Math.max(0, Math.round((t.scored / t.total) * 100)));
      const x = lastTests.length === 1 ? 150 : Math.round((idx / (lastTests.length - 1)) * 260) + 20;
      const y = Math.round(90 - pct * 0.75) + 10;
      return { x, y, pct };
    });

    return {
      readinessScore: readiness,
      persona: pTitle,
      advice: pAdvice,
      memRetention: retention,
      mostRead: mRead,
      mostRev: mRev,
      leastRead: lRead,
      bestTest: bTest,
      subMetrics: sMetrics,
      weeklyBars: { maxP, daysArr },
      testSvgPoints: pts,
      overallTestAvg: ovTestAvg,
    };
  }, [currentUser, subjects, tests]);

  // Filter & Sort Tests
  const filteredTests = React.useMemo(() => {
    let list = tests.slice();
    if (histSubFilter !== "ALL") {
      list = list.filter(
        (t) => (t.subjects || []).includes(histSubFilter) || (t.subjectName || "").includes(histSubFilter)
      );
    }
    if (histSortBy === "latest") list.reverse();
    else if (histSortBy === "high") list.sort((a, b) => b.scored / b.total - a.scored / a.total);
    else if (histSortBy === "low") list.sort((a, b) => a.scored / a.total - b.scored / b.total);
    return list;
  }, [tests, histSubFilter, histSortBy]);

  return (
    <div id="tab-tests" className="space-y-3.5 anim-fade">
      {/* Target MCQ Website Promotion */}
      <a
        href={LIVE_TEST_URL}
        target="_blank"
        rel="noreferrer"
        className="one-card p-3.5 flex items-center justify-between bg-indigo-600/10 border-indigo-500/40 block hover:border-indigo-500 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-base font-bold shadow-sm">
            🌐
          </div>
          <div>
            <div className="text-xs font-extrabold text-indigo-500">
              Live MCQ Practice & Test Series
            </div>
            <div className="text-[11px] font-bold">
              Visit: <span className="underline">www.thetarget.in</span>
            </div>
          </div>
        </div>
        <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full">
          Open ↗
        </span>
      </a>

      {/* Sub-Navigation Pills */}
      <div className="grid grid-cols-3 gap-1.5 subtle-pill p-1">
        <button
          onClick={() => setSubView("overview")}
          className={`py-2 rounded-2xl text-xs font-extrabold transition ${
            subView === "overview"
              ? "bg-indigo-600 text-white shadow-sm"
              : "muted-text hover:text-indigo-500"
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setSubView("addtest")}
          className={`py-2 rounded-2xl text-xs font-extrabold transition ${
            subView === "addtest"
              ? "bg-indigo-600 text-white shadow-sm"
              : "muted-text hover:text-indigo-500"
          }`}
        >
          🎯 + Add Test
        </button>
        <button
          onClick={() => setSubView("chapters")}
          className={`py-2 rounded-2xl text-xs font-extrabold transition ${
            subView === "chapters"
              ? "bg-indigo-600 text-white shadow-sm"
              : "muted-text hover:text-indigo-500"
          }`}
        >
          📚 Sub & Chap
        </button>
      </div>

      {/* ================= SUBVIEW A: OVERVIEW ================= */}
      {subView === "overview" && (
        <div className="space-y-3.5 anim-fade">
          <div id="tourTargetAnalysis" className="one-card p-4 space-y-3 border-t-4 border-t-indigo-600">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold">🧠 Reading & Revision Distribution</h2>
              <div className="text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-600 text-white">
                Readiness: {readinessScore} / 100
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="subtle-pill p-2.5 border-l-4 border-l-indigo-500">
                <div className="text-[9px] font-extrabold uppercase muted-text">
                  📖 સૌથી વધુ વંચાયેલ વિષય
                </div>
                <div className="text-xs font-extrabold text-indigo-500 mt-0.5 truncate">
                  {mostRead?.name || "--"}
                </div>
                <div className="text-[10px] muted-text">
                  {mostRead ? `${mostRead.pRead}p (${mostRead.readShare}% Share)` : "0 Pages"}
                </div>
              </div>

              <div className="subtle-pill p-2.5 border-l-4 border-l-emerald-500">
                <div className="text-[9px] font-extrabold uppercase muted-text">
                  🔄 સૌથી વધુ રિવિઝન વિષય
                </div>
                <div className="text-xs font-extrabold text-emerald-500 mt-0.5 truncate">
                  {mostRev?.name || "--"}
                </div>
                <div className="text-[10px] muted-text">
                  {mostRev ? `${mostRev.pRev}p (${mostRev.revSessions} Revs)` : "0 Pages"}
                </div>
              </div>

              <div className="subtle-pill p-2.5 border-l-4 border-l-rose-500">
                <div className="text-[9px] font-extrabold uppercase muted-text">
                  ⚠️ સૌથી ઓછું ધ્યાન (Least Read)
                </div>
                <div className="text-xs font-extrabold text-rose-500 mt-0.5 truncate">
                  {leastRead?.name || "--"}
                </div>
                <div className="text-[10px] muted-text">Needs More Time</div>
              </div>

              <div className="subtle-pill p-2.5 border-l-4 border-l-purple-500">
                <div className="text-[9px] font-extrabold uppercase muted-text">
                  🏆 શ્રેષ્ઠ ટેસ્ટ વિષય
                </div>
                <div className="text-xs font-extrabold text-purple-500 mt-0.5 truncate">
                  {bestTest ? `${bestTest.name} (${bestTest.tAvg}%)` : "--"}
                </div>
                <div className="text-[10px] muted-text">Highest Test Avg</div>
              </div>
            </div>

            {/* Psychological Advice Card */}
            <div className="subtle-pill p-3 space-y-1 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold">{persona}</span>
                <span className="text-[10px] font-extrabold text-emerald-500">
                  Retention: {memRetention}%
                </span>
              </div>
              <p className="text-[11px] muted-text leading-relaxed">{advice}</p>
            </div>

            {/* Subject Test Averages Grid */}
            <div className="pt-2 border-t space-y-1.5" style={{ borderColor: "var(--border-col)" }}>
              <div className="text-xs font-extrabold">📊 Subject-Wise Test Average</div>
              <div className="grid grid-cols-2 gap-1.5">
                {subMetrics.length === 0 ? (
                  <div className="text-xs muted-text col-span-2">હજુ કોઈ વિષય ઉમેર્યો નથી.</div>
                ) : (
                  subMetrics.map((sm) => (
                    <div key={sm.id} className="subtle-pill px-3 py-2 flex items-center justify-between text-xs">
                      <span className="font-bold truncate pr-1">{sm.name}</span>
                      <span
                        className={`font-extrabold shrink-0 ${
                          sm.tAvg !== null
                            ? sm.tAvg >= 75
                              ? "text-emerald-500"
                              : sm.tAvg < 50
                              ? "text-rose-500"
                              : "text-amber-500"
                            : "muted-text"
                        }`}
                      >
                        {sm.tAvg !== null ? `${sm.tAvg}%` : "--%"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 7-Day Consistency Bar Graph */}
          <div id="streakGraphCardAnchor" className="one-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold">📊 7-Day Study Consistency Graph</h2>
              <span className="text-xs font-extrabold text-indigo-500">7-Day Consistency</span>
            </div>
            <div className="grid grid-cols-7 gap-2 items-end h-28 pt-5 px-2 subtle-pill">
              {weeklyBars.daysArr.map((item, idx) => {
                const hPct =
                  item.p > 0
                    ? Math.max(18, Math.round((item.p / weeklyBars.maxP) * 100))
                    : 8;
                return (
                  <div key={idx} className="flex flex-col items-center justify-end h-full">
                    <span className="text-[9px] font-extrabold muted-text mb-1">
                      {item.p > 0 ? `${item.p}p` : ""}
                    </span>
                    <div
                      style={{ height: `${hPct}%` }}
                      className={`w-full rounded-t-xl transition-all ${
                        item.p > 0
                          ? item.isToday
                            ? "bg-indigo-600"
                            : "bg-emerald-500"
                          : "bg-slate-400/20"
                      }`}
                    />
                    <span
                      className={`text-[9px] mt-1 ${
                        item.isToday ? "text-indigo-500 font-extrabold" : "muted-text"
                      }`}
                    >
                      {item.shortDay}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test Trend SVG Graph */}
          <div className="one-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold">📈 Test Score Progression Graph</h2>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-500">
                {overallTestAvg !== null ? `Avg: ${overallTestAvg}%` : "Avg: --%"}
              </span>
            </div>
            <div className="subtle-pill p-3 h-32 flex items-center justify-center">
              {testSvgPoints.length === 0 ? (
                <span className="text-xs muted-text">ટેસ્ટ માર્ક્સ ઉમેરશો એટલે અહીં ગ્રાફ દેખાશે 📈</span>
              ) : (
                <svg viewBox="0 0 300 110" className="w-full h-full overflow-visible">
                  <line x1="15" y1="22" x2="285" y2="22" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3" />
                  <line x1="15" y1="55" x2="285" y2="55" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3" />
                  <line x1="15" y1="90" x2="285" y2="90" stroke="currentColor" strokeOpacity="0.15" />
                  <polyline
                    fill="none"
                    stroke="#2B50EC"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={testSvgPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                  />
                  {testSvgPoints.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4.5" fill="#10B981" stroke="#fff" strokeWidth="1.5" />
                      <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="currentColor">
                        {p.pct}%
                      </text>
                    </g>
                  ))}
                </svg>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBVIEW B: ADD TEST ================= */}
      {subView === "addtest" && (
        <div className="space-y-3.5 anim-fade">
          <form onSubmit={handleAddTest} className="one-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold">🎯 ટેસ્ટના માર્ક્સ ઉમેરો</h2>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="theme-input text-[11px] font-bold px-2.5 py-1"
              />
            </div>

            {/* Test Modes */}
            <div className="grid grid-cols-3 gap-1 subtle-pill p-1">
              <button
                type="button"
                onClick={() => setTestMode("chapter")}
                className={`py-1.5 rounded-xl text-[10px] font-extrabold transition ${
                  testMode === "chapter" ? "bg-indigo-600 text-white shadow-sm" : "muted-text"
                }`}
              >
                📖 Chapter Test
              </button>
              <button
                type="button"
                onClick={() => setTestMode("subject")}
                className={`py-1.5 rounded-xl text-[10px] font-extrabold transition ${
                  testMode === "subject" ? "bg-indigo-600 text-white shadow-sm" : "muted-text"
                }`}
              >
                📚 Full Subject
              </button>
              <button
                type="button"
                onClick={() => setTestMode("mock")}
                className={`py-1.5 rounded-xl text-[10px] font-extrabold transition ${
                  testMode === "mock" ? "bg-indigo-600 text-white shadow-sm" : "muted-text"
                }`}
              >
                🏆 Grand Mock
              </button>
            </div>

            <input
              type="text"
              placeholder="ટેસ્ટનું નામ (Optional)"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full theme-input px-3.5 py-2 text-xs font-semibold"
            />

            {/* Subject & Chapter Selectors */}
            {testMode !== "mock" && (
              <div className="subtle-pill p-3 space-y-2">
                <div className="text-[10px] font-extrabold uppercase muted-text">
                  1. વિષય સિલેક્ટ કરો
                </div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {subjects.map((s) => {
                    const active = selectedSubIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleTestSub(s.id)}
                        className={`px-3 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap transition ${
                          active ? "bg-indigo-600 text-white" : "one-card muted-text"
                        }`}
                      >
                        {active ? "✓ " : ""}
                        {s.name}
                      </button>
                    );
                  })}
                </div>

                {testMode === "chapter" && (
                  <div>
                    <div
                      className="text-[10px] font-extrabold uppercase muted-text pt-1 mb-1 border-t"
                      style={{ borderColor: "var(--border-col)" }}
                    >
                      2. ચેપ્ટર સિલેક્ટ કરો
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {subjects
                        .filter((s) => selectedSubIds.includes(s.id))
                        .map((s) =>
                          (s.chapters || []).map((c) => {
                            const key = `${s.name}::${c.name}`;
                            const checked = selectedChapKeys.includes(key);
                            return (
                              <label key={key} className="flex items-center gap-2 text-xs p-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleTestChap(key)}
                                  className="accent-indigo-600"
                                />
                                <span className="truncate font-semibold">{c.name}</span>
                              </label>
                            );
                          })
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Score Inputs & Submit */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-bold muted-text ml-1">મેળવેલ માર્ક્સ</label>
                <input
                  type="number"
                  placeholder="e.g. 74"
                  value={scored}
                  onChange={(e) => setScored(e.target.value)}
                  className="w-full theme-input px-3 py-2 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[9px] font-bold muted-text ml-1">કુલ માર્ક્સ</label>
                <input
                  type="number"
                  placeholder="100"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className="w-full theme-input px-3 py-2 text-xs font-bold"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 rounded-2xl text-xs shadow-sm transition"
                >
                  + સેવ કરો
                </button>
              </div>
            </div>
          </form>

          {/* NEW: NEGATIVE MARKING & CUT-OFF SIMULATOR + MISTAKE TRACKER */}
          <div className="one-card p-4 space-y-3 border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">🧮 Negative Marking & Cut-off Calculator</h2>
                <p className="text-[10px] muted-text">0.25 / 0.33 નેગેટિવ માર્કિંગ ગણો અને સીધા ટેસ્ટ બોક્સમાં માર્ક્સ ભરો</p>
              </div>
              <span id="simNetScoreBadge" className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-indigo-600 text-white shadow-sm">
                Net: {simNetScore.toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <label className="text-[9px] font-bold muted-text">Attempted</label>
                <input
                  type="number"
                  placeholder="85"
                  value={simAttempt}
                  onChange={(e) => handleSimAttemptChange(e.target.value)}
                  className="w-full theme-input px-2.5 py-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold muted-text">Wrong (ખોટા)</label>
                <input
                  type="number"
                  placeholder="16"
                  value={simWrong}
                  onChange={(e) => handleSimWrongChange(e.target.value)}
                  className="w-full theme-input px-2.5 py-1.5 text-xs font-bold text-rose-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold muted-text">Negative</label>
                <select
                  value={simNegRatio}
                  onChange={(e) => handleSimNegChange(e.target.value)}
                  className="w-full theme-input px-2 py-1.5 text-xs font-bold"
                >
                  <option value="0.25">-0.25</option>
                  <option value="0.33">-0.33</option>
                  <option value="0.50">-0.50</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold muted-text">Target Cut-off</label>
                <input
                  type="number"
                  value={simCutoff}
                  onChange={(e) => setSimCutoff(e.target.value)}
                  className="w-full theme-input px-2.5 py-1.5 text-xs font-bold text-emerald-500"
                />
              </div>
            </div>
            <div className="subtle-pill p-2.5 text-[11px] font-semibold">
              {simAttemptNum > 0 ? (
                (() => {
                  const gap = +(simCutoffNum - simNetScore).toFixed(2);
                  const tukkaSaved = Math.ceil(gap / (1 + simNegNum));
                  if (gap <= 0) {
                    return (
                      <div>
                        <span className="text-emerald-500 font-extrabold">
                          🏆 સુપર! તમે તમારા Target Cut-off ({simCutoffNum}) કરતા +{Math.abs(gap)} માર્ક્સ આગળ છો!
                        </span>{" "}
                        (સાચા: {simRightNum}, નેગેટિવ કપાત: -{simPenalty.toFixed(2)})
                      </div>
                    );
                  } else {
                    return (
                      <div>
                        ⚠️ સાચા: <b>{simRightNum}</b> | નેગેટિવ કપાત: <b className="text-rose-500">-{simPenalty.toFixed(2)}</b>. Cut-off ({simCutoffNum}) સુધી પહોંચવા <b>+{gap} માર્ક્સ</b> ઘટે છે. જો <b>{simWrongNum} ખોટામાંથી માત્ર {Math.min(simWrongNum, tukkaSaved)} પ્રશ્નો</b> સુધાર્યા હોત તો Cut-off પાર થઈ જાત!
                      </div>
                    );
                  }
                })()
              ) : (
                <span className="muted-text">
                  ઉપર Attempted અને Wrong પ્રશ્નો નાખો એટલે તમારો Net Score અને Cut-off ગેપ દેખાશે.
                </span>
              )}
            </div>
          </div>

          {/* Test History */}
          <div className="one-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-extrabold">📋 ટેસ્ટ હિસ્ટ્રી (Edit / Delete)</h2>
              <div className="flex gap-1.5">
                <select
                  value={histSubFilter}
                  onChange={(e) => setHistSubFilter(e.target.value)}
                  className="theme-input text-[10px] font-bold px-2 py-1"
                >
                  <option value="ALL">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={histSortBy}
                  onChange={(e) => setHistSortBy(e.target.value)}
                  className="theme-input text-[10px] font-bold px-2 py-1"
                >
                  <option value="latest">🕒 Latest</option>
                  <option value="high">⬆️ High %</option>
                  <option value="low">⬇️ Low %</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {filteredTests.length === 0 ? (
                <div className="text-xs muted-text text-center py-3">કોઈ ટેસ્ટ રિઝલ્ટ નથી.</div>
              ) : (
                filteredTests.map((x) => {
                  const pct = Math.round((x.scored / x.total) * 100);
                  const col =
                    pct >= 75
                      ? "bg-emerald-500/20 text-emerald-500"
                      : pct >= 50
                      ? "bg-amber-500/20 text-amber-500"
                      : "bg-rose-500/20 text-rose-500";
                  return (
                    <div
                      key={x.id}
                      className="subtle-pill p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold truncate">{x.title || x.chapterName}</div>
                        <div className="text-[10px] muted-text mt-0.5 truncate">
                          {x.subjectName} • <b>{x.scored}/{x.total}</b> • {x.date}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${col}`}>
                          {pct}%
                        </span>
                        <button
                          onClick={() => handleEditTest(x)}
                          className="px-2 py-1 rounded-full one-card text-xs hover:border-indigo-500"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDeleteTest(x.id)}
                          className="text-rose-500 text-xs px-1.5 hover:bg-rose-500/10 rounded"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBVIEW C: SUBJECT & CHAPTER BREAKDOWN ================= */}
      {subView === "chapters" && (
        <div className="space-y-3.5 anim-fade">
          <div className="one-card p-4 space-y-2.5">
            <h2 className="text-sm font-extrabold">
              📚 Subject-Wise Share, Revision & Test Mastery
            </h2>
            <div className="space-y-2.5">
              {subMetrics.map((sm) => {
                const revPct = sm.pRead > 0 ? Math.round((sm.pRev / sm.pRead) * 100) : 0;
                return (
                  <div key={sm.id} className="subtle-pill p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">
                        {sm.name} <span className="text-[10px] text-indigo-500">({sm.readShare}% Share)</span>
                      </span>
                      <span
                        className={`text-[11px] font-extrabold ${
                          sm.tAvg !== null
                            ? sm.tAvg >= 75
                              ? "text-emerald-500"
                              : sm.tAvg < 50
                              ? "text-rose-500"
                              : "text-amber-500"
                            : "muted-text"
                        }`}
                      >
                        Test: {sm.tAvg !== null ? `${sm.tAvg}%` : "N/A"} ({sm.testCount})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] muted-text">
                      <span>
                        પૂર્ણ ચેપ્ટર: <b>{sm.cDone}/{sm.cTot} ({sm.chapPct}%)</b>
                      </span>
                      <span>
                        Read: <b>{sm.pRead}p</b> • Rev: <b className="text-emerald-500">{sm.pRev}p ({revPct}%)</b>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-400/20 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${sm.chapPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="one-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold">📖 Chapter-Wise Mastery Matrix</h2>
              <select
                value={breakdownSubFilter}
                onChange={(e) => setBreakdownSubFilter(e.target.value)}
                className="theme-input text-[10px] font-bold px-2.5 py-1"
              >
                <option value="ALL">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
              {subjects
                .filter((s) => breakdownSubFilter === "ALL" || s.id === breakdownSubFilter)
                .map((s) =>
                  (s.chapters || []).map((c) => {
                    const cTests = tests.filter(
                      (t) => (t.chapters || []).includes(c.name) || (t.chapterName || "").includes(c.name)
                    );
                    let sc = 0, tot = 0;
                    cTests.forEach((t) => { sc += Number(t.scored || 0); tot += Number(t.total || 0); });
                    const cAvg = tot > 0 ? Math.round((sc / tot) * 100) : null;
                    const rp = Math.min(c.donePages || 0, c.revisedPages || 0);

                    return (
                      <div key={c.id} className="subtle-pill p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold truncate">
                            {c.name} {c.completed ? "✅" : ""}
                          </div>
                          <div className="text-[10px] muted-text">
                            {s.name} • Read: <b>{c.donePages}p</b> | Rev: <b className="text-emerald-500">{rp}p</b>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs font-extrabold ${
                              cAvg !== null
                                ? cAvg >= 75
                                  ? "text-emerald-500"
                                  : cAvg < 50
                                  ? "text-rose-500"
                                  : "text-amber-500"
                                : "muted-text"
                            }`}
                          >
                            {cAvg !== null ? `${cAvg}%` : "No Test"}
                          </div>
                          <div className="text-[9px] muted-text">{cTests.length} Tests</div>
                        </div>
                      </div>
                    );
                  })
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
