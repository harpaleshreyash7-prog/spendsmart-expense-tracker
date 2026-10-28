# SpendSmart – Smart Expense Tracker

SpendSmart is a vanilla HTML, CSS, and JavaScript expense tracker with a responsive dashboard.

## Technologies Used

- **HTML** – Semantic layout, modal form, accessible dialogs
- **CSS** – Design tokens, Grid/Flex layout, responsive UI
- **JavaScript** – CRUD, validation, dynamic dashboard calculations

## Project Structure

```text
spendsmart-expense-tracker/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── assets/
└── README.md
```

## Features

- Dashboard with sidebar, summary cards, weekly chart, and category breakdown
- **Add, edit, and delete** expenses via an accessible modal form with validation
- **Real-time search** by expense title with clear button and live result count
- **Multi-filter pipeline**: combine title search, category filter, and month filter seamlessly
- **Multi-criteria sorting**: Newest First, Oldest First, Amount (High/Low), and Title (A-Z / Z-A)
- Contextual **empty states** with clear filters actions
- Dashboard totals, budget progress, categories, and weekly chart recalculate accurately from expense data
- Budget overspending detection with visual indicators and clear progress warnings
- INR currency formatting and current date display
- Responsive layout with mobile-friendly table and list views

**Note:** Data is currently kept in memory. Refreshing the page resets expenses to the starter sample set until localStorage is added.

## How to Run

1. Open the project folder.
2. Open `index.html` in your browser.

Or use a local server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Planned Next Steps

- localStorage persistence
- Additional pages (All Expenses, Reports)
- Custom monthly budget settings & budget alerts
- Dark mode theme toggle
- CSV / JSON export and import

## Purpose

Educational project for learning DOM manipulation, form handling, and responsive UI design.
