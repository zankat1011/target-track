import React, { useState, useMemo } from "react";
import { useStudy, DEFAULT_MARKETPLACE_BOOKS } from "../../context/StudyContext";
import { useAuth } from "../../context/AuthContext";
import { nowFormattedTimestamp } from "../../utils/helpers";
import { ADMIN_MOBILE } from "../../utils/constants";

export function MarketplaceTab({ onBackToSyllabus }) {
  const { db, commitDb, currentUser, triggerCelebration } = useStudy();
  const { session } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState("browse"); // 'browse' | 'sell' | 'myHistory'
  const [historySubTab, setHistorySubTab] = useState("purchased"); // 'purchased' | 'listings'
  const [selectedExamFilter, setSelectedExamFilter] = useState("ALL");
  const [searchQ, setSearchQ] = useState("");

  // Sub-modal states
  const [previewBook, setPreviewBook] = useState(null);
  const [checkoutBook, setCheckoutBook] = useState(null);
  const [utrInput, setUtrInput] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Sell form states
  const [sellTitle, setSellTitle] = useState("");
  const [sellExam, setSellExam] = useState("CCE (Group A & B)");
  const [sellSubject, setSellSubject] = useState("");
  const [sellType, setSellType] = useState("Handwritten Notes");
  const [sellPrice, setSellPrice] = useState(49);
  const [sellTotalPages, setSellTotalPages] = useState(100);
  const [sellSamplePages, setSellSamplePages] = useState(5);
  const [sellDemoText, setSellDemoText] = useState("");
  const [sellDemoUrl, setSellDemoUrl] = useState("");
  const [sellFullUrl, setSellFullUrl] = useState("");
  const [sellUpi, setSellUpi] = useState("");

  // Guaranteed fallback so it's NEVER empty!
  const books = useMemo(() => {
    if (Array.isArray(db.marketplaceBooks) && db.marketplaceBooks.length > 0) {
      return db.marketplaceBooks;
    }
    return DEFAULT_MARKETPLACE_BOOKS;
  }, [db.marketplaceBooks]);

  const orders = db.marketplaceOrders || [];

  // Filter approved & live books for marketplace browsing
  const liveBooks = useMemo(() => {
    return books.filter((b) => {
      const isApproved = b.status === "Approved";
      const matchExam = selectedExamFilter === "ALL" || b.exam === selectedExamFilter;
      const q = searchQ.trim().toLowerCase();
      const matchQ =
        !q ||
        (b.title || "").toLowerCase().includes(q) ||
        (b.subject || "").toLowerCase().includes(q) ||
        (b.exam || "").toLowerCase().includes(q);
      return isApproved && matchExam && matchQ;
    });
  }, [books, selectedExamFilter, searchQ]);

  // My listings and my purchases
  const myListings = useMemo(() => {
    return books.filter((b) => b.sellerMobile === currentUser?.mobile);
  }, [books, currentUser?.mobile]);

  const myOrders = useMemo(() => {
    return orders.filter((o) => o.buyerMobile === currentUser?.mobile);
  }, [orders, currentUser?.mobile]);

  // Verified bought book IDs
  const myVerifiedBookIds = useMemo(() => {
    return new Set(
      myOrders.filter((o) => o.status === "Verified").map((o) => o.bookId)
    );
  }, [myOrders]);

  // Handle Sell Submission
  const handlePublishBook = (e) => {
    e.preventDefault();
    if (!sellTitle.trim()) return alert("કૃપા કરીને બુક કે નોટ્સનું શીર્ષક લખો.");
    if (!sellSubject.trim()) return alert("કૃપા કરીને વિષયનું નામ લખો.");
    if (Number(sellPrice) < 20) return alert("લઘુત્તમ કિંમત ₹20 હોવી જરૂરી છે.");
    if (!sellUpi.trim()) return alert("તમારી કમાણી (Payout) મેળવવા માટે તમારું UPI ID ફરજિયાત છે.");
    if (!sellFullUrl.trim()) return alert("બુક ડાઉનલોડ કરવા માટે Google Drive / Cloud લિંક આપવી જરૂરી છે.");

    const priceNum = Math.max(20, Math.round(Number(sellPrice) || 20));
    const adminCommission = Math.round(priceNum * 0.1); // 10%
    const sellerPayout = priceNum - adminCommission; // 90%

    const newBook = {
      id: `book_${Date.now()}`,
      title: sellTitle.trim(),
      authorAnon: `Verified Student #${Math.floor(100 + Math.random() * 900)}`,
      sellerMobile: currentUser?.mobile || session?.mobile || "",
      sellerName: currentUser?.name || "Student Seller",
      sellerUpi: sellUpi.trim(),
      exam: sellExam,
      subject: sellSubject.trim(),
      type: sellType,
      price: priceNum,
      adminCommissionPct: 10,
      adminFee: adminCommission,
      sellerPayout: sellerPayout,
      totalPages: Number(sellTotalPages) || 50,
      samplePagesCount: Number(sellSamplePages) || 5,
      sampleDemoText: sellDemoText.trim(),
      sampleDemoUrl: sellDemoUrl.trim(),
      fullDownloadUrl: sellFullUrl.trim(),
      status: "Pending", // Review required by Admin
      createdAt: nowFormattedTimestamp(),
      salesCount: 0,
      rating: 5.0,
    };

    const nextDb = {
      ...db,
      marketplaceBooks: [newBook, ...(db.marketplaceBooks || books)],
    };
    commitDb(nextDb);

    triggerCelebration(
      "📤 લિસ્ટિંગ સબમિટ થયું!",
      "એડમિન દ્વારા ચકાસીને ૨૪ કલાકમાં લાઈવ કરવામાં આવશે."
    );

    // Reset Form
    setSellTitle("");
    setSellSubject("");
    setSellDemoText("");
    setSellDemoUrl("");
    setSellFullUrl("");
    setSellUpi("");
    setActiveSubTab("myHistory");
    setHistorySubTab("listings");
  };

  // Handle Buy Checkout Order Creation
  const handleConfirmPurchase = () => {
    if (!utrInput.trim()) {
      return alert("કૃપા કરીને Google Pay / PhonePe માંથી ૧૨ આંકડાનો UTR / UPI Ref No. દાખલ કરો.");
    }

    setCheckoutSubmitting(true);
    const invoiceNum = `TT-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = {
      id: `ord_${Date.now()}`,
      invoiceNo: invoiceNum,
      bookId: checkoutBook.id,
      bookTitle: checkoutBook.title,
      bookExam: checkoutBook.exam,
      bookSubject: checkoutBook.subject,
      bookPrice: checkoutBook.price,
      adminFee: Math.round(checkoutBook.price * 0.1),
      sellerPayout: checkoutBook.price - Math.round(checkoutBook.price * 0.1),
      sellerMobile: checkoutBook.sellerMobile,
      sellerUpi: checkoutBook.sellerUpi,
      buyerMobile: currentUser?.mobile || session?.mobile || "",
      buyerName: currentUser?.name || "Student Buyer",
      buyerUtr: utrInput.trim().replace(/\s+/g, ""),
      status: "Pending Verification", // Admin will verify UTR & payment
      sellerPayoutStatus: "Pending",
      createdAt: nowFormattedTimestamp(),
      verifiedAt: "",
      downloadUrl: checkoutBook.fullDownloadUrl,
    };

    const nextDb = {
      ...db,
      marketplaceOrders: [newOrder, ...(db.marketplaceOrders || [])],
    };
    commitDb(nextDb);

    setCheckoutSubmitting(false);
    setCheckoutBook(null);
    setUtrInput("");

    triggerCelebration(
      "🧾 પેમેન્ટ રિક્વેસ્ટ મોકલાઈ!",
      "એડમિન વેરિફિકેશન પછી પૂર્ણ બુક તરત અનલોક થશે."
    );

    setActiveSubTab("myHistory");
    setHistorySubTab("purchased");
  };

  return (
    <div id="tab-marketplace" className="space-y-4 anim-fade">
      {/* Top Banner & Back Navigation */}
      <div className="one-card p-4 sm:p-5 bg-gradient-to-r from-emerald-500/15 via-indigo-500/10 to-teal-500/15 border-2 border-emerald-500/40 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
              📖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  TARGET BOOK & NOTES BAZAAR
                </h1>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                  LIVE
                </span>
              </div>
              <p className="text-xs muted-text font-medium mt-0.5">
                ટોપર્સની નોટ્સ ખરીદો અથવા તમારી નોટ્સ વેચીને <b>૯૦% ચોખ્ખી કમાણી</b> કરો
              </p>
            </div>
          </div>

          {onBackToSyllabus && (
            <button
              onClick={onBackToSyllabus}
              className="subtle-pill px-3.5 py-1.5 rounded-xl text-xs font-black hover:border-indigo-500 transition self-start sm:self-auto flex items-center gap-1.5"
            >
              <span>←</span>
              <span>પાછા સિલેબસ પર જાઓ</span>
            </button>
          )}
        </div>

        {/* 3 Main Action Sub-Tabs */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t overflow-x-auto no-scrollbar" style={{ borderColor: "var(--border-col)" }}>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setActiveSubTab("browse")}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-1.5 ${
                activeSubTab === "browse"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "subtle-pill hover:border-indigo-500"
              }`}
            >
              <span>🛒</span>
              <span>નોટ્સ ખરીદો (Browse)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold ml-1">
                {liveBooks.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab("sell")}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-1.5 ${
                activeSubTab === "sell"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "subtle-pill hover:border-emerald-500"
              }`}
            >
              <span>📤</span>
              <span>વેચો (Sell Notes)</span>
            </button>
            <button
              onClick={() => setActiveSubTab("myHistory")}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-1.5 ${
                activeSubTab === "myHistory"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "subtle-pill hover:border-indigo-500"
              }`}
            >
              <span>📋</span>
              <span>મારી હિસ્ટ્રી ({myOrders.length + myListings.length})</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-xl shrink-0">
            <span>🛡️ ૧૦% એડમિન ચાર્જ • ૯૦% સીધા સેલરના UPI માં</span>
          </div>
        </div>
      </div>

      {/* ================= VIEW 1: BROWSE NOTES ================= */}
      {activeSubTab === "browse" && (
        <div className="space-y-4 anim-fade">
          {/* Search & Exam Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="વિષય, પુસ્તક અથવા ટોપિક શોધો (દા.ત. બંધારણ, Reasoning, GPSC)..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full theme-input pl-9 pr-3 py-2.5 text-xs font-semibold"
              />
              <span className="absolute left-3 top-3 text-xs muted-text">🔍</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {["ALL", "CCE (Group A & B)", "GPSC Class 1-2", "Police PSI / Constable", "General / Other"].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setSelectedExamFilter(ex)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition ${
                    selectedExamFilter === ex
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "subtle-pill hover:border-indigo-500"
                  }`}
                >
                  {ex === "ALL" ? "બધી પરીક્ષાઓ" : ex}
                </button>
              ))}
            </div>
          </div>

          {/* Books Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {liveBooks.map((book) => {
              const isBought = myVerifiedBookIds.has(book.id);

              return (
                <div
                  key={book.id}
                  className="one-card p-4 space-y-3 flex flex-col justify-between border-2 hover:border-indigo-500/50 transition group shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-500">
                        {book.exam}
                      </span>
                      <span className="text-sm font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-xl">
                        ₹{book.price}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-black leading-snug line-clamp-2 group-hover:text-indigo-500 transition">
                      {book.title}
                    </h3>

                    <div className="flex items-center gap-2 text-[10px] muted-text font-bold">
                      <span>🏷️ {book.subject}</span>
                      <span>•</span>
                      <span>📄 {book.totalPages} પેજ</span>
                      <span>•</span>
                      <span>⭐ {book.rating || 5.0}</span>
                    </div>

                    <div className="text-[10px] subtle-pill px-2.5 py-1 text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-between">
                      <span>સેલર: {book.authorAnon}</span>
                      <span className="text-emerald-500 font-bold">✓ Verified</span>
                    </div>
                  </div>

                  {/* Action Buttons: Demo Preview & Unlock */}
                  <div className="pt-2 border-t space-y-2" style={{ borderColor: "var(--border-col)" }}>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewBook(book)}
                        className="subtle-pill py-2 text-xs font-black hover:border-indigo-500 transition flex items-center justify-center gap-1"
                        title="ફ્રી સેમ્પલ પેજ જુઓ"
                      >
                        <span>👁️</span>
                        <span>ડેમો પેજ</span>
                      </button>

                      {isBought ? (
                        <a
                          href={book.fullDownloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1 text-center"
                        >
                          <span>📥</span>
                          <span>ડાઉનલોડ</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCheckoutBook(book)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1"
                        >
                          <span>🔒</span>
                          <span>ખરીદો (₹{book.price})</span>
                        </button>
                      )}
                    </div>
                    <div className="text-[9px] text-center muted-text font-semibold">
                      🔒 સુરક્ષિત એડમિન પેમેન્ટ • ત્વરિત ડાઉનલોડ
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: SELL NOTES / BOOK ================= */}
      {activeSubTab === "sell" && (
        <div className="max-w-2xl mx-auto space-y-4 anim-fade">
          <div className="one-card p-4 bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border-emerald-500/30 flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="text-xs space-y-1">
              <div className="font-black text-emerald-500">વિદ્યાર્થીઓ માટે 90% પારદર્શક કમાણી નીતિ</div>
              <p className="muted-text leading-relaxed">
                તમારી બનાવેલી હેન્ડરાઈટિંગ નોટ્સ કે બુક અહીં મૂકો. વેચાણ પર માત્ર ૧૦% એડમિન સર્વિસ ચાર્જ કપાઈને <b>૯૦% રકમ સીધી તમારા UPI ID માં</b> ટ્રાન્સફર થશે.
              </p>
            </div>
          </div>

          <form onSubmit={handlePublishBook} className="one-card p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold muted-text uppercase">પુસ્તક / નોટ્સનું શીર્ષક *</label>
              <input
                type="text"
                placeholder="દા.ત. CCE ભારતનું બંધારણ સંપૂર્ણ શોર્ટ નોટ્સ (Handwritten)"
                value={sellTitle}
                onChange={(e) => setSellTitle(e.target.value)}
                className="w-full theme-input p-3 text-xs font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold muted-text uppercase">પરીક્ષા કેટેગરી *</label>
                <select
                  value={sellExam}
                  onChange={(e) => setSellExam(e.target.value)}
                  className="w-full theme-input p-3 text-xs font-bold"
                >
                  <option value="CCE (Group A & B)">CCE (Group A & B)</option>
                  <option value="GPSC Class 1-2">GPSC Class 1-2</option>
                  <option value="Police PSI / Constable">Police PSI / Constable</option>
                  <option value="Talati / Jr Clerk">Talati / Jr Clerk</option>
                  <option value="TET / TAT">TET / TAT</option>
                  <option value="General / Other">General / All Exams</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold muted-text uppercase">વિષયનું નામ *</label>
                <input
                  type="text"
                  placeholder="દા.ત. ઇતિહાસ, ગણિત, બંધારણ"
                  value={sellSubject}
                  onChange={(e) => setSellSubject(e.target.value)}
                  className="w-full theme-input p-3 text-xs font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold muted-text uppercase">મટીરીયલ પ્રકાર</label>
                <select
                  value={sellType}
                  onChange={(e) => setSellType(e.target.value)}
                  className="w-full theme-input p-3 text-xs font-bold"
                >
                  <option value="Handwritten Notes">હસ્તલિખિત નોટ્સ</option>
                  <option value="Formula / Short Sheet">સૂત્ર / શોર્ટ શીટ</option>
                  <option value="Printed Material">પ્રિન્ટેડ બુક / PDF</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold muted-text uppercase">કુલ પેજ</label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  value={sellTotalPages}
                  onChange={(e) => setSellTotalPages(e.target.value)}
                  className="w-full theme-input p-3 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold muted-text uppercase">વેચાણ કિંમત (₹) *</label>
                <input
                  type="number"
                  min="20"
                  max="2000"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full theme-input p-3 text-xs font-black text-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Live Commission Calculator Card */}
            <div className="p-3.5 rounded-2xl subtle-pill flex items-center justify-between text-xs border" style={{ borderColor: "var(--border-col)" }}>
              <div>
                <span className="muted-text">કુલ કિંમત: </span>
                <b className="text-slate-800 dark:text-slate-200">₹{sellPrice || 0}</b>
                <span className="text-[10px] muted-text ml-2">(એડમિન કમિશન 10%: -₹{Math.round((sellPrice || 0) * 0.1)})</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] muted-text block">તમારી ચોખ્ખી કમાણી:</span>
                <span className="text-base font-black text-emerald-500">
                  ₹{(sellPrice || 0) - Math.round((sellPrice || 0) * 0.1)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-extrabold muted-text uppercase">તમારું UPI ID (કમાણી મેળવવા માટે) *</label>
              <input
                type="text"
                placeholder="દા.ત. 9876543210@okaxis અથવા yourname@upi"
                value={sellUpi}
                onChange={(e) => setSellUpi(e.target.value)}
                className="w-full theme-input p-3 text-xs font-bold"
                required
              />
              <span className="text-[10px] muted-text block">
                🔒 આ UPI ID માત્ર એડમિનને જ દેખાશે, ખરીદનારને ક્યારેય નહીં દેખાય.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-extrabold muted-text uppercase">ડેમો સેમ્પલ પેજ વિગત (ફ્રી પ્રિવ્યૂ માટે) *</label>
              <textarea
                rows="3"
                placeholder="આ નોટ્સમાં કયા કયા મુખ્ય ટોપિક્સ અને શોર્ટકટ્સ છે તે લખો (દા.ત. પ્રકરણ ૧ થી ૩ નો સારાંશ)..."
                value={sellDemoText}
                onChange={(e) => setSellDemoText(e.target.value)}
                className="w-full theme-input p-3 text-xs font-semibold"
              ></textarea>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-extrabold muted-text uppercase">સંપૂર્ણ PDF ડાઉનલોડ લિંક (Google Drive / Cloud Link) *</label>
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/.../view"
                value={sellFullUrl}
                onChange={(e) => setSellFullUrl(e.target.value)}
                className="w-full theme-input p-3 text-xs font-bold"
                required
              />
              <span className="text-[10px] text-amber-500 font-bold block">
                🔒 આ લિંક લોક રહેશે. માત્ર એડમિન દ્વારા પેમેન્ટ વેરિફાય થયા પછી જ ખરીદનારને મળશે.
              </span>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl text-xs shadow-md transition"
            >
              🚀 રિવ્યૂ માટે સબમિટ કરો (+૯૦% કમાણી)
            </button>
          </form>
        </div>
      )}

      {/* ================= VIEW 3: MY ORDERS & LISTINGS ================= */}
      {activeSubTab === "myHistory" && (
        <div className="space-y-4 anim-fade">
          <div className="flex gap-2 border-b pb-2" style={{ borderColor: "var(--border-col)" }}>
            <button
              onClick={() => setHistorySubTab("purchased")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                historySubTab === "purchased" ? "bg-indigo-600 text-white shadow-xs" : "subtle-pill"
              }`}
            >
              📥 મારી ખરીદેલી નોટ્સ ({myOrders.length})
            </button>
            <button
              onClick={() => setHistorySubTab("listings")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                historySubTab === "listings" ? "bg-indigo-600 text-white shadow-xs" : "subtle-pill"
              }`}
            >
              📤 મારી મૂકેલી નોટ્સ ({myListings.length})
            </button>
          </div>

          {/* Sub-view: Purchased Orders */}
          {historySubTab === "purchased" && (
            <div className="space-y-3">
              {myOrders.length === 0 ? (
                <div className="text-center py-10 subtle-pill p-6 rounded-2xl text-xs muted-text">
                  તમે હજુ કોઈ નોટ્સ કે બુક ખરીદી નથી. ઉપર 'નોટ્સ ખરીદો' માંથી બ્રાઉઝ કરો.
                </div>
              ) : (
                myOrders.map((ord) => {
                  const isVerified = ord.status === "Verified";

                  return (
                    <div key={ord.id} className="one-card p-4 space-y-2.5 shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs sm:text-sm font-black">{ord.bookTitle}</div>
                          <div className="text-[10px] muted-text font-bold mt-0.5">
                            Invoice: {ord.invoiceNo} • {ord.createdAt}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            isVerified
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-amber-500/15 text-amber-500"
                          }`}
                        >
                          {isVerified ? "✓ Verified & Active" : "⏳ Review Pending"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t text-xs" style={{ borderColor: "var(--border-col)" }}>
                        <div className="font-extrabold text-slate-800 dark:text-slate-200">
                          ચુકવેલ રકમ: <span className="text-emerald-500 font-black">₹{ord.bookPrice}</span> (UTR: {ord.buyerUtr})
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedInvoice(ord)}
                            className="subtle-pill px-3 py-1.5 text-[10px] font-black hover:border-indigo-500"
                          >
                            🧾 ડિજિટલ બિલ
                          </button>
                          {isVerified && (
                            <a
                              href={ord.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-[10px] font-black hover:bg-emerald-700 shadow-xs"
                            >
                              📥 Download PDF
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Sub-view: My Listings */}
          {historySubTab === "listings" && (
            <div className="space-y-3">
              {myListings.length === 0 ? (
                <div className="text-center py-10 subtle-pill p-6 rounded-2xl text-xs muted-text">
                  તમે હજુ કોઈ બુક લિસ્ટ કરી નથી. ઉપર 'વેચો' બટન પર ક્લિક કરીને તમારી નોટ્સ મૂકો!
                </div>
              ) : (
                myListings.map((b) => (
                  <div key={b.id} className="one-card p-4 space-y-2 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs sm:text-sm font-black">{b.title}</div>
                        <div className="text-[10px] muted-text font-bold mt-0.5">
                          {b.exam} • {b.subject} • ₹{b.price} (તમને મળશે: ₹{b.sellerPayout})
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          b.status === "Approved"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : b.status === "Rejected"
                            ? "bg-rose-500/15 text-rose-500"
                            : "bg-amber-500/15 text-amber-500"
                        }`}
                      >
                        {b.status === "Approved"
                          ? "🟢 Live in Bazaar"
                          : b.status === "Rejected"
                          ? "🔴 Rejected"
                          : "⏳ Under Review"}
                      </span>
                    </div>
                    <div className="text-[10px] muted-text">
                      વેચાણ: {b.salesCount || 0} વખત • Payout UPI: {b.sellerUpi}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= SUB-MODAL 1: SAMPLE DEMO PREVIEW ================= */}
      {previewBook && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-lg one-card p-5 space-y-3.5 border-2 border-indigo-500 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">👁️</span>
                <h3 className="text-sm font-black">ડેમો સેમ્પલ પેજ પ્રિવ્યૂ</h3>
              </div>
              <button
                onClick={() => setPreviewBook(null)}
                className="w-7 h-7 rounded-full subtle-pill flex items-center justify-center text-xs font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs sm:text-sm font-black">{previewBook.title}</div>
              <div className="text-[10px] muted-text font-bold">
                વિષય: {previewBook.subject} • કેટેગરી: {previewBook.exam}
              </div>

              <div className="p-3.5 rounded-2xl subtle-pill text-xs whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto font-medium">
                {previewBook.sampleDemoText || "આ પુસ્તકના પ્રથમ ૫ પેજનો ડેમો સારાંશ અહીં જોઈ શકાય છે."}
              </div>

              {previewBook.sampleDemoUrl && (
                <a
                  href={previewBook.sampleDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs font-black text-indigo-500 underline py-1"
                >
                  🔗 સંપૂર્ણ ડેમો પ્રિવ્યૂ લિંક ખોલો ➔
                </a>
              )}
            </div>

            <div className="pt-2 border-t flex justify-end gap-2" style={{ borderColor: "var(--border-col)" }}>
              <button
                onClick={() => setPreviewBook(null)}
                className="subtle-pill px-4 py-2 text-xs font-bold"
              >
                બંધ કરો
              </button>
              <button
                onClick={() => {
                  const b = previewBook;
                  setPreviewBook(null);
                  setCheckoutBook(b);
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm"
              >
                🔒 ખરીદો (₹{previewBook.price})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-MODAL 2: BUY CHECKOUT ================= */}
      {checkoutBook && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-md one-card p-5 space-y-4 border-2 border-emerald-500 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <h3 className="text-sm font-black">સુરક્ષિત ખરીદી & પેમેન્ટ</h3>
              </div>
              <button
                onClick={() => setCheckoutBook(null)}
                className="w-7 h-7 rounded-full subtle-pill flex items-center justify-center text-xs font-black"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
              <div className="text-xs font-black text-indigo-500">{checkoutBook.title}</div>
              <div className="flex items-center justify-between text-xs font-bold pt-1">
                <span>કુલ ચુકવવાની રકમ:</span>
                <span className="text-base font-black text-emerald-500">₹{checkoutBook.price}</span>
              </div>
            </div>

            {/* UPI Payment Instructions */}
            <div className="one-card p-3 space-y-2 text-center bg-black/5 dark:bg-white/5">
              <div className="text-[11px] font-black">એડમિન ઓફિશિયલ UPI પર પેમેન્ટ કરો:</div>
              <div className="text-xs font-mono font-black text-indigo-500 select-all bg-white dark:bg-stone-800 p-2 rounded-xl border border-indigo-500/30">
                {ADMIN_MOBILE}@upi
              </div>
              <p className="text-[10px] muted-text leading-tight">
                GPay, PhonePe કે Paytm માંથી <b>₹{checkoutBook.price}</b> મોકલીને ૧૨ આંકડાનો UTR નંબર નીચે નાખો.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-emerald-600 block">
                ૧૨ આંકડાનો UPI Ref / UTR નંબર દાખલ કરો: *
              </label>
              <input
                type="text"
                placeholder="દા.ત. 430129482910"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                className="w-full theme-input p-2.5 text-xs font-black text-center tracking-widest uppercase border-emerald-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setCheckoutBook(null)}
                className="subtle-pill py-2.5 text-xs font-bold"
              >
                રદ કરો
              </button>
              <button
                onClick={handleConfirmPurchase}
                disabled={checkoutSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition"
              >
                {checkoutSubmitting ? "ચકાસણી..." : "✓ કન્ફર્મ કરો"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-MODAL 3: DIGITAL BILL / INVOICE ================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-sm one-card p-6 space-y-4 border-2 border-indigo-500 shadow-2xl bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-col)" }}>
              <div>
                <div className="text-xs font-black tracking-widest text-indigo-500">TARGET TRACK OS</div>
                <div className="text-[10px] muted-text">ઓફિશિયલ ડિજિટલ રસીદ (Invoice)</div>
              </div>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                PAID & VERIFIED
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="muted-text">Invoice No:</span>
                <span className="font-mono font-bold">{selectedInvoice.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted-text">તારીખ:</span>
                <span className="font-semibold">{selectedInvoice.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted-text">ખરીદનાર:</span>
                <span className="font-bold">{selectedInvoice.buyerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted-text">પુસ્તક:</span>
                <span className="font-bold max-w-[180px] truncate">{selectedInvoice.bookTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted-text">UTR Ref:</span>
                <span className="font-mono">{selectedInvoice.buyerUtr}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl subtle-pill space-y-1.5 text-xs border" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex justify-between">
                <span>બુક મૂળ કિંમત:</span>
                <span>₹{selectedInvoice.bookPrice}</span>
              </div>
              <div className="flex justify-between text-[10px] muted-text">
                <span>પ્લેટફોર્મ વેરિફિકેશન (10%):</span>
                <span>શામેલ છે</span>
              </div>
              <div className="flex justify-between pt-1 border-t font-black text-sm text-indigo-500" style={{ borderColor: "var(--border-col)" }}>
                <span>કુલ ચુકવણી:</span>
                <span>₹{selectedInvoice.bookPrice}</span>
              </div>
            </div>

            <div className="text-[9px] text-center muted-text leading-tight">
              આ કમ્પ્યુટર-જનરેટેડ ડિજિટલ બિલ છે. Target Track ગેરંટી સાથે ઉપલબ્ધ.
            </div>

            <button
              onClick={() => setSelectedInvoice(null)}
              className="w-full subtle-pill py-2 text-xs font-black hover:border-indigo-500"
            >
              બંધ કરો
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
