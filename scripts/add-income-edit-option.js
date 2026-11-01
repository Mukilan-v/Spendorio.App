const fs = require('fs');
const path = require('path');

// 1. UPDATE storage.js: add updateIncome()
function updateStorageJs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const targetStr = `  deleteIncome(incomeId) {`;
  const updateIncomeCode = `  updateIncome(updatedIncome) {
    if (!updatedIncome || !updatedIncome.id) return null;
    const targetId = String(updatedIncome.id).trim();
    const incomes = this.getIncomes();
    const index = incomes.findIndex(i => String(i.id).trim() === targetId);
    if (index !== -1) {
      incomes[index] = {
        ...incomes[index],
        ...updatedIncome,
        amount: parseFloat(updatedIncome.amount) || 0,
        updatedAt: new Date().toISOString()
      };
      this.saveIncomes(incomes);
      return incomes[index];
    }
    return null;
  }

  deleteIncome(incomeId) {`;

  if (!content.includes('updateIncome(updatedIncome)')) {
    content = content.replace(targetStr, updateIncomeCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated updateIncome in ${filePath}`);
  } else {
    console.log(`updateIncome already exists in ${filePath}`);
  }
}

// 2. UPDATE index.html: add #income-id hidden input and modal z-index
function updateIndexHtml(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add z-index to income modal overlay so it renders cleanly above stat-details-modal
  content = content.replace(
    `<div class="modal-overlay" id="income-modal">`,
    `<div class="modal-overlay" id="income-modal" style="z-index: 1060;">`
  );

  // Add hidden incomeId input if not present
  const targetBody = `<form id="income-form">
        <div class="modal-body">`;
  const replacementBody = `<form id="income-form">
        <div class="modal-body">
          <input type="hidden" id="income-id" name="incomeId">`;

  if (!content.includes('id="income-id"')) {
    content = content.replace(targetBody, replacementBody);
    console.log(`Added #income-id to ${filePath}`);
  }

  // Bump version string
  content = content.replace(/20261101_v29_hide_giver_in_income_mode/g, '20261101_v30_income_edit_option');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated HTML in ${filePath}`);
}

// 3. UPDATE style.css: add .task-action-btn.edit:hover
function updateStyleCss(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const target = `.task-action-btn.delete:hover {
  color: var(--danger);
}`;

  const replacement = `.task-action-btn.edit:hover {
  color: var(--primary);
}

.task-action-btn.delete:hover {
  color: var(--danger);
}`;

  if (!content.includes('.task-action-btn.edit:hover')) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated CSS in ${filePath}`);
  }
}

// 4. UPDATE expenses.js: add openEditIncomeModal, update setIncomeModalMode, openIncomeModal, handleSaveIncome, renderIncomeList, renderPocketGiverPanel
function updateExpensesJs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // In renderPocketGiverPanel: add edit button near delete
  const oldGiverDelete = `                    <button class="task-action-btn delete" style="padding:2px; font-size:0.7rem;" onclick="window.expenses.handleDeleteIncome('\${item.id}')" title="Delete">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>`;

  const newGiverDelete = `                    <button class="task-action-btn edit" style="padding:2px; font-size:0.7rem;" onclick="window.expenses.openEditIncomeModal('\${item.id}')" title="Edit Pocket Money">
                      <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="task-action-btn delete" style="padding:2px; font-size:0.7rem;" onclick="window.expenses.handleDeleteIncome('\${item.id}')" title="Delete">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>`;

  if (content.includes(oldGiverDelete)) {
    content = content.replace(oldGiverDelete, newGiverDelete);
    console.log(`Added edit button to renderPocketGiverPanel in ${filePath}`);
  }

  // In renderIncomeList: add edit button near delete
  const oldIncomeListDelete = `        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="cost-cell cost-income">+\${currency}\${parseFloat(inc.amount).toLocaleString()}</span>
          <button class="task-action-btn delete" onclick="window.expenses.handleDeleteIncome('\${inc.id}')" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>`;

  const newIncomeListDelete = `        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="cost-cell cost-income">+\${currency}\${parseFloat(inc.amount).toLocaleString()}</span>
          <button class="task-action-btn edit" onclick="window.expenses.openEditIncomeModal('\${inc.id}')" title="Edit Income">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="task-action-btn delete" onclick="window.expenses.handleDeleteIncome('\${inc.id}')" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>`;

  if (content.includes(oldIncomeListDelete)) {
    content = content.replace(oldIncomeListDelete, newIncomeListDelete);
    console.log(`Added edit button to renderIncomeList in ${filePath}`);
  }

  // In openIncomeModal: reset income-id input
  const oldOpenIncomeModal = `  openIncomeModal(mode = 'income', giverName = '') {
    const modal = document.getElementById('income-modal');
    const form = document.getElementById('income-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('income-date').value = this.currentDate;`;

  const newOpenIncomeModal = `  openIncomeModal(mode = 'income', giverName = '') {
    const modal = document.getElementById('income-modal');
    const form = document.getElementById('income-form');
    if (!modal || !form) return;

    form.reset();
    const idInput = document.getElementById('income-id');
    if (idInput) idInput.value = '';
    document.getElementById('income-date').value = this.currentDate;`;

  if (content.includes(oldOpenIncomeModal)) {
    content = content.replace(oldOpenIncomeModal, newOpenIncomeModal);
  }

  // In setIncomeModalMode: support edit mode labels and submit text
  const oldSetMode = `  setIncomeModalMode(mode) {
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

  const newSetMode = `  setIncomeModalMode(mode) {
    this.currentIncomeMode = (mode === 'pocket') ? 'pocket' : 'income';
    const idInput = document.getElementById('income-id');
    const isEditing = Boolean(idInput && idInput.value);
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
      if (titleEl) {
        titleEl.innerHTML = isEditing
          ? '<i class="fa-solid fa-pen-to-square" style="color: #8b5cf6;"></i> <span>Edit Pocket Money Entry</span>'
          : '<i class="fa-solid fa-hand-holding-heart" style="color: #8b5cf6;"></i> <span>Log Pocket Money &amp; Family Support</span>';
      }
      if (titleLabel) titleLabel.textContent = 'Pocket Money / Source Title *';
      if (titleInput && (!titleInput.value || titleInput.value.startsWith('Salary') || titleInput.value.startsWith('Freelancing'))) {
        titleInput.placeholder = 'e.g., Brother gave money, Support from Dad';
      }
      if (amountInput) amountInput.style.color = '#8b5cf6';
      if (catSelect && !isEditing) {
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
        submitBtn.innerHTML = isEditing
          ? '<i class="fa-solid fa-check"></i> <span>Update Pocket Money</span>'
          : '<i class="fa-solid fa-check"></i> <span>Save Pocket Money</span>';
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
      if (titleEl) {
        titleEl.innerHTML = isEditing
          ? '<i class="fa-solid fa-pen-to-square" style="color: var(--success);"></i> <span>Edit Earned Income Entry</span>'
          : '<i class="fa-solid fa-wallet" style="color: var(--success);"></i> <span>Log Salary / Other Income</span>';
      }
      if (titleLabel) titleLabel.textContent = 'Income Title / Source *';
      if (titleInput && (!titleInput.value || titleInput.value.startsWith('Received from'))) {
        titleInput.placeholder = 'e.g., Monthly Salary, Freelancing, Dividend';
      }
      if (amountInput) amountInput.style.color = 'var(--success)';
      if (catSelect && !isEditing) {
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
        submitBtn.innerHTML = isEditing
          ? '<i class="fa-solid fa-check"></i> <span>Update Income</span>'
          : '<i class="fa-solid fa-check"></i> <span>Save Income</span>';
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

  if (content.includes(oldSetMode)) {
    content = content.replace(oldSetMode, newSetMode);
  }

  // Add openEditIncomeModal method right above openIncomeModal
  const openEditCode = `  openEditIncomeModal(incomeId) {
    if (!incomeId) return;
    const incomes = window.storage.getIncomes();
    const inc = incomes.find(i => String(i.id) === String(incomeId));
    if (!inc) return;

    const modal = document.getElementById('income-modal');
    const form = document.getElementById('income-form');
    if (!modal || !form) return;

    form.reset();
    const idInput = document.getElementById('income-id');
    if (idInput) idInput.value = inc.id;

    const isPocket = (window.app && window.app.isPocketMoney)
      ? window.app.isPocketMoney(inc)
      : (inc.isPocketMoney === true || inc.category === 'Family Support' || inc.category === 'Pocket Money' || Boolean(inc.giver));

    const mode = isPocket ? 'pocket' : 'income';
    this.currentIncomeMode = mode;
    this.setIncomeModalMode(mode);

    const titleInput = document.getElementById('income-title');
    if (titleInput) titleInput.value = inc.title || '';

    const amountInput = document.getElementById('income-amount');
    if (amountInput) amountInput.value = inc.amount || '';

    const catSelect = document.getElementById('income-category');
    if (catSelect && inc.category) {
      let exists = Array.from(catSelect.options).some(o => o.value === inc.category);
      if (!exists) {
        const opt = document.createElement('option');
        opt.value = inc.category;
        opt.textContent = inc.category;
        catSelect.appendChild(opt);
      }
      catSelect.value = inc.category;
    }

    const dateInput = document.getElementById('income-date');
    if (dateInput) dateInput.value = inc.date || this.currentDate;

    const paymentSelect = document.getElementById('income-payment-method');
    if (paymentSelect && inc.paymentMethod) paymentSelect.value = inc.paymentMethod;

    const notesInput = document.getElementById('income-notes');
    if (notesInput) notesInput.value = inc.notes || '';

    if (isPocket && inc.giver) {
      this.selectPocketMoneyGiver(inc.giver);
    } else {
      this.selectedGiver = null;
      const previewEl = document.getElementById('income-giver-selected');
      if (previewEl) {
        previewEl.innerHTML = '<span style="color: var(--text-muted); font-weight: normal;">No individual selected yet (click a person above)</span>';
      }
    }

    modal.classList.add('active');
  }

  openPocketMoneyModal(giverName = '') {`;

  if (!content.includes('openEditIncomeModal(incomeId)')) {
    content = content.replace('  openPocketMoneyModal(giverName = \'\') {', openEditCode);
    console.log(`Added openEditIncomeModal in ${filePath}`);
  }

  // In handleSaveIncome: update existing income if incomeId is provided
  const oldSave = `  handleSaveIncome(formData) {
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

    const isPocket = (this.currentIncomeMode === 'pocket');

    const incomeData = {
      title: title,
      amount: amount,
      category: category,
      paymentMethod: paymentMethod,
      date: date,
      notes: notes,
      giver: isPocket && this.selectedGiver ? this.selectedGiver.name : '',
      isPocketMoney: isPocket
    };

    window.storage.addIncome(incomeData);

    const modal = document.getElementById('income-modal');
    if (modal) modal.classList.remove('active');

    if (window.app && window.app.showToast) {
      const typeLabel = isPocket
        ? (incomeData.giver ? \`Pocket money from \${incomeData.giver}\` : 'Pocket money')
        : 'Earned income';
      window.app.showToast(\`\${typeLabel} logged successfully!\`, 'success');
    }

    this.render();
    if (window.app && window.app.updateSummaryMetrics) {
      window.app.updateSummaryMetrics();
    }
    if (window.charts && window.charts.renderAll) {
      window.charts.renderAll();
    }
    return true;
  }`;

  const newSave = `  handleSaveIncome(formData) {
    const incomeId = (formData.get('incomeId') || '').trim();
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

    const isPocket = (this.currentIncomeMode === 'pocket');

    const incomeData = {
      title: title,
      amount: amount,
      category: category,
      paymentMethod: paymentMethod,
      date: date,
      notes: notes,
      giver: isPocket && this.selectedGiver ? this.selectedGiver.name : '',
      isPocketMoney: isPocket
    };

    if (incomeId) {
      window.storage.updateIncome({ id: incomeId, ...incomeData });
      if (window.app && window.app.showToast) {
        window.app.showToast(\`\${isPocket ? 'Pocket money' : 'Income'} entry updated!\`, 'success');
      }
    } else {
      window.storage.addIncome(incomeData);
      if (window.app && window.app.showToast) {
        const typeLabel = isPocket
          ? (incomeData.giver ? \`Pocket money from \${incomeData.giver}\` : 'Pocket money')
          : 'Earned income';
        window.app.showToast(\`\${typeLabel} logged successfully!\`, 'success');
      }
    }

    const modal = document.getElementById('income-modal');
    if (modal) modal.classList.remove('active');

    this.render();
    if (window.app) {
      if (window.app.updateSummaryMetrics) {
        window.app.updateSummaryMetrics();
      }
      if (window.app.activeStatType && window.app.renderStatDetailsModal) {
        window.app.renderStatDetailsModal(window.app.activeStatType);
      }
    }
    if (window.charts && window.charts.renderAll) {
      window.charts.renderAll();
    }
    return true;
  }`;

  if (content.includes(oldSave)) {
    content = content.replace(oldSave, newSave);
    console.log(`Updated handleSaveIncome in ${filePath}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// 5. UPDATE app.js: add edit buttons in stat-details-modal for pocket_money and incomes
function updateAppJs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Pocket money modal list
  const oldPocketDelete = `            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 8px;">
              <div style="font-weight: 800; font-size: 1.05rem; color: #8b5cf6; white-space: nowrap;">
                +\${currency}\${parseFloat(i.amount).toLocaleString()}
              </div>
              <button type="button" class="task-action-btn delete" style="padding: 3px 6px; font-size: 0.75rem;" onclick="if (window.expenses) window.expenses.handleDeleteIncome('\${i.id}');" title="Delete pocket money record">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>`;

  const newPocketDelete = `            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 8px;">
              <div style="font-weight: 800; font-size: 1.05rem; color: #8b5cf6; white-space: nowrap;">
                +\${currency}\${parseFloat(i.amount).toLocaleString()}
              </div>
              <button type="button" class="task-action-btn edit" style="padding: 3px 6px; font-size: 0.75rem;" onclick="if (window.expenses) window.expenses.openEditIncomeModal('\${i.id}');" title="Edit pocket money record">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button type="button" class="task-action-btn delete" style="padding: 3px 6px; font-size: 0.75rem;" onclick="if (window.expenses) window.expenses.handleDeleteIncome('\${i.id}');" title="Delete pocket money record">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>`;

  if (content.includes(oldPocketDelete)) {
    content = content.replace(oldPocketDelete, newPocketDelete);
    console.log(`Added edit button to pocket_money modal in ${filePath}`);
  }

  // Earned income modal list
  const oldIncomeDelete = `            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 8px;">
              <div style="font-weight: 700; font-size: 0.96rem; color: var(--success);">
                +\${currency}\${parseFloat(inc.amount || 0).toLocaleString()}
              </div>
              <button type="button" class="task-action-btn delete" style="padding: 3px 6px; font-size: 0.75rem;" onclick="if (window.expenses) window.expenses.handleDeleteIncome('\${inc.id}');" title="Delete income record">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>`;

  const newIncomeDelete = `            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 8px;">
              <div style="font-weight: 700; font-size: 0.96rem; color: var(--success);">
                +\${currency}\${parseFloat(inc.amount || 0).toLocaleString()}
              </div>
              <button type="button" class="task-action-btn edit" style="padding: 3px 6px; font-size: 0.75rem;" onclick="if (window.expenses) window.expenses.openEditIncomeModal('\${inc.id}');" title="Edit income record">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button type="button" class="task-action-btn delete" style="padding: 3px 6px; font-size: 0.75rem;" onclick="if (window.expenses) window.expenses.handleDeleteIncome('\${inc.id}');" title="Delete income record">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>`;

  if (content.includes(oldIncomeDelete)) {
    content = content.replace(oldIncomeDelete, newIncomeDelete);
    console.log(`Added edit button to incomes modal in ${filePath}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// 6. UPDATE sw.js: bump cache
function updateSw(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/spendorio-v2\.2\.2/g, 'spendorio-v2.2.3');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated SW cache in ${filePath}`);
}

// Execute on both public and docs
updateStorageJs('public/js/storage.js');
updateStorageJs('docs/js/storage.js');

updateIndexHtml('public/index.html');
updateIndexHtml('docs/index.html');

updateStyleCss('public/css/style.css');
updateStyleCss('docs/css/style.css');

updateExpensesJs('public/js/expenses.js');
updateExpensesJs('docs/js/expenses.js');

updateAppJs('public/js/app.js');
updateAppJs('docs/js/app.js');

updateSw('public/sw.js');
updateSw('docs/sw.js');

console.log('All updates completed successfully!');
