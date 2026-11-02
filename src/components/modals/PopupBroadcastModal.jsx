import React, { useEffect, useState } from "react";
import { useStudy } from "../../context/StudyContext";

export function PopupBroadcastModal() {
  const { db, currentUser, updateCurrentUser } = useStudy();
  const [modalData, setModalData] = useState(null); // { type: 'dm'|'bc', title, message, id }

  useEffect(() => {
    if (!currentUser) return;

    // 1. Check unread 1-to-1 direct message first
    const unreadDm = (currentUser.directMessages || []).find((m) => !m.seen);
    if (unreadDm) {
      setModalData({
        type: "dm",
        tag: "📩 1-to-1 Admin Reply",
        title: "Admin તરફથી તમારા માટે ખાસ મેસેજ",
        message: `${unreadDm.text}\n\n🕒 ${unreadDm.date || ""}`,
        id: unreadDm.id,
      });
      return;
    }

    // 2. Otherwise check global Pop-up Broadcast
    if (db.popupBroadcast && db.popupBroadcast.id && db.popupBroadcast.message) {
      const seenKey = `POPUP_BC_${db.popupBroadcast.id}_${currentUser.mobile}`;
      if (!localStorage.getItem(seenKey)) {
        setModalData({
          type: "bc",
          tag: "📢 Important Announcement",
          title: db.popupBroadcast.title || "Admin Broadcast",
          message: db.popupBroadcast.message,
          id: db.popupBroadcast.id,
        });
      }
    }
  }, [currentUser, db.popupBroadcast]);

  if (!modalData) return null;

  const handleDismiss = () => {
    if (modalData.type === "dm") {
      updateCurrentUser((u) => {
        const msg = (u.directMessages || []).find((m) => m.id === modalData.id);
        if (msg) msg.seen = true;
      });
    } else if (modalData.type === "bc") {
      localStorage.setItem(`POPUP_BC_${modalData.id}_${currentUser.mobile}`, "1");
    }
    setModalData(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 anim-fade" onClick={handleDismiss}>
      <div
        className="w-full max-w-sm one-card p-5 space-y-3.5 border-2 border-amber-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg font-extrabold shadow-md">
              📢
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                {modalData.tag}
              </span>
              <h3 className="text-sm font-extrabold mt-0.5">{modalData.title}</h3>
            </div>
          </div>
          <button onClick={handleDismiss} className="w-7 h-7 rounded-full subtle-pill text-xs font-extrabold">
            ✕
          </button>
        </div>

        <div className="subtle-pill p-3.5 text-xs font-semibold leading-relaxed whitespace-pre-wrap break-words">
          {modalData.message}
        </div>

        <button
          onClick={handleDismiss}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2.5 rounded-2xl text-xs shadow-md transition"
        >
          ✓ સમજી ગયા (Got It)
        </button>
      </div>
    </div>
  );
}
