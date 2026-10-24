/**
 * SpendSmart — Day 1 dashboard
 * Renders demo data, formats currency (INR), and wires basic UI interactions.
 */

(function () {
  "use strict";

  /** Indian Rupee formatter — reused across the dashboard */
  const inrFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  /**
   * @param {number} amount
   * @returns {string}
   */
  function formatINR(amount) {
    return inrFormatter.format(amount);
  }

  /** Demo transactions — totals align with category summary (₹12,450/month context) */
  const demoTransactions = [
    {
      id: 1,
      title: "Electricity Bill",
      category: "Bills",
      date: "2026-10-21",
      payment: "UPI",
      amount: 1850,
    },
    {
      id: 2,
      title: "Coursera Subscription",
      category: "Education",
      date: "2026-10-20",
      payment: "Debit Card",
      amount: 1999,
    },
    {
      id: 3,
      title: "Amazon — Headphones",
      category: "Shopping",
      date: "2026-10-19",
      payment: "Credit Card",
      amount: 2150,
    },
    {
      id: 4,
      title: "Swiggy Dinner",
      category: "Food",
      date: "2026-10-18",
      payment: "UPI",
      amount: 450,
    },
    {
      id: 5,
      title: "Uber to Campus",
      category: "Transport",
      date: "2026-10-17",
      payment: "UPI",
      amount: 320,
    },
    {
      id: 6,
      title: "Netflix",
      category: "Entertainment",
      date: "2026-10-16",
      payment: "Debit Card",
      amount: 649,
    },
    {
      id: 7,
      title: "Metro Monthly Pass",
      category: "Transport",
      date: "2026-10-15",
      payment: "UPI",
      amount: 500,
    },
    {
      id: 8,
      title: "Stationery & Books",
      category: "Education",
      date: "2026-10-14",
      payment: "Cash",
      amount: 680,
    },
  ];

  /** Category breakdown — sums to ₹12,450 (matches budget card "Spent") */
  const categorySpending = [
    { name: "Food", amount: 3200, color: "var(--category-food)" },
    { name: "Transport", amount: 1800, color: "var(--category-transport)" },
    { name: "Shopping", amount: 2950, color: "var(--category-shopping)" },
    { name: "Education", amount: 1999, color: "var(--category-education)" },
    { name: "Entertainment", amount: 1201, color: "var(--category-entertainment)" },
    { name: "Bills", amount: 1300, color: "var(--category-bills)" },
  ];

  const TOTAL_MONTHLY_EXPENSES = 12450;

  /** Weekly demo chart data (Mon–Sun) */
  const weeklySpending = [
    { day: "Mon", amount: 1200 },
    { day: "Tue", amount: 850 },
    { day: "Wed", amount: 2100 },
    { day: "Thu", amount: 640 },
    { day: "Fri", amount: 1750 },
    { day: "Sat", amount: 980 },
    { day: "Sun", amount: 1420 },
  ];

  const categoryIcons = {
    Food: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><path d="M6 1v3M10 1v3M14 1v3"/></svg>`,
    Transport: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="10" rx="2"/><path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M5 18h2M17 18h2"/></svg>`,
    Shopping: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>`,
    Education: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/></svg>`,
    Entertainment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m10 9 6 3-6 3V9z"/></svg>`,
    Bills: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>`,
  };

  const categoryColors = {
    Food: "var(--category-food)",
    Transport: "var(--category-transport)",
    Shopping: "var(--category-shopping)",
    Education: "var(--category-education)",
    Entertainment: "var(--category-entertainment)",
    Bills: "var(--category-bills)",
  };

  /**
   * @param {string} isoDate — YYYY-MM-DD
   * @returns {string}
   */
  function formatDisplayDate(isoDate) {
    const date = new Date(isoDate + "T12:00:00");
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  /** Sets the header date from the user's local timezone */
  function renderCurrentDate() {
    const el = document.getElementById("currentDate");
    if (!el) return;

    const now = new Date();
    const formatted = new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);

    el.textContent = formatted;
    el.setAttribute("datetime", now.toISOString().slice(0, 10));
  }

  /** Fills elements that declare amounts in data-static-amount */
  function renderStaticAmounts() {
    document.querySelectorAll("[data-static-amount]").forEach(function (node) {
      const raw = node.getAttribute("data-static-amount");
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      node.textContent = formatINR(value);
    });
  }

  /**
   * @param {string} category
   * @returns {string}
   */
  function getCategoryIcon(category) {
    return categoryIcons[category] || categoryIcons.Bills;
  }

  /**
   * @param {typeof demoTransactions[0]} tx
   * @returns {string}
   */
  function buildTableRow(tx) {
    const icon = getCategoryIcon(tx.category);
    const color = categoryColors[tx.category] || "var(--color-text-muted)";

    return `
      <tr>
        <td>
          <div class="tx-title">
            <span class="tx-icon" style="background: color-mix(in srgb, ${color} 12%, white); color: ${color}">
              ${icon}
            </span>
            ${tx.title}
          </div>
        </td>
        <td><span class="category-pill">${tx.category}</span></td>
        <td>${formatDisplayDate(tx.date)}</td>
        <td class="payment-method">${tx.payment}</td>
        <td class="col-amount"><span class="tx-amount">${formatINR(tx.amount)}</span></td>
      </tr>
    `;
  }

  /**
   * @param {typeof demoTransactions[0]} tx
   * @returns {string}
   */
  function buildListItem(tx) {
    const icon = getCategoryIcon(tx.category);
    const color = categoryColors[tx.category] || "var(--color-text-muted)";

    return `
      <li class="tx-list-item">
        <div class="tx-list-item__row">
          <div class="tx-title">
            <span class="tx-icon" style="background: color-mix(in srgb, ${color} 12%, white); color: ${color}">
              ${icon}
            </span>
            ${tx.title}
          </div>
          <span class="tx-amount">${formatINR(tx.amount)}</span>
        </div>
        <div class="tx-list-item__meta">
          <span>${tx.category}</span>
          <span>·</span>
          <span>${formatDisplayDate(tx.date)}</span>
          <span>·</span>
          <span>${tx.payment}</span>
        </div>
      </li>
    `;
  }

  function renderTransactions() {
    const tbody = document.getElementById("transactionsBody");
    const list = document.getElementById("transactionsList");
    if (!tbody || !list) return;

    tbody.innerHTML = demoTransactions.map(buildTableRow).join("");
    list.innerHTML = demoTransactions.map(buildListItem).join("");
  }

  function renderCategories() {
    const container = document.getElementById("categoryList");
    if (!container) return;

    container.innerHTML = categorySpending
      .map(function (cat) {
        const pct = ((cat.amount / TOTAL_MONTHLY_EXPENSES) * 100).toFixed(1);
        return `
          <li class="category-item">
            <div class="category-item__head">
              <span class="category-item__name">${cat.name}</span>
              <span class="category-item__meta">${formatINR(cat.amount)} · ${pct}%</span>
            </div>
            <div class="category-item__bar" role="presentation">
              <div class="category-item__fill" style="width: ${pct}%; background: ${cat.color}"></div>
            </div>
          </li>
        `;
      })
      .join("");
  }

  function renderWeeklyChart() {
    const chart = document.getElementById("weeklyChart");
    if (!chart) return;

    const maxAmount = Math.max(...weeklySpending.map(function (d) {
      return d.amount;
    }));

    chart.innerHTML = weeklySpending
      .map(function (day) {
        const heightPct = maxAmount ? (day.amount / maxAmount) * 100 : 0;
        return `
          <div class="bar-chart__item">
            <span class="bar-chart__value">${formatINR(day.amount)}</span>
            <div class="bar-chart__bar-wrap">
              <div class="bar-chart__bar" style="height: ${heightPct}%"></div>
            </div>
            <span class="bar-chart__label">${day.day}</span>
          </div>
        `;
      })
      .join("");
  }

  /** Mobile sidebar toggle */
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
          backdrop.removeEventListener("transitionend", hideBackdrop);
        },
        { once: true }
      );
    }

    toggle.addEventListener("click", function () {
      if (sidebar.classList.contains("is-open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    backdrop.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebar.classList.contains("is-open")) {
        closeSidebar();
      }
    });

    window.matchMedia("(min-width: 769px)").addEventListener("change", function (mq) {
      if (mq.matches) {
        closeSidebar();
      }
    });
  }

  /** Placeholder — Add Expense (Day 2 modal/form) */
  function initPlaceholders() {
    const addBtn = document.getElementById("addExpenseBtn");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        addBtn.blur();
        /* Intentionally no alert — form wiring on Day 2 */
      });
    }

    document.querySelectorAll(".nav-link--placeholder, .link--placeholder").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
      });
    });
  }

  function init() {
    renderCurrentDate();
    renderStaticAmounts();
    renderTransactions();
    renderCategories();
    renderWeeklyChart();
    initSidebar();
    initPlaceholders();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
