/**
 * SpendSmart — Expense CRUD, Dashboard, and LocalStorage Persistence
 * Single source of truth: expenses[] and monthlyBudget
 */

(function () {
  "use strict";

  const DEFAULT_MONTHLY_BUDGET = 20000;
  /** Illustrative wallet figure — not calculated from expenses */
  const SAMPLE_WALLET_BALANCE = 24850;

  const STORAGE_KEYS = {
    EXPENSES: "spendsmart_expenses",
    BUDGET: "spendsmart_budget",
    THEME: "spendsmart_theme",
  };

  const LEGACY_STORAGE_KEYS = {
    BUDGET: "spendsmart_monthly_budget",
  };

  const CATEGORIES = [
    "Food",
    "Transport",
    "Shopping",
    "Education",
    "Entertainment",
    "Bills",
    "Health",
    "Other",
  ];

  const PAYMENT_METHODS = [
    "UPI",
    "Cash",
    "Credit Card",
    "Debit Card",
    "Net Banking",
    "Other",
  ];

  const categoryIconSvg = {
    Food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><path d="M6 1v3M10 1v3M14 1v3"/></svg>',
    Transport:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="10" rx="2"/><path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M5 18h2M17 18h2"/></svg>',
    Shopping:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>',
    Education:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/></svg>',
    Entertainment:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m10 9 6 3-6 3V9z"/></svg>',
    Bills:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
    Health:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    Other:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
  };

  const categoryColors = {
    Food: "var(--category-food)",
    Transport: "var(--category-transport)",
    Shopping: "var(--category-shopping)",
    Education: "var(--category-education)",
    Entertainment: "var(--category-entertainment)",
    Bills: "var(--category-bills)",
    Health: "var(--category-health)",
    Other: "var(--category-other)",
  };

  const categoryHexColors = {
    Food: "#059669",
    Transport: "#2563eb",
    Shopping: "#7c3aed",
    Education: "#d97706",
    Entertainment: "#db2777",
    Bills: "#64748b",
    Health: "#0d9488",
    Other: "#94a3b8",
  };

  let trendsChartInstance = null;
  let categoryChartInstance = null;
  let trendsTimeRange = "monthly"; // "monthly" | "weekly"
  let trendsChartType = "bar"; // "bar" | "line"

  const inrFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  function generateId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return (
      "exp-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function formatINR(amount) {
    return inrFormatter.format(Math.round(amount));
  }

  function todayISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function parseISODateLocal(isoDate) {
    return new Date(isoDate + "T12:00:00");
  }

  function formatDisplayDate(isoDate) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(parseISODateLocal(isoDate));
  }

  /** Monday–Sunday bounds for the week containing refDate */
  function getWeekRange(refDate) {
    const d = new Date(refDate);
    d.setHours(12, 0, 0, 0);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      const iso =
        current.getFullYear() +
        "-" +
        String(current.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(current.getDate()).padStart(2, "0");
      const label = new Intl.DateTimeFormat("en-IN", { weekday: "short" })
        .format(current)
        .slice(0, 3);
      days.push({ iso, label });
    }
    return days;
  }

  function createInitialExpenses() {
    const seed = [
      {
        title: "Electricity Bill",
        category: "Bills",
        date: "2026-10-21",
        paymentMethod: "UPI",
        amount: 1850,
        notes: "",
      },
      {
        title: "Coursera Subscription",
        category: "Education",
        date: "2026-10-20",
        paymentMethod: "Debit Card",
        amount: 1999,
        notes: "",
      },
      {
        title: "Amazon — Headphones",
        category: "Shopping",
        date: "2026-10-19",
        paymentMethod: "Credit Card",
        amount: 2150,
        notes: "",
      },
      {
        title: "Swiggy Dinner",
        category: "Food",
        date: "2026-10-18",
        paymentMethod: "UPI",
        amount: 450,
        notes: "Hostel dinner",
      },
      {
        title: "Uber to Campus",
        category: "Transport",
        date: "2026-10-17",
        paymentMethod: "UPI",
        amount: 320,
        notes: "",
      },
      {
        title: "Netflix",
        category: "Entertainment",
        date: "2026-10-16",
        paymentMethod: "Debit Card",
        amount: 649,
        notes: "",
      },
      {
        title: "Metro Monthly Pass",
        category: "Transport",
        date: "2026-10-15",
        paymentMethod: "UPI",
        amount: 500,
        notes: "",
      },
      {
        title: "Stationery & Books",
        category: "Education",
        date: "2026-10-14",
        paymentMethod: "Cash",
        amount: 680,
        notes: "",
      },
    ];
    return seed.map(function (item) {
      return {
        id: generateId(),
        title: item.title,
        amount: item.amount,
        category: item.category,
        date: item.date,
        paymentMethod: item.paymentMethod,
        notes: item.notes,
      };
    });
  }

  /**
   * Safely sanitize and validate a raw expense object.
   * Returns a valid expense or null if completely unrecoverable.
   */
  function sanitizeExpense(raw) {
    if (!raw || typeof raw !== "object") return null;

    const id =
      typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : generateId();

    const title =
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : "Untitled Expense";

    const parsedAmount =
      typeof raw.amount === "number" && Number.isFinite(raw.amount) && raw.amount > 0
        ? Math.round(raw.amount * 100) / 100
        : parseFloat(raw.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;

    const category =
      typeof raw.category === "string" && CATEGORIES.indexOf(raw.category) !== -1
        ? raw.category
        : "Other";

    let date = typeof raw.date === "string" ? raw.date.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = todayISO();
    } else {
      const parsedDate = parseISODateLocal(date);
      if (Number.isNaN(parsedDate.getTime())) {
        date = todayISO();
      }
    }

    const paymentMethod =
      typeof raw.paymentMethod === "string" &&
      PAYMENT_METHODS.indexOf(raw.paymentMethod) !== -1
        ? raw.paymentMethod
        : "Other";

    const notes = typeof raw.notes === "string" ? raw.notes.trim() : "";

    return {
      id: id,
      title: title,
      amount: parsedAmount,
      category: category,
      date: date,
      paymentMethod: paymentMethod,
      notes: notes,
    };
  }

  /**
   * Loads saved expenses from localStorage with validation and corruption recovery.
   */
  function loadExpensesFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (raw === null) {
        const initial = createInitialExpenses();
        try {
          localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(initial));
        } catch (e) {
          console.warn("SpendSmart: Could not seed localStorage:", e);
        }
        return initial;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn(
          "SpendSmart: Corrupted expenses data (not an array). Reverting to seed data."
        );
        const fallback = createInitialExpenses();
        saveExpensesToStorage(fallback);
        return fallback;
      }

      if (parsed.length === 0) {
        return [];
      }

      const validList = [];
      for (let i = 0; i < parsed.length; i++) {
        const item = sanitizeExpense(parsed[i]);
        if (item) {
          validList.push(item);
        }
      }

      if (validList.length === 0 && parsed.length > 0) {
        console.warn(
          "SpendSmart: All stored expenses were corrupted. Reverting to seed data."
        );
        const fallback = createInitialExpenses();
        saveExpensesToStorage(fallback);
        return fallback;
      }

      return validList;
    } catch (err) {
      console.warn("SpendSmart: Failed to parse expenses from localStorage:", err);
      const fallback = createInitialExpenses();
      saveExpensesToStorage(fallback);
      return fallback;
    }
  }

  /**
   * Persists expenses array to localStorage with JSON.stringify() and error catching.
   */
  function saveExpensesToStorage(customList) {
    const target = customList !== undefined ? customList : expenses;
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(target));
    } catch (err) {
      console.error("SpendSmart: Failed to save expenses to localStorage:", err);
      showToast("Unable to save expense changes to local storage.", "error");
    }
  }

  /**
   * Loads saved monthly budget from localStorage safely with JSON.parse().
   */
  function loadBudgetFromStorage() {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEYS.BUDGET) ||
        localStorage.getItem(LEGACY_STORAGE_KEYS.BUDGET);

      if (raw === null) {
        return DEFAULT_MONTHLY_BUDGET;
      }

      const parsed = JSON.parse(raw);
      if (typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0) {
        return Math.round(parsed * 100) / 100;
      }

      if (parsed && typeof parsed === "object") {
        const candidate = Number(
          parsed.budget || parsed.amount || parsed.monthlyBudget
        );
        if (Number.isFinite(candidate) && candidate > 0) {
          return Math.round(candidate * 100) / 100;
        }
      }

      console.warn(
        "SpendSmart: Invalid budget format in localStorage. Using default."
      );
      return DEFAULT_MONTHLY_BUDGET;
    } catch (err) {
      console.warn("SpendSmart: Failed to parse budget from localStorage:", err);
      return DEFAULT_MONTHLY_BUDGET;
    }
  }

  /**
   * Persists monthly budget to localStorage with JSON.stringify() and error catching.
   */
  function saveBudgetToStorage() {
    try {
      const serialized = JSON.stringify(monthlyBudget);
      localStorage.setItem(STORAGE_KEYS.BUDGET, serialized);
      localStorage.setItem(LEGACY_STORAGE_KEYS.BUDGET, serialized);
    } catch (err) {
      console.error("SpendSmart: Failed to save budget to localStorage:", err);
      showToast("Unable to save budget changes to local storage.", "error");
    }
  }

  let monthlyBudget = loadBudgetFromStorage();
  /** @type {Array<{id:string,title:string,amount:number,category:string,date:string,paymentMethod:string,notes:string}>} */
  let expenses = loadExpensesFromStorage();

  let editingExpenseId = null;
  let pendingDeleteId = null;
  let isSubmitting = false;
  let lastFocusedBeforeModal = null;


  function populateMonthFilter() {
    const select = document.getElementById("filterMonth");
    if (!select) return;

    const previousValue = select.value || "all";
    const monthSet = new Set();
    const currentMonthKey = todayISO().slice(0, 7);
    monthSet.add(currentMonthKey);

    expenses.forEach(function (e) {
      if (e.date && e.date.length >= 7) {
        monthSet.add(e.date.slice(0, 7));
      }
    });

    const sortedMonths = Array.from(monthSet).sort().reverse();
    select.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Months";
    select.appendChild(allOption);

    sortedMonths.forEach(function (mKey) {
      const parts = mKey.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const d = new Date(year, month - 1, 1, 12, 0, 0);
      const label = new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
      }).format(d);

      const opt = document.createElement("option");
      opt.value = mKey;
      opt.textContent = label + (mKey === currentMonthKey ? " (Current)" : "");
      select.appendChild(opt);
    });

    const hasPrevious =
      sortedMonths.indexOf(previousValue) !== -1 || previousValue === "all";
    select.value = hasPrevious ? previousValue : "all";
  }

  function getActiveFilters() {
    const searchInput = document.getElementById("expenseSearch");
    const categorySelect = document.getElementById("filterCategory");
    const monthSelect = document.getElementById("filterMonth");
    const startDateInput = document.getElementById("filterStartDate");
    const endDateInput = document.getElementById("filterEndDate");
    const sortSelect = document.getElementById("filterSort");

    return {
      search: searchInput ? searchInput.value.trim().toLowerCase() : "",
      category:
        categorySelect && categorySelect.value
          ? categorySelect.value
          : "all",
      month:
        monthSelect && monthSelect.value
          ? monthSelect.value
          : "all",
      startDate: startDateInput ? startDateInput.value : "",
      endDate: endDateInput ? endDateInput.value : "",
      sort:
        sortSelect && sortSelect.value
          ? sortSelect.value
          : "newest",
    };
  }

  function getFilteredExpenses(filters) {
    const f = filters || getActiveFilters();
    return expenses.filter(function (expense) {
      if (f.search) {
        const titleLower = expense.title.toLowerCase();
        if (!titleLower.includes(f.search)) {
          return false;
        }
      }

      if (f.category && f.category !== "all") {
        if (expense.category !== f.category) {
          return false;
        }
      }

      if (f.month && f.month !== "all") {
        const expenseMonth = expense.date.slice(0, 7);
        if (expenseMonth !== f.month) {
          return false;
        }
      }

      if (f.startDate && expense.date < f.startDate) return false;
      if (f.endDate && expense.date > f.endDate) return false;

      return true;
    });
  }

  function getSortedExpenses(expenseList, sortKey) {
    const sort =
      sortKey ||
      (document.getElementById("filterSort")
        ? document.getElementById("filterSort").value
        : "newest");
    const copy = expenseList.slice();

    copy.sort(function (a, b) {
      if (sort === "newest") {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.amount - a.amount;
      }
      if (sort === "oldest") {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return b.amount - a.amount;
      }
      if (sort === "amount-desc") {
        if (b.amount !== a.amount) return b.amount - a.amount;
        return b.date.localeCompare(a.date);
      }
      if (sort === "amount-asc") {
        if (a.amount !== b.amount) return a.amount - b.amount;
        return b.date.localeCompare(a.date);
      }
      if (sort === "title-asc") {
        const cmp = a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
        if (cmp !== 0) return cmp;
        return b.date.localeCompare(a.date);
      }
      if (sort === "title-desc") {
        const cmp = b.title.localeCompare(a.title, undefined, {
          sensitivity: "base",
        });
        if (cmp !== 0) return cmp;
        return b.date.localeCompare(a.date);
      }
      return 0;
    });

    return copy;
  }

  function calculateTotals(refDate, selectedMonth, filters) {
    const now = refDate || new Date();
    const currentMonthKey = todayISO().slice(0, 7);
    const isAllMonths = !selectedMonth || selectedMonth === "all";
    const targetMonthKey = isAllMonths ? currentMonthKey : selectedMonth;
    // Budget figures intentionally use every transaction in the selected month.
    // Analytics, however, should mirror the active search/category/month filters.
    const activeFilters = filters || getActiveFilters();
    const analyticsExpenses = getFilteredExpenses(activeFilters);

    const monthly = expenses.filter(function (e) {
      return e.date.slice(0, 7) === targetMonthKey;
    });

    const allTimeTotal = expenses.reduce(function (sum, e) {
      return sum + e.amount;
    }, 0);

    const monthlyTotal = monthly.reduce(function (sum, e) {
      return sum + e.amount;
    }, 0);

    const remaining = monthlyBudget - monthlyTotal;
    const isOverBudget = monthlyTotal > monthlyBudget;
    const overBudgetAmount = isOverBudget ? monthlyTotal - monthlyBudget : 0;
    const percentSpent =
      monthlyBudget > 0 ? (monthlyTotal / monthlyBudget) * 100 : 0;
    const percentLeft = Math.max(0, 100 - percentSpent);

    const parts = targetMonthKey.split("-");
    const targetYear = parseInt(parts[0], 10);
    const targetMonthNum = parseInt(parts[1], 10);
    const targetMonthDate = new Date(targetYear, targetMonthNum - 1, 1, 12, 0, 0);
    const monthLabel = new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
    }).format(targetMonthDate);

    const categorySource = analyticsExpenses;
    const categoryTotal = categorySource.reduce(function (sum, e) {
      return sum + e.amount;
    }, 0);
    const byCategory = {};
    categorySource.forEach(function (e) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    const categoryRows = Object.keys(byCategory)
      .map(function (name) {
        return {
          name: name,
          amount: byCategory[name],
          percent:
            categoryTotal > 0
              ? (byCategory[name] / categoryTotal) * 100
              : 0,
        };
      })
      .sort(function (a, b) {
        return b.amount - a.amount;
      });

    const chartExpenses = analyticsExpenses;
    const currentWeekDays = getWeekRange(now);
    const hasCurrentWeekExpense = currentWeekDays.some(function (d) {
      return chartExpenses.some(function (e) {
        return e.date === d.iso;
      });
    });

    let chosenWeekDays = currentWeekDays;
    let isCurrentWeek = true;

    if (!hasCurrentWeekExpense && chartExpenses.length > 0) {
      const sortedByDate = chartExpenses.slice().sort(function (a, b) {
        return b.date.localeCompare(a.date);
      });
      chosenWeekDays = getWeekRange(parseISODateLocal(sortedByDate[0].date));
      isCurrentWeek = false;
    }

    const weekly = chosenWeekDays.map(function (day) {
      const amount = chartExpenses
        .filter(function (e) {
          return e.date === day.iso;
        })
        .reduce(function (sum, e) {
          return sum + e.amount;
        }, 0);
      return { day: day.label, iso: day.iso, amount: amount };
    });

    const weekSubtitle = isCurrentWeek
      ? "This week — daily totals"
      : formatDisplayDate(chosenWeekDays[0].iso) +
        " – " +
        formatDisplayDate(chosenWeekDays[6].iso) +
        " — daily totals";

    return {
      isAllMonths: isAllMonths,
      allTimeTotal: allTimeTotal,
      monthlyTotal: monthlyTotal,
      remaining: remaining,
      isOverBudget: isOverBudget,
      overBudgetAmount: overBudgetAmount,
      percentSpent: percentSpent,
      percentLeft: percentLeft,
      categoryRows: categoryRows,
      categoryTotal: categoryTotal,
      weekly: weekly,
      weekSubtitle: weekSubtitle,
      monthLabel: monthLabel,
      monthExpenseCount: monthly.length,
      allTimeExpenseCount: expenses.length,
      analyticsExpenses: analyticsExpenses,
      analyticsExpenseCount: analyticsExpenses.length,
    };
  }

  function getBudgetStatus(percentSpent) {
    if (percentSpent > 100) {
      return { text: "Over budget", className: "progress-meta__status--danger" };
    }
    if (percentSpent >= 85) {
      return { text: "Watch spending", className: "progress-meta__status--warn" };
    }
    return { text: "On track", className: "progress-meta__status--ok" };
  }

  function setIconOnElement(el, category) {
    const svg = categoryIconSvg[category] || categoryIconSvg.Other;
    const color = categoryColors[category] || categoryColors.Other;
    el.style.background = "color-mix(in srgb, " + color + " 12%, white)";
    el.style.color = color;
    el.innerHTML = svg;
  }

  function createActionButtons(expenseId) {
    const wrap = document.createElement("div");
    wrap.className = "tx-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn-icon-text";
    editBtn.dataset.action = "edit";
    editBtn.dataset.expenseId = expenseId;
    editBtn.setAttribute("data-action", "edit");
    editBtn.setAttribute("data-expense-id", expenseId);
    editBtn.textContent = "Edit";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-icon-text btn-icon-text--danger";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.expenseId = expenseId;
    deleteBtn.setAttribute("data-action", "delete");
    deleteBtn.setAttribute("data-expense-id", expenseId);
    deleteBtn.textContent = "Delete";

    wrap.appendChild(editBtn);
    wrap.appendChild(deleteBtn);
    return wrap;
  }

  function buildTableRow(expense) {
    const tr = document.createElement("tr");

    const tdTitle = document.createElement("td");
    const titleWrap = document.createElement("div");
    titleWrap.className = "tx-title";
    const icon = document.createElement("span");
    icon.className = "tx-icon";
    icon.setAttribute("aria-hidden", "true");
    setIconOnElement(icon, expense.category);
    const titleText = document.createElement("span");
    titleText.textContent = expense.title;
    titleWrap.appendChild(icon);
    titleWrap.appendChild(titleText);
    tdTitle.appendChild(titleWrap);

    const tdCat = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = "category-pill";
    pill.textContent = expense.category;
    tdCat.appendChild(pill);

    const tdDate = document.createElement("td");
    tdDate.textContent = formatDisplayDate(expense.date);

    const tdPay = document.createElement("td");
    tdPay.className = "payment-method";
    tdPay.textContent = expense.paymentMethod;

    const tdAmount = document.createElement("td");
    tdAmount.className = "col-amount";
    const amountSpan = document.createElement("span");
    amountSpan.className = "tx-amount";
    amountSpan.textContent = formatINR(expense.amount);
    tdAmount.appendChild(amountSpan);

    const tdActions = document.createElement("td");
    tdActions.className = "col-actions";
    tdActions.appendChild(createActionButtons(expense.id));

    tr.appendChild(tdTitle);
    tr.appendChild(tdCat);
    tr.appendChild(tdDate);
    tr.appendChild(tdPay);
    tr.appendChild(tdAmount);
    tr.appendChild(tdActions);

    return tr;
  }

  function buildListItem(expense) {
    const li = document.createElement("li");
    li.className = "tx-list-item";

    const row = document.createElement("div");
    row.className = "tx-list-item__row";

    const titleWrap = document.createElement("div");
    titleWrap.className = "tx-title";
    const icon = document.createElement("span");
    icon.className = "tx-icon";
    icon.setAttribute("aria-hidden", "true");
    setIconOnElement(icon, expense.category);
    const titleText = document.createElement("span");
    titleText.textContent = expense.title;
    titleWrap.appendChild(icon);
    titleWrap.appendChild(titleText);

    const amountSpan = document.createElement("span");
    amountSpan.className = "tx-amount";
    amountSpan.textContent = formatINR(expense.amount);

    row.appendChild(titleWrap);
    row.appendChild(amountSpan);

    const meta = document.createElement("div");
    meta.className = "tx-list-item__meta";
    meta.textContent =
      expense.category +
      " · " +
      formatDisplayDate(expense.date) +
      " · " +
      expense.paymentMethod;

    const actions = createActionButtons(expense.id);
    actions.classList.add("tx-list-item__actions");

    li.appendChild(row);
    li.appendChild(meta);
    li.appendChild(actions);
    return li;
  }

  function renderExpenses() {
    const tbody = document.getElementById("transactionsBody");
    const list = document.getElementById("transactionsList");
    const empty = document.getElementById("emptyTransactions");
    const emptyTitle = document.getElementById("emptyTransactionsTitle");
    const emptyText = document.getElementById("emptyTransactionsText");
    const emptyAddBtn = document.getElementById("emptyAddExpenseBtn");
    const emptyClearBtn = document.getElementById("emptyClearFiltersBtn");
    const tableWrap = document.getElementById("transactionsTableWrap");
    const resultCountEl = document.getElementById("expenseResultCount");
    const subtitleEl = document.getElementById("transactionsSubtitle");
    if (!tbody || !list || !empty) return;

    const filters = getActiveFilters();
    const filtered = getFilteredExpenses(filters);
    const sorted = getSortedExpenses(filtered, filters.sort);

    const isFiltered = Boolean(
      filters.search ||
      (filters.category && filters.category !== "all") ||
      (filters.month && filters.month !== "all") ||
      filters.startDate ||
      filters.endDate
    );

    tbody.replaceChildren();
    list.replaceChildren();

    if (expenses.length === 0) {
      empty.hidden = false;
      if (emptyTitle) emptyTitle.textContent = "No transactions yet";
      if (emptyText) {
        emptyText.textContent = "Add your first expense to see it listed here.";
      }
      if (emptyAddBtn) emptyAddBtn.hidden = false;
      if (emptyClearBtn) emptyClearBtn.hidden = true;
      if (tableWrap) tableWrap.hidden = true;
      list.hidden = true;
      if (resultCountEl) resultCountEl.textContent = "No expenses recorded";
      if (subtitleEl) subtitleEl.textContent = "Your latest expenses";
      return;
    }

    if (sorted.length === 0) {
      empty.hidden = false;
      if (emptyTitle) emptyTitle.textContent = "No matching expenses";
      if (emptyText) {
        if (filters.startDate || filters.endDate) {
          emptyText.textContent = "No expenses found in the selected date range.";
        } else if (filters.search && filters.category !== "all" && filters.month !== "all") {
          emptyText.textContent =
            'No expenses match "' +
            filters.search +
            '" in ' +
            filters.category +
            " for this month.";
        } else if (filters.search) {
          emptyText.textContent =
            'No expenses match "' +
            filters.search +
            '". Try a different search query or clear filters.';
        } else if (filters.category !== "all" && filters.month !== "all") {
          emptyText.textContent =
            "No expenses found for this category and month.";
        } else if (filters.category !== "all") {
          emptyText.textContent =
            'No expenses found in category "' + filters.category + '".';
        } else if (filters.month !== "all") {
          emptyText.textContent = "No expenses found for this month.";
        } else {
          emptyText.textContent = "No expenses match your active filters.";
        }
      }
      if (emptyAddBtn) emptyAddBtn.hidden = false;
      if (emptyClearBtn) emptyClearBtn.hidden = false;
      if (tableWrap) tableWrap.hidden = true;
      list.hidden = true;
      if (resultCountEl) {
        resultCountEl.textContent =
          "0 of " + expenses.length + " expenses match filters";
      }
      if (subtitleEl) {
        subtitleEl.textContent = "Filtered results (0 found)";
      }
      return;
    }

    empty.hidden = true;
    if (tableWrap) tableWrap.hidden = false;
    list.hidden = false;

    if (resultCountEl) {
      if (isFiltered) {
        resultCountEl.textContent =
          "Showing " + sorted.length + " of " + expenses.length + " expenses";
      } else {
        resultCountEl.textContent =
          "Showing all " + expenses.length + " expenses";
      }
    }

    if (subtitleEl) {
      if (isFiltered) {
        subtitleEl.textContent = "Filtered view (" + sorted.length + " found)";
      } else {
        subtitleEl.textContent = "Your latest expenses";
      }
    }

    sorted.forEach(function (expense) {
      tbody.appendChild(buildTableRow(expense));
      list.appendChild(buildListItem(expense));
    });
  }

  function getChartThemeColors() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    return {
      isDark: isDark,
      text: isDark ? "#9ca3af" : "#64748b",
      grid: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 41, 0.06)",
      tooltipBg: isDark ? "#1f2937" : "#0f1729",
      tooltipText: isDark ? "#f9fafb" : "#ffffff",
      tooltipBorder: isDark ? "#374151" : "#e2e8f0",
      accent: isDark ? "#10b981" : "#059669",
      accentSoft: isDark
        ? "rgba(16, 185, 129, 0.18)"
        : "rgba(5, 150, 105, 0.14)",
      danger: isDark ? "#f87171" : "#dc2626",
      budgetLine: isDark
        ? "rgba(248, 113, 113, 0.85)"
        : "rgba(220, 38, 38, 0.85)",
    };
  }

  function calculateMonthlyTrends(filters) {
    // Keep the trend chart aligned with the transaction list, including month filters.
    const dataset = getFilteredExpenses(filters || getActiveFilters());

    const monthSet = new Set();
    dataset.forEach(function (e) {
      if (e.date && e.date.length >= 7) {
        monthSet.add(e.date.slice(0, 7));
      }
    });
    const currentMonthKey = todayISO().slice(0, 7);
    monthSet.add(currentMonthKey);

    const sortedKeys = Array.from(monthSet).sort();
    const latestKey = sortedKeys[sortedKeys.length - 1] || currentMonthKey;

    const parts = latestKey.split("-");
    const endYear = parseInt(parts[0], 10);
    const endMonth = parseInt(parts[1], 10);
    const allTimelineKeys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(endYear, endMonth - 1 - i, 1);
      const k =
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0");
      allTimelineKeys.push(k);
    }
    sortedKeys.forEach(function (k) {
      if (allTimelineKeys.indexOf(k) === -1) {
        allTimelineKeys.push(k);
      }
    });
    allTimelineKeys.sort();

    const monthData = allTimelineKeys.map(function (mKey) {
      const mParts = mKey.split("-");
      const mDate = new Date(
        parseInt(mParts[0], 10),
        parseInt(mParts[1], 10) - 1,
        1,
        12,
        0,
        0
      );
      const label = new Intl.DateTimeFormat("en-IN", {
        month: "short",
        year: "2-digit",
      }).format(mDate);
      const fullLabel = new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
      }).format(mDate);

      const matching = dataset.filter(function (e) {
        return e.date.slice(0, 7) === mKey;
      });
      const total = matching.reduce(function (sum, e) {
        return sum + e.amount;
      }, 0);

      return {
        key: mKey,
        label: label,
        fullLabel: fullLabel,
        amount: total,
        count: matching.length,
      };
    });

    let peak = monthData[0] || { label: "None", fullLabel: "None", amount: 0 };
    let totalSpendAll = 0;
    let activeMonthCount = 0;
    monthData.forEach(function (m) {
      if (m.amount > peak.amount) {
        peak = m;
      }
      if (m.amount > 0) {
        totalSpendAll += m.amount;
        activeMonthCount++;
      }
    });

    const avgMonthly =
      activeMonthCount > 0 ? totalSpendAll / activeMonthCount : 0;

    const curMonthData =
      monthData.find(function (m) {
        return m.key === currentMonthKey;
      }) || { amount: 0 };
    const curIdx = monthData.findIndex(function (m) {
      return m.key === currentMonthKey;
    });
    const prevMonthData = curIdx > 0 ? monthData[curIdx - 1] : null;

    let monthOverMonthPct = null;
    if (prevMonthData && prevMonthData.amount > 0) {
      monthOverMonthPct =
        ((curMonthData.amount - prevMonthData.amount) / prevMonthData.amount) *
        100;
    }

    return {
      months: monthData,
      labels: monthData.map(function (m) {
        return m.label;
      }),
      amounts: monthData.map(function (m) {
        return m.amount;
      }),
      counts: monthData.map(function (m) {
        return m.count;
      }),
      peakLabel: peak.fullLabel || peak.label,
      peakAmount: peak.amount,
      averageMonthlySpend: avgMonthly,
      monthOverMonthPct: monthOverMonthPct,
      currentMonthTotal: curMonthData.amount,
      datasetCount: dataset.length,
    };
  }

  function renderCategoryDoughnutChart(categoryRows, categoryTotal) {
    if (typeof Chart === "undefined") return;

    const canvas = document.getElementById("categoryDoughnutChart");
    if (!canvas) return;

    const wrapper = document.getElementById("categoryChartWrapper");
    const emptyEl = document.getElementById("categoryChartEmpty");
    const totalEl = document.getElementById("doughnutCenterTotal");

    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }

    if (!categoryRows || categoryRows.length === 0 || categoryTotal === 0) {
      if (wrapper) wrapper.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
      if (totalEl) totalEl.textContent = "₹0";
      return;
    }

    if (wrapper) wrapper.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
    if (totalEl) totalEl.textContent = formatINR(categoryTotal);

    const colors = getChartThemeColors();
    const labels = categoryRows.map(function (r) {
      return r.name;
    });
    const data = categoryRows.map(function (r) {
      return r.amount;
    });
    const sliceColors = categoryRows.map(function (r) {
      return categoryHexColors[r.name] || "#94a3b8";
    });

    categoryChartInstance = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: sliceColors,
            borderColor: colors.isDark ? "#111827" : "#ffffff",
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipText,
            bodyColor: colors.tooltipText,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            titleFont: {
              family: "Plus Jakarta Sans",
              weight: 600,
            },
            bodyFont: {
              family: "Plus Jakarta Sans",
            },
            callbacks: {
              label: function (ctx) {
                const val = ctx.parsed;
                const pct =
                  categoryTotal > 0
                    ? ((val / categoryTotal) * 100).toFixed(1)
                    : "0.0";
                return " " + ctx.label + ": " + formatINR(val) + " (" + pct + "%)";
              },
            },
          },
        },
        animation: {
          duration: 350,
          easing: "easeOutQuart",
        },
      },
    });
  }

  function renderTrendsChart(totals, monthlyTrends) {
    if (typeof Chart === "undefined") return;

    const canvas = document.getElementById("trendsChart");
    if (!canvas) return;

    const container = document.getElementById("trendsChartContainer");
    const emptyEl = document.getElementById("trendsChartEmpty");
    const subtitleEl = document.getElementById("chartSubtitle");
    const peakEl = document.getElementById("chartStatPeak");
    const avgEl = document.getElementById("chartStatAverage");
    const periodEl = document.getElementById("chartStatPeriod");

    const hasTrendsData =
      monthlyTrends &&
      monthlyTrends.amounts &&
      monthlyTrends.amounts.some(function (a) {
        return a > 0;
      });
    const hasWeeklyData =
      totals &&
      totals.weekly &&
      totals.weekly.some(function (w) {
        return w.amount > 0;
      });

    if (trendsChartInstance) {
      trendsChartInstance.destroy();
      trendsChartInstance = null;
    }

    if (!hasTrendsData && !hasWeeklyData && totals.analyticsExpenseCount === 0) {
      if (container) container.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
      if (peakEl) peakEl.textContent = "—";
      if (avgEl) avgEl.textContent = "—";
      if (periodEl) periodEl.textContent = "—";
      return;
    }

    if (container) container.hidden = false;
    if (emptyEl) emptyEl.hidden = true;

    const colors = getChartThemeColors();
    let labels = [];
    let datasets = [];

    if (trendsTimeRange === "monthly") {
      if (subtitleEl) subtitleEl.textContent = "Monthly spending & budget trends";
      labels = monthlyTrends.labels;

      if (trendsChartType === "bar") {
        datasets.push({
          type: "bar",
          label: "Monthly Spending",
          data: monthlyTrends.amounts,
          backgroundColor: monthlyTrends.amounts.map(function (amt) {
            return amt > monthlyBudget
              ? "rgba(239, 68, 68, 0.85)"
              : colors.accent;
          }),
          borderRadius: 6,
          maxBarThickness: 42,
          order: 2,
        });
      } else {
        datasets.push({
          type: "line",
          label: "Monthly Spending",
          data: monthlyTrends.amounts,
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2.5,
          order: 2,
        });
      }

      // Target budget line
      datasets.push({
        type: "line",
        label: "Monthly Budget",
        data: monthlyTrends.labels.map(function () {
          return monthlyBudget;
        }),
        borderColor: colors.budgetLine,
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        order: 1,
      });

      if (peakEl) {
        peakEl.textContent =
          monthlyTrends.peakLabel + " (" + formatINR(monthlyTrends.peakAmount) + ")";
      }
      if (avgEl) {
        avgEl.textContent = formatINR(monthlyTrends.averageMonthlySpend) + "/mo";
      }
      if (periodEl) {
        periodEl.textContent = monthlyTrends.labels.length + " months tracked";
      }
    } else {
      // Weekly view
      if (subtitleEl) {
        subtitleEl.textContent = totals.weekSubtitle || "Daily spending breakdown";
      }
      labels = totals.weekly.map(function (d) {
        return d.day;
      });
      const amounts = totals.weekly.map(function (d) {
        return d.amount;
      });

      if (trendsChartType === "bar") {
        datasets.push({
          type: "bar",
          label: "Daily Spending",
          data: amounts,
          backgroundColor: colors.accent,
          borderRadius: 6,
          maxBarThickness: 36,
        });
      } else {
        datasets.push({
          type: "line",
          label: "Daily Spending",
          data: amounts,
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2.5,
        });
      }

      const peakDay = totals.weekly.reduce(function (max, d) {
        return d.amount > max.amount ? d : max;
      }, totals.weekly[0] || { day: "—", amount: 0 });
      const weeklyTotal = totals.weekly.reduce(function (sum, d) {
        return sum + d.amount;
      }, 0);

      if (peakEl) {
        peakEl.textContent =
          peakDay.day + " (" + formatINR(peakDay.amount) + ")";
      }
      if (avgEl) {
        avgEl.textContent = formatINR(weeklyTotal / 7) + "/day";
      }
      if (periodEl) {
        periodEl.textContent = "7-day view";
      }
    }

    trendsChartInstance = new Chart(canvas, {
      data: {
        labels: labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: trendsTimeRange === "monthly",
            position: "top",
            align: "end",
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              color: colors.text,
              font: {
                family: "Plus Jakarta Sans",
                size: 11,
                weight: 500,
              },
            },
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipText,
            bodyColor: colors.tooltipText,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            titleFont: {
              family: "Plus Jakarta Sans",
              weight: 600,
            },
            bodyFont: {
              family: "Plus Jakarta Sans",
            },
            callbacks: {
              label: function (ctx) {
                return (
                  " " + ctx.dataset.label + ": " + formatINR(ctx.parsed.y)
                );
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: colors.text,
              font: {
                family: "Plus Jakarta Sans",
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: colors.grid,
            },
            ticks: {
              color: colors.text,
              font: {
                family: "Plus Jakarta Sans",
                size: 11,
              },
              callback: function (val) {
                if (val >= 1000) {
                  return "₹" + Math.round(val / 1000) + "k";
                }
                return "₹" + val;
              },
            },
          },
        },
        animation: {
          duration: 350,
          easing: "easeOutQuart",
        },
      },
    });
  }

  function renderAnalyticsInsights(totals, monthlyTrends) {
    const topBadge = document.getElementById("insightTopCategoryBadge");
    const topAmount = document.getElementById("insightTopCategoryAmount");
    const topSub = document.getElementById("insightTopCategorySub");

    const trendTag = document.getElementById("insightTrendTag");
    const trendAmount = document.getElementById("insightMonthlyTrendAmount");
    const trendSub = document.getElementById("insightMonthlyTrendSub");

    const avgAmount = document.getElementById("insightAverageAmount");
    const largestSub = document.getElementById("insightLargestAmountSub");

    const smartText = document.getElementById("insightSmartTipText");

    // 1. Highest Spending Category
    const topCat =
      totals.categoryRows.length > 0 ? totals.categoryRows[0] : null;
    if (topCat && topCat.amount > 0) {
      const topCount = totals.analyticsExpenses.filter(function (e) {
        return e.category === topCat.name;
      }).length;
      if (topBadge) {
        topBadge.textContent = topCat.name;
        const color = categoryHexColors[topCat.name] || "#059669";
        topBadge.style.backgroundColor = color + "20";
        topBadge.style.color = color;
      }
      if (topAmount) topAmount.textContent = formatINR(topCat.amount);
      if (topSub) {
        topSub.textContent =
          topCat.percent.toFixed(1) +
          "% of total · " +
          topCount +
          " transactions";
      }
    } else {
      if (topBadge) {
        topBadge.textContent = "None";
        topBadge.style.backgroundColor = "";
        topBadge.style.color = "";
      }
      if (topAmount) topAmount.textContent = "₹0";
      if (topSub) topSub.textContent = "No expenses recorded";
    }

    // 2. Monthly Trend & Daily Pace
    const now = new Date();
    const dayOfMonth = now.getDate();
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const daysRemainingInMonth = Math.max(1, lastDayOfMonth - dayOfMonth);

    if (trendTag) {
      if (monthlyTrends.monthOverMonthPct !== null) {
        const pct = monthlyTrends.monthOverMonthPct;
        if (pct > 0) {
          trendTag.className = "insight-trend-tag insight-trend-tag--up";
          trendTag.textContent = "+" + pct.toFixed(1) + "% vs last mo";
        } else if (pct < 0) {
          trendTag.className = "insight-trend-tag insight-trend-tag--down";
          trendTag.textContent = pct.toFixed(1) + "% vs last mo";
        } else {
          trendTag.className = "insight-trend-tag";
          trendTag.textContent = "0% vs last mo";
        }
      } else {
        trendTag.className = "insight-trend-tag";
        trendTag.textContent = "1st Period";
      }
    }

    if (trendAmount) {
      trendAmount.textContent = formatINR(
        totals.isAllMonths ? totals.allTimeTotal : totals.monthlyTotal
      );
    }

    if (trendSub) {
      const activeSpend = totals.monthlyTotal;
      const dailyPace = activeSpend / Math.max(1, dayOfMonth);
      trendSub.textContent =
        "Avg. " + formatINR(dailyPace) + "/day for " + totals.monthLabel;
    }

    // 3. Average Spend & Largest Transaction
    const activeList = totals.analyticsExpenses;

    const activeTotal = activeList.reduce(function (sum, e) {
      return sum + e.amount;
    }, 0);
    const avgSpend =
      activeList.length > 0 ? activeTotal / activeList.length : 0;

    let largestExpense = null;
    if (activeList.length > 0) {
      largestExpense = activeList.reduce(function (max, e) {
        return e.amount > max.amount ? e : max;
      }, activeList[0]);
    }

    if (avgAmount) avgAmount.textContent = formatINR(avgSpend);
    if (largestSub) {
      if (largestExpense) {
        largestSub.textContent =
          "Max: " +
          formatINR(largestExpense.amount) +
          " (" +
          largestExpense.title +
          ")";
        largestSub.setAttribute("title", largestExpense.title);
      } else {
        largestSub.textContent = "No expenses recorded";
      }
    }

    // 4. Dynamic Smart Financial Insight
    if (smartText) {
      const dailyAllowance = Math.max(
        0,
        totals.remaining / daysRemainingInMonth
      );
      if (totals.isOverBudget) {
        smartText.textContent =
          "⚠️ Budget exceeded by " +
          formatINR(totals.overBudgetAmount) +
          " for " +
          totals.monthLabel +
          ". Top spend is " +
          (topCat ? topCat.name : "general") +
          " (" +
          (topCat ? topCat.percent.toFixed(0) : "0") +
          "% of total). Consider pausing discretionary purchases.";
      } else if (totals.percentSpent >= 85) {
        smartText.textContent =
          "⚡ Budget alert: " +
          totals.percentSpent.toFixed(0) +
          "% used with " +
          daysRemainingInMonth +
          " days left. Recommended safe limit: " +
          formatINR(dailyAllowance) +
          "/day.";
      } else if (totals.categoryRows.length > 0) {
        smartText.textContent =
          "✅ Spending is on track at " +
          totals.percentSpent.toFixed(0) +
          "% of budget. You have " +
          formatINR(totals.remaining) +
          " remaining (" +
          formatINR(dailyAllowance) +
          "/day allowance) for " +
          totals.monthLabel +
          ".";
      } else {
        smartText.textContent =
          "💡 Ready to master your finances? Add your first expense to unlock interactive category charts and monthly trend analytics.";
      }
    }
  }

  function renderCategories(totals) {
    const container = document.getElementById("categoryList");
    const subtitle = document.getElementById("categorySubtitle");
    const badge = document.getElementById("categoryCountBadge");
    if (!container) return;

    if (badge) {
      const count = totals.categoryRows.length;
      badge.textContent = count + (count === 1 ? " Category" : " Categories");
    }

    if (subtitle) {
      subtitle.textContent = totals.isAllMonths
        ? "Share of all-time expenses"
        : "Share of " + totals.monthLabel + " expenses";
    }

    // Render interactive Chart.js Doughnut
    renderCategoryDoughnutChart(totals.categoryRows, totals.categoryTotal);

    container.replaceChildren();

    if (totals.categoryRows.length === 0 || totals.categoryTotal === 0) {
      const empty = document.createElement("p");
      empty.className = "category-empty";
      empty.textContent = totals.isAllMonths
        ? "No spending recorded yet."
        : "No spending recorded for " + totals.monthLabel + " yet.";
      container.appendChild(empty);
      return;
    }

    totals.categoryRows.forEach(function (cat) {
      const pct = cat.percent.toFixed(1);
      const color =
        categoryHexColors[cat.name] || categoryColors[cat.name] || "#94a3b8";

      const li = document.createElement("li");
      li.className = "category-item";

      const head = document.createElement("div");
      head.className = "category-item__head";

      const name = document.createElement("span");
      name.className = "category-item__name";
      name.textContent = cat.name;

      const meta = document.createElement("span");
      meta.className = "category-item__meta";
      meta.textContent = formatINR(cat.amount) + " · " + pct + "%";

      head.appendChild(name);
      head.appendChild(meta);

      const bar = document.createElement("div");
      bar.className = "category-item__bar";
      bar.setAttribute("role", "presentation");

      const fill = document.createElement("div");
      fill.className = "category-item__fill";
      fill.style.width = pct + "%";
      fill.style.background = color;

      bar.appendChild(fill);
      li.appendChild(head);
      li.appendChild(bar);
      container.appendChild(li);
    });
  }

  function initChartControls() {
    const rangeMonthlyBtn = document.getElementById("chartRangeMonthlyBtn");
    const rangeWeeklyBtn = document.getElementById("chartRangeWeeklyBtn");
    const typeBarBtn = document.getElementById("chartTypeBarBtn");
    const typeLineBtn = document.getElementById("chartTypeLineBtn");

    if (rangeMonthlyBtn && rangeWeeklyBtn) {
      rangeMonthlyBtn.addEventListener("click", function () {
        if (trendsTimeRange === "monthly") return;
        trendsTimeRange = "monthly";
        rangeMonthlyBtn.classList.add("btn-toggle--active");
        rangeMonthlyBtn.setAttribute("aria-pressed", "true");
        rangeWeeklyBtn.classList.remove("btn-toggle--active");
        rangeWeeklyBtn.setAttribute("aria-pressed", "false");
        const monthSelect = document.getElementById("filterMonth");
        const selectedMonth = monthSelect ? monthSelect.value : "all";
        const filters = getActiveFilters();
        const totals = calculateTotals(new Date(), selectedMonth, filters);
        const monthlyTrends = calculateMonthlyTrends(filters);
        renderTrendsChart(totals, monthlyTrends);
      });

      rangeWeeklyBtn.addEventListener("click", function () {
        if (trendsTimeRange === "weekly") return;
        trendsTimeRange = "weekly";
        rangeWeeklyBtn.classList.add("btn-toggle--active");
        rangeWeeklyBtn.setAttribute("aria-pressed", "true");
        rangeMonthlyBtn.classList.remove("btn-toggle--active");
        rangeMonthlyBtn.setAttribute("aria-pressed", "false");
        const monthSelect = document.getElementById("filterMonth");
        const selectedMonth = monthSelect ? monthSelect.value : "all";
        const filters = getActiveFilters();
        const totals = calculateTotals(new Date(), selectedMonth, filters);
        const monthlyTrends = calculateMonthlyTrends(filters);
        renderTrendsChart(totals, monthlyTrends);
      });
    }

    if (typeBarBtn && typeLineBtn) {
      typeBarBtn.addEventListener("click", function () {
        if (trendsChartType === "bar") return;
        trendsChartType = "bar";
        typeBarBtn.classList.add("btn-toggle--active");
        typeBarBtn.setAttribute("aria-pressed", "true");
        typeLineBtn.classList.remove("btn-toggle--active");
        typeLineBtn.setAttribute("aria-pressed", "false");
        const monthSelect = document.getElementById("filterMonth");
        const selectedMonth = monthSelect ? monthSelect.value : "all";
        const filters = getActiveFilters();
        const totals = calculateTotals(new Date(), selectedMonth, filters);
        const monthlyTrends = calculateMonthlyTrends(filters);
        renderTrendsChart(totals, monthlyTrends);
      });

      typeLineBtn.addEventListener("click", function () {
        if (trendsChartType === "line") return;
        trendsChartType = "line";
        typeLineBtn.classList.add("btn-toggle--active");
        typeLineBtn.setAttribute("aria-pressed", "true");
        typeBarBtn.classList.remove("btn-toggle--active");
        typeBarBtn.setAttribute("aria-pressed", "false");
        const monthSelect = document.getElementById("filterMonth");
        const selectedMonth = monthSelect ? monthSelect.value : "all";
        const filters = getActiveFilters();
        const totals = calculateTotals(new Date(), selectedMonth, filters);
        const monthlyTrends = calculateMonthlyTrends(filters);
        renderTrendsChart(totals, monthlyTrends);
      });
    }
  }

  function renderSummary(totals) {
    const balanceEl = document.getElementById("summaryBalance");
    const monthlyEl = document.getElementById("summaryMonthlyExpenses");
    const budgetEl = document.getElementById("summaryMonthlyBudget");
    const remainingEl = document.getElementById("summaryRemainingBudget");
    const remainingHint = document.getElementById("summaryRemainingHint");
    const budgetHint = document.getElementById("summaryBudgetMonthHint");

    if (balanceEl) balanceEl.textContent = formatINR(SAMPLE_WALLET_BALANCE);

    if (monthlyEl) {
      if (totals.isAllMonths) {
        monthlyEl.textContent = formatINR(totals.allTimeTotal);
      } else {
        monthlyEl.textContent = formatINR(totals.monthlyTotal);
      }
    }

    const expenseCard = monthlyEl ? monthlyEl.closest(".summary-card") : null;
    const expenseHint = expenseCard ? expenseCard.querySelector(".summary-card__hint") : null;
    if (expenseHint) {
      if (totals.isAllMonths) {
        expenseHint.textContent =
          "All time · " +
          totals.allTimeExpenseCount +
          " transaction" +
          (totals.allTimeExpenseCount === 1 ? "" : "s");
      } else {
        expenseHint.textContent =
          totals.monthLabel +
          " · " +
          totals.monthExpenseCount +
          " transaction" +
          (totals.monthExpenseCount === 1 ? "" : "s");
      }
    }

    if (budgetEl) budgetEl.textContent = formatINR(monthlyBudget);
    if (budgetHint) {
      budgetHint.textContent = totals.monthLabel.split(" ")[0] + " limit";
    }

    if (remainingEl) {
      if (totals.isOverBudget) {
        remainingEl.textContent = "-" + formatINR(totals.overBudgetAmount);
        remainingEl.classList.add("summary-card__amount--over");
        remainingEl.classList.remove("summary-card__amount--accent");
      } else {
        remainingEl.textContent = formatINR(totals.remaining);
        remainingEl.classList.remove("summary-card__amount--over");
        remainingEl.classList.add("summary-card__amount--accent");
      }
    }

    if (remainingHint) {
      if (totals.isOverBudget) {
        remainingHint.textContent =
          "Over budget by " +
          formatINR(totals.overBudgetAmount) +
          " (" +
          totals.percentSpent.toFixed(1) +
          "% spent)";
      } else {
        remainingHint.textContent =
          totals.percentLeft.toFixed(1) + "% of budget left";
      }
    }
  }

  function renderBudgetCard(totals) {
    const monthLabel = document.getElementById("budgetMonthLabel");
    const limitEl = document.getElementById("budgetMonthlyLimit");
    const spentEl = document.getElementById("budgetSpent");
    const remainingEl = document.getElementById("budgetRemaining");
    const progressLabel = document.getElementById("budgetProgressLabel");
    const statusEl = document.getElementById("budgetStatus");
    const progressBar = document.getElementById("budgetProgressBar");
    const progressFill = document.getElementById("budgetProgressFill");
    const budgetMessage = document.getElementById("budgetMessage");
    const budgetEditorMonth = document.getElementById("budgetEditorMonth");
    const budgetInput = document.getElementById("budgetInput");

    if (monthLabel) {
      monthLabel.textContent = totals.isAllMonths
        ? totals.monthLabel + " (Current Month)"
        : totals.monthLabel;
    }
    if (limitEl) limitEl.textContent = formatINR(monthlyBudget);
    if (spentEl) spentEl.textContent = formatINR(totals.monthlyTotal);

    if (remainingEl) {
      if (totals.isOverBudget) {
        remainingEl.textContent = "-" + formatINR(totals.overBudgetAmount);
        remainingEl.classList.add("summary-card__amount--over");
        remainingEl.classList.remove("text-accent");
      } else {
        remainingEl.textContent = formatINR(totals.remaining);
        remainingEl.classList.remove("summary-card__amount--over");
        remainingEl.classList.add("text-accent");
      }
    }

    const pctDisplay = totals.percentSpent.toFixed(1);
    if (progressLabel) progressLabel.textContent = pctDisplay + "% spent";

    const status = getBudgetStatus(totals.percentSpent);
    if (statusEl) {
      statusEl.textContent = status.text;
      statusEl.className = "progress-meta__status " + status.className;
    }

    const barWidth = Math.min(100, totals.percentSpent);
    if (progressFill) {
      progressFill.style.width = barWidth + "%";
      progressFill.classList.remove(
        "progress-bar__fill--over",
        "progress-bar__fill--warn"
      );
      if (totals.isOverBudget) {
        progressFill.classList.add("progress-bar__fill--over");
      } else if (totals.percentSpent >= 85) {
        progressFill.classList.add("progress-bar__fill--warn");
      }
    }

    if (progressBar) {
      progressBar.setAttribute("aria-valuenow", pctDisplay);
    }

    if (budgetMessage) {
      if (totals.isOverBudget) {
        budgetMessage.innerHTML =
          'You are <strong id="budgetMessageAmount">' +
          formatINR(totals.overBudgetAmount) +
          "</strong> over your monthly budget.";
        budgetMessage.classList.add("budget-message--over");
      } else {
        budgetMessage.innerHTML =
          'You have <strong id="budgetMessageAmount">' +
          formatINR(totals.remaining) +
          "</strong> left for the rest of the month.";
        budgetMessage.classList.remove("budget-message--over");
      }
    }

    if (budgetEditorMonth) {
      budgetEditorMonth.textContent = totals.monthLabel;
    }

    if (budgetInput && document.activeElement !== budgetInput) {
      budgetInput.value = monthlyBudget;
      budgetInput.placeholder = String(monthlyBudget);
    }
  }

  function renderCurrentDate() {
    const el = document.getElementById("currentDate");
    if (!el) return;
    const now = new Date();
    el.textContent = new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
    el.setAttribute("datetime", todayISO());
  }

  function render() {
    const monthSelect = document.getElementById("filterMonth");
    const selectedMonth = monthSelect ? monthSelect.value : "all";
    const filters = getActiveFilters();
    const totals = calculateTotals(new Date(), selectedMonth, filters);
    const monthlyTrends = calculateMonthlyTrends(filters);
    renderCurrentDate();
    renderSummary(totals);
    renderBudgetCard(totals);
    renderAnalyticsInsights(totals, monthlyTrends);
    renderCategories(totals);
    renderTrendsChart(totals, monthlyTrends);
    renderExpenses();
  }

  function readFormData() {
    const titleEl = document.getElementById("expenseTitle");
    const amountEl = document.getElementById("expenseAmount");
    const categoryEl = document.getElementById("expenseCategory");
    const dateEl = document.getElementById("expenseDate");
    const paymentEl = document.getElementById("expensePayment");
    const notesEl = document.getElementById("expenseNotes");

    return {
      title: titleEl ? titleEl.value.trim() : "",
      amount: amountEl ? Number(amountEl.value) : NaN,
      category: categoryEl ? categoryEl.value : "",
      date: dateEl ? dateEl.value : "",
      paymentMethod: paymentEl ? paymentEl.value : "",
      notes: notesEl ? notesEl.value.trim() : "",
    };
  }

  function clearFieldErrors() {
    document.querySelectorAll(".field__error").forEach(function (el) {
      el.textContent = "";
    });
    document.querySelectorAll(".field__input.field--invalid").forEach(function (el) {
      el.classList.remove("field--invalid");
    });
  }

  function setFieldError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (field) field.classList.add("field--invalid");
    if (error) error.textContent = message;
  }

  /**
   * @param {ReturnType<readFormData>} data
   * @returns {{ valid: boolean, data?: object, errors: Record<string,string> }}
   */
  function validateExpense(data) {
    const errors = {};

    if (!data.title) {
      errors.title = "Please enter an expense title.";
    }

    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      errors.amount = "Enter a valid amount greater than zero.";
    }

    if (!data.category || CATEGORIES.indexOf(data.category) === -1) {
      errors.category = "Please select a category.";
    }

    if (!data.date) {
      errors.date = "Please choose a date.";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.date = "Please enter a valid date.";
    } else {
      const parsed = parseISODateLocal(data.date);
      if (Number.isNaN(parsed.getTime())) {
        errors.date = "Please enter a valid date.";
      }
    }

    if (!data.paymentMethod || PAYMENT_METHODS.indexOf(data.paymentMethod) === -1) {
      errors.paymentMethod = "Please select a payment method.";
    }

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors: errors };
    }

    return {
      valid: true,
      errors: {},
      data: {
        title: data.title,
        amount: Math.round(data.amount * 100) / 100,
        category: data.category,
        date: data.date,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      },
    };
  }

  function showValidationErrors(errors) {
    if (errors.title) setFieldError("expenseTitle", "errorTitle", errors.title);
    if (errors.amount) setFieldError("expenseAmount", "errorAmount", errors.amount);
    if (errors.category) setFieldError("expenseCategory", "errorCategory", errors.category);
    if (errors.date) setFieldError("expenseDate", "errorDate", errors.date);
    if (errors.paymentMethod) {
      setFieldError("expensePayment", "errorPayment", errors.paymentMethod);
    }
  }

  function resetExpenseForm() {
    const form = document.getElementById("expenseForm");
    if (!form) return;
    form.reset();
    clearFieldErrors();
    const dateEl = document.getElementById("expenseDate");
    if (dateEl) dateEl.value = todayISO();
    editingExpenseId = null;
    const title = document.getElementById("expenseModalTitle");
    const submit = document.getElementById("expenseSubmitBtn");
    if (title) title.textContent = "Add Expense";
    if (submit) submit.textContent = "Save Expense";
  }

  function openExpenseModal() {
    const root = document.getElementById("expenseModalRoot");
    if (!root) return;
    lastFocusedBeforeModal = document.activeElement;
    root.hidden = false;
    document.body.classList.add("modal-open");
    const titleInput = document.getElementById("expenseTitle");
    if (titleInput) titleInput.focus();
  }

  function closeExpenseModal() {
    const root = document.getElementById("expenseModalRoot");
    if (!root) return;
    root.hidden = true;
    document.body.classList.remove("modal-open");
    resetExpenseForm();
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
      lastFocusedBeforeModal.focus();
    }
  }

  function openAddExpenseForm() {
    resetExpenseForm();
    openExpenseModal();
  }

  function addExpense(data) {
    expenses.unshift({
      id: generateId(),
      title: data.title,
      amount: data.amount,
      category: data.category,
      date: data.date,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    });
    saveExpensesToStorage();
  }

  function updateExpense(id, data) {
    const index = expenses.findIndex(function (e) {
      return e.id === id;
    });
    if (index === -1) return false;
    expenses[index] = {
      id: id,
      title: data.title,
      amount: data.amount,
      category: data.category,
      date: data.date,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    };
    saveExpensesToStorage();
    return true;
  }

  function editExpense(id) {
    const expense = expenses.find(function (e) {
      return e.id === id;
    });
    if (!expense) return;

    editingExpenseId = id;
    clearFieldErrors();

    const title = document.getElementById("expenseModalTitle");
    const submit = document.getElementById("expenseSubmitBtn");
    if (title) title.textContent = "Edit Expense";
    if (submit) submit.textContent = "Update Expense";

    const titleEl = document.getElementById("expenseTitle");
    const amountEl = document.getElementById("expenseAmount");
    const categoryEl = document.getElementById("expenseCategory");
    const dateEl = document.getElementById("expenseDate");
    const paymentEl = document.getElementById("expensePayment");
    const notesEl = document.getElementById("expenseNotes");

    if (titleEl) titleEl.value = expense.title;
    if (amountEl) amountEl.value = String(expense.amount);
    if (categoryEl) categoryEl.value = expense.category;
    if (dateEl) dateEl.value = expense.date;
    if (paymentEl) paymentEl.value = expense.paymentMethod;
    if (notesEl) notesEl.value = expense.notes || "";

    openExpenseModal();
  }

  function deleteExpense(id) {
    expenses = expenses.filter(function (e) {
      return e.id !== id;
    });
    saveExpensesToStorage();
  }

  function openConfirmDialog(expense) {
    pendingDeleteId = expense.id;
    const root = document.getElementById("confirmModalRoot");
    const message = document.getElementById("confirmMessage");
    if (message) {
      message.textContent =
        'Delete "' + expense.title + '" (' + formatINR(expense.amount) + ")? This cannot be undone.";
    }
    if (root) {
      root.hidden = false;
      document.body.classList.add("modal-open");
      const cancelBtn = document.getElementById("confirmCancelBtn");
      if (cancelBtn) cancelBtn.focus();
    }
  }

  function closeConfirmDialog() {
    pendingDeleteId = null;
    const root = document.getElementById("confirmModalRoot");
    if (root) root.hidden = true;
    if (!isExpenseModalOpen()) {
      document.body.classList.remove("modal-open");
    }
  }

  function isExpenseModalOpen() {
    const root = document.getElementById("expenseModalRoot");
    return root && !root.hidden;
  }

  function isConfirmModalOpen() {
    const root = document.getElementById("confirmModalRoot");
    return root && !root.hidden;
  }

  function showToast(message, type) {
    const stack = document.getElementById("toastStack");
    if (!stack) return;

    const toast = document.createElement("div");
    toast.className = "toast" + (type === "error" ? " toast--error" : "");
    toast.textContent = message;
    stack.appendChild(toast);

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(function () {
        toast.classList.add("is-visible");
      });
    } else {
      toast.classList.add("is-visible");
    }

    window.setTimeout(function () {
      toast.classList.remove("is-visible");
      toast.addEventListener("transitionend", function () {
        toast.remove();
      }, { once: true });
    }, 3200);
  }

  function handleExpenseSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    clearFieldErrors();
    const raw = readFormData();
    const result = validateExpense(raw);
    if (!result.valid) {
      showValidationErrors(result.errors);
      return;
    }

    isSubmitting = true;
    const submitBtn = document.getElementById("expenseSubmitBtn");
    if (submitBtn) submitBtn.disabled = true;

    if (editingExpenseId) {
      const updated = updateExpense(editingExpenseId, result.data);
      if (updated) {
        populateMonthFilter();
        render();
        closeExpenseModal();
        showToast("Expense updated successfully.");
      } else {
        showToast("Could not find that expense.", "error");
      }
    } else {
      addExpense(result.data);
      populateMonthFilter();
      render();
      closeExpenseModal();
      showToast("Expense added successfully.");
    }

    isSubmitting = false;
    if (submitBtn) submitBtn.disabled = false;
  }

  function initExpenseForm() {
    const form = document.getElementById("expenseForm");
    const addBtn = document.getElementById("addExpenseBtn");
    const emptyBtn = document.getElementById("emptyAddExpenseBtn");
    const closeBtn = document.getElementById("expenseModalClose");
    const cancelBtn = document.getElementById("expenseCancelBtn");
    const modal = document.getElementById("expenseModal");
    const backdrop = document.getElementById("expenseModalBackdrop");

    if (addBtn) addBtn.addEventListener("click", openAddExpenseForm);
    if (emptyBtn) emptyBtn.addEventListener("click", openAddExpenseForm);
    if (form) form.addEventListener("submit", handleExpenseSubmit);
    if (closeBtn) closeBtn.addEventListener("click", closeExpenseModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeExpenseModal);

    if (backdrop) {
      backdrop.addEventListener("click", closeExpenseModal);
    }

    if (modal) {
      modal.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    const fields = ["expenseTitle", "expenseAmount", "expenseCategory", "expenseDate", "expensePayment"];
    const errorMap = {
      expenseTitle: "errorTitle",
      expenseAmount: "errorAmount",
      expenseCategory: "errorCategory",
      expenseDate: "errorDate",
      expensePayment: "errorPayment",
    };

    fields.forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      function clearError() {
        el.classList.remove("field--invalid");
        const err = document.getElementById(errorMap[id]);
        if (err) err.textContent = "";
      }
      el.addEventListener("input", clearError);
      el.addEventListener("change", clearError);
    });
  }

  function initExpenseFilters() {
    const searchInput = document.getElementById("expenseSearch");
    const clearSearchBtn = document.getElementById("clearSearchBtn");
    const categorySelect = document.getElementById("filterCategory");
    const monthSelect = document.getElementById("filterMonth");
    const startDateInput = document.getElementById("filterStartDate");
    const endDateInput = document.getElementById("filterEndDate");
    const sortSelect = document.getElementById("filterSort");
    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    const emptyClearFiltersBtn = document.getElementById("emptyClearFiltersBtn");

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        if (clearSearchBtn) {
          clearSearchBtn.hidden = searchInput.value.trim().length === 0;
        }
        render();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", function () {
        if (searchInput) {
          searchInput.value = "";
          clearSearchBtn.hidden = true;
          searchInput.focus();
        }
        render();
      });
    }

    if (categorySelect) {
      categorySelect.addEventListener("change", function () {
        render();
      });
    }

    if (monthSelect) {
      monthSelect.addEventListener("change", function () {
        render();
      });
    }

    function handleDateRangeChange() {
      const startDate = startDateInput ? startDateInput.value : "";
      const endDate = endDateInput ? endDateInput.value : "";
      const invalidRange = startDate && endDate && startDate > endDate;
      if (endDateInput) {
        endDateInput.setCustomValidity(
          invalidRange ? "The end date must be on or after the start date." : ""
        );
      }
      if (invalidRange) {
        if (endDateInput) endDateInput.reportValidity();
        showToast("Choose an end date on or after the start date.", "error");
        return;
      }
      render();
    }

    if (startDateInput) startDateInput.addEventListener("change", handleDateRangeChange);
    if (endDateInput) endDateInput.addEventListener("change", handleDateRangeChange);

    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        renderExpenses();
      });
    }

    function clearAllFilters() {
      if (searchInput) searchInput.value = "";
      if (clearSearchBtn) clearSearchBtn.hidden = true;
      if (categorySelect) categorySelect.value = "all";
      if (monthSelect) monthSelect.value = "all";
      if (startDateInput) startDateInput.value = "";
      if (endDateInput) {
        endDateInput.value = "";
        endDateInput.setCustomValidity("");
      }
      render();
      showToast("Filters reset.");
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", clearAllFilters);
    }
    if (emptyClearFiltersBtn) {
      emptyClearFiltersBtn.addEventListener("click", clearAllFilters);
    }
  }

  function initTransactionActions() {
    function handleActionClick(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("[data-action]");
      if (!button) return;

      const action = button.getAttribute("data-action") || button.dataset.action;
      const id = button.getAttribute("data-expense-id") || button.dataset.expenseId;
      if (!id) return;

      if (action === "edit") {
        editExpense(id);
      } else if (action === "delete") {
        const expense = expenses.find(function (e) {
          return e.id === id;
        });
        if (expense) openConfirmDialog(expense);
      }
    }

    const tbody = document.getElementById("transactionsBody");
    const list = document.getElementById("transactionsList");
    if (tbody) tbody.addEventListener("click", handleActionClick);
    if (list) list.addEventListener("click", handleActionClick);
  }

  function initConfirmDialog() {
    const cancelBtn = document.getElementById("confirmCancelBtn");
    const deleteBtn = document.getElementById("confirmDeleteBtn");
    const backdrop = document.getElementById("confirmModalBackdrop");
    const modal = document.getElementById("confirmModal");

    if (cancelBtn) {
      cancelBtn.addEventListener("click", closeConfirmDialog);
    }
    if (backdrop) {
      backdrop.addEventListener("click", closeConfirmDialog);
    }
    if (modal) {
      modal.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        if (!pendingDeleteId) return;
        deleteExpense(pendingDeleteId);
        populateMonthFilter();
        closeConfirmDialog();
        render();
        showToast("Expense deleted.");
      });
    }
  }

  function initGlobalKeys() {
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (isConfirmModalOpen()) {
        closeConfirmDialog();
        return;
      }
      if (isExpenseModalOpen()) {
        closeExpenseModal();
      }
    });
  }

  function initSidebar() {
    const toggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (!toggle || !sidebar || !backdrop) return;

    function openSidebar() {
      sidebar.classList.add("is-open");
      backdrop.hidden = false;
      requestAnimationFrame(function () {
        backdrop.classList.add("is-visible");
      });
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close navigation menu");
    }

    function closeSidebar() {
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-visible");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
      backdrop.addEventListener(
        "transitionend",
        function hideBackdrop() {
          if (!sidebar.classList.contains("is-open")) {
            backdrop.hidden = true;
          }
        },
        { once: true }
      );
    }

    toggle.addEventListener("click", function () {
      if (sidebar.classList.contains("is-open")) closeSidebar();
      else openSidebar();
    });

    backdrop.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebar.classList.contains("is-open")) {
        if (!isExpenseModalOpen() && !isConfirmModalOpen()) closeSidebar();
      }
    });

    window.matchMedia("(min-width: 769px)").addEventListener("change", function (mq) {
      if (mq.matches) closeSidebar();
    });
  }

  function initBudgetForm() {
    const form = document.getElementById("budgetForm");
    const input = document.getElementById("budgetInput");
    const errorEl = document.getElementById("budgetInputError");

    if (!form || !input) return;

    input.value = monthlyBudget;
    input.placeholder = String(monthlyBudget);

    function clearBudgetError() {
      input.classList.remove("field--invalid");
      if (errorEl) errorEl.textContent = "";
    }

    input.addEventListener("input", clearBudgetError);
    input.addEventListener("change", clearBudgetError);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearBudgetError();

      const rawVal = input.value.trim();
      if (!rawVal) {
        input.classList.add("field--invalid");
        if (errorEl) {
          errorEl.textContent = "Please enter a monthly budget.";
        }
        input.focus();
        return;
      }

      const parsedVal = Number(rawVal);
      if (!Number.isFinite(parsedVal) || parsedVal <= 0) {
        input.classList.add("field--invalid");
        if (errorEl) {
          errorEl.textContent = "Please enter a valid budget greater than ₹0.";
        }
        input.focus();
        return;
      }

      if (parsedVal > 100000000) {
        input.classList.add("field--invalid");
        if (errorEl) {
          errorEl.textContent = "Budget cannot exceed ₹10,00,00,000.";
        }
        input.focus();
        return;
      }

      monthlyBudget = Math.round(parsedVal * 100) / 100;
      saveBudgetToStorage();
      render();
      showToast("Monthly budget updated to " + formatINR(monthlyBudget) + ".");
    });
  }

  function syncThemeToggleUI(theme) {
    const btn = document.getElementById("themeToggleBtn");
    if (!btn) return;
    const isDark = theme === "dark";
    const moonIcon = btn.querySelector(".theme-icon--moon");
    const sunIcon = btn.querySelector(".theme-icon--sun");
    if (moonIcon) moonIcon.hidden = isDark;
    if (sunIcon) sunIcon.hidden = !isDark;
    const label = isDark ? "Switch to light theme" : "Switch to dark theme";
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
  }

  function initThemeToggle() {
    const btn = document.getElementById("themeToggleBtn");
    if (!btn) return;
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "light";
    syncThemeToggleUI(currentTheme);

    btn.addEventListener("click", function () {
      const active =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light";
      const next = active === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem(STORAGE_KEYS.THEME, next);
      } catch (err) {
        console.warn("SpendSmart: Failed to save theme to localStorage:", err);
      }
      syncThemeToggleUI(next);
      const monthSelect = document.getElementById("filterMonth");
      const selectedMonth = monthSelect ? monthSelect.value : "all";
      const filters = getActiveFilters();
      const totals = calculateTotals(new Date(), selectedMonth, filters);
      const monthlyTrends = calculateMonthlyTrends(filters);
      renderTrendsChart(totals, monthlyTrends);
      renderCategoryDoughnutChart(totals.categoryRows, totals.categoryTotal);
      showToast("Switched to " + next + " mode.");
    });
  }

  function escapeCsvValue(value) {
    let text = String(value == null ? "" : value);
    // Prevent spreadsheet apps from treating a user-entered title or note as a formula.
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function exportFilteredExpenses() {
    const filters = getActiveFilters();
    const list = getSortedExpenses(getFilteredExpenses(filters), filters.sort);
    if (list.length === 0) {
      showToast("There are no matching expenses to export.", "error");
      return;
    }

    const rows = [["Date", "Title", "Category", "Amount (INR)", "Description"]];
    list.forEach(function (expense) {
      rows.push([
        expense.date,
        expense.title,
        expense.category,
        expense.amount.toFixed(2),
        expense.notes || "",
      ]);
    });

    const csv = "\uFEFF" + rows.map(function (row) {
      return row.map(escapeCsvValue).join(",");
    }).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "spendsmart-expenses-" + todayISO() + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 0);
    showToast(list.length + " expense" + (list.length === 1 ? "" : "s") + " exported as CSV.");
  }

  function initUtilityControls() {
    const exportBtn = document.getElementById("exportCsvBtn");
    const notificationsBtn = document.getElementById("notificationsBtn");
    if (exportBtn) exportBtn.addEventListener("click", exportFilteredExpenses);
    if (notificationsBtn) {
      notificationsBtn.addEventListener("click", function () {
        showToast("You're all caught up — no new notifications.");
      });
    }
  }

  function init() {
    populateMonthFilter();
    initChartControls();
    render();
    initSidebar();
    initThemeToggle();
    initBudgetForm();
    initExpenseForm();
    initExpenseFilters();
    initTransactionActions();
    initConfirmDialog();
    initGlobalKeys();
    initUtilityControls();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
