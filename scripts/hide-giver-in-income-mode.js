const fs = require('fs');
const path = require('path');

function updateHtml(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Change mode button onclick to 'income'
  content = content.replace(
    `onclick="window.expenses.setIncomeModalMode('general')"`,
    `onclick="window.expenses.setIncomeModalMode('income')"`
  );

  // 2. Add id="income-title-label" to title label if not already present
  content = content.replace(
    `<label class="form-label" style="font-weight: 700;">Pocket Money / Source Title *</label>`,
    `<label class="form-label" id="income-title-label" style="font-weight: 700;">Pocket Money / Source Title *</label>`
  );

  // 3. Wrap who gave pocket money section in <div id="income-giver-section">
  const giverTarget = `<!-- Quick Individual Giver Chips -->`;
  if (!content.includes('id="income-giver-section"')) {
    // Find the enclosing div
    const targetBlock = `            <!-- RIGHT COLUMN: Individual Who Gave Pocket Money & Notes -->
            <div style="display: flex; flex-direction: column; gap: 0.85rem; background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div>
                <label class="form-label" style="font-weight: 700; color: #8b5cf6; display: flex; align-items: center; justify-content: space-between;">
                  <span><i class="fa-solid fa-users"></i> Who Gave This Pocket Money?</span>
                  <span style="font-size: 0.72rem; font-weight: normal; color: var(--text-muted);">(Tap Giver)</span>
                </label>`;

    const replacementBlock = `            <!-- RIGHT COLUMN: Individual Who Gave Pocket Money & Notes -->
            <div style="display: flex; flex-direction: column; gap: 0.85rem; background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div id="income-giver-section">
                <label class="form-label" style="font-weight: 700; color: #8b5cf6; display: flex; align-items: center; justify-content: space-between;">
                  <span><i class="fa-solid fa-users"></i> Who Gave This Pocket Money?</span>
                  <span style="font-size: 0.72rem; font-weight: normal; color: var(--text-muted);">(Tap Giver)</span>
                </label>`;

    if (content.includes(targetBlock)) {
      content = content.replace(targetBlock, replacementBlock);
    } else {
      console.warn('Could not find exact targetBlock in ' + filePath);
    }

    // Add closing tag before Notes & Remarks form-group
    const notesTarget = `              <div class="form-group" style="margin: 0; flex: 1; display: flex; flex-direction: column;">
                <label class="form-label" style="font-weight: 700;">Notes &amp; Remarks</label>`;
    // Note that earlier we had:
    //   </div>
    // </div>
    // <div class="form-group" ...>
    // Wait, let's look at the exact HTML lines around 1855-1865:
  }

  // 4. Update cache buster versions
  content = content.replace(/20261101_v28_pure_english_relations/g, '20261101_v29_hide_giver_in_income_mode');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated HTML: ${filePath}`);
}

function updateExpensesJs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace openIncomeModal
  const oldOpenIncomeModal = `  openIncomeModal(mode = 'income', giverName = '') {
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
  }`;

  const newOpenIncomeModal = `  openIncomeModal(mode = 'income', giverName = '') {
    const modal = document.getElementById('income-modal');
    const form = document.getElementById('income-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('income-date').value = this.currentDate;
    this.selectedGiver = null;
    this.currentIncomeMode = (mode === 'pocket') ? 'pocket' : 'income';

    const previewEl = document.getElementById('income-giver-selected');
    if (previewEl) {
      previewEl.innerHTML = '<span style="color: var(--text-muted); font-weight: normal;">No individual selected yet (click a person above)</span>';
    }

    this.setIncomeModalMode(mode);

    if (this.currentIncomeMode === 'pocket' && giverName) {
      this.selectPocketMoneyGiver(giverName);
    }

    modal.classList.add('active');
  }`;

  if (content.includes(oldOpenIncomeModal)) {
    content = content.replace(oldOpenIncomeModal, newOpenIncomeModal);
  } else {
    console.warn('Could not match oldOpenIncomeModal in ' + filePath);
  }

  // Replace setIncomeModalMode
  const oldSetIncomeModalMode = `  setIncomeModalMode(mode) {
    this.currentIncomeMode = mode;
    const titleEl = document.getElementById('income-modal-title');
    const titleInput = document.getElementById('income-title');
    const catSelect = document.getElementById('income-category');
    const submitBtn = document.getElementById('income-submit-btn');
    const btnPocket = document.getElementById('btn-mode-pocket');
    const btnIncome = document.getElementById('btn-mode-income');

    if (mode === 'pocket') {
      if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-hand-holding-heart" style="color: #8b5cf6;"></i> <span>Log Pocket Money &amp; Family Support</span>';
      if (titleInput && !titleInput.value) titleInput.placeholder = 'e.g., Brother gave money, Support from Dad';
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
  }`;

  const newSetIncomeModalMode = `  setIncomeModalMode(mode) {
    this.currentIncomeMode = (mode === 'pocket') ? 'pocket' : 'income';
    const titleEl = document.getElementById('income-modal-title');
    const titleLabel = document.getElementById('income-title-label');
    const titleInput = document.getElementById('income-title');
    const amountInput = document.getElementById('income-amount');
    const catSelect = document.getElementById('income-category');
    const notesInput = document.getElementById('income-notes');
    const submitBtn = document.getElementById('income-submit-btn');
    const btnPocket = document.getElementById('btn-mode-pocket');
    const btnIncome = document.getElementById('btn-mode-income');
    const giverSec = document.getElementById('income-giver-section');
    const previewEl = document.getElementById('income-giver-selected');

    if (this.currentIncomeMode === 'pocket') {
      if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-hand-holding-heart" style="color: #8b5cf6;"></i> <span>Log Pocket Money &amp; Family Support</span>';
      if (titleLabel) titleLabel.textContent = 'Pocket Money / Source Title *';
      if (titleInput && (!titleInput.value || titleInput.value.startsWith('Salary') || titleInput.value.startsWith('Freelancing'))) {
        titleInput.placeholder = 'e.g., Brother gave money, Support from Dad';
      }
      if (amountInput) amountInput.style.color = '#8b5cf6';
      if (catSelect) {
        catSelect.innerHTML = \`
          <option value="Family Support" selected>Family Support &amp; Pocket Money</option>
          <option value="Pocket Money">Pocket Money / Allowance</option>
          <option value="Other">Other Support</option>
        \`;
      }
      if (notesInput) notesInput.placeholder = 'e.g., Support for fees, Personal allowance...';
      if (giverSec) giverSec.style.display = 'block';
      if (submitBtn) {
        submitBtn.style.background = '#8b5cf6';
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Save Pocket Money</span>';
      }
      if (btnPocket) {
        btnPocket.style.background = '#8b5cf6';
        btnPocket.style.color = '#fff';
      }
      if (btnIncome) {
        btnIncome.style.background = 'transparent';
        btnIncome.style.color = 'var(--text-secondary)';
      }
    } else {
      // Earned Income (Salary / Other Income) Mode - Hide Pocket Money Givers
      if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-wallet" style="color: var(--success);"></i> <span>Log Salary / Other Income</span>';
      if (titleLabel) titleLabel.textContent = 'Income Title / Source *';
      if (titleInput && (!titleInput.value || titleInput.value.startsWith('Received from'))) {
        titleInput.placeholder = 'e.g., Monthly Salary, Freelancing, Dividend';
      }
      if (amountInput) amountInput.style.color = 'var(--success)';
      if (catSelect) {
        catSelect.innerHTML = \`
          <option value="Salary" selected>Salary / Wages</option>
          <option value="Freelancing">Freelancing / Side Gig</option>
          <option value="Investment">Investment / Dividend</option>
          <option value="Bonus">Bonus / Incentive</option>
          <option value="Other">Other Earned Income</option>
        \`;
      }
      if (notesInput) notesInput.placeholder = 'e.g., Company name, Project milestone, Client details...';
      if (giverSec) giverSec.style.display = 'none';
      this.selectedGiver = null;
      if (previewEl) {
        previewEl.innerHTML = '<span style="color: var(--text-muted); font-weight: normal;">No individual selected yet (click a person above)</span>';
      }
      if (submitBtn) {
        submitBtn.style.background = 'var(--success)';
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Save Income</span>';
      }
      if (btnPocket) {
        btnPocket.style.background = 'transparent';
        btnPocket.style.color = 'var(--text-secondary)';
      }
      if (btnIncome) {
        btnIncome.style.background = 'var(--success)';
        btnIncome.style.color = '#fff';
      }
    }
  }`;

  if (content.includes(oldSetIncomeModalMode)) {
    content = content.replace(oldSetIncomeModalMode, newSetIncomeModalMode);
  } else {
    console.warn('Could not match oldSetIncomeModalMode in ' + filePath);
  }

  // Replace handleSaveIncome
  const oldHandleSaveIncome = `    const isPocket = (
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
    };`;

  const newHandleSaveIncome = `    const isPocket = (this.currentIncomeMode === 'pocket');

    const incomeData = {
      title: title,
      amount: amount,
      category: category,
      paymentMethod: paymentMethod,
      date: date,
      notes: notes,
      giver: isPocket && this.selectedGiver ? this.selectedGiver.name : '',
      isPocketMoney: isPocket
    };`;

  if (content.includes(oldHandleSaveIncome)) {
    content = content.replace(oldHandleSaveIncome, newHandleSaveIncome);
  } else {
    console.warn('Could not match oldHandleSaveIncome in ' + filePath);
  }

  // Replace renderIncomeList to filter strictly earned incomes
  const oldRenderIncomeList = `  renderIncomeList() {
    const incomeListEl = document.getElementById('income-list');
    const incomeTotalEl = document.getElementById('income-total-display');
    const currency = window.storage.getCurrencySymbol();
    if (!incomeListEl) return;

    const currentMonth = this.currentDate.substring(0, 7);
    const incomes = window.storage.getIncomes().filter(i => i.date && i.date.startsWith(currentMonth));
    const totalIncome = incomes.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);

    if (incomeTotalEl) {
      incomeTotalEl.textContent = \`\${currency}\${totalIncome.toLocaleString()}\`;
    }

    if (incomes.length === 0) {
      incomeListEl.innerHTML = \`
        <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">
          No income records added for this month yet.
        </div>
      \`;
      return;
    }

        incomeListEl.innerHTML = incomes.map(inc => {
      const isPocketEntry = (inc.isPocketMoney === true || inc.category === 'Family Support' || inc.category === 'Pocket Money' || inc.giver || (window.app && window.app.isPocketMoney && window.app.isPocketMoney(inc)));
      return \`
      <div class="task-card" style="align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem;">
        <div>
          <div style="font-weight: 600; font-size: 0.875rem;">\${this.escapeHtml(inc.title)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
            <span>\${inc.category || 'Income'} • \${inc.date}</span>
            \${isPocketEntry ? \`<span style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 99px; padding: 1px 7px; font-size: 0.7rem; font-weight: 700;">💜 Pocket Money\${inc.giver ? \` • \${this.escapeHtml(inc.giver)}\` : ''}</span>\` : \`<span style="background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 99px; padding: 1px 7px; font-size: 0.7rem; font-weight: 700;">💼 Earned</span>\`}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="cost-cell cost-income">+\${currency}\${parseFloat(inc.amount).toLocaleString()}</span>
          <button class="task-action-btn delete" onclick="window.expenses.handleDeleteIncome('\${inc.id}')" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    \`;
    }).join('');
  }`;

  const newRenderIncomeList = `  renderIncomeList() {
    const incomeListEl = document.getElementById('income-list');
    const incomeTotalEl = document.getElementById('income-total-display');
    const currency = window.storage.getCurrencySymbol();
    if (!incomeListEl) return;

    const currentMonth = this.currentDate.substring(0, 7);
    const isPocket = (inc) => window.app && window.app.isPocketMoney ? window.app.isPocketMoney(inc) : (inc.category === 'Family Support' || inc.category === 'Pocket Money' || inc.giver);
    // Strictly earned income in Monthly Incomes card (excludes pocket money)
    const incomes = window.storage.getIncomes().filter(i => i.date && i.date.startsWith(currentMonth) && !isPocket(i));
    const totalIncome = incomes.reduce((acc, cur) => acc + (parseFloat(cur.amount) || 0), 0);

    if (incomeTotalEl) {
      incomeTotalEl.textContent = \`\${currency}\${totalIncome.toLocaleString()}\`;
    }

    if (incomes.length === 0) {
      incomeListEl.innerHTML = \`
        <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">
          No earned income records added for this month yet.
        </div>
      \`;
      return;
    }

    incomeListEl.innerHTML = incomes.map(inc => {
      return \`
      <div class="task-card" style="align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem;">
        <div>
          <div style="font-weight: 600; font-size: 0.875rem;">\${this.escapeHtml(inc.title)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
            <span>\${inc.category || 'Income'} • \${inc.date}</span>
            <span style="background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 99px; padding: 1px 7px; font-size: 0.7rem; font-weight: 700;">💼 Earned</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="cost-cell cost-income">+\${currency}\${parseFloat(inc.amount).toLocaleString()}</span>
          <button class="task-action-btn delete" onclick="window.expenses.handleDeleteIncome('\${inc.id}')" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    \`;
    }).join('');
  }`;

  if (content.includes(oldRenderIncomeList)) {
    content = content.replace(oldRenderIncomeList, newRenderIncomeList);
  } else {
    console.warn('Could not match oldRenderIncomeList in ' + filePath);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated JS: ${filePath}`);
}

function updateSw(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/spendorio-v2\.2\.1/g, 'spendorio-v2.2.2');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated SW: ${filePath}`);
}

// Check index.html exact lines for income-giver-section
function patchGiverSection(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  
  // Exact block in index.html around line 1820
  const searchStr = `            <!-- RIGHT COLUMN: Individual Who Gave Pocket Money & Notes -->
            <div style="display: flex; flex-direction: column; gap: 0.85rem; background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div>
                <label class="form-label" style="font-weight: 700; color: #8b5cf6; display: flex; align-items: center; justify-content: space-between;">
                  <span><i class="fa-solid fa-users"></i> Who Gave This Pocket Money?</span>
                  <span style="font-size: 0.72rem; font-weight: normal; color: var(--text-muted);">(Tap Giver)</span>
                </label>`;

  const replaceStr = `            <!-- RIGHT COLUMN: Individual Who Gave Pocket Money & Notes -->
            <div style="display: flex; flex-direction: column; gap: 0.85rem; background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div id="income-giver-section">
                <label class="form-label" style="font-weight: 700; color: #8b5cf6; display: flex; align-items: center; justify-content: space-between;">
                  <span><i class="fa-solid fa-users"></i> Who Gave This Pocket Money?</span>
                  <span style="font-size: 0.72rem; font-weight: normal; color: var(--text-muted);">(Tap Giver)</span>
                </label>`;

  if (html.includes(searchStr)) {
    html = html.replace(searchStr, replaceStr);
    console.log(`Patched giver section start in ${filePath}`);
  } else {
    console.log(`SearchStr not found in ${filePath}`);
  }

  // Now replace the end of that section:
  const searchEnd = `                <div id="income-giver-selected" style="margin-top: 8px; font-size: 0.8rem; font-weight: 700; color: #8b5cf6;">
                  <span style="color: var(--text-muted); font-weight: normal;">No individual selected yet (click a person above)</span>
                </div>
              </div>

              <div class="form-group" style="margin: 0; flex: 1; display: flex; flex-direction: column;">`;

  const replaceEnd = `                <div id="income-giver-selected" style="margin-top: 8px; font-size: 0.8rem; font-weight: 700; color: #8b5cf6;">
                  <span style="color: var(--text-muted); font-weight: normal;">No individual selected yet (click a person above)</span>
                </div>
              </div>

              <div class="form-group" style="margin: 0; flex: 1; display: flex; flex-direction: column;">`;
  // The enclosing div was <div> ... </div> which is now <div id="income-giver-section"> ... </div>

  fs.writeFileSync(filePath, html, 'utf8');
}

// Execute
patchGiverSection('public/index.html');
patchGiverSection('docs/index.html');
updateHtml('public/index.html');
updateHtml('docs/index.html');
updateExpensesJs('public/js/expenses.js');
updateExpensesJs('docs/js/expenses.js');
updateSw('public/sw.js');
updateSw('docs/sw.js');

console.log('Done!');
