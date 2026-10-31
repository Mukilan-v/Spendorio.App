const fs = require('fs');

// 1. Update index.html
function patchIndexHtml() {
  ['public/index.html', 'docs/index.html'].forEach(filePath => {
    let html = fs.readFileSync(filePath, 'utf8');

    // Add Card 6 after Card 5 (Tasks Completed)
    const card5End = `            <!-- Card 5: Tasks Completed & Streak -->
            <div class="stat-card card-tasks stat-card-interactive" onclick="window.app.openStatDetails('tasks')" title="Click to view Tasks Details &amp; Shortcut">
              <div class="stat-info">
                <span class="stat-label">Tasks Completed <i class="fa-solid fa-arrow-up-right-from-square stat-shortcut-icon"></i></span>
                <span class="stat-value" id="stat-tasks-completed">0 / 0</span>
                <span class="stat-sub" id="stat-tasks-rate">0% completion rate</span>
              </div>
              <div class="stat-icon-wrap icon-tasks" title="Click to view tasks details">
                <i class="fa-solid fa-circle-check"></i>
              </div>
            </div>`;

    const card6 = `            <!-- Card 6: Family Support & Pocket Money -->
            <div class="stat-card stat-card-interactive" style="border-left: 4px solid #8b5cf6;" onclick="window.app.openStatDetails('pocket_money')" title="Click to view Family Support &amp; Pocket Money Details &amp; Shortcut">
              <div class="stat-info">
                <span class="stat-label">Family Support &amp; Pocket Money <i class="fa-solid fa-arrow-up-right-from-square stat-shortcut-icon"></i></span>
                <span class="stat-value" id="stat-pocket-money" style="color: #8b5cf6;">₹0</span>
                <span class="stat-sub" id="stat-pocket-money-sub">0 family &amp; pocket entries</span>
              </div>
              <div class="stat-icon-wrap" style="background: rgba(139, 92, 246, 0.12); color: #8b5cf6;" title="Click to view pocket money details">
                <i class="fa-solid fa-hand-holding-heart"></i>
              </div>
            </div>`;

    if (!html.includes('id="stat-pocket-money"')) {
      html = html.replace(card5End, `${card5End}\n\n${card6}`);
      console.log(`Added Card 6 to ${filePath}`);
    }

    // Add Family Support and Pocket Money to category dropdown in Log Income modal
    const catSelectTarget = `<select class="form-select" id="income-category" name="category">`;
    const catSelectReplacement = `<select class="form-select" id="income-category" name="category">
                <option value="Family Support">Family Support &amp; Pocket Money</option>
                <option value="Pocket Money">Pocket Money / Allowance</option>`;
    if (!html.includes('value="Family Support"')) {
      html = html.replace(catSelectTarget, catSelectReplacement);
      console.log(`Added category options to ${filePath}`);
    }

    // Bump version tag
    html = html.replace(/v=20261030_v17_clean_install/g, 'v=20261031_v18_pocket_money');

    fs.writeFileSync(filePath, html, 'utf8');
  });
}

// 2. Update app.js
function patchAppJs() {
  ['public/js/app.js', 'docs/js/app.js'].forEach(filePath => {
    let js = fs.readFileSync(filePath, 'utf8');

    // In updateSummaryMetrics()
    const targetInMetrics = `    // Monthly Dashboard Sidebar Box
    const monthSpentEl = document.getElementById('dash-month-spent');`;

    const codeInMetrics = `    // Summary Card 6: Family Support & Pocket Money
    const isFamilyOrPocketMoney = (inc) => {
      const cat = (inc.category || '').toLowerCase();
      const text = \`\${inc.title || ''} \${inc.notes || ''}\`.toLowerCase();
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
      pocketValEl.textContent = \`\${currency}\${totalPocketMoney.toLocaleString()}\`;
    }
    if (pocketSubEl) {
      pocketSubEl.textContent = \`\${pocketIncomes.length} family & pocket entries\`;
    }

    // Monthly Dashboard Sidebar Box
    const monthSpentEl = document.getElementById('dash-month-spent');`;

    if (!js.includes('stat-pocket-money')) {
      js = js.replace(targetInMetrics, codeInMetrics);
      console.log(`Added pocket money calculation to updateSummaryMetrics in ${filePath}`);
    }

    // In renderStatDetailsModal()
    const targetModalCase = `    } else if (type === 'net_balance') {`;
    const codeModalCase = `    } else if (type === 'pocket_money') {
      const allIncomes = window.storage.getIncomes() || [];
      const isFamilyOrPocketMoney = (inc) => {
        const cat = (inc.category || '').toLowerCase();
        const text = \`\${inc.title || ''} \${inc.notes || ''}\`.toLowerCase();
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
      if (badgeEl) badgeEl.textContent = \`\${pocketIncomes.length} records • Family & Pocket Money\`;
      if (iconWrapEl) {
        iconWrapEl.style.background = 'rgba(139, 92, 246, 0.12)';
        iconWrapEl.style.color = '#8b5cf6';
        iconWrapEl.innerHTML = '<i class=\"fa-solid fa-hand-holding-heart\"></i>';
      }
      if (heroValEl) {
        heroValEl.style.color = '#8b5cf6';
        heroValEl.textContent = \`\${currency}\${totalPocketMoney.toLocaleString()}\`;
      }

      if (heroBreakdownEl) {
        const sourceMap = {};
        pocketIncomes.forEach(i => {
          let src = i.title || i.source || i.category || 'Family';
          sourceMap[src] = (sourceMap[src] || 0) + (parseFloat(i.amount) || 0);
        });
        const topSources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
        heroBreakdownEl.innerHTML = topSources.map(([src, amt]) => \`
          <span style=\"background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 99px; padding: 3px 9px; font-size: 0.73rem; font-weight: 600;\">
            \${this.escapeHtml(src)}: \${currency}\${amt.toLocaleString()}
          </span>
        \`).join('');
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
        const searchStr = \`\${i.title || ''} \${i.notes || ''} \${i.category || ''} \${i.date || ''} \${i.amount || ''}\`.toLowerCase();
        return searchStr.includes(q);
      });

      if (filtered.length === 0) {
        listEl.innerHTML = \`
          <div style=\"text-align: center; padding: 2rem 1rem; color: var(--text-muted);\">
            <i class=\"fa-solid fa-hand-holding-heart\" style=\"font-size: 2rem; opacity: 0.3; margin-bottom: 0.5rem; display: block;\"></i>
            <div style=\"font-size: 0.9rem; font-weight: 600;\">No pocket money entries found</div>
            <div style=\"font-size: 0.75rem; margin-top: 4px;\">Click \"Add Pocket Money\" to record support from family.</div>
          </div>
        \`;
      } else {
        listEl.innerHTML = filtered.map(i => \`
          <div class=\"stat-detail-item\" style=\"border-left: 3px solid #8b5cf6;\">
            <div style=\"flex: 1; min-width: 0;\">
              <div style=\"font-weight: 700; font-size: 0.9rem; color: var(--text-primary); margin-bottom: 2px;\">
                \${this.escapeHtml(i.title || 'Pocket Money')}
              </div>
              <div style=\"font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 8px; flex-wrap: wrap;\">
                <span><i class=\"fa-regular fa-calendar\"></i> \${i.date || 'No date'}</span>
                <span><i class=\"fa-solid fa-tag\"></i> \${this.escapeHtml(i.category || 'Family Support')}</span>
                \${i.notes ? \`<span><i class=\"fa-regular fa-comment\"></i> \${this.escapeHtml(i.notes)}</span>\` : ''}
              </div>
            </div>
            <div style=\"font-weight: 800; font-size: 1.05rem; color: #8b5cf6; white-space: nowrap;\">
              +\${currency}\${parseFloat(i.amount).toLocaleString()}
            </div>
          </div>
        \`).join('');
      }

    } else if (type === 'net_balance') {`;

    if (!js.includes("type === 'pocket_money'")) {
      js = js.replace(targetModalCase, codeModalCase);
      console.log(`Added pocket_money modal case to renderStatDetailsModal in ${filePath}`);
    }

    fs.writeFileSync(filePath, js, 'utf8');
  });
}

// 3. Update sw.js cache version
function patchSwJs() {
  ['public/sw.js', 'docs/sw.js'].forEach(filePath => {
    let sw = fs.readFileSync(filePath, 'utf8');
    sw = sw.replace('spendorio-v2.1.1', 'spendorio-v2.1.2');
    fs.writeFileSync(filePath, sw, 'utf8');
    console.log(`Bumped cache name in ${filePath}`);
  });
}

patchIndexHtml();
patchAppJs();
patchSwJs();
console.log('Finished applying Card 6 Family Support & Pocket Money!');
