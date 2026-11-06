# 🎯 Target Track — Smart Study OS (React + Vite)

A modern, fast, and feature-rich Study Management & Exam Preparation System built specifically for competitive exam aspirants (GPSC, CCE, UPSC, etc.). 

Now fully converted and refactored from a single-file application into a modular **React + Vite** architecture with **Tailwind CSS**, Samsung One UI 9 inspired design, and real-time cloud sync.

---

## ✨ Features

- **📱 One UI 9 Minimal Design:** Minimal Cream and AMOLED Deep Black theme support with fluid animations.
- **⏳ Daily Pastel Countdown:** Dynamic daily-changing light gradient countdown timer showing Days, Hours, Minutes, and Seconds to your target exam.
- **🎯 Multiple Exam Management & Smart Sync:** Switch between different exams seamlessly while automatically synchronizing common subject and chapter progress.
- **📖 Daily Study Logger:** Log read pages with sub-topics, steppers, and single-click chapter finish.
- **🔔 Spaced Repetition Revision Engine:**
  - Automated Day-1 and 7-Day revision for ongoing chapters.
  - Full 1, 7, 30, and 60-Day Master Revision cycles for completed chapters.
  - Smart merging of same-chapter revisions due on the same day.
  - Overdue revision forwarding with reverse revision capability.
- **🏆 Completed Chapters Vault:** Track finished chapters organized by subject with Master Revision progress (e.g. `Master Rev: 2/4`).
- **📊 In-Depth Analytics & Consistency Graph:**
  - 7-Day Study consistency bar chart.
  - SVG polyline test score progression chart.
  - Study readiness score (0-100) and cognitive retention percentage.
  - Personalized psychological study personas.
- **🎯 3-Mode Test Marks Logger:** Chapter tests, full subject tests, and grand mock exams with score percentage metrics.
- **⏱️ Smart Study Focus Timer:** Built-in Pomodoro timer with presets (15m, 25m, 45m, 60m).
- **🗂️ Quick Formula & Key Folders:** Dedicated bento-grid folders organized by subject and chapter for formulas, shortcut keys, and important notes.
- **📥 Excel / Word Bulk Import:** Copy-paste or upload `.csv` / `.txt` files to import whole syllabus chapters and test scores instantly.
- **🛡️ Multi-Page Admin Console:**
  - Student leaderboard, user management, and validity adjustments.
  - Global top banner broadcast & pop-up modal announcements.
  - 1-to-1 direct messaging and bug report response system.
  - Deleted & archived accounts vault with restore and permanent deletion authorities.

---

## 📁 Project Structure

```text
target-track/
├── public/
├── src/
│   ├── assets/               # Static assets & icons
│   ├── components/
│   │   ├── admin/            # AdminApp.jsx (Overview, Users, Broadcast, Reports)
│   │   ├── auth/             # AuthScreen.jsx (Mobile login, PIN check, Plans)
│   │   ├── common/           # ToastAndConfetti.jsx
│   │   ├── layout/           # Header.jsx, BottomNav.jsx, SideDrawer.jsx
│   │   ├── modals/           # MultiExam, QuickNotes, ExtraRev, BulkImport, AppTour, etc.
│   │   ├── today/            # DailyCountdown, KpiCards, DailyGoal, StudyLogger, DueRevisions, ActivityHistory
│   │   ├── syllabus/         # SyllabusTab, Subject cards, CompletedVault
│   │   ├── analysis/         # AnalysisTab, Overview charts, Test logger, Breakdown matrix
│   │   └── profile/          # ProfileTab, FocusTimer, Razorpay plans, Backup & Restore
│   ├── context/
│   │   ├── AuthContext.jsx   # Authentication & demo mode state
│   │   ├── StudyContext.jsx  # Primary database & synchronization logic
│   │   └── ThemeContext.jsx  # One UI cream/black theme controller
│   ├── services/
│   │   └── firebase.js       # Cloud REST API & offline sync handling
│   ├── utils/
│   │   ├── constants.js      # App configurations, secrets, and palettes
│   │   └── helpers.js        # Date, formatting, and calculation utilities
│   ├── App.jsx               # Main screen router and modal controller
│   ├── main.jsx              # React DOM entry point with context providers
│   └── index.css             # Tailwind base & custom One UI CSS variables
├── index.html                # App shell with Google Fonts & responsive meta tags
├── package.json              # Dependencies and Vite scripts
├── tailwind.config.js        # Tailwind CSS configuration
└── vite.config.js            # Vite build configuration
```

---

## 🚀 How to Run Locally

If you have Node.js installed on your computer:

```bash
# 1. Open the project folder in terminal
cd target-track

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Visit the local URL shown in your terminal (usually `http://localhost:3000`).

---

## 🌐 How to Upload to GitHub (GitHub પર મૂકવાની રીત)

તમે આ પ્રોજેક્ટ GitHub પર ૩ માંથી કોઈપણ એક સરળ રીતે અપલોડ કરી શકો છો:

### પદ્ધતિ ૧: GitHub Desktop દ્વારા (સૌથી સરળ - No Coding Required)
1. **[GitHub Desktop](https://desktop.github.com/)** સોફ્ટવેર ડાઉનલોડ કરીને ઇન્સ્ટોલ કરો.
2. તમારા GitHub એકાઉન્ટથી સાઇન ઇન કરો.
3. ઉપર મેનૂમાં **File** ➔ **Add Local Repository** પર ક્લિક કરો.
4. આ ફોલ્ડરનો પાથ સિલેક્ટ કરો:
   `C:\Users\zanka\.gemini\antigravity\scratch\target-track`
5. જો પૂછે કે *"This directory does not appear to be a Git repository"*, તો **"Create a repository"** પર ક્લિક કરો.
6. નીચે ડાબી બાજુ **"Publish repository"** બટન દબાવો. તમારો આખો પ્રોજેક્ટ GitHub પર લાઈવ થઈ જશે!

---

### પદ્ધતિ ૨: VS Code (Visual Studio Code) દ્વારા
1. VS Code માં આ ફોલ્ડર ખોલો: `File ➔ Open Folder... ➔ target-track`
2. ડાબી બાજુના મેનૂમાં **Source Control** આઇકોન (ત્રીજો આઇકોન) પર ક્લિક કરો.
3. **"Publish to GitHub"** બટન પર ક્લિક કરો.
4. તમારા GitHub એકાઉન્ટમાં **Public** અથવા **Private** પસંદ કરો. VS Code બધી જ ફાઈલો ઓટોમેટિક અપલોડ કરી દેશે.

---

### પદ્ધતિ ૩: Git Terminal દ્વારા (જો Git ઇન્સ્ટોલ કરેલું હોય)

```bash
cd C:\Users\zanka\.gemini\antigravity\scratch\target-track
git init
git add .
git commit -m "Initial commit: Target Track React+Vite OS"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

---

## 🔒 Security & Privacy

- All sensitive keys and configuration parameters are localized.
- Database changes automatically synchronize with LocalStorage and Firebase Realtime Database.
- Strict two-step verification is enforced before account data resets, with automatic archiving to the admin vault.
