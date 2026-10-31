const fs = require('fs');

// 1. Update index.html
function patchIndexHtml() {
  ['public/index.html', 'docs/index.html'].forEach(filePath => {
    let html = fs.readFileSync(filePath, 'utf8');

    // 1A. Add "+ Add Pocket Money" button in Cost & Expenses toolbar
    const oldToolbarButtons = `<button class="action-btn btn-primary" onclick="window.expenses.openAddModal()">
                    <i class="fa-solid fa-plus"></i> Add Cost
                  </button>
                  <button class="action-btn btn-secondary" onclick="window.expenses.openIncomeModal()">
                    <i class="fa-solid fa-hand-holding-dollar"></i> Add Income
                  </button>`;

    const newToolbarButtons = `<button class="action-btn btn-primary" onclick="window.expenses.openAddModal()">
                    <i class="fa-solid fa-plus"></i> Add Cost
                  </button>
                  <button class="action-btn" style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.35); font-weight: 700; display: inline-flex; align-items: center; gap: 6px;" onclick="window.expenses.openPocketMoneyModal()" title="Log Pocket Money / Family Support">
                    <i class="fa-solid fa-hand-holding-heart"></i> Add Pocket Money
                  </button>
                  <button class="action-btn btn-secondary" onclick="window.expenses.openIncomeModal()">
                    <i class="fa-solid fa-hand-holding-dollar"></i> Add Income
                  </button>`;

    if (!html.includes('openPocketMoneyModal()')) {
      // Handle CRLF vs LF
      if (html.includes(oldToolbarButtons)) {
        html = html.replace(oldToolbarButtons, newToolbarButtons);
      } else {
        html = html.replace(
          /<button class="action-btn btn-primary" onclick="window\.expenses\.openAddModal\(\)">[\s\S]*?Add Cost[\s\S]*?<\/button>\s*<button class="action-btn btn-secondary" onclick="window\.expenses\.openIncomeModal\(\)">/,
          `<button class="action-btn btn-primary" onclick="window.expenses.openAddModal()">\n                    <i class="fa-solid fa-plus"></i> Add Cost\n                  </button>\n                  <button class="action-btn" style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.35); font-weight: 700; display: inline-flex; align-items: center; gap: 6px;" onclick="window.expenses.openPocketMoneyModal()" title="Log Pocket Money / Family Support">\n                    <i class="fa-solid fa-hand-holding-heart"></i> Add Pocket Money\n                  </button>\n                  <button class="action-btn btn-secondary" onclick="window.expenses.openIncomeModal()">`
        );
      }
      console.log('Added Add Pocket Money button to', filePath);
    }

    // 1B. Reformat income-modal to Side-by-Side layout with Giver chips
    const modalPattern = /<div class="modal-overlay" id="income-modal">[\s\S]*?<\/form>\s*<\/div>\s*<\/div>/;

    const newSideBySideModal = `<div class="modal-overlay" id="income-modal">
    <div class="modal-box modal-lg" style="max-width: 720px; width: 95%;">
      <div class="modal-header" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(99, 102, 241, 0.08));">
        <h3 id="income-modal-title" style="display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-hand-holding-heart" style="color: #8b5cf6;"></i>
          <span>Log Pocket Money &amp; Family Support</span>
        </h3>
        <button class="modal-close-btn" aria-label="Close">&times;</button>
      </div>
      <form id="income-form">
        <div class="modal-body">

          <!-- Mode Switcher: Pocket Money vs General Income -->
          <div style="display: flex; gap: 8px; margin-bottom: 1.25rem; background: var(--bg-surface); padding: 4px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <button type="button" id="btn-mode-pocket" class="action-btn" style="flex: 1; justify-content: center; background: #8b5cf6; color: #fff; font-weight: 700; border-radius: var(--radius-sm); border: none;" onclick="window.expenses.setIncomeModalMode('pocket')">
              <i class="fa-solid fa-hand-holding-heart"></i> Pocket Money &amp; Family Support
            </button>
            <button type="button" id="btn-mode-income" class="action-btn" style="flex: 1; justify-content: center; background: transparent; color: var(--text-secondary); font-weight: 600; border-radius: var(--radius-sm); border: none;" onclick="window.expenses.setIncomeModalMode('general')">
              <i class="fa-solid fa-wallet"></i> Salary / Other Income
            </button>
          </div>

          <!-- SIDE-BY-SIDE TWO COLUMN GRID -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; align-items: start;">
            
            <!-- LEFT COLUMN: Fill Details -->
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label" style="font-weight: 700;">Pocket Money / Source Title *</label>
                <input type="text" class="form-input" id="income-title" name="title" placeholder="e.g., Anna gave money, Raj Appa support" required>
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label" style="font-weight: 700;">Amount (<span class="currency-symbol-label">₹</span>) *</label>
                <input type="number" step="any" min="0.01" class="form-input" id="income-amount" name="amount" placeholder="e.g., 1000" style="font-size: 1.15rem; font-weight: 800; color: #8b5cf6;" required>
              </div>

              <div class="form-row" style="margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem;">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Category</label>
                  <select class="form-select" id="income-category" name="category">
                    <option value="Family Support" selected>Family Support &amp; Pocket Money</option>
                    <option value="Pocket Money">Pocket Money / Allowance</option>
                    <option value="Salary">Salary</option>
                    <option value="Freelancing">Freelancing / Side Gig</option>
                    <option value="Investment">Investment / Dividend</option>
                    <option value="Bonus">Bonus</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Received Date</label>
                  <input type="date" class="form-input" id="income-date" name="date" required>
                </div>
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label">Received Via (Payment Method)</label>
                <select class="form-select" id="income-payment-method" name="paymentMethod">
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash in Hand</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <!-- RIGHT COLUMN: Individual Who Gave Pocket Money & Notes -->
            <div style="display: flex; flex-direction: column; gap: 0.85rem; background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div>
                <label class="form-label" style="font-weight: 700; color: #8b5cf6; display: flex; align-items: center; justify-content: space-between;">
                  <span><i class="fa-solid fa-users"></i> Who Gave This Pocket Money?</span>
                  <span style="font-size: 0.72rem; font-weight: normal; color: var(--text-muted);">(Tap Giver)</span>
                </label>
                
                <!-- Quick Individual Giver Chips -->
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;" id="income-giver-chips">
                  <button type="button" class="person-tag-btn" onclick="window.expenses.selectPocketMoneyGiver('Anna', '👦', '#f59e0b')" style="border-radius: 99px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.12); color: #b45309; cursor: pointer;">
                    👦 Anna
                  </button>
                  <button type="button" class="person-tag-btn" onclick="window.expenses.selectPocketMoneyGiver('Raj Appa', '👨', '#6366f1')" style="border-radius: 99px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.12); color: #4338ca; cursor: pointer;">
                    👨 Raj Appa
                  </button>
                  <button type="button" class="person-tag-btn" onclick="window.expenses.selectPocketMoneyGiver('Appa', '👨', '#3b82f6')" style="border-radius: 99px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.12); color: #1d4ed8; cursor: pointer;">
                    👨 Appa
                  </button>
                  <button type="button" class="person-tag-btn" onclick="window.expenses.selectPocketMoneyGiver('Amma', '👩', '#ec4899')" style="border-radius: 99px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(236, 72, 153, 0.4); background: rgba(236, 72, 153, 0.12); color: #be185d; cursor: pointer;">
                    👩 Amma
                  </button>
                  <button type="button" class="person-tag-btn" onclick="window.expenses.selectPocketMoneyGiver('Dharshini', '👧', '#8b5cf6')" style="border-radius: 99px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(139, 92, 246, 0.4); background: rgba(139, 92, 246, 0.12); color: #6d28d9; cursor: pointer;">
                    👧 Dharshini
                  </button>
                  <button type="button" class="person-tag-btn" onclick="window.expenses.selectPocketMoneyGiver('Family', '👵', '#10b981')" style="border-radius: 99px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.12); color: #047857; cursor: pointer;">
                    👵 Family
                  </button>
                  <button type="button" class="person-tag-btn" onclick="window.expenses.selectPocketMoneyGiver('Friend', '🤝', '#06b6d4')" style="border-radius: 99px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(6, 182, 212, 0.4); background: rgba(6, 182, 212, 0.12); color: #0e7490; cursor: pointer;">
                    🤝 Friend
                  </button>
                  <button type="button" class="person-tag-btn" onclick="window.expenses.selectPocketMoneyGiver('Myself', '🙋', '#64748b')" style="border-radius: 99px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(100, 116, 139, 0.4); background: rgba(100, 116, 139, 0.12); color: #334155; cursor: pointer;">
                    🙋 Myself / Self
                  </button>
                </div>

                <div id="income-giver-selected" style="margin-top: 8px; font-size: 0.8rem; font-weight: 700; color: #8b5cf6;">
                  <span style="color: var(--text-muted); font-weight: normal;">No individual selected yet (click a person above)</span>
                </div>
              </div>

              <div class="form-group" style="margin: 0; flex: 1; display: flex; flex-direction: column;">
                <label class="form-label" style="font-weight: 700;">Notes &amp; Remarks</label>
                <textarea class="form-textarea" id="income-notes" name="notes" rows="3" placeholder="e.g., Anna give money 3rd time, Support for mess fees..." style="flex: 1; resize: none;"></textarea>
              </div>
            </div>

          </div>

        </div>

        <div class="modal-footer">
          <button type="button" class="action-btn btn-secondary modal-cancel-btn">Cancel</button>
          <button type="submit" class="action-btn" id="income-submit-btn" style="background: #8b5cf6; color: #fff; font-weight: 700; border: none; padding: 0.65rem 1.4rem;">
            <i class="fa-solid fa-check"></i> <span>Save Pocket Money</span>
          </button>
        </div>
      </form>
    </div>
  </div>`;

    if (modalPattern.test(html)) {
      html = html.replace(modalPattern, newSideBySideModal);
      console.log('Reformatted income-modal in', filePath);
    }

    // Bump version tag
    html = html.replace(/v19_card6_active/g, 'v20_sidebyside_pocketmoney');

    fs.writeFileSync(filePath, html, 'utf8');
  });
}

// 2. Update expenses.js
function patchExpensesJs() {
  ['public/js/expenses.js', 'docs/js/expenses.js'].forEach(filePath => {
    let js = fs.readFileSync(filePath, 'utf8');

    // Replace openIncomeModal and handleSaveIncome with pocket money support
    const targetIncomeCode = `  openIncomeModal() {
    const modal = document.getElementById('income-modal');
    const form = document.getElementById('income-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('income-date').value = this.currentDate;
    modal.classList.add('active');
  }`;

    const newIncomeCode = `  openPocketMoneyModal(giverName = '') {
    this.openIncomeModal('pocket', giverName);
  },

  openIncomeModal(mode = 'pocket', giverName = '') {
    const modal = document.getElementById('income-modal');
    const form = document.getElementById('income-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('income-date').value = this.currentDate;
    this.selectedGiver = null;

    const previewEl = document.getElementById('income-giver-selected');
    if (previewEl) {
      previewEl.innerHTML = '<span style="color: var(--text-muted); font-weight: normal;">No individual selected yet (click a person above)</span>';
    }

    this.setIncomeModalMode(mode);

    if (giverName) {
      this.selectPocketMoneyGiver(giverName);
    }

    modal.classList.add('active');
  },

  setIncomeModalMode(mode) {
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
  },

  selectPocketMoneyGiver(name, emoji = '👤', color = '#8b5cf6') {
    this.selectedGiver = { name, emoji, color };
    const previewEl = document.getElementById('income-giver-selected');
    if (previewEl) {
      previewEl.innerHTML = \`
        <span style="display:inline-flex; align-items:center; gap:5px; background:\${color}20; color:\${color}; border:1px solid \${color}50; border-radius:99px; padding:3px 12px; font-size:0.8rem; font-weight:700;">
          \${emoji} Selected Giver: \${name}
        </span>
      \`;
    }

    const titleInput = document.getElementById('income-title');
    if (titleInput && (!titleInput.value.trim() || titleInput.value.startsWith('Received from') || titleInput.value.includes('pocket money') || titleInput.value.includes('support'))) {
      titleInput.value = \`Received from \${name}\`;
    }

    const notesInput = document.getElementById('income-notes');
    if (notesInput && !notesInput.value.includes(name)) {
      notesInput.value = notesInput.value ? \`\${notesInput.value}, \${name}\` : \`Pocket money from \${name}\`;
    }

    const catSelect = document.getElementById('income-category');
    if (catSelect) {
      catSelect.value = 'Family Support';
    }
  }`;

    if (js.includes(targetIncomeCode)) {
      js = js.replace(targetIncomeCode, newIncomeCode);
      console.log('Updated openIncomeModal & added selectPocketMoneyGiver in', filePath);
    }

    // Enhance handleSaveIncome
    const targetHandleSave = `  handleSaveIncome(formData) {
    const incomeData = {
      title: formData.get('title').trim(),
      amount: parseFloat(formData.get('amount')) || 0,
      category: formData.get('category'),
      date: formData.get('date') || this.currentDate,
      notes: formData.get('notes').trim()
    };

    if (!incomeData.title || incomeData.amount <= 0) {
      alert('Please provide a valid income source and amount');
      return false;
    }

    window.storage.addIncome(incomeData);
    if (window.app && window.app.showToast) {
      window.app.showToast('Income entry logged!', 'success');
    }

    this.render();
    if (window.app) window.app.updateSummaryMetrics();
    if (window.charts) window.charts.renderAll();
    return true;
  }`;

    const newHandleSave = `  handleSaveIncome(formData) {
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

    const incomeData = {
      title: title,
      amount: amount,
      category: category,
      paymentMethod: paymentMethod,
      date: date,
      notes: notes,
      giver: this.selectedGiver ? this.selectedGiver.name : ''
    };

    window.storage.addIncome(incomeData);

    const isPocket = (category === 'Family Support' || category === 'Pocket Money' || (this.selectedGiver && this.selectedGiver.name));
    if (window.app && window.app.showToast) {
      window.app.showToast(isPocket ? '💜 Pocket Money entry saved successfully!' : 'Income entry logged!', 'success');
    }

    const modal = document.getElementById('income-modal');
    if (modal) modal.classList.remove('active');

    this.render();
    if (window.app) window.app.updateSummaryMetrics();
    if (window.charts) window.charts.renderAll();
    return true;
  }`;

    if (js.includes(targetHandleSave)) {
      js = js.replace(targetHandleSave, newHandleSave);
      console.log('Updated handleSaveIncome in', filePath);
    }

    // Enhance renderIncomeList to show giver badge
    const oldIncomeRow = `<div style="font-size: 0.75rem; color: var(--text-muted);">\${inc.category || 'Income'} • \${inc.date}</div>`;
    const newIncomeRow = `<div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
            <span>\${inc.category || 'Income'} • \${inc.date}</span>
            \${inc.giver ? \`<span style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 99px; padding: 1px 7px; font-size: 0.7rem; font-weight: 700;">👤 \${this.escapeHtml(inc.giver)}</span>\` : ''}
          </div>`;

    if (js.includes(oldIncomeRow)) {
      js = js.replace(oldIncomeRow, newIncomeRow);
      console.log('Added giver badge to renderIncomeList in', filePath);
    }

    fs.writeFileSync(filePath, js, 'utf8');
  });
}

// 3. Update sw.js cache name to spendorio-v2.1.4
function patchSwJs() {
  ['public/sw.js', 'docs/sw.js'].forEach(filePath => {
    let sw = fs.readFileSync(filePath, 'utf8');
    sw = sw.replace('spendorio-v2.1.3', 'spendorio-v2.1.4');
    fs.writeFileSync(filePath, sw, 'utf8');
    console.log('Bumped SW to spendorio-v2.1.4 in', filePath);
  });
}

patchIndexHtml();
patchExpensesJs();
patchSwJs();
console.log('Done patching side-by-side pocket money feature!');
