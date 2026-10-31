/**
 * expenses.js - Cost & Expense Management Module
 * Includes Compulsory Notes Validation & Simultaneous Individual Cost Monitor (Amma, Appa, Friend, etc.)
 */

class ExpenseManager {
  constructor() {
    this.currentDate = new Date().toISOString().split('T')[0];
    this.periodFilter = 'today'; // 'today', 'month', 'all'
    this.categoryFilter = 'all';
    this.searchQuery = '';
    this.personPeriod = 'all'; // 'all', 'month', 'today'
    this.selectedPersonFilter = null; // null or person name string
  }

  setDate(dateStr) {
    this.currentDate = dateStr;
    this.render();
  }

  setPeriodFilter(period) {
    this.periodFilter = period;
    this.render();
  }

  setFilters({ search, category }) {
    if (search !== undefined) this.searchQuery = search.toLowerCase();
    if (category !== undefined) this.categoryFilter = category;
    this.render();
  }

  setPersonPeriod(period, btnEl) {
    this.personPeriod = period;
    if (btnEl && btnEl.parentElement) {
      const btns = btnEl.parentElement.querySelectorAll('.person-period-btn');
      btns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'var(--bg-surface)';
        b.style.color = 'var(--text-secondary)';
      });
      btnEl.classList.add('active');
      btnEl.style.background = 'var(--primary)';
      btnEl.style.color = '#fff';
    }
    this.renderPersonCostPanel();
    this.renderPocketGiverPanel();
  }

  // ── Person Name Extraction & Mapping ──────────────────────────────
  // Dictionary of known relations, personas, and nicknames
  getKnownPersonConfig() {
    return [
      { keys: ['amma', 'mom', 'mother'], label: 'Amma', emoji: '👩', color: '#ec4899' },
      { keys: ['appa', 'dad', 'father'], label: 'Appa', emoji: '👨', color: '#3b82f6' },
      { keys: ['anna', 'brother', 'bro'], label: 'Anna', emoji: '🧑', color: '#f59e0b' },
      { keys: ['akka', 'sister', 'sis'], label: 'Akka', emoji: '👩', color: '#ec4899' },
      { keys: ['dharshini', 'dharsh'], label: 'Dharshini', emoji: '👧', color: '#8b5cf6' },
      { keys: ['friend', 'friends', 'nanban', 'natpu', 'roommate', 'buddy'], label: 'Friend', emoji: '🤝', color: '#10b981' },
      { keys: ['myself', 'self', 'personal', 'me', 'my', 'mine'], label: 'Myself', emoji: '🙋', color: '#0ea5e9' },
      { keys: ['raj'], label: 'Raj', emoji: '👨', color: '#6366f1' },
      { keys: ['thambi'], label: 'Thambi', emoji: '👦', color: '#14b8a6' },
      { keys: ['thangachi', 'thangai'], label: 'Thangachi', emoji: '👧', color: '#f43f5e' }
    ];
  }

  getStopWords() {
    return new Set([
      'cost','bill','recharge','food','dinner','lunch','snacks','egg','tea','juice','coffee',
      'hotel','hostel','rent','room','bus','auto','train','metro','cab','travel','ticket',
      'petrol','fuel','diesel','soap','paste','shampoo','cloth','dress','shirt','pant',
      'tshirt','innerwear','tablet','medicine','doctor','hospital','clinic','fees','fee',
      'tuition','course','college','school','exam','books','loan','emi','grameen','besant',
      'advance','deposit','electric','power','water','cable','wifi','internet','pack','plan',
      'sim','mobile','phone','gpay','phonepe','paytm','cash','card','bank','atm','rupees',
      'rs','inr','spent','paid','gave','given','bought','buy','purchase','item','items',
      'today','yesterday','morning','afternoon','evening','night','day','days','month',
      'months','year','years','daily','weekly','monthly','routine','task','total','amount',
      'amt','partial','full','first','second','one','two','three','four','five','pcs',
      'kg','gram','gm','ml','liter','litres','piece','pieces','packet','visit','go','come',
      'home','pg','city','electronic','hair','cut','saloon','haircut','pizza','biryani',
      'briyani','noodles','rice','curd','milk','vegetables','fruits','grocery','groceries',
      'supermarket','shop','store','market','work','office','company','interview','class',
      'practice','study','notes','remarks','extra','other','etc','none','na','nil','ok',
      'yes','no','good','bad','new','old','for','from','with','and','the','this','that',
      'these','those','his','her','their','our','all','some','any','not','use','used',
      'send','sent','receive','received','give','take','taken','took','put','bring','brought',
      'vest','dollor','liquid','instalment','com','commute'
    ]);
  }

  // Extract detected persons from notes (and fallback to title)
  extractPersons(notesText, titleText = '') {
    const combined = ((notesText || '') + ' ' + (titleText || '')).toLowerCase();
    const matched = new Set();
    const result = [];
    const known = this.getKnownPersonConfig();
    const stopWords = this.getStopWords();

    // 1. Check known family / relation keywords
    for (const p of known) {
      for (const k of p.keys) {
        const regex = new RegExp('\\b' + k + '\\b', 'i');
        if (regex.test(combined)) {
          if (!matched.has(p.label)) {
            matched.add(p.label);
            result.push({ name: p.label, emoji: p.emoji, color: p.color });
          }
          break;
        }
      }
    }

    // 2. Check pattern: "for <name>", "to <name>", "@<name>", "#<name>"
    const patternMatches = combined.match(/(?:for|to|@|#)\s*([a-z]{3,})/g) || [];
    patternMatches.forEach(m => {
      const clean = m.replace(/(?:for|to|@|#)\s*/, '').trim();
      if (!stopWords.has(clean)) {
        let isKnown = false;
        for (const p of known) {
          if (p.keys.includes(clean)) { isKnown = true; break; }
        }
        if (!isKnown) {
          const cap = clean.charAt(0).toUpperCase() + clean.slice(1);
          if (!matched.has(cap)) {
            matched.add(cap);
            result.push({ name: cap, emoji: '👤', color: '#8b5cf6' });
          }
        }
      }
    });

    return result;
  }

  // Build aggregated map of person spending for the selected period
  buildPersonCostMap(period = this.personPeriod) {
    let allExpenses = window.storage.getExpenses();
    const currentMonth = this.currentDate.substring(0, 7);

    if (period === 'today') {
      allExpenses = allExpenses.filter(e => e.date === this.currentDate);
    } else if (period === 'month') {
      allExpenses = allExpenses.filter(e => e.date && e.date.startsWith(currentMonth));
    }

    const map = {};
    allExpenses.forEach(exp => {
      const persons = this.extractPersons(exp.notes, exp.title);
      const amount = parseFloat(exp.amount) || 0;
      persons.forEach(p => {
        if (!map[p.name]) {
          map[p.name] = {
            name: p.name,
            emoji: p.emoji,
            color: p.color,
            total: 0,
            count: 0,
            items: []
          };
        }
        map[p.name].total += amount;
        map[p.name].count += 1;
        map[p.name].items.push({
          id: exp.id,
          title: exp.title,
          amount: amount,
          date: exp.date,
          notes: exp.notes
        });
      });
    });

    return map;
  }

  // Quick 1-tap chip insertion into Notes textarea
  insertPersonTag(name) {
    const textarea = document.getElementById('expense-notes');
    if (!textarea) return;

    const currentVal = textarea.value.trim();
    if (!currentVal) {
      textarea.value = `${name} `;
    } else if (!new RegExp('\\b' + name + '\\b', 'i').test(currentVal)) {
      textarea.value = `${currentVal}, ${name} `;
    }
    textarea.focus();
    this.previewPersonTags(textarea.value);
  }

  // Live preview badge under Notes textarea in Expense modal
  previewPersonTags(notesValue) {
    const preview = document.getElementById('expense-person-preview');
    if (!preview) return;

    const trimmed = (notesValue || '').trim();
    if (!trimmed) {
      preview.innerHTML = `
        <span style="font-size:0.75rem; color:var(--danger); font-weight:600;">
          <i class="fa-solid fa-circle-exclamation"></i> Required: Enter remarks or tap a person chip above
        </span>`;
      return;
    }

    const persons = this.extractPersons(trimmed);
    if (persons.length === 0) {
      preview.innerHTML = `
        <span style="font-size:0.75rem; color:var(--text-muted);">
          <i class="fa-solid fa-circle-check" style="color:var(--success);"></i> Remarks entered. (Tip: Tap a chip above to link to Amma, Appa, Friend, etc.)
        </span>`;
      return;
    }

    preview.innerHTML = `
      <span style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">Tracking For:</span>
      ${persons.map(p => `
        <span class="badge" style="background:${p.color}20; color:${p.color}; border:1px solid ${p.color}50; border-radius:99px; padding:2px 10px; font-size:0.75rem; font-weight:700;">
          ${p.emoji} ${p.name}
        </span>
      `).join('')}
    `;
  }

  // Filter main expense table by clicked person
  filterByPerson(personName) {
    if (this.selectedPersonFilter === personName) {
      this.selectedPersonFilter = null; // toggle off
    } else {
      this.selectedPersonFilter = personName;
    }
    this.renderTable();
    this.renderPersonCostPanel();

    // Scroll to expense table on mobile / desktop
    const tableEl = document.getElementById('tab-expenses');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  clearPersonFilter() {
    this.selectedPersonFilter = null;
    this.renderTable();
    this.renderPersonCostPanel();
  }

  // Get expenses applying search, category, date AND person filters
  getFilteredExpenses() {
    let expenses = window.storage.getExpenses();
    const currentMonth = this.currentDate.substring(0, 7);

    if (this.periodFilter === 'today') {
      expenses = expenses.filter(e => e.date === this.currentDate);
    } else if (this.periodFilter === 'month') {
      expenses = expenses.filter(e => e.date && e.date.startsWith(currentMonth));
    }

    if (this.categoryFilter && this.categoryFilter !== 'all') {
      expenses = expenses.filter(e => e.category === this.categoryFilter);
    }

    if (this.selectedPersonFilter) {
      const pFilter = this.selectedPersonFilter.toLowerCase();
      expenses = expenses.filter(e => {
        const persons = this.extractPersons(e.notes, e.title);
        return persons.some(p => p.name.toLowerCase() === pFilter);
      });
    }

    if (this.searchQuery) {
      expenses = expenses.filter(e =>
        (e.title && e.title.toLowerCase().includes(this.searchQuery)) ||
        (e.notes && e.notes.toLowerCase().includes(this.searchQuery)) ||
        (e.paymentMethod && e.paymentMethod.toLowerCase().includes(this.searchQuery))
      );
    }

    return expenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  render() {
    this.renderTable();
    this.renderBudgetPanel();
    this.renderIncomeList();
    this.renderPersonCostPanel();
    this.renderDashboardPersonSummary();
  }

  renderTable() {
    const tableBody = document.getElementById('expense-table-body');
    const totalCountEl = document.getElementById('expense-filtered-total');
    const netCountEl = document.getElementById('expense-filtered-net');
    const currency = window.storage.getCurrencySymbol();

    if (!tableBody) return;

    const filtered = this.getFilteredExpenses();
    const totalSum = filtered.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);

    // Calculate Incomes for current filter
    const allIncomes = window.storage.getIncomes();
    let filteredIncomes = allIncomes;
    if (this.periodFilter === 'today') {
      filteredIncomes = allIncomes.filter(i => i.date === this.currentDate);
    } else if (this.periodFilter === 'month') {
      const monthPrefix = this.currentDate.substring(0, 7);
      filteredIncomes = allIncomes.filter(i => i.date && i.date.startsWith(monthPrefix));
    }
    const totalIncomes = filteredIncomes.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);
    const netBalance = totalIncomes - totalSum;

    if (totalCountEl) {
      const personNotice = this.selectedPersonFilter ? ` (for ${this.selectedPersonFilter})` : '';
      totalCountEl.textContent = `Total Spent: ${currency}${totalSum.toLocaleString()}${personNotice}`;
    }

    if (netCountEl) {
      netCountEl.textContent = `Net Balance: ${netBalance >= 0 ? '+' : ''}${currency}${netBalance.toLocaleString()}`;
      netCountEl.style.color = netBalance >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    // Active person filter banner above rows
    const filterBanner = this.selectedPersonFilter ? `
      <tr>
        <td colspan="7" style="background: rgba(139, 92, 246, 0.08); padding: 0.65rem 1rem; border-left: 4px solid #8b5cf6;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.85rem; font-weight:700; color:#8b5cf6;">
              <i class="fa-solid fa-filter"></i> Filtered by Individual: ${this.selectedPersonFilter} (${filtered.length} expenses)
            </span>
            <button class="action-btn btn-secondary" style="padding:2px 8px; font-size:0.75rem;" onclick="window.expenses.clearPersonFilter()">
              <i class="fa-solid fa-xmark"></i> Show All
            </button>
          </div>
        </td>
      </tr>
    ` : '';

    if (filtered.length === 0) {
      tableBody.innerHTML = filterBanner + `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            <i class="fa-solid fa-receipt" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5; display: block;"></i>
            No expenses found for the selected period & filters.
            ${this.selectedPersonFilter ? `<div style="margin-top:0.5rem;"><button class="action-btn btn-primary" onclick="window.expenses.clearPersonFilter()">Clear Person Filter</button></div>` : ''}
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filterBanner + filtered.map(exp => {
      const routineBadge = exp.isRoutineLinked || exp.taskId ? `
        <span class="badge badge-routine" title="Generated from daily routine">
          <i class="fa-solid fa-arrows-rotate"></i> Routine
        </span>
      ` : `
        <span class="badge" style="background: var(--bg-main); color: var(--text-muted);">Standalone</span>
      `;

      // Detect linked persons for this row
      const rowPersons = this.extractPersons(exp.notes, exp.title);
      const personBadges = rowPersons.map(p => `
        <span class="badge" style="background:${p.color}15; color:${p.color}; border:1px solid ${p.color}35; font-size:0.7rem; padding:1px 6px; border-radius:99px; font-weight:700; cursor:pointer;" onclick="window.expenses.filterByPerson('${p.name}')" title="Filter by ${p.name}">
          ${p.emoji} ${p.name}
        </span>
      `).join(' ');

      return `
        <tr>
          <td>
            <div style="font-weight: 600; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span>${this.escapeHtml(exp.title)}</span>
              ${personBadges}
            </div>
            ${exp.notes ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top:2px;">${this.escapeHtml(exp.notes)}</div>` : ''}
          </td>
          <td><span class="badge badge-category">${this.escapeHtml(exp.category || 'Other')}</span></td>
          <td><span class="cost-cell cost-expense">${currency}${parseFloat(exp.amount).toLocaleString()}</span></td>
          <td><span style="font-size: 0.825rem; color: var(--text-secondary);"><i class="fa-regular fa-credit-card"></i> ${this.escapeHtml(exp.paymentMethod || 'UPI')}</span></td>
          <td><span style="font-size: 0.8rem; color: var(--text-muted);">${exp.date || 'N/A'}</span></td>
          <td>${routineBadge}</td>
          <td>
            <div class="task-actions" style="opacity: 1;">
              <button class="task-action-btn" onclick="window.expenses.openEditModal('${exp.id}')" title="Edit Expense">
                <i class="fa-solid fa-pencil"></i>
              </button>
              <button class="task-action-btn delete" onclick="window.expenses.handleDeleteExpense('${exp.id}')" title="Delete Expense">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ── Render Individual Cost Monitor Sidebar Panel ───────────────────
  renderPersonCostPanel() {
    const listEl = document.getElementById('person-cost-list');
    if (!listEl) return;
    const currency = window.storage.getCurrencySymbol();
    const personMap = this.buildPersonCostMap(this.personPeriod);
    const entries = Object.values(personMap).sort((a, b) => b.total - a.total);

    if (entries.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); font-size:0.82rem; padding:1.25rem 0.5rem;">
          <i class="fa-solid fa-user-tag" style="font-size:1.6rem; opacity:0.35; display:block; margin-bottom:0.4rem;"></i>
          No individual costs tracked for this period.<br>
          <span style="font-size:0.75rem;">Mention <strong>Amma, Appa, Friend</strong> etc. in Notes when logging an expense!</span>
        </div>`;
      return;
    }

    const totalPersonSpend = entries.reduce((s, p) => s + p.total, 0) || 1;

    listEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(139,92,246,0.06); padding:0.4rem 0.6rem; border-radius:6px; font-size:0.75rem; margin-bottom:0.25rem;">
        <span style="color:var(--text-secondary); font-weight:600;">Tracked Individuals: <strong>${entries.length}</strong></span>
        <span style="color:#8b5cf6; font-weight:800;">Total: ${currency}${totalPersonSpend.toLocaleString()}</span>
      </div>
      ${entries.map((p, i) => {
        const pct = Math.round((p.total / totalPersonSpend) * 100);
        const isFilterActive = this.selectedPersonFilter === p.name;
        const latestDate = p.items.length > 0
          ? [...p.items].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0].date
          : '';

        return `
          <div style="background:${p.color}0a; border:1px solid ${isFilterActive ? p.color : p.color + '35'}; ${isFilterActive ? 'box-shadow: 0 0 8px ' + p.color + '40;' : ''} border-radius:10px; padding:0.75rem 0.85rem; transition:var(--transition);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
              <span style="font-weight:700; font-size:0.92rem; color:${p.color};">
                ${p.emoji} ${p.name}
              </span>
              <span style="font-weight:800; font-size:1.05rem; color:${p.color};">
                ${currency}${p.total.toLocaleString()}
              </span>
            </div>

            <!-- Progress Bar -->
            <div style="height:6px; background:#e2e8f0; border-radius:99px; overflow:hidden; margin-bottom:0.45rem;">
              <div style="height:100%; width:${pct}%; background:${p.color}; border-radius:99px; transition:width 0.4s ease;"></div>
            </div>

            <!-- Sub metadata -->
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; color:var(--text-muted); margin-bottom:0.5rem;">
              <span>${p.count} expense${p.count !== 1 ? 's' : ''} • ${pct}%</span>
              <span>Last: ${latestDate || 'N/A'}</span>
            </div>

            <!-- Action buttons: Filter table & Expand items -->
            <div style="display:flex; gap:6px;">
              <button type="button" class="action-btn" onclick="window.expenses.togglePersonDetail('person-detail-${i}')" style="flex:1; padding:3px 6px; font-size:0.72rem; border-radius:6px; background:var(--bg-surface); color:var(--text-secondary); border:1px solid var(--border-color); cursor:pointer;">
                <i class="fa-solid fa-list-ul"></i> Items (${p.count})
              </button>
              <button type="button" class="action-btn" onclick="window.expenses.filterByPerson('${p.name}')" style="flex:1; padding:3px 6px; font-size:0.72rem; border-radius:6px; background:${isFilterActive ? p.color : 'var(--bg-surface)'}; color:${isFilterActive ? '#fff' : p.color}; border:1px solid ${p.color}50; cursor:pointer; font-weight:600;">
                <i class="fa-solid ${isFilterActive ? 'fa-check' : 'fa-filter'}"></i> ${isFilterActive ? 'Filtered' : 'Filter Table'}
              </button>
            </div>

            <!-- Expandable Item Breakdown -->
            <div id="person-detail-${i}" style="display:none; margin-top:0.6rem; border-top:1px solid ${p.color}25; padding-top:0.5rem;" onclick="event.stopPropagation()">
              ${p.items.map(item => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; font-size:0.78rem; border-bottom:1px dashed var(--border-color);">
                  <div style="flex:1; min-width:0; padding-right:6px;">
                    <div style="font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.escapeHtml(item.title)}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${item.date} ${item.notes ? '• ' + this.escapeHtml(item.notes) : ''}</div>
                  </div>
                  <span style="color:${p.color}; font-weight:800; white-space:nowrap;">${currency}${parseFloat(item.amount).toLocaleString()}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  togglePersonDetail(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
  }

  // ── Pocket Money by Giver Helper & Panels ──────────────────────────
  buildPocketGiverMap(period = 'all') {
    let incomes = window.storage.getIncomes() || [];
    const isPocket = (inc) => window.app && window.app.isPocketMoney ? window.app.isPocketMoney(inc) : (inc.category === 'Family Support' || inc.category === 'Pocket Money' || inc.giver);
    const pocketIncomes = incomes.filter(isPocket);

    const today = this.currentDate;
    const currentMonth = today.substring(0, 7);

    let filtered = pocketIncomes;
    if (period === 'today') {
      filtered = pocketIncomes.filter(i => i.date === today);
    } else if (period === 'month') {
      filtered = pocketIncomes.filter(i => i.date && i.date.startsWith(currentMonth));
    }

    const giverPresets = {
      'Raj Appa': { emoji: '👨', color: '#6366f1' },
      'Anna': { emoji: '👦', color: '#f59e0b' },
      'Appa': { emoji: '👨', color: '#3b82f6' },
      'Amma': { emoji: '👩', color: '#ec4899' },
      'Dharshini': { emoji: '👧', color: '#8b5cf6' },
      'Family': { emoji: '👵', color: '#10b981' },
      'Friend': { emoji: '🤝', color: '#06b6d4' },
      'Myself': { emoji: '🙋', color: '#64748b' }
    };

    const map = {};
    filtered.forEach(inc => {
      let giver = (inc.giver || '').trim();
      if (!giver) {
        const text = `${inc.title || ''} ${inc.notes || ''}`.toLowerCase();
        if (text.includes('raj appa')) giver = 'Raj Appa';
        else if (text.includes('anna')) giver = 'Anna';
        else if (text.includes('appa')) giver = 'Appa';
        else if (text.includes('amma')) giver = 'Amma';
        else if (text.includes('dharshini')) giver = 'Dharshini';
        else if (text.includes('friend')) giver = 'Friend';
        else if (text.includes('family')) giver = 'Family';
        else giver = inc.title || 'Family';
      }

      const meta = giverPresets[giver] || { emoji: '💜', color: '#8b5cf6' };
      if (!map[giver]) {
        map[giver] = {
          name: giver,
          emoji: meta.emoji,
          color: meta.color,
          total: 0,
          count: 0,
          items: []
        };
      }
      map[giver].total += parseFloat(inc.amount) || 0;
      map[giver].count += 1;
      map[giver].items.push(inc);
    });

    return map;
  }

  renderDashboardPocketGiversSummary() {
    const listEl = document.getElementById('dash-pocket-givers-list');
    if (!listEl) return;
    const currency = window.storage.getCurrencySymbol();
    const giverMap = this.buildPocketGiverMap('all');
    const entries = Object.values(giverMap).sort((a, b) => b.total - a.total);

    if (entries.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:0.75rem 0;">
          No pocket money logged yet.<br>
          <span style="font-size:0.72rem;">Click "+ Add Pocket Money" to record family support!</span>
        </div>`;
      return;
    }

    const totalPocket = entries.reduce((s, g) => s + g.total, 0) || 1;

    listEl.innerHTML = entries.map(g => {
      const pct = Math.round((g.total / totalPocket) * 100);
      return `
        <div style="display:flex; flex-direction:column; gap:2px; padding:4px 0; cursor:pointer;" onclick="window.app.openStatDetails('pocket_money')" title="View ${g.name}'s pocket money entries">
          <div style="display:flex; justify-content:space-between; font-size:0.82rem;">
            <span style="font-weight:600; color:var(--text-primary);"><span style="color:${g.color};">${g.emoji}</span> ${g.name} (${g.count}x)</span>
            <span style="font-weight:700; color:${g.color};">+${currency}${g.total.toLocaleString()}</span>
          </div>
          <div style="height:4px; background:#e2e8f0; border-radius:99px; overflow:hidden;">
            <div style="height:100%; width:${pct}%; background:${g.color}; border-radius:99px;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderPocketGiverPanel() {
    const listEl = document.getElementById('pocket-givers-list');
    if (!listEl) return;
    const currency = window.storage.getCurrencySymbol();
    const giverMap = this.buildPocketGiverMap('all');
    const entries = Object.values(giverMap).sort((a, b) => b.total - a.total);

    if (entries.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); font-size:0.82rem; padding:1rem 0.5rem;">
          <i class="fa-solid fa-hand-holding-heart" style="font-size:1.6rem; opacity:0.35; display:block; margin-bottom:0.4rem; color:#8b5cf6;"></i>
          No pocket money records found.<br>
          <span style="font-size:0.75rem;">Tap <strong>+ Add Pocket Money</strong> to log family support!</span>
        </div>`;
      return;
    }

    const totalPocket = entries.reduce((s, g) => s + g.total, 0) || 1;

    listEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(139,92,246,0.06); padding:0.4rem 0.6rem; border-radius:6px; font-size:0.75rem; margin-bottom:0.25rem;">
        <span style="color:var(--text-secondary); font-weight:600;">Givers: <strong>${entries.length}</strong></span>
        <span style="color:#8b5cf6; font-weight:800;">Total: +${currency}${totalPocket.toLocaleString()}</span>
      </div>
      ${entries.map((g, i) => {
        const pct = Math.round((g.total / totalPocket) * 100);
        return `
          <div style="background:${g.color}0a; border:1px solid ${g.color}35; border-radius:10px; padding:0.7rem 0.8rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
              <span style="font-weight:700; font-size:0.9rem; color:${g.color};">
                ${g.emoji} ${g.name}
              </span>
              <span style="font-weight:800; font-size:1rem; color:${g.color};">
                +${currency}${g.total.toLocaleString()}
              </span>
            </div>
            <div style="height:5px; background:#e2e8f0; border-radius:99px; overflow:hidden; margin-bottom:0.4rem;">
              <div style="height:100%; width:${pct}%; background:${g.color}; border-radius:99px;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; color:var(--text-muted); margin-bottom:0.35rem;">
              <span>${g.count} contribution${g.count !== 1 ? 's' : ''} • ${pct}%</span>
              <button type="button" class="action-btn" onclick="window.expenses.togglePocketGiverDetail('pocket-giver-detail-${i}')" style="padding:2px 7px; font-size:0.7rem; border-radius:4px; background:var(--bg-surface); color:var(--text-secondary); border:1px solid var(--border-color); cursor:pointer;">
                <i class="fa-solid fa-list-ul"></i> Details (${g.count})
              </button>
            </div>
            <div id="pocket-giver-detail-${i}" style="display:none; margin-top:0.5rem; border-top:1px dashed ${g.color}30; padding-top:0.4rem;">
              ${g.items.map(item => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; font-size:0.76rem; border-bottom:1px dashed var(--border-color);">
                  <div style="flex:1; min-width:0; padding-right:6px;">
                    <div style="font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.escapeHtml(item.title)}</div>
                    <div style="font-size:0.68rem; color:var(--text-muted);"><i class="fa-regular fa-calendar"></i> ${item.date} ${item.notes ? '• ' + this.escapeHtml(item.notes) : ''}</div>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span style="color:${g.color}; font-weight:800; white-space:nowrap;">+${currency}${parseFloat(item.amount).toLocaleString()}</span>
                    <button class="task-action-btn delete" style="padding:2px; font-size:0.7rem;" onclick="window.expenses.handleDeleteIncome('${item.id}')" title="Delete">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  togglePocketGiverDetail(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
  }

  // ── Render Dashboard Individual Cost Summary ───────────────────────
  renderDashboardPersonSummary() {
    const dashListEl = document.getElementById('dash-person-list');
    if (!dashListEl) return;
    const currency = window.storage.getCurrencySymbol();
    const personMap = this.buildPersonCostMap('all');
    const entries = Object.values(personMap).sort((a, b) => b.total - a.total);

    if (entries.length === 0) {
      dashListEl.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:0.75rem 0;">
          No individual costs logged yet.<br>
          <span style="font-size:0.72rem;">Mention names like Amma, Appa in Notes!</span>
        </div>`;
      return;
    }

    const totalTracked = entries.reduce((s, p) => s + p.total, 0) || 1;

    dashListEl.innerHTML = entries.slice(0, 5).map(p => {
      const pct = Math.round((p.total / totalTracked) * 100);
      return `
        <div style="display:flex; flex-direction:column; gap:2px; padding:4px 0;">
          <div style="display:flex; justify-content:space-between; font-size:0.82rem;">
            <span style="font-weight:600; color:var(--text-primary);">${p.emoji} ${p.name} (${p.count})</span>
            <span style="font-weight:700; color:${p.color};">${currency}${p.total.toLocaleString()}</span>
          </div>
          <div style="height:4px; background:#e2e8f0; border-radius:99px; overflow:hidden;">
            <div style="height:100%; width:${pct}%; background:${p.color}; border-radius:99px;"></div>
          </div>
        </div>
      `;
    }).join('') + (entries.length > 5 ? `<div style="text-align:right; font-size:0.72rem; color:var(--primary); font-weight:600; margin-top:2px;">+${entries.length - 5} more individuals</div>` : '');
  }

  renderBudgetPanel() {
    const summary = window.storage.getDaySummary(this.currentDate);
    const monthSummary = window.storage.getMonthSummary(this.currentDate.substring(0, 7));
    const settings = window.storage.getSettings();
    const currency = settings.currency || '₹';

    // Daily progress bar
    const dailyProgressBar = document.getElementById('daily-budget-bar');
    const dailyBudgetLabel = document.getElementById('daily-budget-label');
    const dailySpentLabel = document.getElementById('daily-spent-label');

    if (dailyProgressBar && dailyBudgetLabel) {
      dailyBudgetLabel.textContent = `${currency}${summary.totalExpense.toLocaleString()} / ${currency}${summary.dailyBudget.toLocaleString()}`;
      dailySpentLabel.textContent = `${summary.budgetUsagePercent}% of daily budget used`;

      dailyProgressBar.style.width = `${Math.min(summary.budgetUsagePercent, 100)}%`;
      dailyProgressBar.className = 'budget-progress-bar ' + 
        (summary.budgetUsagePercent > 100 ? 'progress-danger' : 
         summary.budgetUsagePercent >= 80 ? 'progress-warning' : 'progress-safe');
    }

    // Monthly progress bar
    const monthlyProgressBar = document.getElementById('monthly-budget-bar');
    const monthlyBudgetLabel = document.getElementById('monthly-budget-label');
    const monthlySpentLabel = document.getElementById('monthly-spent-label');

    if (monthlyProgressBar && monthlyBudgetLabel) {
      monthlyBudgetLabel.textContent = `${currency}${monthSummary.totalExpense.toLocaleString()} / ${currency}${monthSummary.monthlyBudget.toLocaleString()}`;
      monthlySpentLabel.textContent = `${monthSummary.budgetUsagePercent}% of monthly budget used`;

      monthlyProgressBar.style.width = `${Math.min(monthSummary.budgetUsagePercent, 100)}%`;
      monthlyProgressBar.className = 'budget-progress-bar ' + 
        (monthSummary.budgetUsagePercent > 100 ? 'progress-danger' : 
         monthSummary.budgetUsagePercent >= 80 ? 'progress-warning' : 'progress-safe');
    }

    // Category breakdown list
    const categoryBudgetList = document.getElementById('category-budget-list');
    if (categoryBudgetList) {
      const allExpenses = window.storage.getExpenses();
      const catTotals = {};
      allExpenses.forEach(e => {
        const cat = e.category || 'Other';
        catTotals[cat] = (catTotals[cat] || 0) + (parseFloat(e.amount) || 0);
      });
      const totalAll = Object.values(catTotals).reduce((a, b) => a + b, 0) || 1;

      categoryBudgetList.innerHTML = Object.entries(catTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, spent]) => {
          const percent = Math.round((spent / totalAll) * 100);
          return `
            <div class="category-budget-item">
              <div class="category-budget-meta">
                <span style="font-weight: 500;">${this.escapeHtml(cat)}</span>
                <span><strong>${currency}${spent.toLocaleString()}</strong> (${percent}%)</span>
              </div>
              <div class="budget-progress-bar-wrap">
                <div class="budget-progress-bar progress-safe" style="width: ${percent}%;"></div>
              </div>
            </div>
          `;
        }).join('');
    }
  }

  renderIncomeList() {
    const incomeListEl = document.getElementById('income-list');
    const incomeTotalEl = document.getElementById('income-total-display');
    const currency = window.storage.getCurrencySymbol();
    if (!incomeListEl) return;

    const currentMonth = this.currentDate.substring(0, 7);
    const incomes = window.storage.getIncomes().filter(i => i.date && i.date.startsWith(currentMonth));
    const totalIncome = incomes.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);

    if (incomeTotalEl) {
      incomeTotalEl.textContent = `${currency}${totalIncome.toLocaleString()}`;
    }

    if (incomes.length === 0) {
      incomeListEl.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">
          No income records added for this month yet.
        </div>
      `;
      return;
    }

        incomeListEl.innerHTML = incomes.map(inc => {
      const isPocketEntry = (inc.isPocketMoney === true || inc.category === 'Family Support' || inc.category === 'Pocket Money' || inc.giver || (window.app && window.app.isPocketMoney && window.app.isPocketMoney(inc)));
      return `
      <div class="task-card" style="align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem;">
        <div>
          <div style="font-weight: 600; font-size: 0.875rem;">${this.escapeHtml(inc.title)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
            <span>${inc.category || 'Income'} • ${inc.date}</span>
            ${isPocketEntry ? `<span style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 99px; padding: 1px 7px; font-size: 0.7rem; font-weight: 700;">💜 Pocket Money${inc.giver ? ` • ${this.escapeHtml(inc.giver)}` : ''}</span>` : `<span style="background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 99px; padding: 1px 7px; font-size: 0.7rem; font-weight: 700;">💼 Earned</span>`}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="cost-cell cost-income">+${currency}${parseFloat(inc.amount).toLocaleString()}</span>
          <button class="task-action-btn delete" onclick="window.expenses.handleDeleteIncome('${inc.id}')" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
    }).join('');
  }

  openAddModal() {
    const modal = document.getElementById('expense-modal');
    const form = document.getElementById('expense-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('expense-id').value = '';
    document.getElementById('expense-modal-title').textContent = 'Log New Expense';
    document.getElementById('expense-date').value = this.currentDate;
    
    // Reset person preview
    this.previewPersonTags('');

    modal.classList.add('active');
  }

  openEditModal(expenseId) {
    const expenses = window.storage.getExpenses();
    const exp = expenses.find(e => e.id === expenseId);
    if (!exp) return;

    const modal = document.getElementById('expense-modal');
    const form = document.getElementById('expense-form');
    if (!modal || !form) return;

    document.getElementById('expense-id').value = exp.id;
    document.getElementById('expense-modal-title').textContent = 'Edit Expense Entry';
    document.getElementById('expense-title').value = exp.title || '';
    document.getElementById('expense-amount').value = exp.amount || '';
    document.getElementById('expense-category').value = exp.category || 'Food & Dining';
    document.getElementById('expense-payment-method').value = exp.paymentMethod || 'UPI';
    document.getElementById('expense-date').value = exp.date || this.currentDate;
    document.getElementById('expense-notes').value = exp.notes || '';

    // Show detected person preview for existing notes
    this.previewPersonTags(exp.notes || '');

    modal.classList.add('active');
  }

  openPocketMoneyModal(giverName = '') {
    this.openIncomeModal('pocket', giverName);
  }

  openIncomeModal(mode = 'income', giverName = '') {
    const modal = document.getElementById('income-modal');
    const form = document.getElementById('income-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('income-date').value = this.currentDate;
    this.selectedGiver = null;
    this.currentIncomeMode = mode;

    const previewEl = document.getElementById('income-giver-selected');
    if (previewEl) {
      previewEl.innerHTML = '<span style="color: var(--text-muted); font-weight: normal;">No individual selected yet (click a person above)</span>';
    }

    this.setIncomeModalMode(mode);

    if (giverName) {
      this.selectPocketMoneyGiver(giverName);
    }

    modal.classList.add('active');
  }

  setIncomeModalMode(mode) {
    this.currentIncomeMode = mode;
    const titleEl = document.getElementById('income-modal-title');
    const titleInput = document.getElementById('income-title');
    const catSelect = document.getElementById('income-category');
    const submitBtn = document.getElementById('income-submit-btn');
    const btnPocket = document.getElementById('btn-mode-pocket');
    const btnIncome = document.getElementById('btn-mode-income');

    if (mode === 'pocket') {
      if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-hand-holding-heart" style="color: #8b5cf6;"></i> <span>Log Pocket Money &amp; Family Support</span>';
      if (titleInput && !titleInput.value) titleInput.placeholder = 'e.g., Anna gave money, Raj Appa support';
      if (catSelect) catSelect.value = 'Family Support';
      if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Save Pocket Money</span>';
      if (btnPocket) {
        btnPocket.style.background = '#8b5cf6';
        btnPocket.style.color = '#fff';
      }
      if (btnIncome) {
        btnIncome.style.background = 'transparent';
        btnIncome.style.color = 'var(--text-secondary)';
      }
    } else {
      if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-wallet" style="color: var(--success);"></i> <span>Log Salary / Other Income</span>';
      if (titleInput && !titleInput.value) titleInput.placeholder = 'e.g., Monthly Salary, Freelancing, Dividend';
      if (catSelect) catSelect.value = 'Salary';
      if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Save Income</span>';
      if (btnPocket) {
        btnPocket.style.background = 'transparent';
        btnPocket.style.color = 'var(--text-secondary)';
      }
      if (btnIncome) {
        btnIncome.style.background = 'var(--success)';
        btnIncome.style.color = '#fff';
      }
    }
  }

  selectPocketMoneyGiver(name, emoji = '👤', color = '#8b5cf6') {
    this.selectedGiver = { name, emoji, color };
    const previewEl = document.getElementById('income-giver-selected');
    if (previewEl) {
      previewEl.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:5px; background:${color}20; color:${color}; border:1px solid ${color}50; border-radius:99px; padding:3px 12px; font-size:0.8rem; font-weight:700;">
          ${emoji} Selected Giver: ${name}
        </span>
      `;
    }

    const titleInput = document.getElementById('income-title');
    if (titleInput && (!titleInput.value.trim() || titleInput.value.startsWith('Received from') || titleInput.value.includes('pocket money') || titleInput.value.includes('support'))) {
      titleInput.value = `Received from ${name}`;
    }

    const notesInput = document.getElementById('income-notes');
    if (notesInput && !notesInput.value.includes(name)) {
      notesInput.value = notesInput.value ? `${notesInput.value}, ${name}` : `Pocket money from ${name}`;
    }

    const catSelect = document.getElementById('income-category');
    if (catSelect) {
      catSelect.value = 'Family Support';
    }
  }

  // ── Compulsory Notes & Remarks Validation & Saving ─────────────────
  handleSaveExpense(formData) {
    const expenseId = formData.get('expenseId');
    const title = (formData.get('title') || '').trim();
    const amount = parseFloat(formData.get('amount')) || 0;
    const notes = (formData.get('notes') || '').trim();
    const category = formData.get('category');
    const paymentMethod = formData.get('paymentMethod');
    const date = formData.get('date') || this.currentDate;

    // 1. Title validation
    if (!title || amount <= 0) {
      alert('Please provide a valid Expense Title and Amount greater than 0.');
      return false;
    }

    // 2. COMPULSORY Notes & Remarks Validation
    if (!notes) {
      alert('⚠️ Notes & Remarks is COMPULSORY!\n\nPlease mention who or what this expense is for (e.g. Amma, Appa, Friend, Dharshini, Myself, etc.) so it can be tracked in the Individual Cost Monitor.');
      const notesEl = document.getElementById('expense-notes');
      if (notesEl) {
        notesEl.focus();
        notesEl.style.borderColor = 'var(--danger)';
        notesEl.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
      }
      return false;
    }

    const expenseData = {
      title: title,
      amount: amount,
      category: category,
      paymentMethod: paymentMethod,
      date: date,
      notes: notes
    };

    // Detect persons for toast message
    const detected = this.extractPersons(notes, title);
    const trackedNotice = detected.length > 0
      ? ` (Tracked for: ${detected.map(p => p.name).join(', ')})`
      : '';

    if (expenseId) {
      window.storage.updateExpense({ id: expenseId, ...expenseData });
      if (window.app && window.app.showToast) {
        window.app.showToast(`Expense updated!${trackedNotice}`, 'success');
      }
    } else {
      window.storage.addExpense(expenseData);
      if (window.app && window.app.showToast) {
        window.app.showToast(`Expense logged!${trackedNotice}`, 'success');
      }
    }

    // Re-render table, person cost panel, and dashboard simultaneously
    this.render();
    if (window.app) window.app.updateSummaryMetrics();
    if (window.charts) window.charts.renderAll();
    return true;
  }

  handleSaveIncome(formData) {
    const title = (formData.get('title') || '').trim();
    const amount = parseFloat(formData.get('amount')) || 0;
    const category = formData.get('category');
    const paymentMethod = formData.get('paymentMethod') || 'UPI';
    const date = formData.get('date') || this.currentDate;
    const notes = (formData.get('notes') || '').trim();

    if (!title || amount <= 0) {
      alert('Please provide a valid Title and Amount greater than 0.');
      return false;
    }

    const isPocket = (
      this.currentIncomeMode === 'pocket' ||
      category === 'Family Support' ||
      category === 'Pocket Money' ||
      Boolean(this.selectedGiver && this.selectedGiver.name)
    );

    const incomeData = {
      title: title,
      amount: amount,
      category: category,
      paymentMethod: paymentMethod,
      date: date,
      notes: notes,
      giver: this.selectedGiver ? this.selectedGiver.name : '',
      isPocketMoney: isPocket
    };

    window.storage.addIncome(incomeData);

    if (window.app && window.app.showToast) {
      window.app.showToast(isPocket ? '💜 Pocket Money entry saved! Tracked in Card 6 (Pocket Money).' : '💼 Earned Income logged! Tracked in Card 3.', 'success');
    }

    const modal = document.getElementById('income-modal');
    if (modal) modal.classList.remove('active');

    this.render();
    if (window.app) window.app.updateSummaryMetrics();
    if (window.charts) window.charts.renderAll();
    return true;
  }

  handleDeleteExpense(expenseId) {
    if (confirm('Delete this expense record?')) {
      window.storage.deleteExpense(expenseId);
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast('Expense removed', 'info');
      }
      if (window.app) window.app.updateSummaryMetrics();
      if (window.charts) window.charts.renderAll();
    }
  }

  handleDeleteIncome(incomeId) {
    if (confirm('Delete this income record?')) {
      window.storage.deleteIncome(incomeId);
      this.render();
      if (window.app && window.app.showToast) {
        window.app.showToast('Income removed', 'info');
      }
      if (window.app) window.app.updateSummaryMetrics();
      if (window.charts) window.charts.renderAll();
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.expenses = new ExpenseManager();
