import React, { useState, useMemo } from "react";
import { useStudy, DEFAULT_MARKETPLACE_BOOKS } from "../../context/StudyContext";
import { useAuth } from "../../context/AuthContext";
import { nowFormattedTimestamp } from "../../utils/helpers";
import { ADMIN_MOBILE } from "../../utils/constants";

export function MarketplaceTab({ onBackToSyllabus }) {
  const { db, commitDb, currentUser, triggerCelebration } = useStudy();
  const { session } = useAuth();

  // Main Sub-Tabs: 'browse' | 'bundles' | 'wallet' | 'library'
  const [activeSubTab, setActiveSubTab] = useState("browse");
  const [selectedExamFilter, setSelectedExamFilter] = useState("ALL");
  const [searchQ, setSearchQ] = useState("");

  // Sub-modal states
  const [previewBook, setPreviewBook] = useState(null);
  const [activeDemoImageIdx, setActiveDemoImageIdx] = useState(0);
  const [checkoutBook, setCheckoutBook] = useState(null);
  const [utrInput, setUtrInput] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [sellerProfileToView, setSellerProfileToView] = useState(null);
  const [reviewOrderToRate, setReviewOrderToRate] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutAmountInput, setPayoutAmountInput] = useState("");
  const [payoutUpiInput, setPayoutUpiInput] = useState("");
  const [vipUpgradeModalOpen, setVipUpgradeModalOpen] = useState(false);
  const [vipUtrInput, setVipUtrInput] = useState("");

  // Sell form states
  const [sellTitle, setSellTitle] = useState("");
  const [sellExam, setSellExam] = useState("CCE (Group A & B)");
  const [sellSubject, setSellSubject] = useState("");
  const [sellType, setSellType] = useState("Handwritten Notes");
  const [sellIsBundle, setSellIsBundle] = useState(false);
  const [sellBundleItemsText, setSellBundleItemsText] = useState("");
  const [sellOriginalPrice, setSellOriginalPrice] = useState(99);
  const [sellOfferPrice, setSellOfferPrice] = useState(49);
  const [sellPlanChoice, setSellPlanChoice] = useState("commission_10"); // 'commission_10' | 'fixed_500'
  const [sellTotalPages, setSellTotalPages] = useState(100);
  const [sellSamplePages, setSellSamplePages] = useState(5);
  const [sellDemoText, setSellDemoText] = useState("");
  const [sellCoverImage, setSellCoverImage] = useState("");
  const [sellDemoImages, setSellDemoImages] = useState([]);
  const [sellDirectFileData, setSellDirectFileData] = useState("");
  const [sellDirectFileName, setSellDirectFileName] = useState("");
  const [sellFullUrlBackup, setSellFullUrlBackup] = useState("");
  const [sellUpi, setSellUpi] = useState("");
  const [sellBio, setSellBio] = useState("");

  // All Books with fallback
  const books = useMemo(() => {
    if (Array.isArray(db.marketplaceBooks) && db.marketplaceBooks.length > 0) {
      return db.marketplaceBooks;
    }
    return DEFAULT_MARKETPLACE_BOOKS;
  }, [db.marketplaceBooks]);

  const orders = db.marketplaceOrders || [];
  const payouts = db.marketplacePayouts || [];
  const subscriptions = db.marketplaceSubscriptions || [];

  const userMobile = currentUser?.mobile || session?.mobile || "";

  // Check if current user has an active ₹500 3-Month VIP Plan
  const activeUserSubscription = useMemo(() => {
    return subscriptions.find(
      (s) => s.sellerMobile === userMobile && s.status === "active"
    );
  }, [subscriptions, userMobile]);

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
        (b.exam || "").toLowerCase().includes(q) ||
        (b.sellerName || "").toLowerCase().includes(q);
      return isApproved && matchExam && matchQ;
    });
  }, [books, selectedExamFilter, searchQ]);

  // Special Bundle packs
  const bundleBooks = useMemo(() => {
    return liveBooks.filter((b) => b.isBundle);
  }, [liveBooks]);

  // My listings and my purchases
  const myListings = useMemo(() => {
    return books.filter((b) => b.sellerMobile === userMobile);
  }, [books, userMobile]);

  const myOrders = useMemo(() => {
    return orders.filter((o) => o.buyerMobile === userMobile);
  }, [orders, userMobile]);

  // My Payout Requests
  const myPayouts = useMemo(() => {
    return payouts.filter((p) => p.sellerMobile === userMobile);
  }, [payouts, userMobile]);

  // Verified bought book IDs
  const myVerifiedOrders = useMemo(() => {
    return myOrders.filter((o) => o.status === "Verified");
  }, [myOrders]);

  const myVerifiedBookIds = useMemo(() => {
    return new Set(myVerifiedOrders.map((o) => o.bookId));
  }, [myVerifiedOrders]);

  // ============================================================
  // SELLER WALLET CALCULATIONS (Requirement 1, 3 & 8)
  // ============================================================
  const sellerWalletStats = useMemo(() => {
    // Orders of books sold by this seller
    const sellerSoldOrders = orders.filter(
      (o) => o.sellerMobile === userMobile && o.status === "Verified"
    );

    // Total gross sales and net earnings
    let totalGrossSales = 0;
    let totalNetEarnings = 0;

    sellerSoldOrders.forEach((ord) => {
      const price = Number(ord.bookPrice) || 0;
      totalGrossSales += price;
      // If seller has active VIP subscription, 0% commission (100% net)
      if (ord.sellerPlanApplied === "fixed_500") {
        totalNetEarnings += price;
      } else {
        const adminFee = Math.round(price * 0.1);
        totalNetEarnings += price - adminFee;
      }
    });

    // Payout requests calculations
    let totalPaidOut = 0;
    let totalPendingPayout = 0;
    let totalReversed = 0;

    myPayouts.forEach((p) => {
      const amt = Number(p.amount) || 0;
      if (p.status === "Paid") {
        totalPaidOut += amt;
      } else if (p.status === "Pending") {
        totalPendingPayout += amt;
      } else if (p.status === "Reversed") {
        totalReversed += amt;
      }
    });

    // Available balance = Net Earnings - (Paid Out + Pending)
    const availableBalance = Math.max(
      0,
      totalNetEarnings - (totalPaidOut + totalPendingPayout)
    );

    return {
      totalSalesCount: sellerSoldOrders.length,
      totalGrossSales,
      totalNetEarnings,
      totalPaidOut,
      totalPendingPayout,
      totalReversed,
      availableBalance,
    };
  }, [orders, myPayouts, userMobile]);

  // File Upload Handlers (FileReader Base64 for local storage)
  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      return alert("કવર ફોટો ૨ MB કરતા નાનો હોવો જોઈએ.");
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSellCoverImage(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDemoPagesUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length > 6) {
      alert("મહત્તમ ૬ ડેમો ફોટા અપલોડ કરી શકાય છે.");
    }
    const validFiles = files.slice(0, 6);
    const newDemoUrls = [];
    let processed = 0;

    validFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newDemoUrls.push(ev.target.result);
        processed++;
        if (processed === validFiles.length) {
          setSellDemoImages((prev) => [...prev, ...newDemoUrls].slice(0, 8));
        }
      };
      reader.readAsDataURL(f);
    });
  };

  const handleDirectPdfUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSellDirectFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSellDirectFileData(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Direct Book File Downloader (Requirement 2 & 7)
  const handleDownloadBookPdf = (order) => {
    const currentCount = Number(order.downloadCount || 0);

    // Limit check: Max 2 Downloads Allowed
    if (currentCount >= 2) {
      return alert(
        "🔒 ડાઉનલોડ મર્યાદા સમાપ્ત!\nતમે આ પુસ્તક મહત્તમ ૨ વખત ડાઉનલોડ કરી લીધું છે (2/2 Downloads Used).\nસુરક્ષાના નિયમો મુજબ લિંક એક્સપાયર થઈ ગઈ છે."
      );
    }

    const newCount = currentCount + 1;

    // Update download count in database
    const nextOrders = orders.map((o) =>
      o.id === order.id ? { ...o, downloadCount: newCount } : o
    );
    commitDb({ ...db, marketplaceOrders: nextOrders });

    // Native file download directly from website (Base64 data or fallback link)
    const fileData = order.fileData || order.downloadUrl;
    const cleanTitle = (order.bookTitle || "Target_Notes")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .slice(0, 30);

    if (fileData && fileData.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = fileData;
      a.download = `${cleanTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (fileData && fileData.startsWith("http")) {
      window.open(fileData, "_blank");
    } else {
      const blob = new Blob(
        [
          `TARGET TRACK TOPPER STUDY MATERIAL\n\nTitle: ${order.bookTitle}\nExam: ${order.bookExam || "General"}\nSubject: ${order.bookSubject || "General"}\nInvoice: ${order.invoiceNo}\nDownloaded: ${nowFormattedTimestamp()}\n\nAuthorized for Student: ${order.buyerName} (${order.buyerMobile})\nTarget Track Copyright © All Rights Reserved.`,
        ],
        { type: "text/plain;charset=utf-8" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanTitle}_Handwritten_Notes.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    triggerCelebration(
      `📥 ડાઉનલોડ શરૂ થયું (${newCount}/2)!`,
      `બાકી રહેલ ડાઉનલોડ: ${2 - newCount}/2 વખત.`
    );
  };

  // Submit New Book / Bundle for Sale
  const handlePublishBook = (e) => {
    e.preventDefault();
    if (!sellTitle.trim()) return alert("કૃપા કરીને બુક કે નોટ્સનું શીર્ષક લખો.");
    if (!sellSubject.trim()) return alert("કૃપા કરીને વિષયનું નામ લખો.");
    const offerNum = Math.max(20, Math.round(Number(sellOfferPrice) || 20));
    const origNum = Math.max(offerNum, Math.round(Number(sellOriginalPrice) || offerNum));
    if (!sellUpi.trim()) return alert("તમારી કમાણી (Payout) મેળવવા માટે UPI ID ફરજિયાત છે.");

    // Direct PDF or link required
    if (!sellDirectFileData && !sellFullUrlBackup.trim()) {
      return alert(
        "કૃપા કરીને વેબસાઈટ પરથી ડાઉનલોડ થાય તે માટે સીધી PDF ફાઈલ અપલોડ કરો અથવા Cloud લિંક આપો."
      );
    }

    // Determine plan: active VIP plan gives 0% commission, otherwise 10%
    const isVip = activeUserSubscription || sellPlanChoice === "fixed_500";
    const commissionPct = isVip ? 0 : 10;
    const adminCommission = Math.round(offerNum * (commissionPct / 100));
    const sellerPayout = offerNum - adminCommission;

    let bundleItemsArray = [];
    if (sellIsBundle && sellBundleItemsText.trim()) {
      bundleItemsArray = sellBundleItemsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const newBook = {
      id: `book_${Date.now()}`,
      title: sellTitle.trim(),
      authorAnon: `${currentUser?.name || "Topper Student"} (Verified)`,
      sellerMobile: userMobile,
      sellerName: currentUser?.name || "Student Seller",
      sellerBio: sellBio.trim() || "Target Track Verified Contributor",
      sellerUpi: sellUpi.trim(),
      exam: sellExam,
      subject: sellSubject.trim(),
      type: sellType,
      isBundle: sellIsBundle,
      bundleItems: bundleItemsArray,
      originalPrice: origNum,
      price: offerNum,
      sellerPlan: isVip ? "fixed_500" : "commission_10",
      adminCommissionPct: commissionPct,
      adminFee: adminCommission,
      sellerPayout: sellerPayout,
      totalPages: Number(sellTotalPages) || 50,
      samplePagesCount: Number(sellSamplePages) || 5,
      coverImage:
        sellCoverImage ||
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
      demoImages: sellDemoImages,
      sampleDemoText: sellDemoText.trim(),
      sampleDemoUrl: "",
      fileData: sellDirectFileData || "",
      fileName: sellDirectFileName || "Book_Notes.pdf",
      fullDownloadUrl: sellFullUrlBackup.trim() || "",
      status: "Pending", // Review required by Admin
      createdAt: nowFormattedTimestamp(),
      salesCount: 0,
      rating: 5.0,
      ratings: [],
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
    setSellIsBundle(false);
    setSellBundleItemsText("");
    setSellDemoText("");
    setSellCoverImage("");
    setSellDemoImages([]);
    setSellDirectFileData("");
    setSellDirectFileName("");
    setSellFullUrlBackup("");
    setSellUpi("");
    setSellBio("");
    setActiveSubTab("wallet");
  };

  // Handle Buy Checkout Order Creation
  const handleConfirmPurchase = () => {
    if (!utrInput.trim()) {
      return alert("કૃપા કરીને Google Pay / PhonePe માંથી ૧૨ આંકડાનો UTR / UPI Ref No. દાખલ કરો.");
    }

    setCheckoutSubmitting(true);
    const invoiceNum = `TT-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const isSellerVip = checkoutBook.sellerPlan === "fixed_500";
    const adminCommission = isSellerVip ? 0 : Math.round(checkoutBook.price * 0.1);
    const sellerPayout = checkoutBook.price - adminCommission;

    const newOrder = {
      id: `ord_${Date.now()}`,
      invoiceNo: invoiceNum,
      bookId: checkoutBook.id,
      bookTitle: checkoutBook.title,
      bookExam: checkoutBook.exam,
      bookSubject: checkoutBook.subject,
      bookCover: checkoutBook.coverImage,
      bookPrice: checkoutBook.price,
      adminFee: adminCommission,
      sellerPayout: sellerPayout,
      sellerPlanApplied: checkoutBook.sellerPlan || "commission_10",
      sellerMobile: checkoutBook.sellerMobile,
      sellerUpi: checkoutBook.sellerUpi,
      buyerMobile: userMobile,
      buyerName: currentUser?.name || "Student Buyer",
      buyerUtr: utrInput.trim().replace(/\s+/g, ""),
      status: "Pending Verification", // Admin will verify UTR & payment
      sellerPayoutStatus: "Pending",
      downloadCount: 0, // Max 2 downloads permitted
      createdAt: nowFormattedTimestamp(),
      verifiedAt: "",
      fileData: checkoutBook.fileData || "",
      downloadUrl: checkoutBook.fullDownloadUrl || "",
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
      "🧾 પેમેન્ટ વિનંતી મોકલાઈ ગઈ!",
      "એડમિન વેરિફિકેશન પૂર્ણ થતાં જ 'મારી ખરીદી' માં ડાઉનલોડ ઓપ્શન મળી જશે."
    );

    setActiveSubTab("library");
  };

  // Handle Weekly Payout Request Submission (Requirement 1)
  const handleSubmitPayoutRequest = (e) => {
    e.preventDefault();
    const reqAmt = Number(payoutAmountInput);
    if (!reqAmt || reqAmt <= 0) return alert("કૃપા કરીને માન્ય રકમ દાખલ કરો.");
    if (reqAmt > sellerWalletStats.availableBalance) {
      return alert(
        `તમારા વૉલેટમાં ઉપલબ્ધ રકમ ₹${sellerWalletStats.availableBalance} છે. તેના કરતાં વધુ વિનંતી ન કરી શકાય.`
      );
    }
    if (!payoutUpiInput.trim()) return alert("UPI ID દાખલ કરવું ફરજિયાત છે.");

    const newPayout = {
      id: `payout_${Date.now()}`,
      sellerMobile: userMobile,
      sellerName: currentUser?.name || "Seller",
      upiId: payoutUpiInput.trim(),
      amount: reqAmt,
      status: "Pending", // 'Pending' | 'Paid' | 'Reversed'
      requestedAt: nowFormattedTimestamp(),
      paidAt: "",
      adminUtr: "",
      reversedAt: "",
      note: "સાપ્તાહિક સેલિંગ બેલેન્સ ઉપાડ વિનંતી",
    };

    const nextDb = {
      ...db,
      marketplacePayouts: [newPayout, ...(db.marketplacePayouts || [])],
    };
    commitDb(nextDb);

    setPayoutModalOpen(false);
    setPayoutAmountInput("");
    triggerCelebration(
      "💰 પેઆઉટ વિનંતી સબમિટ થઈ!",
      "એડમિન દ્વારા વેરિફાય કરીને રકમ તમારા UPI ખાતામાં જમા કરવામાં આવશે."
    );
  };

  // Handle Buyer Rating & Review Submission (Requirement 6)
  const handleSubmitRatingReview = (e) => {
    e.preventDefault();
    if (!reviewOrderToRate) return;

    const newReview = {
      id: `rev_${Date.now()}`,
      studentMobile: userMobile,
      studentName: currentUser?.name || "Verified Buyer",
      rating: Number(ratingStars),
      comment: ratingComment.trim(),
      date: nowFormattedTimestamp(),
      hidden: false,
    };

    const nextBooks = books.map((b) => {
      if (b.id === reviewOrderToRate.bookId) {
        const existingReviews = b.ratings || [];
        const updatedReviews = [newReview, ...existingReviews];
        const avg = (
          updatedReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) /
          updatedReviews.length
        ).toFixed(1);
        return {
          ...b,
          rating: Number(avg),
          ratings: updatedReviews,
        };
      }
      return b;
    });

    commitDb({ ...db, marketplaceBooks: nextBooks });
    setReviewOrderToRate(null);
    setRatingComment("");
    triggerCelebration("⭐ રેટિંગ સબમિટ થયું!", "તમારો રિવ્યૂ સફળતાપૂર્વક ઉમેરાઈ ગયો છે.");
  };

  // Handle ₹500 3-Month Plan VIP Upgrade Request (Requirement 8)
  const handleRequestVipUpgrade = (e) => {
    e.preventDefault();
    if (!vipUtrInput.trim()) {
      return alert("કૃપા કરીને Google Pay / PhonePe માંથી ₹500 ટ્રાન્સફરનો 12 આંકડાનો UTR દાખલ કરો.");
    }

    const newSub = {
      id: `sub_${Date.now()}`,
      sellerMobile: userMobile,
      sellerName: currentUser?.name || "VIP Seller",
      plan: "fixed_500",
      planName: "૩ મહિના અનલિમિટેડ સેલિંગ (0% કમિશન)",
      price: 500,
      utr: vipUtrInput.trim(),
      status: "Pending Verification", // Admin will activate
      requestedAt: nowFormattedTimestamp(),
      activatedAt: "",
      expiresAt: "",
    };

    const nextDb = {
      ...db,
      marketplaceSubscriptions: [newSub, ...(db.marketplaceSubscriptions || [])],
    };
    commitDb(nextDb);

    setVipUpgradeModalOpen(false);
    setVipUtrInput("");
    triggerCelebration(
      "👑 VIP સેલર વિનંતી મોકલાઈ ગઈ!",
      "એડમિન વેરિફિકેશન બાદ ૩ મહિના માટે ૦% કમિશન પ્લાન શરૂ થશે."
    );
  };

  return (
    <div id="tab-marketplace" className="space-y-4 anim-fade">
      {/* Top Banner & Header */}
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
                {activeUserSubscription && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                    👑 VIP 0%
                  </span>
                )}
              </div>
              <p className="text-xs muted-text font-medium mt-0.5">
                ગુજરાતના શ્રેષ્ઠ ટોપર્સની નોટ્સ ખરીદો અથવા તમારી નોટ્સ વેચીને વૉલેટમાં કમાણી કરો
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

        {/* 4 Main Action Sub-Tabs (Requirement 4: Mobile First Navigation) */}
        <div
          className="flex items-center justify-between gap-2 pt-2 border-t overflow-x-auto no-scrollbar"
          style={{ borderColor: "var(--border-col)" }}
        >
          <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto sm:flex sm:gap-2">
            <button
              onClick={() => setActiveSubTab("browse")}
              className={`px-3 py-2 rounded-2xl text-[11px] sm:text-xs font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeSubTab === "browse"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "subtle-pill hover:border-indigo-500"
              }`}
            >
              <span>🛍️</span>
              <span>બુક સ્ટોર</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold hidden sm:inline">
                {liveBooks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab("bundles")}
              className={`px-3 py-2 rounded-2xl text-[11px] sm:text-xs font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeSubTab === "bundles"
                  ? "bg-purple-600 text-white shadow-md"
                  : "subtle-pill hover:border-purple-500"
              }`}
            >
              <span>📦</span>
              <span>બંડલ્સ & ઑફર્સ</span>
            </button>

            <button
              onClick={() => setActiveSubTab("wallet")}
              className={`px-3 py-2 rounded-2xl text-[11px] sm:text-xs font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeSubTab === "wallet"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "subtle-pill hover:border-emerald-500"
              }`}
            >
              <span>💼</span>
              <span>સેલર વૉલેટ</span>
              {sellerWalletStats.availableBalance > 0 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 font-extrabold">
                  ₹{sellerWalletStats.availableBalance}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab("library")}
              className={`px-3 py-2 rounded-2xl text-[11px] sm:text-xs font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeSubTab === "library"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "subtle-pill hover:border-indigo-500"
              }`}
            >
              <span>📂</span>
              <span>મારી ખરીદી</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold hidden sm:inline">
                {myVerifiedOrders.length}
              </span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-xl shrink-0">
            <span>🛡️ ૧૦% કમિશન પ્લાન અથવા ₹૫૦૦ માં ૩ મહિના ૦% કમિશન!</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. VIEW: BROWSE ALL BOOKS                                    */}
      {/* ============================================================ */}
      {activeSubTab === "browse" && (
        <div className="space-y-4 anim-fade">
          {/* Search & Exam Filter Chips */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="વિષય, પુસ્તક અથવા ટોપરનું નામ શોધો (દા.ત. રીઝનિંગ, ઈતિહાસ, બંધારણ)..."
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
                  {ex === "ALL" ? "બધી કેટેગરીઝ" : ex}
                </button>
              ))}
            </div>
          </div>

          {/* Book Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {liveBooks.map((book) => {
              const isBought = myVerifiedBookIds.has(book.id);
              const discountPct =
                book.originalPrice && book.originalPrice > book.price
                  ? Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)
                  : 0;

              return (
                <div
                  key={book.id}
                  className="one-card p-4 space-y-3 flex flex-col justify-between border-2 hover:border-indigo-500/50 transition group shadow-xs relative overflow-hidden"
                >
                  {/* Top Badges */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-500">
                          {book.exam}
                        </span>
                        {book.isBundle && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-500">
                            🔥 કોમ્બો બંડલ
                          </span>
                        )}
                        {discountPct > 0 && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-500">
                            {discountPct}% OFF
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-xl block">
                          ₹{book.price}
                        </span>
                        {discountPct > 0 && (
                          <span className="text-[10px] muted-text line-through block mt-0.5">
                            ₹{book.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Book Front Cover Thumbnail Preview */}
                    <div
                      onClick={() => setPreviewBook(book)}
                      className="relative w-full h-36 rounded-2xl overflow-hidden bg-slate-900/10 dark:bg-white/5 cursor-pointer group-hover:opacity-95 transition"
                    >
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition transform duration-300"
                        onError={(e) => {
                          e.target.src =
                            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                        <span className="text-[10px] text-white font-black bg-black/60 px-2 py-0.5 rounded-lg backdrop-blur-xs flex items-center gap-1">
                          <span>👁️ ફ્રી ડેમો પેજીસ</span>
                          {book.demoImages && book.demoImages.length > 0 && (
                            <span>({book.demoImages.length} ફોટા)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <h3
                      onClick={() => setPreviewBook(book)}
                      className="text-xs sm:text-sm font-black leading-snug line-clamp-2 cursor-pointer group-hover:text-indigo-500 transition"
                    >
                      {book.title}
                    </h3>

                    {/* Meta Info */}
                    <div className="flex items-center gap-2 text-[10px] muted-text font-bold">
                      <span>🏷️ {book.subject}</span>
                      <span>•</span>
                      <span>📄 {book.totalPages} પેજ</span>
                      <span>•</span>
                      <span className="text-amber-500 font-extrabold">
                        ⭐ {book.rating || 5.0} ({book.ratings?.length || 0})
                      </span>
                    </div>

                    {/* Clickable Seller Profile link */}
                    <div
                      onClick={() => setSellerProfileToView(book)}
                      className="text-[10px] subtle-pill px-2.5 py-1 text-slate-600 dark:text-slate-300 font-semibold flex items-center justify-between cursor-pointer hover:border-indigo-500 transition"
                      title="સેલર પ્રોફાઇલ અને અન્ય નોટ્સ જુઓ"
                    >
                      <span className="truncate">👨‍🏫 સેલર: {book.sellerName || book.authorAnon}</span>
                      <span className="text-indigo-500 font-bold shrink-0 ml-1">પ્રોફાઇલ ➔</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t space-y-2" style={{ borderColor: "var(--border-col)" }}>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewBook(book);
                          setActiveDemoImageIdx(0);
                        }}
                        className="subtle-pill py-2 text-xs font-black hover:border-indigo-500 transition flex items-center justify-center gap-1"
                      >
                        <span>👁️</span>
                        <span>ડેમો જુઓ</span>
                      </button>

                      {isBought ? (
                        <button
                          type="button"
                          onClick={() => setActiveSubTab("library")}
                          className="bg-emerald-600/15 text-emerald-500 border border-emerald-500/40 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1"
                        >
                          <span>✓</span>
                          <span>ખરીદેલ છે</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutBook(book);
                            setUtrInput("");
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1"
                        >
                          <span>🔒</span>
                          <span>ખરીદો ₹{book.price}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. VIEW: BUNDLES & COMBO PACKS (Requirement 6)                */}
      {/* ============================================================ */}
      {activeSubTab === "bundles" && (
        <div className="space-y-4 anim-fade">
          <div className="one-card p-4 bg-gradient-to-r from-purple-500/15 to-indigo-500/10 border-2 border-purple-500/40 space-y-1">
            <h2 className="text-sm font-black text-purple-600 dark:text-purple-400">
              🔥 સ્પેશિયલ ટોપર્સ કોમ્બો બંડલ્સ (Save Big)
            </h2>
            <p className="text-xs muted-text">
              એક સાથે ૩ થી ૪ વિષયોની નોટ્સ ખરીદીને <b>૩૦% થી ૫૦% સુધીની મોટી બચત</b> મેળવો!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bundleBooks.length === 0 ? (
              <div className="col-span-2 text-center py-10 subtle-pill p-6 rounded-2xl text-xs muted-text">
                હાલમાં કોઈ કોમ્બો બંડલ લાઈવ નથી. સેલર વૉલેટમાં જઈને તમે પણ કોમ્બો બંડલ મૂકી શકો છો!
              </div>
            ) : (
              bundleBooks.map((bundle) => (
                <div
                  key={bundle.id}
                  className="one-card p-4 space-y-3 border-2 border-purple-500/30 hover:border-purple-500 transition shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-500 text-white">
                      🔥 સુપર કોમ્બો પેક
                    </span>
                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-500 bg-emerald-500/10 px-3 py-0.5 rounded-xl">
                        ₹{bundle.price}
                      </span>
                      {bundle.originalPrice && (
                        <span className="text-xs muted-text line-through block mt-0.5">
                          ₹{bundle.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-black">{bundle.title}</h3>

                  {/* Included Items in Bundle */}
                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1 text-xs">
                    <div className="font-extrabold text-purple-600 dark:text-purple-300">
                      📦 આ પેકમાં શું શામેલ છે?
                    </div>
                    {bundle.bundleItems && bundle.bundleItems.length > 0 ? (
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] font-semibold">
                        {bundle.bundleItems.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-[11px] muted-text">{bundle.sampleDemoText}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: "var(--border-col)" }}>
                    <button
                      onClick={() => setPreviewBook(bundle)}
                      className="subtle-pill py-2 text-xs font-black hover:border-purple-500 transition"
                    >
                      👁️ સેમ્પલ જુઓ
                    </button>
                    <button
                      onClick={() => {
                        setCheckoutBook(bundle);
                        setUtrInput("");
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl text-xs font-black shadow-sm transition"
                    >
                      🔒 કોમ્બો અનલોક કરો
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. VIEW: SELLER WALLET & PUBLISHING HUB (Requirements 1, 3, 7, 8) */}
      {/* ============================================================ */}
      {activeSubTab === "wallet" && (
        <div className="space-y-4 anim-fade">
          {/* A. WALLET BALANCE & METRICS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="one-card p-4 space-y-1 border-l-4 border-l-emerald-500">
              <div className="text-[10px] font-extrabold muted-text uppercase">ઉપલબ્ધ વૉલેટ બેલેન્સ</div>
              <div className="text-2xl font-black text-emerald-500">
                ₹{sellerWalletStats.availableBalance}
              </div>
              <div className="text-[9px] muted-text font-bold">સાપ્તાહિક ઉપાડ માટે ઉપલબ્ધ</div>
            </div>

            <div className="one-card p-4 space-y-1">
              <div className="text-[10px] font-extrabold muted-text uppercase">કુલ નેટ કમાણી</div>
              <div className="text-2xl font-black text-indigo-500">
                ₹{sellerWalletStats.totalNetEarnings}
              </div>
              <div className="text-[9px] muted-text font-bold">
                વેચાણ: {sellerWalletStats.totalSalesCount} ઓર્ડર્સ
              </div>
            </div>

            <div className="one-card p-4 space-y-1">
              <div className="text-[10px] font-extrabold muted-text uppercase">પેન્ડિંગ વિનંતીઓ</div>
              <div className="text-2xl font-black text-amber-500">
                ₹{sellerWalletStats.totalPendingPayout}
              </div>
              <div className="text-[9px] text-amber-500 font-bold">વેરિફિકેશન હેઠળ</div>
            </div>

            <div className="one-card p-4 space-y-1">
              <div className="text-[10px] font-extrabold muted-text uppercase">કુલ મેળવેલ ચુકવણી</div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-200">
                ₹{sellerWalletStats.totalPaidOut}
              </div>
              <div className="text-[9px] text-emerald-500 font-bold">UPI ખાતામાં જમા</div>
            </div>
          </div>

          {/* B. WALLET ACTION BAR: REQUEST PAYOUT & VIP UPGRADE */}
          <div className="one-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 via-transparent to-amber-500/10">
            <div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                💰 સાપ્તાહિક પેઆઉટ સિસ્ટમ (Weekly Consolidated Payout)
              </div>
              <p className="text-[11px] muted-text mt-0.5">
                તમારી બુક્સના વેચાણની રકમ સીધી તમારા UPI (GPay / PhonePe / Paytm) માં ટ્રાન્સફર કરવા વિનંતી મોકલો.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setPayoutAmountInput(sellerWalletStats.availableBalance.toString());
                  setPayoutUpiInput(currentUser?.mobile ? `${currentUser.mobile}@upi` : "");
                  setPayoutModalOpen(true);
                }}
                disabled={sellerWalletStats.availableBalance <= 0}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm ${
                  sellerWalletStats.availableBalance > 0
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
              >
                <span>💸</span>
                <span>વિનંતી મોકલો (₹{sellerWalletStats.availableBalance})</span>
              </button>

              <button
                type="button"
                onClick={() => setVipUpgradeModalOpen(true)}
                className="flex-1 sm:flex-initial subtle-pill px-3.5 py-2.5 rounded-xl text-xs font-black hover:border-amber-500 text-amber-500 flex items-center justify-center gap-1"
              >
                <span>👑</span>
                <span>{activeUserSubscription ? "VIP સક્રિય" : "₹500 VIP પ્લાન"}</span>
              </button>
            </div>
          </div>

          {/* C. PAYOUT HISTORY WITH REVERSAL LOG (Requirement 1 & 3) */}
          <div className="one-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase muted-text">
                📜 પેઆઉટ ઉપાડ વિનંતી હિસ્ટ્રી
              </h3>
              <span className="text-[10px] muted-text font-bold">
                {myPayouts.length} વિનંતીઓ
              </span>
            </div>

            {myPayouts.length === 0 ? (
              <div className="text-[11px] muted-text text-center py-4 subtle-pill p-3">
                હજુ સુધી કોઈ પેઆઉટ વિનંતી કરી નથી. પુસ્તક વેચાય એટલે ઉપાડ કરી શકશો.
              </div>
            ) : (
              <div className="space-y-2">
                {myPayouts.map((p) => {
                  const isPaid = p.status === "Paid";
                  const isReversed = p.status === "Reversed";

                  return (
                    <div
                      key={p.id}
                      className={`subtle-pill p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l-4 ${
                        isPaid
                          ? "border-l-emerald-500"
                          : isReversed
                          ? "border-l-rose-500"
                          : "border-l-amber-500"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm">₹{p.amount}</span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              isPaid
                                ? "bg-emerald-500/15 text-emerald-500"
                                : isReversed
                                ? "bg-rose-500/15 text-rose-500"
                                : "bg-amber-500/15 text-amber-500"
                            }`}
                          >
                            {isPaid
                              ? "✅ ચૂકવાઈ ગયું (Paid)"
                              : isReversed
                              ? "↩️ રિવર્સ થયેલ (વૉલેટમાં પાછું જમા)"
                              : "⏳ પ્રોસેસિંગ હેઠળ"}
                          </span>
                        </div>
                        <div className="text-[10px] muted-text mt-0.5">
                          તારીખ: {p.requestedAt} • UPI: <b className="font-mono text-indigo-500">{p.upiId}</b>
                        </div>
                        {isPaid && p.adminUtr && (
                          <div className="text-[10px] text-emerald-500 font-extrabold mt-0.5">
                            Bank Ref / UTR: {p.adminUtr}
                          </div>
                        )}
                        {isReversed && (
                          <div className="text-[10px] text-rose-500 font-extrabold mt-0.5">
                            રિવર્સલ નોંધ: એડમિન દ્વારા રિવર્સ કરી રકમ આપના વૉલેટમાં પુનઃ જમા કરેલ છે.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* D. PUBLISH NEW BOOK OR BUNDLE FORM (Requirement 6, 7 & 8) */}
          <div className="one-card p-4 sm:p-5 space-y-4 border-2 border-emerald-500/30">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              <div>
                <h3 className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  📤 નવી બુક / કોમ્બો બંડલ લિસ્ટ કરો
                </h3>
                <p className="text-[11px] muted-text">
                  વેબસાઈટ પરથી વિદ્યાર્થીઓ સીધી ડાઉનલોડ કરી શકે તેવી ગુણવત્તાયુક્ત નોટ્સ મૂકો.
                </p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-500">
                {activeUserSubscription ? "👑 VIP: 0% કમિશન" : "૧૦% કમિશન પ્લાન"}
              </span>
            </div>

            <form onSubmit={handlePublishBook} className="space-y-3.5">
              {/* Single or Bundle Toggle */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                <label className="text-xs font-black">લિસ્ટિંગ પ્રકાર:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSellIsBundle(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      !sellIsBundle
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "subtle-pill"
                    }`}
                  >
                    📖 એક પુસ્તક
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellIsBundle(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      sellIsBundle
                        ? "bg-purple-600 text-white shadow-xs"
                        : "subtle-pill"
                    }`}
                  >
                    📦 કોમ્બો બંડલ (Multi-Book)
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-extrabold muted-text mb-1">
                  પુસ્તક / નોટ્સનું આકર્ષક શીર્ષક *
                </label>
                <input
                  type="text"
                  placeholder="દા.ત. CCE 2026 ગણિત શોર્ટકટ્સ & ફોર્મ્યુલા માસ્ટર બુક"
                  value={sellTitle}
                  onChange={(e) => setSellTitle(e.target.value)}
                  className="w-full theme-input p-2.5 text-xs font-semibold"
                  required
                />
              </div>

              {/* Exam & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold muted-text mb-1">પરીક્ષા કેટેગરી *</label>
                  <select
                    value={sellExam}
                    onChange={(e) => setSellExam(e.target.value)}
                    className="w-full theme-input p-2.5 text-xs font-semibold"
                  >
                    <option value="CCE (Group A & B)">CCE (Group A & B)</option>
                    <option value="GPSC Class 1-2">GPSC Class 1-2</option>
                    <option value="Police PSI / Constable">Police PSI / Constable</option>
                    <option value="General / Other">જનરલ નોલેજ / અન્ય</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold muted-text mb-1">વિષયનું નામ *</label>
                  <input
                    type="text"
                    placeholder="દા.ત. રીઝનિંગ, ગુજરાતનો ઈતિહાસ, બંધારણ"
                    value={sellSubject}
                    onChange={(e) => setSellSubject(e.target.value)}
                    className="w-full theme-input p-2.5 text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              {/* If Bundle: Items textarea */}
              {sellIsBundle && (
                <div>
                  <label className="block text-[11px] font-extrabold text-purple-600 dark:text-purple-400 mb-1">
                    📦 આ કોમ્બોમાં શામેલ પુસ્તકોના નામ (દરેક નવી લીટીમાં) *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="૧. ગણિત શોર્ટકટ્સ (120 પેજ)&#10;૨. રીઝનિંગ માસ્ટર બુક (140 પેજ)&#10;૩. બંધારણ કેપ્સ્યુલ (90 પેજ)"
                    value={sellBundleItemsText}
                    onChange={(e) => setSellBundleItemsText(e.target.value)}
                    className="w-full theme-input p-2.5 text-xs font-semibold"
                  ></textarea>
                </div>
              )}

              {/* Pricing & Offers (Requirement 6 & 8) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-black/5 dark:bg-white/5">
                <div>
                  <label className="block text-[11px] font-extrabold muted-text mb-1">
                    મૂળ કિંમત (MRP ₹)
                  </label>
                  <input
                    type="number"
                    min="20"
                    value={sellOriginalPrice}
                    onChange={(e) => setSellOriginalPrice(e.target.value)}
                    className="w-full theme-input p-2 text-xs font-semibold"
                  />
                  <span className="text-[10px] muted-text">ડિસ્કાઉન્ટ બતાવવા માટે</span>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-emerald-500 mb-1">
                    ઑફર વેચાણ કિંમત (Selling Price ₹) *
                  </label>
                  <input
                    type="number"
                    min="20"
                    value={sellOfferPrice}
                    onChange={(e) => setSellOfferPrice(e.target.value)}
                    className="w-full theme-input p-2 text-xs font-extrabold text-emerald-500"
                    required
                  />
                  <span className="text-[10px] muted-text">વિદ્યાર્થી આટલા ચૂકવશે</span>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold muted-text mb-1">
                    તમને ચોખ્ખા મળશે (Net Payout)
                  </label>
                  <div className="text-base font-black text-indigo-500 pt-1">
                    ₹{activeUserSubscription ? sellOfferPrice : Math.round(Number(sellOfferPrice || 0) * 0.9)}
                  </div>
                  <span className="text-[10px] muted-text">
                    {activeUserSubscription ? "👑 0% કમિશન કપાત" : "૧૦% એડમિન કમિશન બાદ"}
                  </span>
                </div>
              </div>

              {/* Front Cover Photo Upload (Requirement 7) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold muted-text">
                  🖼️ પુસ્તક મુખપૃષ્ઠ (Front Cover) ફોટો અપલોડ કરો *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                  />
                  {sellCoverImage && (
                    <img
                      src={sellCoverImage}
                      alt="Cover Preview"
                      className="w-10 h-10 object-cover rounded-xl border border-indigo-500 shadow-xs"
                    />
                  )}
                </div>
              </div>

              {/* Sample Demo Pages Photos (Requirement 7) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold muted-text">
                  📸 ડેમો સેમ્પલ પેજીસના ફોટા અપલોડ કરો (ગ્રાહક ફ્રીમાં જોઈ શકશે - મહત્તમ ૬ ફોટા)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleDemoPagesUpload}
                  className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-700 file:text-white"
                />
                {sellDemoImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {sellDemoImages.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Demo ${i + 1}`}
                        className="w-12 h-12 object-cover rounded-lg border border-slate-400"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Demo text bullet points */}
              <div>
                <label className="block text-[11px] font-extrabold muted-text mb-1">
                  ડેમો સારાંશ / અગત્યના પોઈન્ટ્સ (ટેક્સ્ટ)
                </label>
                <textarea
                  rows={2}
                  placeholder="✓ શોર્ટકટ ફોર્મ્યુલા&#10;✓ ૨૫૦+ વિગતવાર સોલ્વ કરેલા પ્રશ્નો"
                  value={sellDemoText}
                  onChange={(e) => setSellDemoText(e.target.value)}
                  className="w-full theme-input p-2.5 text-xs font-semibold"
                ></textarea>
              </div>

              {/* Direct Full Book PDF File Upload (Requirement 7: No Drive link needed!) */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                <label className="block text-xs font-black text-indigo-600 dark:text-indigo-400">
                  📁 સંપૂર્ણ બુક PDF સીધી અપલોડ કરો (વેબસાઈટ પરથી ડાયરેક્ટ ડાઉનલોડ થશે - Drive Link ની જરૂર નથી) *
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleDirectPdfUpload}
                  className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                />
                {sellDirectFileName && (
                  <div className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                    <span>✓ અપલોડ થયેલ:</span>
                    <span>{sellDirectFileName}</span>
                  </div>
                )}

                <div className="pt-1">
                  <span className="text-[10px] muted-text block">અથવા જો મોટી ફાઈલ હોય તો Google Drive લિંક આપો (વૈકલ્પિક):</span>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={sellFullUrlBackup}
                    onChange={(e) => setSellFullUrlBackup(e.target.value)}
                    className="w-full theme-input p-2 text-xs font-semibold mt-1"
                  />
                </div>
              </div>

              {/* Seller Payout UPI ID */}
              <div>
                <label className="block text-[11px] font-extrabold muted-text mb-1">
                  તમારું UPI ID (કમાણી મેળવવા માટે) *
                </label>
                <input
                  type="text"
                  placeholder="उदा. 9876543210@paytm, name@okhdfcbank"
                  value={sellUpi}
                  onChange={(e) => setSellUpi(e.target.value)}
                  className="w-full theme-input p-2.5 text-xs font-semibold font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl text-xs shadow-md transition"
              >
                🚀 નોટ્સ વેચવા માટે સબમિટ કરો
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. VIEW: MY PURCHASES & DOWNLOADS (Requirement 2 & 6)         */}
      {/* ============================================================ */}
      {activeSubTab === "library" && (
        <div className="space-y-4 anim-fade">
          <div className="one-card p-4 space-y-1 border-l-4 border-l-indigo-600">
            <h2 className="text-sm font-black">📂 મારી ખરીદેલ નોટ્સ અને પુસ્તકો</h2>
            <p className="text-xs muted-text">
              સુરક્ષાના નિયમો મુજબ દરેક ખરીદેલ પુસ્તક <b>મહત્તમ ૨ વખત ડાઉનલોડ</b> કરી શકાય છે.
            </p>
          </div>

          {myOrders.length === 0 ? (
            <div className="text-center py-12 subtle-pill p-6 rounded-2xl text-xs muted-text space-y-2">
              <div className="text-2xl">🛒</div>
              <div className="font-bold">તમે હજુ કોઈ પુસ્તક કે નોટ્સ ખરીદી નથી.</div>
              <button
                onClick={() => setActiveSubTab("browse")}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs mt-2"
              >
                બુક સ્ટોર જુઓ ➔
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map((ord) => {
                const isVerified = ord.status === "Verified";
                const dCount = Number(ord.downloadCount || 0);
                const limitReached = dCount >= 2;

                return (
                  <div
                    key={ord.id}
                    className={`one-card p-4 space-y-3 border-2 ${
                      isVerified ? "border-emerald-500/40" : "border-amber-500/40"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-black text-sm">{ord.bookTitle}</span>
                        <div className="text-[10px] muted-text font-bold mt-0.5">
                          Invoice: {ord.invoiceNo} • {ord.createdAt}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full self-start sm:self-auto ${
                          isVerified
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-amber-500/15 text-amber-500"
                        }`}
                      >
                        {isVerified ? "✓ Verified & Active" : "⏳ વેરિફિકેશન ચાલુ (Admin Review)"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs" style={{ borderColor: "var(--border-col)" }}>
                      <div className="font-extrabold">
                        ચૂકવેલ: <span className="text-emerald-500 font-black">₹{ord.bookPrice}</span> (UTR: {ord.buyerUtr})
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setSelectedInvoice(ord)}
                          className="subtle-pill px-3 py-1.5 text-[10px] font-black hover:border-indigo-500"
                        >
                          🧾 ડિજિટલ બિલ
                        </button>

                        {isVerified && (
                          <>
                            <button
                              onClick={() => handleDownloadBookPdf(ord)}
                              disabled={limitReached}
                              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black shadow-xs transition flex items-center gap-1 ${
                                limitReached
                                  ? "bg-slate-400 text-white cursor-not-allowed"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                              }`}
                            >
                              <span>📥</span>
                              <span>
                                {limitReached
                                  ? "🔒 મર્યાદા સમાપ્ત (2/2)"
                                  : `ડાઉનલોડ PDF (${dCount}/2)`}
                              </span>
                            </button>

                            <button
                              onClick={() => {
                                setReviewOrderToRate(ord);
                                setRatingStars(5);
                                setRatingComment("");
                              }}
                              className="subtle-pill px-2.5 py-1.5 rounded-xl text-[10px] font-black hover:border-amber-500 text-amber-500 flex items-center gap-1"
                            >
                              <span>⭐</span>
                              <span>રેટિંગ આપો</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: SAMPLE DEMO PREVIEW WITH PHOTO GALLERY (Req 7)       */}
      {/* ============================================================ */}
      {previewBook && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-lg one-card p-5 space-y-3.5 border-2 border-indigo-500 shadow-2xl max-h-[90vh] overflow-y-auto">
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

            <div className="space-y-3">
              <div className="text-xs sm:text-sm font-black">{previewBook.title}</div>

              {/* Photo Gallery Viewer for Scanned Pages */}
              {previewBook.demoImages && previewBook.demoImages.length > 0 ? (
                <div className="space-y-2">
                  <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-indigo-500/40">
                    <img
                      src={previewBook.demoImages[activeDemoImageIdx] || previewBook.demoImages[0]}
                      alt="Sample Page"
                      className="max-h-full max-w-full object-contain"
                    />
                    {previewBook.demoImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDemoImageIdx((prev) =>
                              prev > 0 ? prev - 1 : previewBook.demoImages.length - 1
                            )
                          }
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center font-black"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDemoImageIdx((prev) =>
                              prev < previewBook.demoImages.length - 1 ? prev + 1 : 0
                            )
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center font-black"
                        >
                          ›
                        </button>
                      </>
                    )}
                  </div>
                  <div className="text-center text-[10px] muted-text font-bold">
                    સેમ્પલ પેજ {activeDemoImageIdx + 1} / {previewBook.demoImages.length}
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-black/10">
                  <img
                    src={previewBook.coverImage}
                    alt={previewBook.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Demo text summary */}
              <div className="p-3.5 rounded-2xl subtle-pill text-xs whitespace-pre-wrap leading-relaxed font-medium">
                {previewBook.sampleDemoText || "આ પુસ્તકના પ્રથમ ૫ પેજનો ડેમો સારાંશ અહીં જોઈ શકાય છે."}
              </div>

              {/* Ratings List on Book */}
              {previewBook.ratings && previewBook.ratings.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: "var(--border-col)" }}>
                  <div className="text-[11px] font-extrabold">
                    ⭐ વિદ્યાર્થીઓના રિવ્યૂઝ ({previewBook.ratings.filter((r) => !r.hidden).length})
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1.5">
                    {previewBook.ratings
                      .filter((r) => !r.hidden)
                      .map((rev) => (
                        <div key={rev.id} className="subtle-pill p-2 text-[10px] space-y-0.5">
                          <div className="flex items-center justify-between font-bold">
                            <span>{rev.studentName}</span>
                            <span className="text-amber-500">{"★".repeat(rev.rating)}</span>
                          </div>
                          {rev.comment && <div className="muted-text">{rev.comment}</div>}
                        </div>
                      ))}
                  </div>
                </div>
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm"
              >
                🔒 ખરીદો (₹{previewBook.price})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: BUY CHECKOUT MODAL                                  */}
      {/* ============================================================ */}
      {checkoutBook && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
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

            <div className="space-y-3">
              <div className="p-3 rounded-2xl subtle-pill space-y-1">
                <div className="text-xs font-black">{checkoutBook.title}</div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="muted-text">ચુકવવાની ચોખ્ખી રકમ:</span>
                  <span className="text-lg font-black text-emerald-500">₹{checkoutBook.price}</span>
                </div>
              </div>

              {/* UPI Payment Instructions */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2 text-center">
                <div className="text-[11px] font-extrabold text-indigo-500">
                  📲 Google Pay / PhonePe / Paytm સ્કેન કરો અથવા UPI આઈડી કોપી કરો:
                </div>
                <div className="font-mono text-sm font-black bg-white dark:bg-slate-900 py-1.5 px-3 rounded-xl border select-all">
                  9876543210@paytm
                </div>
                <div className="text-[10px] muted-text">
                  (રકમ ₹{checkoutBook.price} ટ્રાન્સફર કરીને નીચે UTR નંબર દાખલ કરો)
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold muted-text mb-1">
                  12-આંકડાનો UTR / UPI Ref No. દાખલ કરો *
                </label>
                <input
                  type="text"
                  placeholder="उदा. 431289012345"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="w-full theme-input p-3 text-xs font-bold font-mono tracking-wider"
                  required
                />
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end gap-2" style={{ borderColor: "var(--border-col)" }}>
              <button
                onClick={() => setCheckoutBook(null)}
                className="subtle-pill px-4 py-2 text-xs font-bold"
              >
                રદ કરો
              </button>
              <button
                onClick={handleConfirmPurchase}
                disabled={checkoutSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-sm"
              >
                {checkoutSubmitting ? "પ્રોસેસિંગ..." : "✓ ચુકવણી કન્ફર્મ કરો"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: SELLER PORTFOLIO MODAL (Requirement 6)              */}
      {/* ============================================================ */}
      {sellerProfileToView && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-lg one-card p-5 space-y-4 border-2 border-indigo-500 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">👨‍🏫</span>
                <h3 className="text-sm font-black">સેલર પ્રોફાઇલ & ઉપલબ્ધ પુસ્તકો</h3>
              </div>
              <button
                onClick={() => setSellerProfileToView(null)}
                className="w-7 h-7 rounded-full subtle-pill flex items-center justify-center text-xs font-black"
              >
                ✕
              </button>
            </div>

            {/* Seller Header */}
            <div className="p-3.5 rounded-2xl subtle-pill flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-black">
                {(sellerProfileToView.sellerName || "T")[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm">{sellerProfileToView.sellerName}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                    ✓ Verified Topper
                  </span>
                </div>
                <div className="text-[11px] muted-text mt-0.5">
                  {sellerProfileToView.sellerBio || "Target Track Verified Contributor"}
                </div>
              </div>
            </div>

            {/* Other Books by this Seller */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold muted-text uppercase">
                આ સેલરની અન્ય નોટ્સ ({books.filter((b) => b.sellerMobile === sellerProfileToView.sellerMobile).length})
              </div>
              <div className="space-y-2">
                {books
                  .filter((b) => b.sellerMobile === sellerProfileToView.sellerMobile)
                  .map((b) => (
                    <div
                      key={b.id}
                      className="subtle-pill p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-black">{b.title}</div>
                        <div className="text-[10px] muted-text font-bold">
                          {b.exam} • {b.subject}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-emerald-500 block">₹{b.price}</span>
                        <button
                          onClick={() => {
                            setSellerProfileToView(null);
                            setPreviewBook(b);
                          }}
                          className="text-[10px] font-black text-indigo-500 underline mt-0.5"
                        >
                          જુઓ ➔
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setSellerProfileToView(null)}
                className="subtle-pill px-4 py-2 text-xs font-bold"
              >
                બંધ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: WEEKLY PAYOUT REQUEST MODAL (Requirement 1)         */}
      {/* ============================================================ */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-sm one-card p-5 space-y-4 border-2 border-emerald-500 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <h3 className="text-sm font-black">સાપ્તાહિક પેઆઉટ વિનંતી</h3>
              </div>
              <button
                onClick={() => setPayoutModalOpen(false)}
                className="w-7 h-7 rounded-full subtle-pill flex items-center justify-center text-xs font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayoutRequest} className="space-y-3">
              <div className="p-3 rounded-2xl subtle-pill text-xs flex justify-between items-center">
                <span className="muted-text">ઉપલબ્ધ બેલેન્સ:</span>
                <span className="text-base font-black text-emerald-500">
                  ₹{sellerWalletStats.availableBalance}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold muted-text mb-1">
                  ઉપાડ રકમ (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={sellerWalletStats.availableBalance}
                  value={payoutAmountInput}
                  onChange={(e) => setPayoutAmountInput(e.target.value)}
                  className="w-full theme-input p-2.5 text-xs font-black text-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold muted-text mb-1">
                  UPI ID (GPay / PhonePe / Paytm) *
                </label>
                <input
                  type="text"
                  placeholder="उदा. mobile@upi"
                  value={payoutUpiInput}
                  onChange={(e) => setPayoutUpiInput(e.target.value)}
                  className="w-full theme-input p-2.5 text-xs font-mono font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs shadow-sm mt-2"
              >
                વિનંતી મોકલો ➔
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: BUYER RATE & REVIEW MODAL (Requirement 6)           */}
      {/* ============================================================ */}
      {reviewOrderToRate && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-sm one-card p-5 space-y-4 border-2 border-amber-500 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <h3 className="text-sm font-black">રેટિંગ અને રિવ્યૂ આપો</h3>
              </div>
              <button
                onClick={() => setReviewOrderToRate(null)}
                className="w-7 h-7 rounded-full subtle-pill flex items-center justify-center text-xs font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRatingReview} className="space-y-3">
              <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                {reviewOrderToRate.bookTitle}
              </div>

              {/* Star selector */}
              <div>
                <label className="block text-[11px] font-extrabold muted-text mb-1.5">
                  સ્ટાર્સ પસંદ કરો:
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setRatingStars(st)}
                      className={`text-2xl transition transform hover:scale-125 ${
                        ratingStars >= st ? "text-amber-400" : "text-slate-300 dark:text-slate-700"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold muted-text mb-1">
                  તમારો ટૂંકો અનુભવ / ફીડબેક:
                </label>
                <textarea
                  rows={3}
                  placeholder="નોટ્સ ખૂબ જ ઉપયોગી છે, Handwriting ખૂબ સુંદર છે..."
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  className="w-full theme-input p-2.5 text-xs font-semibold"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-2.5 rounded-xl text-xs shadow-sm"
              >
                સબમિટ કરો
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 6: VIP 3-MONTH PLAN UPGRADE MODAL (Requirement 8)      */}
      {/* ============================================================ */}
      {vipUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-md one-card p-5 space-y-4 border-2 border-amber-500 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <h3 className="text-sm font-black">VIP સેલર પ્લાન (0% કમિશન)</h3>
              </div>
              <button
                onClick={() => setVipUpgradeModalOpen(false)}
                className="w-7 h-7 rounded-full subtle-pill flex items-center justify-center text-xs font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 space-y-1">
                <div className="font-black text-amber-600 dark:text-amber-400 text-sm">
                  ₹500 ફિક્સ પ્લાન — ૩ મહિના માટે 0% કમિશન!
                </div>
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  ✓ ૩ મહિનામાં ગમે તેટલી બુક્સ વેચો, એડમિન કોઈ કમિશન નહીં કાપે.
                  <br />
                  ✓ ૧૦૦% કમાણી સીધી તમારા વૉલેટમાં જમા થશે.
                  <br />
                  ✓ તમારી બુક્સ પર 👑 VIP સેલર બેજ દેખાશે.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1 text-center">
                <div className="text-[10px] muted-text">₹500 ટ્રાન્સફર માટે Admin UPI:</div>
                <div className="font-mono font-black text-indigo-500 select-all">9876543210@paytm</div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold muted-text mb-1">
                  12-આંકડાનો UTR નંબર દાખલ કરો *
                </label>
                <input
                  type="text"
                  placeholder="उदा. 431289012345"
                  value={vipUtrInput}
                  onChange={(e) => setVipUtrInput(e.target.value)}
                  className="w-full theme-input p-2.5 text-xs font-bold font-mono tracking-wider"
                  required
                />
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end gap-2" style={{ borderColor: "var(--border-col)" }}>
              <button
                onClick={() => setVipUpgradeModalOpen(false)}
                className="subtle-pill px-4 py-2 text-xs font-bold"
              >
                રદ કરો
              </button>
              <button
                onClick={handleRequestVipUpgrade}
                className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-sm"
              >
                વિનંતી સબમિટ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 7: DIGITAL INVOICE / BILL MODAL                        */}
      {/* ============================================================ */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-sm one-card p-5 space-y-4 border-2 border-indigo-500 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🧾</span>
                <h3 className="text-sm font-black">અધિકૃત ડિજિટલ બિલ</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-7 h-7 rounded-full subtle-pill flex items-center justify-center text-xs font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="text-center p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                <div className="text-xs font-black text-indigo-500">TARGET TRACK OFFICIAL RECEIPT</div>
                <div className="text-[10px] muted-text mt-0.5">{selectedInvoice.invoiceNo}</div>
              </div>

              <div className="space-y-1.5 border-b pb-2" style={{ borderColor: "var(--border-col)" }}>
                <div className="flex justify-between">
                  <span className="muted-text">પુસ્તક:</span>
                  <span className="font-bold">{selectedInvoice.bookTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="muted-text">તારીખ:</span>
                  <span>{selectedInvoice.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="muted-text">વિદ્યાર્થી:</span>
                  <span>{selectedInvoice.buyerName} ({selectedInvoice.buyerMobile})</span>
                </div>
                <div className="flex justify-between">
                  <span className="muted-text">UTR Ref:</span>
                  <span className="font-mono text-indigo-500 font-bold">{selectedInvoice.buyerUtr}</span>
                </div>
              </div>

              <div className="flex justify-between text-sm font-black pt-1">
                <span>કુલ ચૂકવેલ રકમ:</span>
                <span className="text-emerald-500">₹{selectedInvoice.bookPrice}</span>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="subtle-pill px-4 py-2 text-xs font-bold"
              >
                બંધ કરો
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketplaceTab;
