import React, { useState, useMemo } from "react";
import { useStudy, DEFAULT_MARKETPLACE_BOOKS } from "../../context/StudyContext";
import { useAuth } from "../../context/AuthContext";
import { nowFormattedTimestamp, openAdminWhatsApp } from "../../utils/helpers";
import { ADMIN_MOBILE } from "../../utils/constants";
import { LegalPolicyModal } from "../modals/LegalPolicyModal";

export function MarketplaceTab({ onBackToSyllabus }) {
  const { db, commitDb, currentUser, triggerCelebration } = useStudy();
  const { session } = useAuth();

  // 3 Primary Tabs (Requirement 1: Combo integrated into store)
  const [activeSubTab, setActiveSubTab] = useState("browse"); // 'browse' | 'wallet' | 'library'
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
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState("terms");

  // 2-Step Order Delete States (Requirement 6)
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteStep, setDeleteStep] = useState(1); // 1 or 2
  const [deleteVerifyText, setDeleteVerifyText] = useState("");

  // Seller Onboarding Application Form States (Requirement 2)
  const [applyName, setApplyName] = useState(currentUser?.name || "");
  const [applyCity, setApplyCity] = useState("");
  const [applyExamExp, setApplyExamExp] = useState("CCE Topper / Ranker");
  const [applyQualification, setApplyQualification] = useState("");
  const [applyUpi, setApplyUpi] = useState("");
  const [applyBio, setApplyBio] = useState("");
  const [applySampleProof, setApplySampleProof] = useState("");
  const [applyTermsCheck, setApplyTermsCheck] = useState(false);

  // Dynamic Multi-Book Bundle Form States (Requirement 3 & 5)
  const [sellTitle, setSellTitle] = useState("");
  const [sellExam, setSellExam] = useState("CCE (Group A & B)");
  const [sellSubject, setSellSubject] = useState("");
  const [sellType, setSellType] = useState("Handwritten Notes");
  const [sellIsBundle, setSellIsBundle] = useState(false);
  const [bundleBooksList, setBundleBooksList] = useState([
    { title: "પુસ્તક ૧: ગણિત શોર્ટકટ્સ", pages: 120, fileData: "", fileName: "" },
    { title: "પુસ્તક ૨: રીઝનિંગ માસ્ટર બુક", pages: 140, fileData: "", fileName: "" },
  ]);
  const [sellOriginalPrice, setSellOriginalPrice] = useState(99);
  const [sellOfferPrice, setSellOfferPrice] = useState(49);
  const [sellPlanChoice, setSellPlanChoice] = useState("commission_10"); // 'commission_10' | 'fixed_500'
  const [sellVipUtr, setSellVipUtr] = useState("");
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

  // Seller Support States (Requirement 4)
  const [supportCategory, setSupportCategory] = useState("💸 પેઆઉટ / વૉલેટ ઉપાડ સંબંધિત પ્રશ્ન");
  const [supportMsg, setSupportMsg] = useState("");

  // All Books with fallback
  const books = useMemo(() => {
    if (Array.isArray(db.marketplaceBooks) && db.marketplaceBooks.length > 0) {
      return db.marketplaceBooks;
    }
    return DEFAULT_MARKETPLACE_BOOKS;
  }, [db.marketplaceBooks]);

  const orders = db.marketplaceOrders || [];
  const payouts = db.marketplacePayouts || [];
  const applications = db.sellerApplications || [];
  const sellerTickets = db.sellerTickets || [];

  const userMobile = currentUser?.mobile || session?.mobile || "";

  // Check Current User's Seller Verification Status (Requirement 2)
  const mySellerApplication = useMemo(() => {
    return applications.find((a) => a.applicantMobile === userMobile);
  }, [applications, userMobile]);

  const isSellerApproved = useMemo(() => {
    // Admin or approved applicant or default topper mobile
    if (session?.role === "admin") return true;
    if (mySellerApplication && mySellerApplication.status === "Approved") return true;
    // If student has existing approved books in the system
    return books.some((b) => b.sellerMobile === userMobile && b.status === "Approved");
  }, [session, mySellerApplication, books, userMobile]);

  // Filter approved & live books for marketplace browsing (Requirement 1: Combos inside store)
  const liveBooks = useMemo(() => {
    return books.filter((b) => {
      const isApproved = b.status === "Approved";
      let matchExam = true;
      if (selectedExamFilter === "COMBOS") {
        matchExam = b.isBundle === true;
      } else if (selectedExamFilter !== "ALL") {
        matchExam = b.exam === selectedExamFilter;
      }

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

  // Featured combo bundles
  const featuredCombos = useMemo(() => {
    return books.filter((b) => b.status === "Approved" && b.isBundle);
  }, [books]);

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
  // SELLER WALLET CALCULATIONS (Requirement 5, 8 & 9)
  // ============================================================
  const sellerWalletStats = useMemo(() => {
    const sellerSoldOrders = orders.filter(
      (o) => o.sellerMobile === userMobile && o.status === "Verified"
    );

    let totalGrossSales = 0;
    let totalNetEarnings = 0;

    sellerSoldOrders.forEach((ord) => {
      const price = Number(ord.bookPrice) || 0;
      totalGrossSales += price;
      // Per-book VIP plan applied check (Requirement 5)
      if (ord.sellerPlanApplied === "fixed_500") {
        totalNetEarnings += price; // 100% net earnings
      } else {
        const adminFee = Math.round(price * 0.1);
        totalNetEarnings += price - adminFee; // 90% net earnings
      }
    });

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

  // Direct Book File Downloader (Max 2 Downloads)
  const handleDownloadBookPdf = (order, itemIdx = null) => {
    const currentCount = Number(order.downloadCount || 0);

    if (currentCount >= 2) {
      return alert(
        "🔒 ડાઉનલોડ મર્યાદા સમાપ્ત!\nતમે આ પુસ્તક મહત્તમ ૨ વખત ડાઉનલોડ કરી લીધું છે (2/2 વપરાયેલ).\nસુરક્ષાના નિયમો મુજબ લિંક એક્સપાયર થઈ ગઈ છે."
      );
    }

    const newCount = currentCount + 1;

    // Update download count in database
    const nextOrders = orders.map((o) =>
      o.id === order.id ? { ...o, downloadCount: newCount } : o
    );
    commitDb({ ...db, marketplaceOrders: nextOrders });

    // Multi-book bundle item or single book
    let fileData = order.fileData || order.downloadUrl;
    let fileNameTitle = order.bookTitle || "Target_Notes";

    if (itemIdx !== null && order.bundleFiles && order.bundleFiles[itemIdx]) {
      const subItem = order.bundleFiles[itemIdx];
      fileData = subItem.fileData || fileData;
      fileNameTitle = subItem.title || fileNameTitle;
    }

    const cleanTitle = fileNameTitle
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
          `TARGET TRACK TOPPER STUDY MATERIAL\n\nTitle: ${fileNameTitle}\nInvoice: ${order.invoiceNo}\nDownloaded: ${nowFormattedTimestamp()}\nAuthorized Student: ${order.buyerName} (${order.buyerMobile})\nTarget Track Copyright © All Rights Reserved.`,
        ],
        { type: "text/plain;charset=utf-8" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanTitle}_Notes.txt`;
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

  // 2-Step Verified Order Delete (Requirement 6)
  const handleConfirmDeleteOrder = () => {
    if (!orderToDelete) return;
    if (deleteVerifyText.trim().toUpperCase() !== "DELETE") {
      return alert("પુષ્ટિ કરવા માટે ખાનામાં બરાબર 'DELETE' લખો.");
    }

    const nextOrders = orders.filter((o) => o.id !== orderToDelete.id);
    commitDb({ ...db, marketplaceOrders: nextOrders });

    setOrderToDelete(null);
    setDeleteStep(1);
    setDeleteVerifyText("");
    triggerCelebration("🗑️ ઓર્ડર હિસ્ટ્રી ડિલીટ થઈ", "ઓર્ડર લિસ્ટમાંથી સફળતાપૂર્વક હટાવી દીધો.");
  };

  // Submit Seller Verification Application (Requirement 2 & 7)
  const handleSubmitSellerApplication = (e) => {
    e.preventDefault();
    if (!applyName.trim()) return alert("કૃપા કરીને પૂરું નામ લખો.");
    if (!applyCity.trim()) return alert("કૃપા કરીને તમારું શહેર અથવા જિલ્લો લખો.");
    if (!applyUpi.trim()) return alert("કૃપા કરીને તમારું UPI ID લખો.");
    if (!applyTermsCheck) {
      return alert("સેલર બનવા માટે કૃપા કરીને સેલર નિયમો અને નીતિઓ સ્વીકારો.");
    }

    const newApp = {
      id: `sell_app_${Date.now()}`,
      applicantMobile: userMobile,
      applicantName: applyName.trim(),
      city: applyCity.trim(),
      examExperience: applyExamExp.trim(),
      qualification: applyQualification.trim(),
      upiId: applyUpi.trim(),
      bio: applyBio.trim() || "Target Track Verified Contributor",
      status: "Pending", // 24 to 36 hours review
      appliedAt: nowFormattedTimestamp(),
      approvedAt: "",
      rejectedAt: "",
    };

    const nextDb = {
      ...db,
      sellerApplications: [newApp, ...(db.sellerApplications || [])],
    };
    commitDb(nextDb);

    triggerCelebration(
      "📋 સેલર અરજી સબમિટ થઈ!",
      "અમારી એડમિન ટીમ ૨૪ થી ૩૬ કલાકમાં વિગતો ચકાસીને એકાઉન્ટ મંજૂર કરશે."
    );
  };

  // Dynamic Bundle Handlers (Requirement 3)
  const handleAddBundleBook = () => {
    setBundleBooksList((prev) => [
      ...prev,
      {
        title: `પુસ્તક ${prev.length + 1}: નવો વિષય`,
        pages: 100,
        fileData: "",
        fileName: "",
      },
    ]);
  };

  const handleRemoveBundleBook = (idx) => {
    if (bundleBooksList.length <= 1) return alert("બંડલમાં ઓછામાં ઓછું ૧ પુસ્તક હોવું જરૂરી છે.");
    setBundleBooksList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateBundleBook = (idx, field, val) => {
    setBundleBooksList((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleBundlePdfUpload = (idx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      handleUpdateBundleBook(idx, "fileData", ev.target.result);
      handleUpdateBundleBook(idx, "fileName", file.name);
    };
    reader.readAsDataURL(file);
  };

  // Submit New Book or Bundle with Per-Book Pricing Plan (Requirement 3 & 5)
  const handlePublishBook = (e) => {
    e.preventDefault();
    if (!sellTitle.trim()) return alert("કૃપા કરીને પુસ્તકનું શીર્ષક લખો.");
    if (!sellSubject.trim()) return alert("કૃપા કરીને વિષયનું નામ લખો.");
    const offerNum = Math.max(20, Math.round(Number(sellOfferPrice) || 20));
    const origNum = Math.max(offerNum, Math.round(Number(sellOriginalPrice) || offerNum));
    if (!sellUpi.trim()) return alert("કમાણી મેળવવા માટે UPI ID ફરજિયાત છે.");

    // VIP Plan Per-Book verification (Requirement 5)
    if (sellPlanChoice === "fixed_500" && !sellVipUtr.trim()) {
      return alert(
        "આ પુસ્તક પર 0% કમિશન પ્લાન સક્રિય કરવા માટે ₹500 ટ્રાન્સફરનો 12 આંકડાનો UTR નંબર દાખલ કરો."
      );
    }

    const isPerBookVip = sellPlanChoice === "fixed_500";
    const commissionPct = isPerBookVip ? 0 : 10;
    const adminCommission = Math.round(offerNum * (commissionPct / 100));
    const sellerPayout = offerNum - adminCommission;

    let bundleItemsArray = [];
    if (sellIsBundle) {
      bundleItemsArray = bundleBooksList.map((b) => `${b.title} (${b.pages} પેજ)`);
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
      bundleFiles: sellIsBundle ? bundleBooksList : null,
      originalPrice: origNum,
      price: offerNum,
      sellerPlan: sellPlanChoice, // 'commission_10' or 'fixed_500' (per-book!)
      vipPlanUtr: sellVipUtr.trim() || null,
      adminCommissionPct: commissionPct,
      adminFee: adminCommission,
      sellerPayout: sellerPayout,
      totalPages: sellIsBundle
        ? bundleBooksList.reduce((acc, b) => acc + (Number(b.pages) || 0), 0)
        : Number(sellTotalPages) || 50,
      samplePagesCount: Number(sellSamplePages) || 5,
      coverImage:
        sellCoverImage ||
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
      demoImages: sellDemoImages,
      sampleDemoText: sellDemoText.trim(),
      fileData: sellDirectFileData || "",
      fileName: sellDirectFileName || "Book_Notes.pdf",
      fullDownloadUrl: sellFullUrlBackup.trim() || "",
      status: "Pending", // Admin review required
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
      "📤 લિસ્ટિંગ રિવ્યૂ માટે મોકલાઈ ગયું!",
      "એડમિન દ્વારા ૨૪ થી ૩૬ કલાકમાં ચકાસીને લાઈવ કરવામાં આવશે."
    );

    // Reset Form
    setSellTitle("");
    setSellSubject("");
    setSellIsBundle(false);
    setSellDemoText("");
    setSellCoverImage("");
    setSellDemoImages([]);
    setSellDirectFileData("");
    setSellDirectFileName("");
    setSellFullUrlBackup("");
    setSellUpi("");
    setSellVipUtr("");
    setActiveSubTab("wallet");
  };

  // Handle Buy Checkout Order Creation
  const handleConfirmPurchase = () => {
    if (!utrInput.trim()) {
      return alert("કૃપા કરીને Google Pay / PhonePe માંથી ૧૨ આંકડાનો UTR / UPI Ref No. દાખલ કરો.");
    }

    setCheckoutSubmitting(true);
    const invoiceNum = `TT-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const isBookVip = checkoutBook.sellerPlan === "fixed_500";
    const adminCommission = isBookVip ? 0 : Math.round(checkoutBook.price * 0.1);
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
      status: "Pending Verification",
      sellerPayoutStatus: "Pending",
      downloadCount: 0,
      createdAt: nowFormattedTimestamp(),
      verifiedAt: "",
      fileData: checkoutBook.fileData || "",
      bundleFiles: checkoutBook.bundleFiles || null,
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

  // Handle Weekly Payout Request Submission (Requirement 8 & 9: Clean Language)
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
      status: "Pending",
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
      "💰 પેઆઉટ વિનંતી સફળ!",
      "એડમિન દ્વારા વેરિફાય કરીને રકમ તમારા બેંક ખાતામાં જમા કરવામાં આવશે."
    );
  };

  // Submit Seller Support Ticket (Requirement 4)
  const handleSubmitSellerTicket = (e) => {
    e.preventDefault();
    if (!supportMsg.trim()) return alert("કૃપા કરીને તમારો પ્રશ્ન કે સમસ્યા લખો.");

    const newTicket = {
      id: `ticket_${Date.now()}`,
      sellerMobile: userMobile,
      sellerName: currentUser?.name || "Seller",
      category: supportCategory,
      message: supportMsg.trim(),
      status: "Pending",
      createdAt: nowFormattedTimestamp(),
      adminReply: "",
      repliedAt: "",
    };

    const nextDb = {
      ...db,
      sellerTickets: [newTicket, ...(db.sellerTickets || [])],
    };
    commitDb(nextDb);

    setSupportMsg("");
    triggerCelebration("📩 સપોર્ટ ટિકિટ મોકલાઈ!", "એડમિન ટૂંક સમયમાં તમને જવાબ આપશે.");
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
                {isSellerApproved && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500 text-white">
                    ✓ Verified Seller
                  </span>
                )}
              </div>
              <p className="text-xs muted-text font-medium mt-0.5">
                ગુજરાતના શ્રેષ્ઠ ટોપર્સની નોટ્સ અને ઑફર્સ એક જ સ્થળે • સીધું વૉલેટમાં સાપ્તાહિક પેઆઉટ
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

        {/* 3 Main Action Sub-Tabs (Requirement 1: Combos merged into Store) */}
        <div
          className="flex items-center justify-between gap-2 pt-2 border-t overflow-x-auto no-scrollbar"
          style={{ borderColor: "var(--border-col)" }}
        >
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:gap-2">
            <button
              onClick={() => setActiveSubTab("browse")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                activeSubTab === "browse"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "subtle-pill hover:border-indigo-500"
              }`}
            >
              <span>🛍️</span>
              <span>બુક સ્ટોર & ઑફર્સ</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold hidden sm:inline">
                {liveBooks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab("wallet")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                activeSubTab === "wallet"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "subtle-pill hover:border-emerald-500"
              }`}
            >
              <span>💼</span>
              <span>સેલર હબ & વૉલેટ</span>
              {sellerWalletStats.availableBalance > 0 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 font-extrabold">
                  ₹{sellerWalletStats.availableBalance}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab("library")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                activeSubTab === "library"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "subtle-pill hover:border-indigo-500"
              }`}
            >
              <span>📂</span>
              <span>મારી ખરીદી</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold hidden sm:inline">
                {myVerifiedOrders.length}
              </span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-xl shrink-0">
            <span>🛡️ ૧૦% કમિશન અથવા બુક-વાઇઝ ₹૫૦૦ માં 0% કમિશન VIP પ્લાન</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. VIEW: BROWSE ALL BOOKS & INTEGRATED COMBOS (Req 1)        */}
      {/* ============================================================ */}
      {activeSubTab === "browse" && (
        <div className="space-y-4 anim-fade">
          {/* Integrated Hot Combos Banner (Requirement 1) */}
          {featuredCombos.length > 0 && (
            <div className="one-card p-4 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-teal-500/10 border-2 border-purple-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-purple-600 dark:text-purple-400">
                      ટોપર્સ સ્પેશિયલ કોમ્બો બંડલ્સ (મોટી બચત)
                    </h3>
                    <p className="text-[10px] muted-text">એક જ પેકમાં ૩ થી ૪ વિષયોની સંપૂર્ણ નોટ્સ ૫૦% સુધી ડિસ્કાઉન્ટ સાથે</p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-500 text-white shrink-0">
                  {featuredCombos.length} કોમ્બો લાઈવ
                </span>
              </div>

              {/* Horizontal Scrollable Combo Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {featuredCombos.slice(0, 2).map((cb) => (
                  <div key={cb.id} className="subtle-pill p-3 space-y-2 border-l-4 border-l-purple-500">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-xs text-purple-600 dark:text-purple-400">
                        {cb.title}
                      </span>
                      <span className="text-sm font-black text-emerald-500 shrink-0">₹{cb.price}</span>
                    </div>
                    {cb.bundleItems && (
                      <div className="text-[10px] muted-text">
                        શામેલ: {cb.bundleItems.slice(0, 2).join(" + ")} {cb.bundleItems.length > 2 && "..."}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setPreviewBook(cb)}
                        className="text-[10px] font-bold text-indigo-500 underline"
                      >
                        ડેમો સેમ્પલ જુઓ
                      </button>
                      <button
                        onClick={() => { setCheckoutBook(cb); setUtrInput(""); }}
                        className="bg-purple-600 text-white px-3 py-1 rounded-lg text-[10px] font-black shadow-xs"
                      >
                        કોમ્બો ખરીદો ₹{cb.price}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Exam Filter Chips (Includes "🔥 કોમ્બો & ઑફર્સ") */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="પુસ્તક, વિષય અથવા ટોપરનું નામ શોધો..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full theme-input pl-9 pr-3 py-2.5 text-xs font-semibold"
              />
              <span className="absolute left-3 top-3 text-xs muted-text">🔍</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {[
                { id: "ALL", label: "બધા પુસ્તકો" },
                { id: "COMBOS", label: "🔥 કોમ્બો બંડલ્સ" },
                { id: "CCE (Group A & B)", label: "CCE" },
                { id: "GPSC Class 1-2", label: "GPSC" },
                { id: "Police PSI / Constable", label: "PSI / Constable" },
              ].map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExamFilter(ex.id)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition ${
                    selectedExamFilter === ex.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "subtle-pill hover:border-indigo-500"
                  }`}
                >
                  {ex.label}
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
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-500">
                          {book.exam}
                        </span>
                        {book.isBundle && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-500">
                            🔥 કોમ્બો પેક
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

                    {/* Seller Link */}
                    <div
                      onClick={() => setSellerProfileToView(book)}
                      className="text-[10px] subtle-pill px-2.5 py-1 text-slate-600 dark:text-slate-300 font-semibold flex items-center justify-between cursor-pointer hover:border-indigo-500 transition"
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
      {/* 2. VIEW: SELLER HUB & WALLET (Req 2, 3, 4, 5, 8 & 9)           */}
      {/* ============================================================ */}
      {activeSubTab === "wallet" && (
        <div className="space-y-4 anim-fade">
          {/* CASE A: USER HAS NOT BEEN APPROVED AS SELLER YET (Requirement 2) */}
          {!isSellerApproved ? (
            <div className="one-card p-5 sm:p-6 space-y-4 border-2 border-indigo-500">
              {mySellerApplication && mySellerApplication.status === "Pending" ? (
                // 24 to 36 hours verification banner
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-3xl mx-auto animate-pulse">
                    ⏳
                  </div>
                  <h3 className="text-base font-black text-amber-500">
                    તમારી સેલર અરજી ચકાસણી હેઠળ છે!
                  </h3>
                  <div className="max-w-md mx-auto p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs leading-relaxed font-semibold text-slate-700 dark:text-slate-300">
                    અમારી એડમિન ટીમ તમારી માહિતી અને નોટ્સની ગુણવત્તા <b>૨૪ થી ૩૬ કલાકમાં</b> ચકાસીને એકાઉન્ટ મંજૂર કરશે.
                    <br />
                    અરજી તારીખ: <b>{mySellerApplication.appliedAt}</b>
                  </div>
                  <p className="text-[11px] muted-text">
                    એડમિન દ્વારા મંજૂરી મળતાં જ તમારું સેલર ડેશબોર્ડ અને વૉલેટ આપોઆપ અનલૉક થઈ જશે.
                  </p>
                  <button
                    onClick={() =>
                      openAdminWhatsApp(
                        `Hello Target Track Admin, I have submitted my Seller Application for mobile: ${userMobile}. Please check.`
                      )
                    }
                    className="subtle-pill px-4 py-2 text-xs font-black text-emerald-600 hover:border-emerald-500"
                  >
                    💬 એડમિન સાથે WhatsApp પર વાત કરો
                  </button>
                </div>
              ) : (
                // Seller Registration Application Form (Requirement 2 & 7)
                <div className="space-y-4">
                  <div className="border-b pb-3" style={{ borderColor: "var(--border-col)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎓</span>
                      <div>
                        <h2 className="text-base font-black text-indigo-600 dark:text-indigo-400">
                          સેલર એકાઉન્ટ વેરિફિકેશન અરજી
                        </h2>
                        <p className="text-xs muted-text mt-0.5">
                          ગુણવત્તા જાળવવા માટે સેલર વેરિફિકેશન ફરજિયાત છે. મંજૂરી સમય: ૨૪ થી ૩૬ કલાક.
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitSellerApplication} className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-extrabold muted-text mb-1">
                          તમારું પૂરું નામ *
                        </label>
                        <input
                          type="text"
                          value={applyName}
                          onChange={(e) => setApplyName(e.target.value)}
                          className="w-full theme-input p-2.5 text-xs font-semibold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-extrabold muted-text mb-1">
                          શહેર / જિલ્લો *
                        </label>
                        <input
                          type="text"
                          placeholder="દા.ત. ગાંધીનગર, અમદાવાદ, રાજકોટ"
                          value={applyCity}
                          onChange={(e) => setApplyCity(e.target.value)}
                          className="w-full theme-input p-2.5 text-xs font-semibold"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-extrabold muted-text mb-1">
                          પરીક્ષાનો અનુભવ / રેન્ક *
                        </label>
                        <input
                          type="text"
                          placeholder="દા.ત. CCE Group A/B Rank 14, GPSC Prelims Qualified"
                          value={applyExamExp}
                          onChange={(e) => setApplyExamExp(e.target.value)}
                          className="w-full theme-input p-2.5 text-xs font-semibold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-extrabold muted-text mb-1">
                          કમાણી ઉપાડવા માટે તમારું UPI ID *
                        </label>
                        <input
                          type="text"
                          placeholder="उदा. 9876543210@paytm, name@okaxis"
                          value={applyUpi}
                          onChange={(e) => setApplyUpi(e.target.value)}
                          className="w-full theme-input p-2.5 text-xs font-mono font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold muted-text mb-1">
                        તમારો ટૂંકો પરિચય (Bio - વિદ્યાર્થીઓને તમારી પ્રોફાઇલ પર દેખાશે)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="દા.ત. ૩ વર્ષથી GPSC/CCE ની તૈયારીનો અનુભવ, ગણિત અને રીઝનિંગ શોર્ટકટ્સ એક્સપર્ટ..."
                        value={applyBio}
                        onChange={(e) => setApplyBio(e.target.value)}
                        className="w-full theme-input p-2.5 text-xs font-semibold"
                      ></textarea>
                    </div>

                    {/* Mandatory Seller Policies Checkbox (Requirement 7) */}
                    <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 space-y-2">
                      <div className="flex items-start gap-2 text-[11px] leading-snug">
                        <input
                          type="checkbox"
                          id="sellerTermsCheck"
                          checked={applyTermsCheck}
                          onChange={(e) => setApplyTermsCheck(e.target.checked)}
                          className="mt-0.5 rounded accent-indigo-600 cursor-pointer w-4 h-4 shrink-0"
                          required
                        />
                        <label htmlFor="sellerTermsCheck" className="cursor-pointer font-semibold select-none">
                          હું Target Track ની{" "}
                          <button
                            type="button"
                            onClick={() => { setLegalModalTab("terms"); setLegalModalOpen(true); }}
                            className="text-indigo-500 font-bold underline"
                          >
                            સેલર નીતિઓ
                          </button>
                          ,{" "}
                          <button
                            type="button"
                            onClick={() => { setLegalModalTab("pricing"); setLegalModalOpen(true); }}
                            className="text-indigo-500 font-bold underline"
                          >
                            કમિશન શરતો
                          </button>{" "}
                          અને કૉપિરાઇટ કાયદા સાથે સંપૂર્ણપણે સહમત છું. મારી નોટ્સ મારી સ્વ-તૈયાર કરેલ છે.
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl text-xs shadow-md transition"
                    >
                      🚀 સેલર વેરિફિકેશન અરજી સબમિટ કરો (૨૪-૩૬ કલાકમાં મંજૂરી)
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            // CASE B: APPROVED SELLER FULL DASHBOARD (Requirement 3, 4, 5, 8 & 9)
            <div className="space-y-4">
              {/* WALLET METRICS (Clean Gujarati - Requirement 8 & 9) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="one-card p-4 space-y-1 border-l-4 border-l-emerald-500">
                  <div className="text-[10px] font-extrabold muted-text uppercase">ઉપલબ્ધ વૉલેટ બેલેન્સ</div>
                  <div className="text-2xl font-black text-emerald-500">
                    ₹{sellerWalletStats.availableBalance}
                  </div>
                  <div className="text-[9px] muted-text font-bold">સાપ્તાહિક ઉપાડ માટે તૈયાર</div>
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
                  <div className="text-[9px] text-amber-500 font-bold">બેંક ટ્રાન્સફર પ્રક્રિયા હેઠળ</div>
                </div>

                <div className="one-card p-4 space-y-1">
                  <div className="text-[10px] font-extrabold muted-text uppercase">સફળતાપૂર્વક જમા થયેલ</div>
                  <div className="text-2xl font-black text-slate-800 dark:text-slate-200">
                    ₹{sellerWalletStats.totalPaidOut}
                  </div>
                  <div className="text-[9px] text-emerald-500 font-bold">તમારા UPI માં જમા</div>
                </div>
              </div>

              {/* PAYOUT REQUEST TRIGGER */}
              <div className="one-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 via-transparent to-amber-500/10">
                <div>
                  <div className="text-xs font-black">
                    💰 સાપ્તાહિક ચૂકવણી ઉપાડ સિસ્ટમ (Weekly Payout Withdrawal)
                  </div>
                  <p className="text-[11px] muted-text mt-0.5">
                    તમારા પુસ્તકોના વેચાણની રકમ સીધી તમારા UPI (GPay / PhonePe / Paytm) માં ટ્રાન્સફર કરવા વિનંતી મોકલો.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPayoutAmountInput(sellerWalletStats.availableBalance.toString());
                    setPayoutUpiInput(currentUser?.mobile ? `${currentUser.mobile}@upi` : "");
                    setPayoutModalOpen(true);
                  }}
                  disabled={sellerWalletStats.availableBalance <= 0}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm ${
                    sellerWalletStats.availableBalance > 0
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      : "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <span>💸</span>
                  <span>સાપ્તાહિક ઉપાડ વિનંતી મોકલો (₹{sellerWalletStats.availableBalance})</span>
                </button>
              </div>

              {/* PAYOUT HISTORY */}
              <div className="one-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase muted-text">
                    📜 ઉપાડ વિનંતી હિસ્ટ્રી
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
                                  ? "↩️ રિવર્સ થયેલ (વૉલેટમાં પુનઃ જમા)"
                                  : "⏳ પ્રોસેસિંગ હેઠળ"}
                              </span>
                            </div>
                            <div className="text-[10px] muted-text mt-0.5">
                              તારીખ: {p.requestedAt} • UPI: <b className="font-mono text-indigo-500">{p.upiId}</b>
                            </div>
                            {isPaid && p.adminUtr && (
                              <div className="text-[10px] text-emerald-500 font-extrabold mt-0.5">
                                Bank UTR: {p.adminUtr}
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

              {/* DYNAMIC MULTI-BOOK & PER-BOOK VIP PUBLISH FORM (Req 3 & 5) */}
              <div className="one-card p-4 sm:p-5 space-y-4 border-2 border-emerald-500/40">
                <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
                  <div>
                    <h3 className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      📤 નવી બુક અથવા મલ્ટી-બુક કોમ્બો લિસ્ટ કરો
                    </h3>
                    <p className="text-[11px] muted-text">
                      દરેક પુસ્તક માટે અલગથી ૧૦% કમિશન અથવા ₹૫૦૦ VIP પ્લાન પસંદ કરી શકાય છે.
                    </p>
                  </div>
                </div>

                <form onSubmit={handlePublishBook} className="space-y-3.5">
                  {/* Single or Combo Toggle */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                    <label className="text-xs font-black">પ્રકાર પસંદ કરો:</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSellIsBundle(false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          !sellIsBundle ? "bg-emerald-600 text-white shadow-xs" : "subtle-pill"
                        }`}
                      >
                        📖 એક પુસ્તક
                      </button>
                      <button
                        type="button"
                        onClick={() => setSellIsBundle(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          sellIsBundle ? "bg-purple-600 text-white shadow-xs" : "subtle-pill"
                        }`}
                      >
                        📦 મલ્ટી-બુક કોમ્બો પેક
                      </button>
                    </div>
                  </div>

                  {/* Title & Exam */}
                  <div>
                    <label className="block text-[11px] font-extrabold muted-text mb-1">
                      {sellIsBundle ? "કોમ્બો પેકનું શીર્ષક *" : "પુસ્તકનું શીર્ષક *"}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        sellIsBundle
                          ? "દા.ત. CCE 2026 ૩-ઇન-૧ મહા-કોમ્બો (ગણિત + રીઝનિંગ + બંધારણ)"
                          : "દા.ત. CCE Group A & B Master Reasoning Notes"
                      }
                      value={sellTitle}
                      onChange={(e) => setSellTitle(e.target.value)}
                      className="w-full theme-input p-2.5 text-xs font-semibold"
                      required
                    />
                  </div>

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
                        placeholder="દા.ત. રીઝનિંગ, ગુજરાતનો ઈતિહાસ, સંપૂર્ણ કોમ્બો"
                        value={sellSubject}
                        onChange={(e) => setSellSubject(e.target.value)}
                        className="w-full theme-input p-2.5 text-xs font-semibold"
                        required
                      />
                    </div>
                  </div>

                  {/* DYNAMIC MULTI-BOOK SECTION (Requirement 3: + Add Book button & multiple PDF upload) */}
                  {sellIsBundle && (
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                          📦 કોમ્બોમાં શામેલ પુસ્તકો અને અલગ-અલગ PDF અપલોડ ({bundleBooksList.length} બુક્સ)
                        </span>
                        <button
                          type="button"
                          onClick={handleAddBundleBook}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-xl text-[10px] font-black transition flex items-center gap-1 shadow-xs"
                        >
                          <span>+</span>
                          <span>પુસ્તક ઉમેરો (Add Book)</span>
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {bundleBooksList.map((item, idx) => (
                          <div key={idx} className="subtle-pill p-3 space-y-2 text-xs border border-purple-400/30">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-[11px] text-purple-600">
                                પુસ્તક #{idx + 1}
                              </span>
                              {bundleBooksList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBundleBook(idx)}
                                  className="text-rose-500 hover:text-rose-700 font-bold text-[10px]"
                                >
                                  🗑️ હટાવો
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder={`દા.ત. પુસ્તક ${idx + 1} નું નામ`}
                                value={item.title}
                                onChange={(e) => handleUpdateBundleBook(idx, "title", e.target.value)}
                                className="w-full theme-input p-2 text-xs font-semibold"
                                required
                              />
                              <input
                                type="number"
                                placeholder="કુલ પેજ"
                                value={item.pages}
                                onChange={(e) => handleUpdateBundleBook(idx, "pages", e.target.value)}
                                className="w-full theme-input p-2 text-xs font-semibold"
                              />
                            </div>

                            {/* Direct PDF upload for this specific book */}
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={(e) => handleBundlePdfUpload(idx, e.target.files?.[0])}
                                className="text-[11px] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-purple-600 file:text-white"
                              />
                              {item.fileName && (
                                <span className="text-[10px] font-bold text-emerald-500 truncate">
                                  ✓ {item.fileName}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Single Book Direct PDF Upload (if not bundle) */}
                  {!sellIsBundle && (
                    <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-1.5">
                      <label className="block text-xs font-black text-indigo-600 dark:text-indigo-400">
                        📁 સંપૂર્ણ બુક PDF સીધી અપલોડ કરો (વેબસાઈટ પરથી ડાયરેક્ટ ડાઉનલોડ થશે) *
                      </label>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setSellDirectFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = (ev) => setSellDirectFileData(ev.target.result);
                          reader.readAsDataURL(file);
                        }}
                        className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-600 file:text-white"
                      />
                      {sellDirectFileName && (
                        <div className="text-[11px] font-bold text-emerald-500">
                          ✓ અપલોડ થયેલ: {sellDirectFileName}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PER-BOOK PRICING PLAN SELECTOR (Requirement 5) */}
                  <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 space-y-2.5 border">
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                      🎯 આ ચોક્કસ બુક માટે પ્લાન પસંદ કરો (Per-Book Plan):
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div
                        onClick={() => setSellPlanChoice("commission_10")}
                        className={`p-3 rounded-2xl cursor-pointer border-2 transition ${
                          sellPlanChoice === "commission_10"
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "subtle-pill opacity-75"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs">૧૦% કમિશન પ્લાન</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">
                            શરૂઆતમાં ₹0
                          </span>
                        </div>
                        <p className="text-[10px] muted-text mt-1">
                          દરેક વેચાણ પર ૧૦% એડમિન કમિશન કપાશે, ૯૦% કમાણી વૉલેટમાં જશે.
                        </p>
                      </div>

                      <div
                        onClick={() => setSellPlanChoice("fixed_500")}
                        className={`p-3 rounded-2xl cursor-pointer border-2 transition ${
                          sellPlanChoice === "fixed_500"
                            ? "border-amber-500 bg-amber-500/10"
                            : "subtle-pill opacity-75"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs">👑 આ બુક માટે VIP પ્લાન</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                            ₹500 / ૩ મહિના
                          </span>
                        </div>
                        <p className="text-[10px] muted-text mt-1">
                          ૩ મહિના સુધી <b>0% કમિશન (૧૦૦% કમાણી તમારી)</b>!
                        </p>
                      </div>
                    </div>

                    {/* If VIP chosen for this book: UTR field */}
                    {sellPlanChoice === "fixed_500" && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 mt-2">
                        <div className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                          ₹500 ટ્રાન્સફર માટે Admin UPI: <b className="font-mono text-indigo-500 select-all">9876543210@paytm</b>
                        </div>
                        <input
                          type="text"
                          placeholder="₹500 પેમેન્ટનો 12 આંકડાનો UTR દાખલ કરો *"
                          value={sellVipUtr}
                          onChange={(e) => setSellVipUtr(e.target.value)}
                          className="w-full theme-input p-2 text-xs font-mono font-bold"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Pricing Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-extrabold muted-text mb-1">
                        મૂળ કિંમત (MRP ₹)
                      </label>
                      <input
                        type="number"
                        min="20"
                        value={sellOriginalPrice}
                        onChange={(e) => setSellOriginalPrice(e.target.value)}
                        className="w-full theme-input p-2.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-emerald-500 mb-1">
                        વેચાણ કિંમત (Offer Price ₹) *
                      </label>
                      <input
                        type="number"
                        min="20"
                        value={sellOfferPrice}
                        onChange={(e) => setSellOfferPrice(e.target.value)}
                        className="w-full theme-input p-2.5 text-xs font-extrabold text-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  {/* UPI ID */}
                  <div>
                    <label className="block text-[11px] font-extrabold muted-text mb-1">
                      તમારું UPI ID (કમાણી મેળવવા માટે) *
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. 9876543210@paytm"
                      value={sellUpi}
                      onChange={(e) => setSellUpi(e.target.value)}
                      className="w-full theme-input p-2.5 text-xs font-mono font-bold"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl text-xs shadow-md transition"
                  >
                    🚀 લિસ્ટિંગ રિવ્યૂ માટે સબમિટ કરો
                  </button>
                </form>
              </div>

              {/* SELLER SUPPORT & PRE-DEFINED HELP DESK (Requirement 4) */}
              <div className="one-card p-4 sm:p-5 space-y-3.5 border-l-4 border-l-indigo-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎧</span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black">
                        સેલર સપોર્ટ & હેલ્પ ડેસ્ક (Seller Help Desk)
                      </h3>
                      <p className="text-[10px] muted-text">કોઈપણ મુશ્કેલી હોય તો સીધો સંપર્ક કરો</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openAdminWhatsApp(
                        `Hello Target Track Admin, I am Seller (${currentUser?.name || userMobile}). Need help regarding: ${supportCategory}`
                      )
                    }
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-1.5 rounded-xl text-xs shadow-xs flex items-center gap-1.5"
                  >
                    <span>💬</span>
                    <span>સેલર WhatsApp હેલ્પલાઇન</span>
                  </button>
                </div>

                <form onSubmit={handleSubmitSellerTicket} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-extrabold muted-text mb-1.5">
                      સમસ્યાનો પ્રકાર પસંદ કરો (Pre-defined Help Options):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {[
                        "💸 પેઆઉટ / વૉલેટ ઉપાડ સંબંધિત પ્રશ્ન",
                        "📚 પુસ્તક મંજૂરી / લિસ્ટિંગ સ્ટેટસ",
                        "👑 VIP 0% કમિશન પ્લાન પ્રશ્ન",
                        "📁 PDF અપલોડ કે ડાઉનલોડ ત્રુટિ",
                        "✏️ કિંમત કે ટાઇટલ બદલવા વિનંતી",
                        "❓ અન્ય કોઈ પ્રશ્ન",
                      ].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSupportCategory(cat)}
                          className={`p-2 rounded-xl text-[10px] sm:text-[11px] font-bold text-left transition ${
                            supportCategory === cat
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "subtle-pill hover:border-indigo-500"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold muted-text mb-1">
                      તમારો સંદેશ અથવા વિગતો લખો:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="સમસ્યાની વિગત અહીં લખો..."
                      value={supportMsg}
                      onChange={(e) => setSupportMsg(e.target.value)}
                      className="w-full theme-input p-2.5 text-xs font-semibold"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="subtle-pill px-4 py-2 text-xs font-black text-indigo-600 hover:border-indigo-500"
                  >
                    📩 સપોર્ટ ટિકિટ મોકલો
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. VIEW: MY PURCHASES WITH 2-STEP DELETE (Req 2 & 6)          */}
      {/* ============================================================ */}
      {activeSubTab === "library" && (
        <div className="space-y-4 anim-fade">
          <div className="one-card p-4 space-y-1 border-l-4 border-l-indigo-600">
            <h2 className="text-sm font-black">📂 મારી ખરીદેલ નોટ્સ અને પુસ્તકો</h2>
            <p className="text-xs muted-text">
              સુરક્ષાના નિયમો મુજબ દરેક પુસ્તક <b>મહત્તમ ૨ વખત ડાઉનલોડ</b> કરી શકાય છે.
            </p>
          </div>

          {myOrders.length === 0 ? (
            <div className="text-center py-12 subtle-pill p-6 rounded-2xl text-xs muted-text space-y-2">
              <div className="text-2xl">🛒</div>
              <div className="font-bold">તમે હજુ કોઈ પુસ્તક ખરીદ્યું નથી.</div>
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

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                            isVerified
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-amber-500/15 text-amber-500"
                          }`}
                        >
                          {isVerified ? "✓ Verified & Active" : "⏳ વેરિફિકેશન ચાલુ"}
                        </span>

                        {/* 2-Step Delete Button (Requirement 6) */}
                        <button
                          type="button"
                          onClick={() => {
                            setOrderToDelete(ord);
                            setDeleteStep(1);
                            setDeleteVerifyText("");
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1 text-xs transition"
                          title="આ ખરીદી હિસ્ટ્રીમાંથી કાઢી નાખો"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Multi-Book Bundle individual download links (Requirement 3) */}
                    {isVerified && ord.bundleFiles && ord.bundleFiles.length > 0 && (
                      <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                        <div className="text-[11px] font-black text-purple-600 dark:text-purple-400">
                          📦 કોમ્બો પુસ્તકો ડાઉનલોડ કરો:
                        </div>
                        <div className="space-y-1.5">
                          {ord.bundleFiles.map((bFile, bIdx) => (
                            <div key={bIdx} className="flex items-center justify-between text-xs subtle-pill p-2">
                              <span className="font-bold">{bFile.title}</span>
                              <button
                                onClick={() => handleDownloadBookPdf(ord, bIdx)}
                                disabled={limitReached}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-black"
                              >
                                📥 PDF ડાઉનલોડ
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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

                        {isVerified && !ord.bundleFiles && (
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
      {/* 2-STEP ORDER DELETE VERIFICATION MODAL (Requirement 6)        */}
      {/* ============================================================ */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-sm one-card p-5 space-y-4 border-2 border-rose-500 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-500">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-sm font-black">
                {deleteStep === 1 ? "પગલું ૧/૨: ખરીદી હિસ્ટ્રી ડિલીટ?" : "પગલું ૨/૨: અંતિમ પુષ્ટિ (DELETE)"}
              </h3>
            </div>

            {deleteStep === 1 ? (
              <div className="space-y-3 text-xs">
                <p className="leading-relaxed">
                  શું તમે ખરેખર <b>"{orderToDelete.bookTitle}"</b> ની ખરીદી રેકોર્ડ લિસ્ટમાંથી હટાવવા માંગો છો?
                </p>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                  નોંધ: આ ડિલીટ કરવાથી તમારો ડાઉનલોડ કરવાનો એક્સેસ બંધ થઈ જશે.
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--border-col)" }}>
                  <button onClick={() => setOrderToDelete(null)} className="subtle-pill px-4 py-2 font-bold">
                    રદ કરો
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl font-black"
                  >
                    આગળ વધો (Step 2) ➔
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="leading-relaxed">
                  ખાતરી કરવા માટે નીચેના ખાનામાં <b>DELETE</b> ટાઈપ કરો:
                </p>
                <input
                  type="text"
                  placeholder="DELETE લખો"
                  value={deleteVerifyText}
                  onChange={(e) => setDeleteVerifyText(e.target.value)}
                  className="w-full theme-input p-2.5 text-xs font-mono font-black text-rose-500 uppercase"
                  autoFocus
                />
                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--border-col)" }}>
                  <button onClick={() => setOrderToDelete(null)} className="subtle-pill px-4 py-2 font-bold">
                    રદ કરો
                  </button>
                  <button
                    onClick={handleConfirmDeleteOrder}
                    disabled={deleteVerifyText.trim().toUpperCase() !== "DELETE"}
                    className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white px-5 py-2 rounded-xl font-black"
                  >
                    કાયમ માટે ડિલીટ કરો
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SAMPLE DEMO PREVIEW MODAL */}
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
                  <img src={previewBook.coverImage} alt={previewBook.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-3.5 rounded-2xl subtle-pill text-xs whitespace-pre-wrap leading-relaxed font-medium">
                {previewBook.sampleDemoText || "આ પુસ્તકના પ્રથમ ૫ પેજનો ડેમો સારાંશ અહીં જોઈ શકાય છે."}
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end gap-2" style={{ borderColor: "var(--border-col)" }}>
              <button onClick={() => setPreviewBook(null)} className="subtle-pill px-4 py-2 text-xs font-bold">
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

      {/* BUY CHECKOUT MODAL */}
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
                  <span className="muted-text">ચુકવવાની રકમ:</span>
                  <span className="text-lg font-black text-emerald-500">₹{checkoutBook.price}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2 text-center">
                <div className="text-[11px] font-extrabold text-indigo-500">
                  📲 Google Pay / PhonePe / Paytm સ્કેન કરો અથવા UPI આઈડી કોપી કરો:
                </div>
                <div className="font-mono text-sm font-black bg-white dark:bg-slate-900 py-1.5 px-3 rounded-xl border select-all">
                  9876543210@paytm
                </div>
                <div className="text-[10px] muted-text">
                  (રકમ ₹{checkoutBook.price} ટ્રાન્સફર કરીને નીચે ૧૨ આંકડાનો UTR નંબર દાખલ કરો)
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
              <button onClick={() => setCheckoutBook(null)} className="subtle-pill px-4 py-2 text-xs font-bold">
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

      {/* PAYOUT REQUEST MODAL */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-sm one-card p-5 space-y-4 border-2 border-emerald-500 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <h3 className="text-sm font-black">સાપ્તાહિક પેઆઉટ ઉપાડ વિનંતી</h3>
              </div>
              <button onClick={() => setPayoutModalOpen(false)} className="w-7 h-7 rounded-full subtle-pill flex items-center justify-center text-xs font-black">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayoutRequest} className="space-y-3">
              <div className="p-3 rounded-2xl subtle-pill text-xs flex justify-between items-center">
                <span className="muted-text">ઉપલબ્ધ બેલેન્સ:</span>
                <span className="text-base font-black text-emerald-500">₹{sellerWalletStats.availableBalance}</span>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold muted-text mb-1">ઉપાડ રકમ (₹) *</label>
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
                <label className="block text-[11px] font-extrabold muted-text mb-1">UPI ID *</label>
                <input
                  type="text"
                  placeholder="उदा. mobile@upi"
                  value={payoutUpiInput}
                  onChange={(e) => setPayoutUpiInput(e.target.value)}
                  className="w-full theme-input p-2.5 text-xs font-mono font-bold"
                  required
                />
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs shadow-sm mt-2">
                વિનંતી મોકલો ➔
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SELLER PORTFOLIO MODAL */}
      {sellerProfileToView && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-lg one-card p-5 space-y-4 border-2 border-indigo-500 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">👨‍🏫</span>
                <h3 className="text-sm font-black">સેલર પ્રોફાઇલ & ઉપલબ્ધ પુસ્તકો</h3>
              </div>
              <button onClick={() => setSellerProfileToView(null)} className="w-7 h-7 rounded-full subtle-pill flex items-center justify-center text-xs font-black">
                ✕
              </button>
            </div>

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

            <div className="space-y-2">
              <div className="text-xs font-extrabold muted-text uppercase">
                આ સેલરની અન્ય નોટ્સ ({books.filter((b) => b.sellerMobile === sellerProfileToView.sellerMobile).length})
              </div>
              <div className="space-y-2">
                {books
                  .filter((b) => b.sellerMobile === sellerProfileToView.sellerMobile)
                  .map((b) => (
                    <div key={b.id} className="subtle-pill p-3 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-black">{b.title}</div>
                        <div className="text-[10px] muted-text font-bold">{b.exam} • {b.subject}</div>
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
              <button onClick={() => setSellerProfileToView(null)} className="subtle-pill px-4 py-2 text-xs font-bold">
                બંધ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 anim-fade">
          <div className="w-full max-w-sm one-card p-5 space-y-4 border-2 border-indigo-500 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🧾</span>
                <h3 className="text-sm font-black">અધિકૃત ડિજિટલ બિલ</h3>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="w-7 h-7 rounded-full subtle-pill flex items-center justify-center text-xs font-black">
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
                  <span>{selectedInvoice.buyerName}</span>
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
              <button onClick={() => setSelectedInvoice(null)} className="subtle-pill px-4 py-2 text-xs font-bold">
                બંધ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEGAL POLICY MODAL (Requirement 7) */}
      <LegalPolicyModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
}

export default MarketplaceTab;
