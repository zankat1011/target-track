import React, { useState } from "react";

export function LegalPolicyModal({ isOpen, onClose, initialTab = "terms" }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 anim-fade">
      <div className="w-full max-w-2xl one-card p-5 space-y-4 border-2 border-indigo-500 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-col)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">
                અધિકૃત નિયમો & નીતિઓ (Legal Policies)
              </h2>
              <p className="text-[10px] muted-text">Target Track શૈક્ષણિક પ્લેટફોર્મની સુરક્ષા અને માર્ગદર્શિકા</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full subtle-pill flex items-center justify-center text-xs font-black hover:bg-rose-500/10 hover:text-rose-500 transition"
          >
            ✕
          </button>
        </div>

        {/* Policy Tab Switcher */}
        <div className="grid grid-cols-5 gap-1 subtle-pill p-1 shrink-0 text-center">
          {[
            { id: "terms", label: "શરતો (Terms)" },
            { id: "refund", label: "રીફંડ (Refund)" },
            { id: "pricing", label: "પ્રાઇસિંગ (Pricing)" },
            { id: "disclaimer", label: "ડિસ્ક્લેમર" },
            { id: "privacy", label: "પ્રાઈવસી (Privacy)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-black transition truncate ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "muted-text hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Policy Content Area */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          {/* 1. TERMS OF SERVICE */}
          {activeTab === "terms" && (
            <div className="space-y-2.5 anim-fade">
              <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                ૧. સેવાની શરતો (Terms of Service)
              </h3>
              <p>
                Target Track એપ્લિકેશન અને વેબસાઇટ વાપરવા બદલ આભાર. આ પ્લેટફોર્મ સ્પર્ધાત્મક પરીક્ષાઓની તૈયારી કરતા વિદ્યાર્થીઓ માટે બનાવવામાં આવેલ છે.
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li><b>ખાતાની સુરક્ષા:</b> દરેક વપરાશકર્તા પોતાના મોબાઈલ નંબર અને લોગિન સત્રની સુરક્ષા માટે સ્વયં જવાબદાર રહેશે.</li>
                <li><b>સામગ્રીની માલિકી (Copyright):</b> કોઈપણ વિદ્યાર્થી અન્ય કોઈ પ્રકાશન કે સંસ્થાના કૉપિરાઇટ કરેલા પુસ્તકો ગેરકાયદેસર વેચી શકશે નહીં. માત્ર પોતાના હસ્તાક્ષરની અથવા સ્વ-તૈયાર કરેલ નોટ્સ જ માન્ય રહેશે.</li>
                <li><b>અયોગ્ય વર્તન:</b> કોઈપણ પ્રકારની છેતરપિંડી, બોગસ UTR પેમેન્ટ કે નિયમોનું ઉલ્લંઘન કરનારનું ખાતું કોઈપણ પૂર્વ ચેતવણી વગર કાયમ માટે સ્થગિત (Ban) કરવામાં આવશે.</li>
                <li><b>ડાઉનલોડ લિમિટ:</b> ખરીદેલ પુસ્તકની ડીજીટલ કોપી સુરક્ષા ખાતર મહત્તમ ૨ વખત ડાઉનલોડ કરવાની સુવિધા આપવામાં આવે છે.</li>
              </ul>
            </div>
          )}

          {/* 2. REFUND POLICY */}
          {activeTab === "refund" && (
            <div className="space-y-2.5 anim-fade">
              <h3 className="text-sm font-black text-rose-500">
                ૨. રીફંડ અને રદ્દીકરણ નીતિ (Refund & Cancellation Policy)
              </h3>
              <p>
                અમારી ડિજિટલ સામગ્રી અને પુસ્તકો અંગેની રીફંડ નીતિ નીચે મુજબ સ્પષ્ટ કરવામાં આવે છે:
              </p>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-semibold space-y-1">
                <div>⚠️ ડિજિટલ નોટ્સ & PDF નીતિ:</div>
                <div className="text-[11px] font-normal leading-relaxed">
                  ડિજિટલ ફાઈલ એક વખત અનલૉક અથવા ડાઉનલોડ થયા બાદ તેના પર <b>કોઈપણ સંજોગોમાં રીફંડ મળવાપાત્ર રહેશે નહીં</b>.
                </div>
              </div>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li><b>ફાઈલ ત્રુટિ:</b> જો કોઈ ખરીદેલ PDF ખામીયુક્ત હોય કે ન ખૂલતી હોય, તો સેલર અથવા એડમિન દ્વારા ૨૪ કલાકમાં નવી સાચી ફાઈલ પૂરી પાડવામાં આવશે.</li>
                <li><b>ડબલ પેમેન્ટ:</b> જો ટેકનિકલ ખામીના લીધે એક જ બુક માટે બે વાર પૈસા કપાઈ ગયા હોય, તો વધારાની રકમ યોગ્ય ચકાસણી બાદ ૫ થી ૭ કાર્યકારી દિવસોમાં રીફંડ કરવામાં આવશે.</li>
                <li><b>સેલર VIP પ્લાન:</b> ₹૫૦૦ વાળા ૩ મહિનાના VIP સેલર પ્લાનનું એક વખત સક્રિયકરણ થયા બાદ રીફંડ મળતું નથી.</li>
              </ul>
            </div>
          )}

          {/* 3. PRICING POLICY */}
          {activeTab === "pricing" && (
            <div className="space-y-2.5 anim-fade">
              <h3 className="text-sm font-black text-emerald-500">
                ૩. પ્રાઇસિંગ અને કમિશન નીતિ (Pricing & Commission Policy)
              </h3>
              <p>
                Target Track વિદ્યાર્થીઓ અને સેલર્સ બંને માટે પારદર્શક અને ન્યાયી કિંમત વ્યવસ્થા પૂરી પાડે છે:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-2xl subtle-pill space-y-1 border-l-4 border-l-indigo-500">
                  <div className="font-extrabold text-indigo-500">પ્લાન A: ૧૦% કમિશન પ્લાન</div>
                  <div className="text-[11px] muted-text">
                    કોઈ અપફ્રન્ટ ફી નહીં. દરેક પુસ્તકના વેચાણ પર ૧૦% એડમિન મેન્ટેનન્સ કમિશન કપાશે અને ૯૦% ચોખ્ખી રકમ સેલરના વૉલેટમાં જશે.
                  </div>
                </div>
                <div className="p-3 rounded-2xl subtle-pill space-y-1 border-l-4 border-l-amber-500">
                  <div className="font-extrabold text-amber-500">પ્લાન B: પર્ટીક્યુલર બુક VIP પ્લાન</div>
                  <div className="text-[11px] muted-text">
                    ચોક્કસ પુસ્તક માટે માત્ર ₹૫૦૦ ચૂકવીને ૩ મહિના સુધી ૦% કમિશન (૧૦૦% કમાણી સેલરની) મેળવી શકાય છે.
                  </div>
                </div>
              </div>
              <ul className="list-disc list-inside space-y-1.5 pl-1 pt-1">
                <li>સેલર પોતાની બુકની લઘુત્તમ કિંમત ₹૨૦ રાખી શકે છે.</li>
                <li>વૉલેટમાંથી સાપ્તાહિક ઉપાડની રકમ સીધી માન્ય UPI આઈડી પર ટ્રાન્સફર કરવામાં આવે છે.</li>
              </ul>
            </div>
          )}

          {/* 4. DISCLAIMER */}
          {activeTab === "disclaimer" && (
            <div className="space-y-2.5 anim-fade">
              <h3 className="text-sm font-black text-amber-500">
                ૪. ડિસ્ક્લેમર (Disclaimer & Non-Affiliation)
              </h3>
              <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 space-y-2">
                <p>
                  <b>બિન-સરકારી પ્લેટફોર્મ:</b> Target Track એક સ્વતંત્ર શૈક્ષણિક પ્લેટફોર્મ છે. આ એપ્લિકેશન ગુજરાત સરકાર, GPSC, GSSSB, ગૌણ સેવા પસંદગી મંડળ અથવા પોલીસ ભરતી બોર્ડ સાથે કોઈપણ રીતે અધિકૃત જોડાણ ધરાવતી નથી.
                </p>
                <p>
                  <b>અભ્યાસ સામગ્રી:</b> અહીં ઉપલબ્ધ નોટ્સ અને પુસ્તકો વિદ્યાર્થીઓ અને ટોપર્સ દ્વારા વ્યક્તિગત અભ્યાસ માટે તૈયાર કરાયેલ છે. અમે પરીક્ષામાં સફળતાની કોઈ ગેરંટી આપતા નથી.
                </p>
                <p>
                  <b>ડેટા સંગ્રહ:</b> વપરાશકર્તાનો ડેટા સુરક્ષિત રાખવા માટે તમામ પ્રયાસો કરવામાં આવે છે, તેમ છતાં વિદ્યાર્થીએ પોતાના અગત્યના ડેટાનો નિયમિત બેકઅપ ડાઉનલોડ રાખવાની સલાહ આપવામાં આવે છે.
                </p>
              </div>
            </div>
          )}

          {/* 5. PRIVACY POLICY */}
          {activeTab === "privacy" && (
            <div className="space-y-2.5 anim-fade">
              <h3 className="text-sm font-black text-teal-500">
                ૫. ગોપનીયતા નીતિ (Privacy Policy)
              </h3>
              <p>
                તમારી અંગત માહિતીની સુરક્ષા અમારી પ્રથમ પ્રાથમિકતા છે:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li><b>સંગ્રહિત વિગતો:</b> અમે માત્ર તમારું નામ, મોબાઈલ નંબર, લક્ષિત પરીક્ષા અને અભ્યાસ ટ્રેકિંગ ડેટા સાચવીએ છીએ.</li>
                <li><b>કોઈ ડેટા વેચાણ નહીં:</b> અમે તમારી વ્યક્તિગત માહિતી કોઈપણ ત્રીજા પક્ષકાર (Third Party) ને વેચતા કે આપતા નથી.</li>
                <li><b>પેમેન્ટ સુરક્ષા:</b> બેંક અને UPI ટ્રાન્ઝેક્શન્સ એન્ક્રિપ્ટેડ માધ્યમ દ્વારા પ્રોસેસ થાય છે.</li>
                <li><b>ડેટા ડિલીટ કરવાનો અધિકાર:</b> વિદ્યાર્થી પોતાના પ્રોફાઇલમાંથી ગમે ત્યારે પોતાનો ડેટા સંપૂર્ણ સાફ (Delete All Data) કરી શકે છે.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t flex justify-end" style={{ borderColor: "var(--border-col)" }}>
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2 rounded-xl text-xs shadow-sm transition"
          >
            સમજાયું (Close)
          </button>
        </div>
      </div>
    </div>
  );
}

export default LegalPolicyModal;
