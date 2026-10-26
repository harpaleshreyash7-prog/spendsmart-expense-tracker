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
- **Add, edit, and delete** expenses via a modal form
- Form validation with inline error messages and toast notifications
- Dashboard totals, budget progress, categories, and chart recalculate from your expense list
- INR currency formatting and current date display
- Responsive layout for desktop and mobile

**Note:** Data is kept in memory only. Refreshing the page resets expenses to the starter sample set until localStorage is added later.

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
- Search, filter, and sort
- Additional pages (All Expenses, Reports)
- Budget alerts and themes

## Purpose

Educational project for learning DOM manipulation, form handling, and responsive UI design.
