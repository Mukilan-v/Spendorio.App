/**
 * app.js - Master Application Controller & Navigation
 */

class Application {
  constructor() {
    this.currentTab = 'dashboard';
    this.currentDate = new Date().toISOString().split('T')[0];
    this.init();
  }

  init() {
    // Load theme & settings
    const settings = window.storage.getSettings();
    this.applyTheme(settings.theme || 'light');
    this.applyCurrency(settings.currency || '₹');

    // Setup Date display and input
    const dateInput = document.getElementById('global-date-picker');
    if (dateInput) {
      dateInput.value = this.currentDate;
    }

    // Initialize Dashboard Background Theme
    this.initDashboardBackground();

    // Attach Event Listeners
    this.bindEvents();

    // Initial Render of all sections
    this.updateSummaryMetrics();
    if (window.tasks) window.tasks.setDate(this.currentDate);
    if (window.expenses) window.expenses.setDate(this.currentDate);
    if (window.charts) {
      setTimeout(() => window.charts.renderAll(), 100);
    }

    // Show sync bridge banner if user is viewing via file://
    if (window.location.protocol === 'file:') {
      const banner = document.getElementById('file-sync-banner');
      if (banner) banner.style.display = 'flex';
    }

    // Fetch network info for mobile phone monitoring (4G/5G and Wi-Fi)
    try {
      fetch('/api/network-info')
        .then(r => r.json())
        .then(d => {
          if (!d) return;
          const wifiEl = document.getElementById('phone-access-wifi-url');
          if (wifiEl && d.localUrl) wifiEl.textContent = d.localUrl;

          const tunnelEl = document.getElementById('phone-access-tunnel-url');
          if (tunnelEl && d.tunnelUrl) tunnelEl.textContent = d.tunnelUrl;

          const legacyEl = document.getElementById('phone-access-url');
          if (legacyEl) legacyEl.textContent = d.tunnelUrl || d.localUrl || 'http://localhost:3000';
        })
        .catch(() => {});
    } catch {}
  }

  bindEvents() {
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const tab = item.dataset.tab;
        if (tab) {
          this.switchTab(tab);
          // Close mobile sidebar if open
          document.querySelector('.sidebar')?.classList.remove('open');
        }
      });
    });

    // Date Navigation
    document.getElementById('prev-date-btn')?.addEventListener('click', () => this.shiftDate(-1));
    document.getElementById('next-date-btn')?.addEventListener('click', () => this.shiftDate(1));
    document.getElementById('today-date-btn')?.addEventListener('click', () => this.goToToday());
    
    document.getElementById('global-date-picker')?.addEventListener('change', (e) => {
      this.setDate(e.target.value);
    });

    // Mobile sidebar toggle
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('open');
    });

    // Theme toggle button
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Currency selector
    document.getElementById('currency-select')?.addEventListener('change', (e) => {
      this.setCurrency(e.target.value);
    });

    // Modals close on click outside or close buttons
    document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    // Escape key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      }
    });

    // Automatically lock body scroll when any modal is open, and unlock when closed
    const syncModalBodyLock = () => {
      const hasActiveModal = document.querySelectorAll('.modal-overlay.active').length > 0;
      document.body.classList.toggle('modal-open', hasActiveModal);
    };
    if (typeof MutationObserver !== 'undefined') {
      const modalObserver = new MutationObserver(syncModalBodyLock);
      document.querySelectorAll('.modal-overlay').forEach(overlay => {
        modalObserver.observe(overlay, { attributes: true, attributeFilter: ['class'] });
      });
    }

    // Close export dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('expense-export-menu');
      if (menu && menu.style.display !== 'none') {
        if (!e.target.closest('#expense-export-menu') && !e.target.closest('button[onclick*="expense-export-menu"]')) {
          menu.style.display = 'none';
        }
      }
    });

    // Task Form Submit
    document.getElementById('task-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const saved = window.tasks.handleSaveTask(formData);
      if (saved) {
        document.getElementById('task-modal')?.classList.remove('active');
      }
    });

    // Expense Form Submit
    document.getElementById('expense-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const saved = window.expenses.handleSaveExpense(formData);
      if (saved) {
        document.getElementById('expense-modal')?.classList.remove('active');
      }
    });

    // Income Form Submit
    document.getElementById('income-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const saved = window.expenses.handleSaveIncome(formData);
      if (saved) {
        document.getElementById('income-modal')?.classList.remove('active');
      }
    });

    // Budget Settings Form Submit
    document.getElementById('budget-settings-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      this.saveBudgetSettings(formData);
    });

    // Task Filters
    document.getElementById('task-search-input')?.addEventListener('input', (e) => {
      window.tasks.setFilters({ search: e.target.value });
    });
    document.getElementById('task-category-filter')?.addEventListener('change', (e) => {
      window.tasks.setFilters({ category: e.target.value });
    });
    document.getElementById('task-priority-filter')?.addEventListener('change', (e) => {
      window.tasks.setFilters({ priority: e.target.value });
    });
    document.getElementById('task-status-filter')?.addEventListener('change', (e) => {
      window.tasks.setFilters({ status: e.target.value });
    });

    // Expense Filters
    document.getElementById('expense-period-filter')?.addEventListener('change', (e) => {
      window.expenses.setPeriodFilter(e.target.value);
    });
    document.getElementById('expense-category-filter')?.addEventListener('change', (e) => {
      window.expenses.setFilters({ category: e.target.value });
    });
    document.getElementById('expense-search-input')?.addEventListener('input', (e) => {
      window.expenses.setFilters({ search: e.target.value });
    });

    // Data Export & Backup Actions
    document.getElementById('export-json-btn')?.addEventListener('click', () => this.downloadJSON());
    document.getElementById('export-csv-btn')?.addEventListener('click', () => this.downloadCSV());
    document.getElementById('import-json-input')?.addEventListener('change', (e) => this.handleFileImport(e));
    document.getElementById('print-report-btn')?.addEventListener('click', () => window.print());
    document.getElementById('reset-demo-btn')?.addEventListener('click', () => this.resetToDemoData());
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update active nav button
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });

    // Update active tab pane
    document.querySelectorAll('.tab-content').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });

    // Update page title & subtitle
    const titleMap = {
      dashboard: { title: 'Dashboard Overview', sub: 'Daily Routine, Habits & Expense Analytics' },
      routines: { title: 'Daily Routine & Tasks', sub: 'Schedule time blocks, track habits and complete daily goals' },
      expenses: { title: 'Cost & Expense Tracker', sub: 'Manage task-linked spending, general expenses and incomes' },
      analytics: { title: 'Insights & Reports', sub: 'Deep dive into spending patterns and task efficiency' },
      settings: { title: 'Settings & Data Backup', sub: 'Configure currency, themes, import/export backups' }
    };

    if (titleMap[tabId]) {
      const pageTitleEl = document.getElementById('page-title-text');
      const pageSubEl = document.getElementById('page-subtitle-text');
      if (pageTitleEl) pageTitleEl.textContent = titleMap[tabId].title;
      if (pageSubEl) pageSubEl.textContent = titleMap[tabId].sub;
    }

    // Refresh components when tab is switched
    this.updateSummaryMetrics();
    if (tabId === 'routines' && window.tasks) window.tasks.render();
    if (tabId === 'expenses' && window.expenses) window.expenses.render();
    if ((tabId === 'analytics' || tabId === 'dashboard') && window.charts) {
      setTimeout(() => window.charts.renderAll(), 150);
    }
    if (tabId === 'settings' && window.auth) {
      window.auth.updateSettingsProfileCard();
    }
  }

  setDate(dateStr) {
    if (!dateStr) return;
    this.currentDate = dateStr;
    const dateInput = document.getElementById('global-date-picker');
    if (dateInput) dateInput.value = dateStr;

    if (window.tasks) window.tasks.setDate(dateStr);
    if (window.expenses) window.expenses.setDate(dateStr);
    this.updateSummaryMetrics();
    if (window.charts) window.charts.renderAll();
  }

  shiftDate(deltaDays) {
    const current = new Date(this.currentDate);
    current.setDate(current.getDate() + deltaDays);
    this.setDate(current.toISOString().split('T')[0]);
  }

  goToToday() {
    this.setDate(new Date().toISOString().split('T')[0]);
  }

  updateSummaryMetrics() {
    const summary = window.storage.getDaySummary(this.currentDate);
    const monthSummary = window.storage.getMonthSummary(this.currentDate.substring(0, 7));
    const allIncomes = window.storage.getIncomes();
    const allExpenses = window.storage.getExpenses();
    const totalAllIncomes = allIncomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const totalAllExpenses = allExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const netOverallBalance = totalAllIncomes - totalAllExpenses;

    const streaks = window.storage.getStreakCount();
    const currency = window.storage.getCurrencySymbol();

    // Summary Card 1: Today's Expense
    const expenseValEl = document.getElementById('stat-today-expense');
    const expenseSubEl = document.getElementById('stat-routine-vs-standalone');
    if (expenseValEl) {
      expenseValEl.textContent = `${currency}${summary.totalExpense.toLocaleString()}`;
    }
    if (expenseSubEl) {
      expenseSubEl.textContent = `Routine: ${currency}${summary.routineExpense} | Misc: ${currency}${summary.standaloneExpense}`;
    }

    // Summary Card 2: Total Added Expenses (Pure All-Time Sum without subtracting income)
    const allExpenseValEl = document.getElementById('stat-total-all-expense');
    const allExpenseSubEl = document.getElementById('stat-total-all-expense-sub');
    if (allExpenseValEl) {
      allExpenseValEl.textContent = `${currency}${totalAllExpenses.toLocaleString()}`;
    }
    if (allExpenseSubEl) {
      allExpenseSubEl.textContent = `${allExpenses.length} records • All-time total`;
    }

    // Summary Card 3: Total Incomes Received
    const incomeValEl = document.getElementById('stat-total-income');
    const incomeSubEl = document.getElementById('stat-income-count');
    if (incomeValEl) {
      incomeValEl.textContent = `${currency}${totalAllIncomes.toLocaleString()}`;
    }
    if (incomeSubEl) {
      incomeSubEl.textContent = `${allIncomes.length} total income records`;
    }

    // Summary Card 4: Net Balance (Incomes - Total Costs)
    const balanceValEl = document.getElementById('stat-net-balance');
    const balanceSubEl = document.getElementById('stat-net-balance-sub');
    if (balanceValEl) {
      balanceValEl.textContent = `${netOverallBalance >= 0 ? '+' : ''}${currency}${netOverallBalance.toLocaleString()}`;
      balanceValEl.style.color = netOverallBalance >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    if (balanceSubEl) {
      balanceSubEl.textContent = `Total Income: ${currency}${totalAllIncomes.toLocaleString()} | Spent: ${currency}${totalAllExpenses.toLocaleString()}`;
    }

    // Summary Card 5: Tasks Completed
    const tasksValEl = document.getElementById('stat-tasks-completed');
    const tasksSubEl = document.getElementById('stat-tasks-rate');
    if (tasksValEl) {
      tasksValEl.textContent = `${summary.completedTasks} / ${summary.totalTasks}`;
    }
    if (tasksSubEl) {
      tasksSubEl.textContent = `${summary.completionRate}% completion rate today`;
    }

    // Summary Card 6: Family Support & Pocket Money
    const isFamilyOrPocketMoney = (inc) => {
      const cat = (inc.category || '').toLowerCase();
      const text = `${inc.title || ''} ${inc.notes || ''}`.toLowerCase();
      if (cat.includes('family') || cat.includes('pocket') || cat.includes('support') || cat.includes('allowance')) {
        return true;
      }
      if (/anna|appa|amma|family|pocket|allowance|home|father|mother|bro|sister|gift/i.test(text)) {
        return true;
      }
      if (!/salary|freelanc|invest|bonus|client|business/i.test(cat) && !/salary|client|project|dividend/i.test(text)) {
        return true;
      }
      return false;
    };

    const pocketIncomes = allIncomes.filter(isFamilyOrPocketMoney);
    const totalPocketMoney = pocketIncomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

    const pocketValEl = document.getElementById('stat-pocket-money');
    const pocketSubEl = document.getElementById('stat-pocket-money-sub');
    if (pocketValEl) {
      pocketValEl.textContent = `${currency}${totalPocketMoney.toLocaleString()}`;
    }
    if (pocketSubEl) {
      pocketSubEl.textContent = `${pocketIncomes.length} family & pocket entries`;
    }

    // Monthly Dashboard Sidebar Box
    const monthSpentEl = document.getElementById('dash-month-spent');
    const monthIncomeEl = document.getElementById('dash-month-income');
    if (monthSpentEl) monthSpentEl.textContent = `${currency}${monthSummary.totalExpense.toLocaleString()}`;
    if (monthIncomeEl) monthIncomeEl.textContent = `${currency}${monthSummary.totalIncome.toLocaleString()}`;

    // Sidebar quick widget
    const sbTasksEl = document.getElementById('sb-today-tasks');
    const sbSpentEl = document.getElementById('sb-today-spent');
    const sbTotalAddedEl = document.getElementById('sb-total-added-expense');
    const sbNetEl = document.getElementById('sb-net-balance');
    const sbStreakEl = document.getElementById('sb-today-streak');
    if (sbTasksEl) sbTasksEl.textContent = `${summary.completedTasks}/${summary.totalTasks}`;
    if (sbSpentEl) sbSpentEl.textContent = `${currency}${summary.totalExpense.toLocaleString()}`;
    if (sbTotalAddedEl) sbTotalAddedEl.textContent = `${currency}${totalAllExpenses.toLocaleString()}`;
    if (sbNetEl) {
      sbNetEl.textContent = `${netOverallBalance >= 0 ? '+' : ''}${currency}${netOverallBalance.toLocaleString()}`;
      sbNetEl.style.color = netOverallBalance >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    if (sbStreakEl) sbStreakEl.textContent = `${streaks.currentStreak}d 🔥`;

    // Routine list badge count in sidebar
    const taskNavBadge = document.getElementById('nav-task-badge');
    if (taskNavBadge) {
      const pendingCount = summary.totalTasks - summary.completedTasks;
      taskNavBadge.textContent = pendingCount > 0 ? pendingCount : '✓';
      taskNavBadge.style.background = pendingCount > 0 ? 'var(--primary)' : 'var(--success)';
    }

    // Update Dashboard Individual Cost Summary
    if (window.expenses && typeof window.expenses.renderDashboardPersonSummary === 'function') {
      window.expenses.renderDashboardPersonSummary();
    }
  }

  // ── Stat Details Modal & Interactive Dashboard Shortcuts ───────────
  openStatDetails(type = 'total_expenses') {
    this.activeStatType = type;
    const searchInput = document.getElementById('stat-modal-search');
    if (searchInput) searchInput.value = '';

    this.renderStatDetailsModal(type, '');

    const modal = document.getElementById('stat-details-modal');
    if (modal) modal.classList.add('active');
  }

  closeStatDetailsModal() {
    const modal = document.getElementById('stat-details-modal');
    if (modal) modal.classList.remove('active');
  }

  filterStatDetailsList(query) {
    this.renderStatDetailsModal(this.activeStatType || 'total_expenses', query);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  renderStatDetailsModal(type, query = '') {
    const titleEl = document.getElementById('stat-modal-title');
    const badgeEl = document.getElementById('stat-modal-badge');
    const iconWrapEl = document.getElementById('stat-modal-icon-wrap');
    const heroValEl = document.getElementById('stat-modal-hero-val');
    const heroBreakdownEl = document.getElementById('stat-modal-hero-breakdown');
    const listEl = document.getElementById('stat-modal-list');
    const quickActionBtn = document.getElementById('stat-modal-quick-action');
    const quickActionText = document.getElementById('stat-modal-quick-action-text');
    const jumpBtn = document.getElementById('stat-modal-jump-btn');
    const jumpText = document.getElementById('stat-modal-jump-text');

    if (!listEl) return;

    const currency = window.storage.getCurrencySymbol();
    const q = (query || '').trim().toLowerCase();

    if (type === 'total_expenses') {
      const allExpenses = window.storage.getExpenses() || [];
      const totalAllExpenses = allExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

      if (titleEl) titleEl.textContent = 'Total Added Expenses Details';
      if (badgeEl) badgeEl.textContent = `${allExpenses.length} records • All-time total expenses`;
      if (iconWrapEl) {
        iconWrapEl.style.background = 'rgba(239, 68, 68, 0.12)';
        iconWrapEl.style.color = '#ef4444';
        iconWrapEl.innerHTML = '<i class="fa-solid fa-wallet"></i>';
      }
      if (heroValEl) {
        heroValEl.style.color = '#ef4444';
        heroValEl.textContent = `${currency}${totalAllExpenses.toLocaleString()}`;
      }

      // Top Category breakdown chips
      if (heroBreakdownEl) {
        const catMap = {};
        allExpenses.forEach(e => {
          const cat = e.category || 'General';
          catMap[cat] = (catMap[cat] || 0) + (parseFloat(e.amount) || 0);
        });
        const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
        heroBreakdownEl.innerHTML = topCats.map(([cat, amt]) => `
          <span style="background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 99px; padding: 3px 9px; font-size: 0.73rem; font-weight: 600;">
            ${this.escapeHtml(cat)}: ${currency}${amt.toLocaleString()}
          </span>
        `).join('');
      }

      if (quickActionBtn && quickActionText) {
        quickActionText.textContent = 'Log New Expense';
        quickActionBtn.onclick = () => {
          this.closeStatDetailsModal();
          if (window.expenses) window.expenses.openAddModal();
        };
      }
      if (jumpBtn && jumpText) {
        jumpText.textContent = 'Open Full Expenses Page';
        jumpBtn.onclick = () => {
          this.closeStatDetailsModal();
          this.switchTab('expenses');
        };
      }

      // Filtered list
      let filtered = allExpenses.filter(e => {
        if (!q) return true;
        return (
          (e.title && e.title.toLowerCase().includes(q)) ||
          (e.category && e.category.toLowerCase().includes(q)) ||
          (e.paymentMethod && e.paymentMethod.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          (e.date && e.date.toLowerCase().includes(q)) ||
          String(e.amount).includes(q)
        );
      });

      // Sort by date descending
      filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 2.2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
            <i class="fa-solid fa-receipt" style="font-size: 1.8rem; margin-bottom: 8px; opacity: 0.4; display: block;"></i>
            No expenses found matching "${this.escapeHtml(query)}".
          </div>
        `;
      } else {
        listEl.innerHTML = filtered.map(exp => `
          <div class="stat-modal-item">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
              <div style="width: 34px; height: 34px; border-radius: 9px; background: rgba(239, 68, 68, 0.12); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;">
                <i class="fa-solid fa-receipt"></i>
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${this.escapeHtml(exp.title || 'Untitled Expense')}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 2px;">
                  <span><i class="fa-regular fa-calendar" style="font-size: 0.68rem;"></i> ${exp.date || ''}</span>
                  <span class="badge" style="font-size: 0.68rem; padding: 1px 7px; border-radius: 99px; background: rgba(99, 102, 241, 0.1); color: var(--primary); font-weight: 600;">
                    ${this.escapeHtml(exp.category || 'General')}
                  </span>
                  ${exp.paymentMethod ? `<span style="font-size: 0.7rem; color: var(--text-secondary);"><i class="fa-regular fa-credit-card" style="font-size: 0.65rem;"></i> ${this.escapeHtml(exp.paymentMethod)}</span>` : ''}
                </div>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
              <div style="font-weight: 700; font-size: 0.96rem; color: #ef4444;">
                -${currency}${parseFloat(exp.amount || 0).toLocaleString()}
              </div>
              <button type="button" class="action-btn" style="padding: 2px 8px; font-size: 0.7rem; border-radius: 4px; margin-top: 3px; border: 1px solid var(--border-color); background: var(--bg-card); cursor: pointer;" onclick="window.app.closeStatDetailsModal(); window.app.switchTab('expenses'); if (window.expenses) window.expenses.openEditModal('${exp.id}');">
                Edit <i class="fa-solid fa-pen-to-square" style="font-size: 0.65rem;"></i>
              </button>
            </div>
          </div>
        `).join('');
      }

    } else if (type === 'today_expenses') {
      const summary = window.storage.getDaySummary(this.currentDate);
      const allExpenses = window.storage.getExpenses() || [];
      const todayExpenses = allExpenses.filter(e => e.date === this.currentDate);

      if (titleEl) titleEl.textContent = "Today's Total Spend Details";
      if (badgeEl) badgeEl.textContent = `${todayExpenses.length} records today (${this.currentDate})`;
      if (iconWrapEl) {
        iconWrapEl.style.background = 'rgba(239, 68, 68, 0.12)';
        iconWrapEl.style.color = '#ef4444';
        iconWrapEl.innerHTML = '<i class="fa-solid fa-receipt"></i>';
      }
      if (heroValEl) {
        heroValEl.style.color = '#ef4444';
        heroValEl.textContent = `${currency}${summary.totalExpense.toLocaleString()}`;
      }

      if (heroBreakdownEl) {
        heroBreakdownEl.innerHTML = `
          <span style="background: rgba(99, 102, 241, 0.1); color: var(--primary); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 99px; padding: 3px 9px; font-size: 0.73rem; font-weight: 600;">
            Routine: ${currency}${summary.routineExpense.toLocaleString()}
          </span>
          <span style="background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 99px; padding: 3px 9px; font-size: 0.73rem; font-weight: 600;">
            Misc: ${currency}${summary.standaloneExpense.toLocaleString()}
          </span>
        `;
      }

      if (quickActionBtn && quickActionText) {
        quickActionText.textContent = "Log Today's Expense";
        quickActionBtn.onclick = () => {
          this.closeStatDetailsModal();
          if (window.expenses) window.expenses.openAddModal();
        };
      }
      if (jumpBtn && jumpText) {
        jumpText.textContent = 'Open Full Expenses Page';
        jumpBtn.onclick = () => {
          this.closeStatDetailsModal();
          this.switchTab('expenses');
        };
      }

      let filtered = todayExpenses.filter(e => {
        if (!q) return true;
        return (
          (e.title && e.title.toLowerCase().includes(q)) ||
          (e.category && e.category.toLowerCase().includes(q)) ||
          (e.paymentMethod && e.paymentMethod.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          String(e.amount).includes(q)
        );
      });

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 2.2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
            <i class="fa-solid fa-calendar-day" style="font-size: 1.8rem; margin-bottom: 8px; opacity: 0.4; display: block;"></i>
            ${q ? `No expenses matching "${this.escapeHtml(query)}" today.` : 'No expenses logged for today yet.'}
          </div>
        `;
      } else {
        listEl.innerHTML = filtered.map(exp => `
          <div class="stat-modal-item">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
              <div style="width: 34px; height: 34px; border-radius: 9px; background: rgba(239, 68, 68, 0.12); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;">
                <i class="fa-solid fa-receipt"></i>
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${this.escapeHtml(exp.title || 'Untitled Expense')}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 2px;">
                  <span class="badge" style="font-size: 0.68rem; padding: 1px 7px; border-radius: 99px; background: rgba(99, 102, 241, 0.1); color: var(--primary); font-weight: 600;">
                    ${this.escapeHtml(exp.category || 'General')}
                  </span>
                  ${exp.paymentMethod ? `<span style="font-size: 0.7rem; color: var(--text-secondary);"><i class="fa-regular fa-credit-card" style="font-size: 0.65rem;"></i> ${this.escapeHtml(exp.paymentMethod)}</span>` : ''}
                </div>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
              <div style="font-weight: 700; font-size: 0.96rem; color: #ef4444;">
                -${currency}${parseFloat(exp.amount || 0).toLocaleString()}
              </div>
              <button type="button" class="action-btn" style="padding: 2px 8px; font-size: 0.7rem; border-radius: 4px; margin-top: 3px; border: 1px solid var(--border-color); background: var(--bg-card); cursor: pointer;" onclick="window.app.closeStatDetailsModal(); window.app.switchTab('expenses'); if (window.expenses) window.expenses.openEditModal('${exp.id}');">
                Edit <i class="fa-solid fa-pen-to-square" style="font-size: 0.65rem;"></i>
              </button>
            </div>
          </div>
        `).join('');
      }

    } else if (type === 'incomes') {
      const allIncomes = window.storage.getIncomes() || [];
      const totalAllIncomes = allIncomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

      if (titleEl) titleEl.textContent = 'Total Incomes Received Details';
      if (badgeEl) badgeEl.textContent = `${allIncomes.length} records • Total earned`;
      if (iconWrapEl) {
        iconWrapEl.style.background = 'rgba(16, 185, 129, 0.12)';
        iconWrapEl.style.color = 'var(--success)';
        iconWrapEl.innerHTML = '<i class="fa-solid fa-hand-holding-dollar"></i>';
      }
      if (heroValEl) {
        heroValEl.style.color = 'var(--success)';
        heroValEl.textContent = `${currency}${totalAllIncomes.toLocaleString()}`;
      }

      if (heroBreakdownEl) {
        const catMap = {};
        allIncomes.forEach(i => {
          const cat = i.category || i.source || 'General';
          catMap[cat] = (catMap[cat] || 0) + (parseFloat(i.amount) || 0);
        });
        const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
        heroBreakdownEl.innerHTML = topCats.map(([cat, amt]) => `
          <span style="background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 99px; padding: 3px 9px; font-size: 0.73rem; font-weight: 600;">
            ${this.escapeHtml(cat)}: ${currency}${amt.toLocaleString()}
          </span>
        `).join('');
      }

      if (quickActionBtn && quickActionText) {
        quickActionText.textContent = 'Add Income Entry';
        quickActionBtn.onclick = () => {
          this.closeStatDetailsModal();
          if (window.expenses) window.expenses.openIncomeModal();
        };
      }
      if (jumpBtn && jumpText) {
        jumpText.textContent = 'Open Expenses & Incomes';
        jumpBtn.onclick = () => {
          this.closeStatDetailsModal();
          this.switchTab('expenses');
        };
      }

      let filtered = allIncomes.filter(i => {
        if (!q) return true;
        return (
          (i.source && i.source.toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q)) ||
          (i.notes && i.notes.toLowerCase().includes(q)) ||
          (i.date && i.date.toLowerCase().includes(q)) ||
          String(i.amount).includes(q)
        );
      });

      filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 2.2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
            <i class="fa-solid fa-hand-holding-dollar" style="font-size: 1.8rem; margin-bottom: 8px; opacity: 0.4; display: block;"></i>
            ${q ? `No income records matching "${this.escapeHtml(query)}".` : 'No income records added yet.'}
          </div>
        `;
      } else {
        listEl.innerHTML = filtered.map(inc => `
          <div class="stat-modal-item">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
              <div style="width: 34px; height: 34px; border-radius: 9px; background: rgba(16, 185, 129, 0.12); color: var(--success); display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;">
                <i class="fa-solid fa-arrow-down"></i>
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${this.escapeHtml(inc.source || 'Income Entry')}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 2px;">
                  <span><i class="fa-regular fa-calendar" style="font-size: 0.68rem;"></i> ${inc.date || ''}</span>
                  <span class="badge" style="font-size: 0.68rem; padding: 1px 7px; border-radius: 99px; background: rgba(16, 185, 129, 0.1); color: var(--success); font-weight: 600;">
                    ${this.escapeHtml(inc.category || 'Income')}
                  </span>
                  ${inc.notes ? `<span style="font-size: 0.7rem; color: var(--text-secondary);">${this.escapeHtml(inc.notes)}</span>` : ''}
                </div>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
              <div style="font-weight: 700; font-size: 0.96rem; color: var(--success);">
                +${currency}${parseFloat(inc.amount || 0).toLocaleString()}
              </div>
            </div>
          </div>
        `).join('');
      }

    } else if (type === 'pocket_money') {
      const allIncomes = window.storage.getIncomes() || [];
      const isFamilyOrPocketMoney = (inc) => {
        const cat = (inc.category || '').toLowerCase();
        const text = `${inc.title || ''} ${inc.notes || ''}`.toLowerCase();
        if (cat.includes('family') || cat.includes('pocket') || cat.includes('support') || cat.includes('allowance')) {
          return true;
        }
        if (/anna|appa|amma|family|pocket|allowance|home|father|mother|bro|sister|gift/i.test(text)) {
          return true;
        }
        if (!/salary|freelanc|invest|bonus|client|business/i.test(cat) && !/salary|client|project|dividend/i.test(text)) {
          return true;
        }
        return false;
      };

      const pocketIncomes = allIncomes.filter(isFamilyOrPocketMoney);
      const totalPocketMoney = pocketIncomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

      if (titleEl) titleEl.textContent = 'Family Support & Pocket Money Details';
      if (badgeEl) badgeEl.textContent = `${pocketIncomes.length} records • Family & Pocket Money`;
      if (iconWrapEl) {
        iconWrapEl.style.background = 'rgba(139, 92, 246, 0.12)';
        iconWrapEl.style.color = '#8b5cf6';
        iconWrapEl.innerHTML = '<i class="fa-solid fa-hand-holding-heart"></i>';
      }
      if (heroValEl) {
        heroValEl.style.color = '#8b5cf6';
        heroValEl.textContent = `${currency}${totalPocketMoney.toLocaleString()}`;
      }

      if (heroBreakdownEl) {
        const sourceMap = {};
        pocketIncomes.forEach(i => {
          let src = i.title || i.source || i.category || 'Family';
          sourceMap[src] = (sourceMap[src] || 0) + (parseFloat(i.amount) || 0);
        });
        const topSources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
        heroBreakdownEl.innerHTML = topSources.map(([src, amt]) => `
          <span style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 99px; padding: 3px 9px; font-size: 0.73rem; font-weight: 600;">
            ${this.escapeHtml(src)}: ${currency}${amt.toLocaleString()}
          </span>
        `).join('');
      }

      if (quickActionBtn && quickActionText) {
        quickActionText.textContent = 'Add Pocket Money / Support';
        quickActionBtn.onclick = () => {
          this.closeStatDetailsModal();
          if (window.expenses) window.expenses.openIncomeModal();
        };
      }
      if (jumpBtn && jumpText) {
        jumpText.textContent = 'Open Expenses & Incomes';
        jumpBtn.onclick = () => {
          this.closeStatDetailsModal();
          this.switchTab('expenses');
        };
      }

      const filtered = pocketIncomes.filter(i => {
        if (!q) return true;
        const searchStr = `${i.title || ''} ${i.notes || ''} ${i.category || ''} ${i.date || ''} ${i.amount || ''}`.toLowerCase();
        return searchStr.includes(q);
      });

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
            <i class="fa-solid fa-hand-holding-heart" style="font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem; display: block;"></i>
            <div style="font-size: 0.9rem; font-weight: 600;">No pocket money entries found</div>
            <div style="font-size: 0.75rem; margin-top: 4px;">Click "Add Pocket Money" to record support from family.</div>
          </div>
        `;
      } else {
        listEl.innerHTML = filtered.map(i => `
          <div class="stat-detail-item" style="border-left: 3px solid #8b5cf6;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary); margin-bottom: 2px;">
                ${this.escapeHtml(i.title || 'Pocket Money')}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 8px; flex-wrap: wrap;">
                <span><i class="fa-regular fa-calendar"></i> ${i.date || 'No date'}</span>
                <span><i class="fa-solid fa-tag"></i> ${this.escapeHtml(i.category || 'Family Support')}</span>
                ${i.notes ? `<span><i class="fa-regular fa-comment"></i> ${this.escapeHtml(i.notes)}</span>` : ''}
              </div>
            </div>
            <div style="font-weight: 800; font-size: 1.05rem; color: #8b5cf6; white-space: nowrap;">
              +${currency}${parseFloat(i.amount).toLocaleString()}
            </div>
          </div>
        `).join('');
      }

    } else if (type === 'net_balance') {
      const allIncomes = window.storage.getIncomes() || [];
      const allExpenses = window.storage.getExpenses() || [];
      const totalAllIncomes = allIncomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
      const totalAllExpenses = allExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      const netOverallBalance = totalAllIncomes - totalAllExpenses;

      if (titleEl) titleEl.textContent = 'Net Balance Breakdown';
      if (badgeEl) badgeEl.textContent = `Total Income vs Pure All-Time Spend`;
      if (iconWrapEl) {
        iconWrapEl.style.background = 'rgba(245, 158, 11, 0.12)';
        iconWrapEl.style.color = 'var(--warning)';
        iconWrapEl.innerHTML = '<i class="fa-solid fa-scale-balanced"></i>';
      }
      if (heroValEl) {
        heroValEl.style.color = netOverallBalance >= 0 ? 'var(--success)' : '#ef4444';
        heroValEl.textContent = `${netOverallBalance >= 0 ? '+' : ''}${currency}${netOverallBalance.toLocaleString()}`;
      }

      if (heroBreakdownEl) {
        heroBreakdownEl.innerHTML = `
          <span style="background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 99px; padding: 3px 9px; font-size: 0.73rem; font-weight: 600;">
            Income: +${currency}${totalAllIncomes.toLocaleString()}
          </span>
          <span style="background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 99px; padding: 3px 9px; font-size: 0.73rem; font-weight: 600;">
            Spent: -${currency}${totalAllExpenses.toLocaleString()}
          </span>
        `;
      }

      if (quickActionBtn && quickActionText) {
        quickActionText.textContent = 'Log New Expense';
        quickActionBtn.onclick = () => {
          this.closeStatDetailsModal();
          if (window.expenses) window.expenses.openAddModal();
        };
      }
      if (jumpBtn && jumpText) {
        jumpText.textContent = 'View Full Analytics';
        jumpBtn.onclick = () => {
          this.closeStatDetailsModal();
          this.switchTab('analytics');
        };
      }

      const combined = [
        ...allIncomes.map(i => ({ ...i, streamType: 'income' })),
        ...allExpenses.map(e => ({ ...e, streamType: 'expense' }))
      ];

      let filtered = combined.filter(item => {
        if (!q) return true;
        const name = item.title || item.source || '';
        return (
          name.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.date && item.date.toLowerCase().includes(q)) ||
          String(item.amount).includes(q)
        );
      });

      filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 2.2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
            <i class="fa-solid fa-scale-balanced" style="font-size: 1.8rem; margin-bottom: 8px; opacity: 0.4; display: block;"></i>
            No financial transactions found.
          </div>
        `;
      } else {
        listEl.innerHTML = filtered.slice(0, 100).map(item => {
          const isIncome = item.streamType === 'income';
          return `
            <div class="stat-modal-item">
              <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                <div style="width: 34px; height: 34px; border-radius: 9px; background: ${isIncome ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}; color: ${isIncome ? 'var(--success)' : '#ef4444'}; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;">
                  <i class="fa-solid ${isIncome ? 'fa-arrow-down' : 'fa-receipt'}"></i>
                </div>
                <div style="min-width: 0; flex: 1;">
                  <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${this.escapeHtml(item.title || item.source || 'Transaction')}
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 2px;">
                    <span><i class="fa-regular fa-calendar" style="font-size: 0.68rem;"></i> ${item.date || ''}</span>
                    <span class="badge" style="font-size: 0.68rem; padding: 1px 7px; border-radius: 99px; background: ${isIncome ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)'}; color: ${isIncome ? 'var(--success)' : 'var(--primary)'}; font-weight: 600;">
                      ${this.escapeHtml(item.category || (isIncome ? 'Income' : 'Expense'))}
                    </span>
                  </div>
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
                <div style="font-weight: 700; font-size: 0.96rem; color: ${isIncome ? 'var(--success)' : '#ef4444'};">
                  ${isIncome ? '+' : '-'}${currency}${parseFloat(item.amount || 0).toLocaleString()}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

    } else if (type === 'tasks') {
      const summary = window.storage.getDaySummary(this.currentDate);
      const tasks = window.storage.getTasksByDate(this.currentDate) || [];
      const streak = window.storage.getStreakCount();

      if (titleEl) titleEl.textContent = 'Daily Tasks & Routines Details';
      if (badgeEl) badgeEl.textContent = `${summary.completionRate}% completion rate for ${this.currentDate}`;
      if (iconWrapEl) {
        iconWrapEl.style.background = 'rgba(16, 185, 129, 0.12)';
        iconWrapEl.style.color = 'var(--success)';
        iconWrapEl.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      }
      if (heroValEl) {
        heroValEl.style.color = 'var(--success)';
        heroValEl.textContent = `${summary.completedTasks} / ${summary.totalTasks} Completed`;
      }

      if (heroBreakdownEl) {
        heroBreakdownEl.innerHTML = `
          <span style="background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 99px; padding: 3px 9px; font-size: 0.73rem; font-weight: 600;">
            Done: ${summary.completedTasks}
          </span>
          <span style="background: rgba(245, 158, 11, 0.1); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 99px; padding: 3px 9px; font-size: 0.73rem; font-weight: 600;">
            Pending: ${summary.totalTasks - summary.completedTasks}
          </span>
          <span style="background: rgba(99, 102, 241, 0.1); color: var(--primary); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 99px; padding: 3px 9px; font-size: 0.73rem; font-weight: 600;">
            Streak: ${streak.currentStreak}d 🔥
          </span>
        `;
      }

      if (quickActionBtn && quickActionText) {
        quickActionText.textContent = 'Add Daily Task';
        quickActionBtn.onclick = () => {
          this.closeStatDetailsModal();
          if (window.tasks) window.tasks.openAddModal();
        };
      }
      if (jumpBtn && jumpText) {
        jumpText.textContent = 'Open Daily Routine Planner';
        jumpBtn.onclick = () => {
          this.closeStatDetailsModal();
          this.switchTab('routines');
        };
      }

      let filtered = tasks.filter(t => {
        if (!q) return true;
        return (
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.timeBlock && t.timeBlock.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q))
        );
      });

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 2.2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
            <i class="fa-solid fa-list-check" style="font-size: 1.8rem; margin-bottom: 8px; opacity: 0.4; display: block;"></i>
            ${q ? `No tasks matching "${this.escapeHtml(query)}" today.` : 'No tasks scheduled for today.'}
          </div>
        `;
      } else {
        listEl.innerHTML = filtered.map(task => `
          <div class="stat-modal-item">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
              <div style="width: 34px; height: 34px; border-radius: 9px; background: ${task.completed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.12)'}; color: ${task.completed ? 'var(--success)' : 'var(--text-muted)'}; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;">
                <i class="fa-solid ${task.completed ? 'fa-check' : 'fa-hourglass-half'}"></i>
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary); text-decoration: ${task.completed ? 'line-through' : 'none'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${this.escapeHtml(task.title || 'Untitled Task')}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                  <span><i class="fa-regular fa-clock" style="font-size: 0.68rem;"></i> ${task.startTime || 'Anytime'} - ${task.endTime || ''}</span>
                  <span class="badge" style="font-size: 0.68rem; padding: 1px 7px; border-radius: 99px; background: rgba(99, 102, 241, 0.1); color: var(--primary); font-weight: 600;">
                    ${this.escapeHtml(task.timeBlock || 'General')}
                  </span>
                </div>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
              <span class="badge" style="font-size: 0.72rem; padding: 3px 8px; font-weight: 700; border-radius: 99px; background: ${task.completed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)'}; color: ${task.completed ? 'var(--success)' : 'var(--warning)'};">
                ${task.completed ? 'Done' : 'Pending'}
              </span>
            </div>
          </div>
        `).join('');
      }
    }
  }


  loadBudgetSettingsToForm() {
    const settings = window.storage.getSettings();
    const dailyInput = document.getElementById('input-daily-budget');
    if (dailyInput) dailyInput.value = settings.dailyBudget || 1500;
    const monthlyInput = document.getElementById('input-monthly-budget');
    if (monthlyInput) monthlyInput.value = settings.monthlyBudget || 40000;
    
    if (settings.categoryBudgets) {
      Object.entries(settings.categoryBudgets).forEach(([cat, val]) => {
        const input = document.getElementById(`cat-budget-${cat.replace(/[^a-zA-Z0-9]/g, '_')}`);
        if (input) input.value = val;
      });
    }
  }

  saveBudgetSettings(formData) {
    const settings = window.storage.getSettings();
    settings.dailyBudget = parseFloat(formData.get('dailyBudget')) || 1500;
    settings.monthlyBudget = parseFloat(formData.get('monthlyBudget')) || 40000;

    const categoryBudgets = {};
    Object.keys(settings.categoryBudgets || {}).forEach(cat => {
      const key = `cat_${cat.replace(/[^a-zA-Z0-9]/g, '_')}`;
      categoryBudgets[cat] = parseFloat(formData.get(key)) || 0;
    });
    settings.categoryBudgets = categoryBudgets;

    window.storage.updateSettings(settings);
    this.showToast('Budget preferences saved successfully!', 'success');
    this.updateSummaryMetrics();
    if (window.expenses) window.expenses.render();
    if (window.charts) window.charts.renderAll();
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    window.storage.updateSettings({ theme: next });
  }

  applyTheme(theme) {
    if (document.documentElement) {
      document.documentElement.setAttribute('data-theme', theme);
    }
    const themeBtnIcon = document.querySelector('#theme-toggle-btn i');
    if (themeBtnIcon) {
      themeBtnIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
    if (window.charts) {
      setTimeout(() => window.charts.renderAll(), 100);
    }
  }

  setCurrency(symbol) {
    window.storage.updateSettings({ currency: symbol });
    this.applyCurrency(symbol);
    this.updateSummaryMetrics();
    if (window.tasks) window.tasks.render();
    if (window.expenses) window.expenses.render();
    if (window.charts) window.charts.renderAll();
    this.showToast(`Currency set to ${symbol}`, 'info');
  }

  applyCurrency(symbol) {
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) currencySelect.value = symbol;
    document.querySelectorAll('.currency-symbol-label').forEach(el => {
      el.textContent = symbol;
    });
  }

  downloadJSON() {
    const dataStr = window.storage.exportAllDataJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-routine-cost-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1200);
    this.showToast('Backup JSON exported successfully!', 'success');
  }

  downloadPDFReport(period) {
    const p = period || document.getElementById('export-period-select')?.value || 'all';
    if (window.reports) window.reports.downloadPDF(p);
  }

  downloadExcelReport(period) {
    const p = period || document.getElementById('export-period-select')?.value || 'all';
    if (window.reports) window.reports.downloadExcel(p);
  }

  downloadWordDocReport(period) {
    const p = period || document.getElementById('export-period-select')?.value || 'all';
    if (window.reports) window.reports.downloadWord(p);
  }

  downloadTextSummary(period) {
    const p = period || document.getElementById('export-period-select')?.value || 'all';
    if (window.reports) window.reports.downloadText(p);
  }

  downloadCSV(period) {
    const p = period || document.getElementById('export-period-select')?.value || 'all';
    if (window.reports) {
      window.reports.downloadCSV(p);
    } else {
      const csvStr = window.storage.exportExpensesCSV();
      const blob = new Blob([csvStr], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Expenses CSV exported successfully!', 'success');
    }
  }

  handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const res = window.storage.importAllDataJSON(evt.target.result);
      if (res.success) {
        this.showToast('Data restored successfully!', 'success');
        setTimeout(() => location.reload(), 600);
      } else {
        alert('Failed to import backup: ' + res.error);
      }
    };
    reader.readAsText(file);
  }

  resetToDemoData() {
    if (confirm('Reset all tasks and expenses to sample routine data? (Custom data will be overwritten)')) {
      localStorage.clear();
      location.reload();
    }
  }

  // Dashboard Background Theme Customizer
  toggleDashboardBgPicker() {
    const menu = document.getElementById('dash-bg-picker-menu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    }
  }

  setDashboardBackground(bgId) {
    const wrapper = document.querySelector('.main-wrapper') || document.body;
    if (wrapper && typeof wrapper.setAttribute === 'function') {
      wrapper.setAttribute('data-dash-bg', bgId);
      localStorage.setItem('spendorio_dash_bg', bgId);
    }
    document.querySelectorAll('.dash-bg-opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bg === bgId);
    });
    const menu = document.getElementById('dash-bg-picker-menu');
    if (menu) menu.style.display = 'none';
  }

  initDashboardBackground() {
    const saved = localStorage.getItem('spendorio_dash_bg') || localStorage.getItem('spendora_dash_bg') || 'dots-aurora';
    this.setDashboardBackground(saved);

    document.addEventListener('click', (e) => {
      const wrap = document.querySelector('.dash-bg-picker-container');
      const menu = document.getElementById('dash-bg-picker-menu');
      if (wrap && menu && !wrap.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: 'fa-solid fa-circle-check',
      warning: 'fa-solid fa-triangle-exclamation',
      danger: 'fa-solid fa-circle-xmark',
      info: 'fa-solid fa-circle-info'
    };

    toast.innerHTML = `
      <i class="${icons[type] || icons.info}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (typeof toast.remove === 'function') {
          toast.remove();
        } else if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Expose on window
window.Application = Application;

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new Application();
});
