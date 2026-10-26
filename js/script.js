/**
 * SpendSmart — Expense CRUD & dashboard
 * Single source of truth: expenses[]
 */

(function () {
  "use strict";

  const MONTHLY_BUDGET = 20000;
  /** Illustrative wallet figure — not calculated from expenses */
  const SAMPLE_WALLET_BALANCE = 24850;

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

  const inrFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  /** @type {Array<{id:string,title:string,amount:number,category:string,date:string,paymentMethod:string,notes:string}>} */
  let expenses = createInitialExpenses();

  let editingExpenseId = null;
  let pendingDeleteId = null;
  let isSubmitting = false;
  let lastFocusedBeforeModal = null;

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

  function isSameMonth(isoDate, refDate) {
    const d = parseISODateLocal(isoDate);
    return (
      d.getFullYear() === refDate.getFullYear() &&
      d.getMonth() === refDate.getMonth()
    );
  }

  function getMonthLabel(refDate) {
    return new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
    }).format(refDate);
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

  function calculateTotals(refDate) {
    const now = refDate || new Date();
    const monthly = expenses.filter(function (e) {
      return isSameMonth(e.date, now);
    });

    const monthlyTotal = monthly.reduce(function (sum, e) {
      return sum + e.amount;
    }, 0);

    const remaining = MONTHLY_BUDGET - monthlyTotal;
    const percentSpent =
      MONTHLY_BUDGET > 0 ? (monthlyTotal / MONTHLY_BUDGET) * 100 : 0;
    const percentLeft = Math.max(0, 100 - percentSpent);

    const byCategory = {};
    monthly.forEach(function (e) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    const categoryRows = Object.keys(byCategory)
      .map(function (name) {
        return { name, amount: byCategory[name] };
      })
      .sort(function (a, b) {
        return b.amount - a.amount;
      });

    const weekDays = getWeekRange(now);
    const weekly = weekDays.map(function (day) {
      const amount = expenses
        .filter(function (e) {
          return e.date === day.iso;
        })
        .reduce(function (sum, e) {
          return sum + e.amount;
        }, 0);
      return { day: day.label, amount: amount };
    });

    return {
      monthlyTotal,
      remaining,
      percentSpent,
      percentLeft,
      categoryRows,
      weekly,
      monthLabel: getMonthLabel(now),
    };
  }

  function getBudgetStatus(percentSpent) {
    if (percentSpent > 100) {
      return { text: "Over budget", className: "progress-meta__status--warn" };
    }
    if (percentSpent >= 85) {
      return { text: "Watch spending", className: "progress-meta__status--warn" };
    }
    return { text: "On track", className: "" };
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
    editBtn.textContent = "Edit";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-icon-text btn-icon-text--danger";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.expenseId = expenseId;
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
    const tableWrap = document.getElementById("transactionsTableWrap");
    if (!tbody || !list || !empty) return;

    const sorted = expenses.slice().sort(function (a, b) {
      if (a.date === b.date) return b.amount - a.amount;
      return a.date < b.date ? 1 : -1;
    });

    tbody.replaceChildren();
    list.replaceChildren();

    if (sorted.length === 0) {
      empty.hidden = false;
      if (tableWrap) tableWrap.hidden = true;
      list.hidden = true;
      return;
    }

    empty.hidden = true;
    if (tableWrap) tableWrap.hidden = false;
    list.hidden = false;

    sorted.forEach(function (expense) {
      tbody.appendChild(buildTableRow(expense));
      list.appendChild(buildListItem(expense));
    });
  }

  function renderCategories(totals) {
    const container = document.getElementById("categoryList");
    if (!container) return;

    container.replaceChildren();

    if (totals.monthlyTotal === 0 || totals.categoryRows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "category-empty";
      empty.textContent = "No spending recorded for this month yet.";
      container.appendChild(empty);
      return;
    }

    totals.categoryRows.forEach(function (cat) {
      const pct = ((cat.amount / totals.monthlyTotal) * 100).toFixed(1);
      const color = categoryColors[cat.name] || categoryColors.Other;

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

  function renderWeeklyChart(totals) {
    const chart = document.getElementById("weeklyChart");
    if (!chart) return;

    chart.replaceChildren();
    const maxAmount = Math.max(
      0,
      ...totals.weekly.map(function (d) {
        return d.amount;
      })
    );

    totals.weekly.forEach(function (day) {
      const heightPct = maxAmount ? (day.amount / maxAmount) * 100 : 0;

      const item = document.createElement("div");
      item.className = "bar-chart__item";

      const value = document.createElement("span");
      value.className = "bar-chart__value";
      value.textContent = formatINR(day.amount);

      const barWrap = document.createElement("div");
      barWrap.className = "bar-chart__bar-wrap";

      const bar = document.createElement("div");
      bar.className = "bar-chart__bar";
      bar.style.height = heightPct + "%";

      barWrap.appendChild(bar);

      const label = document.createElement("span");
      label.className = "bar-chart__label";
      label.textContent = day.day;

      item.appendChild(value);
      item.appendChild(barWrap);
      item.appendChild(label);
      chart.appendChild(item);
    });
  }

  function renderSummary(totals) {
    const balanceEl = document.getElementById("summaryBalance");
    const monthlyEl = document.getElementById("summaryMonthlyExpenses");
    const budgetEl = document.getElementById("summaryMonthlyBudget");
    const remainingEl = document.getElementById("summaryRemainingBudget");
    const remainingHint = document.getElementById("summaryRemainingHint");
    const budgetHint = document.getElementById("summaryBudgetMonthHint");

    if (balanceEl) balanceEl.textContent = formatINR(SAMPLE_WALLET_BALANCE);
    if (monthlyEl) monthlyEl.textContent = formatINR(totals.monthlyTotal);
    if (budgetEl) budgetEl.textContent = formatINR(MONTHLY_BUDGET);
    if (remainingEl) remainingEl.textContent = formatINR(totals.remaining);
    if (remainingHint) {
      remainingHint.textContent =
        totals.percentLeft.toFixed(2) + "% of budget left";
    }
    if (budgetHint) {
      budgetHint.textContent = totals.monthLabel.split(" ")[0] + " limit";
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
    const messageAmount = document.getElementById("budgetMessageAmount");

    if (monthLabel) monthLabel.textContent = totals.monthLabel;
    if (limitEl) limitEl.textContent = formatINR(MONTHLY_BUDGET);
    if (spentEl) spentEl.textContent = formatINR(totals.monthlyTotal);
    if (remainingEl) remainingEl.textContent = formatINR(totals.remaining);

    const pctDisplay = totals.percentSpent.toFixed(2);
    if (progressLabel) progressLabel.textContent = pctDisplay + "% spent";

    const status = getBudgetStatus(totals.percentSpent);
    if (statusEl) {
      statusEl.textContent = status.text;
      statusEl.className = "progress-meta__status " + status.className;
    }

    const barWidth = Math.min(100, totals.percentSpent);
    if (progressFill) progressFill.style.width = barWidth + "%";
    if (progressBar) {
      progressBar.setAttribute("aria-valuenow", pctDisplay);
    }
    if (messageAmount) messageAmount.textContent = formatINR(totals.remaining);
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
    const totals = calculateTotals(new Date());
    renderCurrentDate();
    renderSummary(totals);
    renderBudgetCard(totals);
    renderExpenses();
    renderCategories(totals);
    renderWeeklyChart(totals);
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

    requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });

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
        render();
        closeExpenseModal();
        showToast("Expense updated successfully.");
      } else {
        showToast("Could not find that expense.", "error");
      }
    } else {
      addExpense(result.data);
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

  function initTransactionActions() {
    function handleActionClick(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("[data-action]");
      if (!button) return;

      const action = button.getAttribute("data-action");
      const id = button.getAttribute("data-expense-id");
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

  function initPlaceholders() {
    document.querySelectorAll(".nav-link--placeholder, .link--placeholder").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
      });
    });
  }

  function init() {
    render();
    initSidebar();
    initExpenseForm();
    initTransactionActions();
    initConfirmDialog();
    initGlobalKeys();
    initPlaceholders();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
