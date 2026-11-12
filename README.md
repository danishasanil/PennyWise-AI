# PennyWise AI 🪙✨

**PennyWise AI** is an intelligent, friendly, and responsible personal finance companion. It helps users understand their spending, manage monthly budgets, track protected savings goals, calculate daily spending allowances, and make confident purchasing decisions with real-time AI guidance.

---

## 🔒 Security Architecture

PennyWise AI is engineered with a **defense-in-depth, zero-trust** security architecture designed for safe public deployment:

1. **Gemini AI API Isolation**:
   - The `@google/genai` SDK is executed **strictly on the Node.js backend** (`src/server/geminiService.ts`).
   - The frontend communicates via proxy endpoints (`/api/ai/*`). The `GEMINI_API_KEY` is **never** sent to the client browser or exposed in frontend code.

2. **PayPal Sandbox REST Security**:
   - `PAYPAL_CLIENT_SECRET` resides **exclusively on the backend** and is never exposed to the frontend.
   - Access tokens are acquired server-to-server and cached in memory.
   - Order creation enforces server-side pricing from an authoritative product catalog, overriding client amount tampering.
   - Payment capture is verified by the backend via PayPal REST API before any expense record is committed.
   - Webhooks validate cryptographic headers and certificate URLs against trusted PayPal domains (`anti-SSRF`).

3. **Cloud Firestore Rules & User Partitioning**:
   - All user data (`budgets`, `expenses`, `savingsGoals`, `plannedPurchases`, `payments`) is strictly scoped under `/users/{userId}`.
   - Security rules enforce `request.auth.uid == userId` with strict schema validation (`isValidUserProfile`, `isValidExpense`, `isValidBudgetSummary`).
   - Blanket listing of users is explicitly forbidden.
   - Verified PayPal payment records are protected from client tampering and deletion.

4. **Multi-Currency Precision**:
   - Supports 20+ global currencies with verified exchange rate conversions and zero-decimal currency handling (JPY, KRW, VND, CLP).

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/pennywise-ai.git
cd pennywise-ai
npm install
```

### 2. Configure Environment Variables

Copy the example environment template:

```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:

```env
# Server-side secrets (never expose to client)
GEMINI_API_KEY="your_gemini_api_key"
PAYPAL_CLIENT_ID="your_paypal_sandbox_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_sandbox_client_secret"
PAYPAL_MODE="sandbox"

# Client-side Firebase Web configuration (optional if using local config)
VITE_FIREBASE_API_KEY="your_firebase_web_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project_id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_DATABASE_ID="(default)"
VITE_FIREBASE_STORAGE_BUCKET="your_project_id.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id"
VITE_FIREBASE_APP_ID="your_firebase_app_id"
```

> **Note**: Never commit your `.env` file to version control. It is ignored by `.gitignore`.

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

### 4. Run Test Suite

PennyWise AI includes a comprehensive 57-test suite covering deterministic budget math, currency conversions, savings analytics, PayPal order/capture verification, and Firestore data security invariants:

```bash
npm test
```

### 5. Production Build

```bash
npm run build
npm start
```

---

## 📂 Project Structure

```
├── .env.example              # Sanitized environment variable template
├── .gitignore                # Comprehensive Git ignore rules (secrets, keys, dist)
├── firestore.rules           # Hardened Firestore security rules (ABAC / zero-trust)
├── server.ts                 # Express backend mounting API routes & Vite middleware
├── src/
│   ├── components/           # React views (Dashboard, AI Chat, Analyzer, Expenses, etc.)
│   ├── context/              # FinanceContext state & Firebase Auth integration
│   ├── data/                 # Currency rates, sample products, international data
│   ├── firebase/             # Firebase SDK initialization with singleton & env support
│   ├── server/               # Server-side engines (Gemini, PayPal, Budget, Savings)
│   ├── services/             # Frontend API client communicating with backend
│   └── types/                # TypeScript interfaces and invariants
└── test/                     # 57 unit tests (budget, currency, paypal, firestore, ai)
```

---

## 🛡️ Pre-Publication Checklist for GitHub

Before pushing to a public repository:

1. **Verify Git Status**:
   ```bash
   git status
   ```
   Ensure `.env`, `.env.local`, or any private JSON credentials do **not** appear under "Untracked files".

2. **Verify No Committed Secrets**:
   ```bash
   git log -p | grep -E "AIzaSy|sk-|client_secret"
   ```

3. **Check .env.example**:
   Ensure `.env.example` contains only dummy placeholders and no real API keys.

---

## 📜 Educational Disclaimer

PennyWise AI provides educational personal budgeting assistance and purchase awareness simulation. It does not provide professional legal, tax, or investment advice.
