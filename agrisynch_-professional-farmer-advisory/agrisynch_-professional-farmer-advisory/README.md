
# AgriSynch: Fully Offline Production Crop Advisory

AgriSynch is a mobile-first application designed for rural farmers operating with zero or intermittent internet connectivity.

## 🚀 Key Features

- **100% Offline Daily Use**: Crop management, soil intelligence, and advisory engines work without any internet connection.
- **Multilingual Support**: Supports English, Hindi, and Marathi out-of-the-box with a high-contrast, icon-heavy UI.
- **Offline Soil Intelligence**: Immediately maps registered crops to local soil profiles (Water Retention, Fertility, Action Tips).
- **48-Hour Insight Engine**: Computes critical alerts (Weather risk, Pest alerts, Irrigation needs) locally on the device using a stored weather snapshot.
- **Battery & Memory Efficient**: Optimized for low-end Android devices with minimal overhead.

## 🧠 Offline Architecture

1.  **Local Knowledge Base**: The application ships with pre-bundled datasets for:
    - 7 major crop varieties (Rice, Wheat, Cotton, etc.)
    - 5 primary soil types (Alluvial, Black, Red, etc.)
    - 3 languages (EN, HI, MR)
2.  **Persistence**: Farmer data is stored in `localStorage` (simulated SQLite), surviving app restarts and reboots.
3.  **Local Computation**: Decision logic is deterministic and rule-based, requiring no server-side calls for daily insights.

## 🛠 Tech Stack

- **Frontend**: React (Mobile-First)
- **Styling**: Tailwind CSS (Accessibility optimized)
- **Offline Logic**: Custom TypeScript Decision Engine
- **Branding**: AgriSynch (Emerald/Earth Tones)

## 🌐 Connectivity Logic

- **Offline Mode**: Full functionality for registration, viewing, and insights.
- **Online Mode**: Silent background sync for updated weather snapshots and new advisory rules.
- **Diagnostics**: AI-powered diagnostics (Ask Expert AI) become active when a signal is detected.

## 📁 Repository Structure

```
agrisynch/
├── mobile-app/
│   ├── App.tsx (Logic Hub)
│   ├── types.ts (Type Safety)
│   ├── constants.tsx (Local Database & Translations)
│   ├── services/
│   │   ├── AdvisoryEngine.ts (Offline Logic)
│   │   └── geminiService.ts (Online Diagnostics)
├── data/ (Bundled with build)
│   ├── crops.json
│   ├── soils.json
└── README.md
```

## 🏆 Deployment Strategy

AgriSynch is built to be a standalone APK that can be distributed via SD cards or local mesh networks, ensuring every farmer has an agricultural expert in their pocket, internet or not.
