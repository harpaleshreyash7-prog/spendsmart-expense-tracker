# SpendSmart – Smart Expense Tracker

SpendSmart is a modern, responsive personal finance dashboard built with vanilla HTML5, CSS3, and JavaScript. It provides complete expense tracking, dynamic monthly budgeting, multi-filter analytics, and reliable `localStorage` persistence.

---

## Technologies Used

- **HTML5** – Semantic structure, accessible modal dialogs, and ARIA attributes
- **CSS3** – Custom properties (design tokens), CSS Grid & Flexbox, micro-animations, and full dark/light theme support
- **Vanilla JavaScript (ES6+)** – Clean modular architecture, DOM manipulation, form validation, dynamic calculations, and `localStorage` persistence

---

## Project Structure

```text
spendsmart-expense-tracker/
├── index.html       # Primary application layout and semantic dashboard UI
├── css/
│   └── style.css    # Complete design system, component styles, dark theme, and responsive breakpoints
├── js/
│   └── script.js    # State management, CRUD handlers, budget editor, filtering, and persistence
├── assets/          # Static assets and icons
└── README.md        # Project documentation, architecture overview, and testing instructions
```

---

## Key Features

### Day 4: Persistence & Dynamic Budget Management
- **`localStorage` Persistence**: Expenses and monthly budget are automatically serialized via `JSON.stringify()` and deserialized with `JSON.parse()`. All changes persist across page reloads and browser sessions.
- **Dynamic Monthly Budget Editor**: Users can update their monthly budget limit directly from the dashboard with live form validation (preventing negative, zero, non-numeric, or blank amounts).
- **Instant Reactive Updates**: Whenever transactions or the monthly budget change, the entire dashboard immediately recalculates:
  - Total Monthly Expenses
  - Total Balance snapshot
  - Monthly Budget display
  - Remaining Budget (turns negative with overspending styling when exceeded)
  - Budget Progress Bar (color-coded: Accent for normal, Amber for warning ≥85%, Red for over budget)
  - Status Indicators (`On track`, `Watch spending`, or `Over budget`)
  - Dynamic spending message and category breakdown
- **Safe Corruption Recovery**: Built-in safety guards validate and sanitize data loaded from `localStorage`. Corrupted JSON or invalid array items are safely handled with graceful fallbacks without crashing the application.
- **Dark/Light Theme Toggle**: Toggle between dark and light themes with preference saved in `localStorage` and fallback to system `prefers-color-scheme`.

### Day 1–3 Core Features Preserved
- **Complete Expense CRUD**: Add, edit, and delete transactions using accessible dialogs and validation.
- **Real-time Search & Filters**: Instant search by title, category filtering (Food, Transport, Shopping, Education, Entertainment, Bills, Health, Other), and dynamic month filter.
- **Multi-criteria Sorting**: Sort by Newest, Oldest, Amount (High to Low / Low to High), and Title (A–Z / Z–A).
- **Analytics & Visualizations**:
  - Weekly spending bar chart with adaptive date ranges
  - Category breakdown with proportional progress bars and INR formatting
- **Mobile Responsive**: Responsive layout with sidebar drawer, adaptive table-to-list transaction views, and touch-friendly controls.

---

## How to Run the Application

### Option 1: Direct File Open
Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).

### Option 2: Local HTTP Server (Recommended)
From the project root directory, run:

```bash
# Using Python 3
python3 -m http.server 8080

# Or using Node.js npx
npx serve .
```

Then visit `http://localhost:8080` in your web browser.

---

## How to Test Day 4 Requirements (Manual Testing Guide)

Follow these steps to verify all Day 4 capabilities:

### 1. Test Initial Load & Default Budget
1. Open the application in your browser.
2. Verify that **Monthly Budget** defaults to **₹20,000**.
3. Verify starter expenses appear with proper category icons and formatted amounts.

### 2. Test Budget Form Validation & Updating
1. Scroll to the **Budget Progress** card on the right.
2. In the budget input field, clear the value and click **Save Budget**.
   - *Expected*: Error message `"Please enter a monthly budget."` appears and the field highlights red.
3. Enter `-500` or `0` and click **Save Budget**.
   - *Expected*: Error message `"Please enter a valid budget greater than ₹0."` appears.
4. Enter `15000` and click **Save Budget**.
   - *Expected*:
     - Success toast `"Monthly budget updated to ₹15,000."` appears.
     - Summary card **Monthly Budget** immediately updates to **₹15,000**.
     - Remaining budget and progress percentage recalculate instantly.

### 3. Test Overspending Warnings & Visual Alerts
1. In the budget input, set a small budget (e.g. `5000`) and click **Save Budget**.
2. Notice the immediate dashboard changes:
   - Remaining budget shows a negative value (e.g., `-₹4,999`) in bold red text.
   - Status badge displays **Over budget** in red.
   - Progress bar fill turns red (`#dc2626`).
   - Warning text reads: *"You are **₹4,999** over your monthly budget."*
3. Update the budget to `30000`:
   - *Expected*: Status returns to **On track**, progress bar returns to green/accent, and remaining amount turns positive.

### 4. Test Auto-Save on Adding, Editing, and Deleting Expenses
1. **Add Expense**: Click **Add Expense**, enter a new transaction (e.g. `"Campus Stationery"`, Amount: `500`, Category: `"Education"`, Date: Today, Payment: `"UPI"`), and save.
   - *Expected*: Expense appears at the top of the table; totals immediately update.
2. **Edit Expense**: Click **Edit** on `"Campus Stationery"`, change the amount to `750`, and save.
   - *Expected*: Table and dashboard totals immediately reflect ₹750.
3. **Delete Expense**: Click **Delete** on `"Campus Stationery"` and confirm in the dialog.
   - *Expected*: Expense is removed and dashboard totals recalculate.

### 5. Test Persistence Across Page Refresh
1. Set the monthly budget to `25000`.
2. Add an expense with Title `"Weekly Grocery"`, Amount `1200`, Category `"Shopping"`.
3. Refresh the browser page (`F5` or `Cmd+R`).
4. *Expected*: The budget remains **₹25,000**, and `"Weekly Grocery"` remains in the transaction list.

### 6. Test Corrupted / Missing Storage Safety
1. Open the browser Developer Console (`F12` -> Console).
2. Run: `localStorage.setItem('spendsmart_expenses', 'invalid-json-data{{{');`
3. Refresh the page.
   - *Expected*: The application safely catches the error, logs a clean warning, restores the sample dataset, and loads without crashing.

### 7. Test Dark Mode Persistence
1. Click the sun/moon theme toggle button in the top navigation bar.
2. Verify the application switches between light and dark modes.
3. Refresh the page to confirm your chosen theme is preserved.

---

## Educational Purpose

This project demonstrates core front-end engineering competencies:
- Stateful client-side architecture without external UI frameworks
- Resilient offline persistence with `localStorage`
- Accessible, semantic form validation and WCAG-aligned dialogs
- Responsive, token-driven CSS architecture with dark-mode support
