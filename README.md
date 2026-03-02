# 📊 YNAB Analytics & Analysis Tool

A powerful, privacy-first financial dashboard built on top of the YNAB API. Visualize your spending patterns, detect recurring transactions, and generate deep financial insights for analysis.

---

## ✨ Features

- **Privacy Mode**: One-click toggle to mask all financial amounts—perfect for sharing your screen.
- **Deep Category Analysis**: Sortable tables and bar charts for top categories and sub-categories.
- **Recurring Transaction Detection**: Automatically identifies subscriptions and recurring bills based on historical patterns.
- **Payee Analytics**: See where your money is going with per-payee spending breakdowns.
- **Financial Review (LLM Ready)**: Generate a comprehensive markdown report of any period (Last Month, Last 7 Days, etc.) to feed into LLMs like ChatGPT or Claude for personal financial coaching.
- **Multi-Budget Support**: Seamlessly switch between your YNAB budgets.
- **Dynamic Filtering**: Filter by any combination of accounts and categories with instant updates.

---

## 🚀 Getting Started

### 1. Prerequisites
- A [YNAB Account](https://www.ynab.com/).
- A **YNAB Personal Access Token (PAT)**. You can generate one in your YNAB Account Settings under "Developer Settings".

### 2. Setup (Local)
1.  Clone the repository:
    ```bash
    git clone https://github.com/jedi-tx/YNAB-Analytics.git
    cd ynab-analytics
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:5173` in your browser.
5.  Enter your YNAB PAT to authenticate (it is stored securely in your browser's `localStorage`).

### 3. Desktop Application (.exe)
You can also run this as a standalone Windows desktop app:
1.  Build the app: `npm run build`
2.  Launch Electron development: `npm run electron:dev`
3.  To generate a portable `.exe`: `npm run electron:build`
    - The output will be in `dist-electron/win-unpacked/` (or the portable `.exe` in `dist-electron/`).

---

## 🛠 Tech Stack
- **Frontend**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Vanilla CSS (Modern Aesthetics)
- **Charts**: Recharts
- **Icons**: Lucide-React
- **Date Handling**: date-fns

---

## 🔒 Privacy & Security
- **No Backend**: This app has no server-side component. It communicates directly from your browser to the YNAB API.
- **Local Storage**: Your API token and filter preferences are stored exclusively on your machine in `localStorage`.
- **Open Source**: Review the code to ensure your data stays private.

---

## 📄 License
MIT
