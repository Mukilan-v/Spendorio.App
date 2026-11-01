const assert = require('assert');
const fs = require('fs');

// DOM Mock
class ElementMock {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.style = {};
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.placeholder = '';
    this.options = [];
    this.classList = {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    };
  }
  appendChild(child) {
    this.options.push(child);
  }
}

const elements = {};
function getOrCreate(id, tagName = 'div') {
  if (!elements[id]) {
    elements[id] = new ElementMock(id, tagName);
  }
  return elements[id];
}

global.document = {
  addEventListener() {},
  getElementById(id) {
    return elements[id] || getOrCreate(id);
  },
  createElement(tag) {
    return new ElementMock('', tag);
  }
};

// Initialize DOM elements
getOrCreate('income-modal', 'div');
getOrCreate('income-form', 'form');
elements['income-form'].reset = function() {
  elements['income-id'].value = '';
  elements['income-title'].value = '';
  elements['income-amount'].value = '';
  elements['income-notes'].value = '';
};
getOrCreate('income-id', 'input');
getOrCreate('income-modal-title', 'h3');
getOrCreate('income-title-label', 'label');
getOrCreate('income-title', 'input');
getOrCreate('income-amount', 'input');
getOrCreate('income-category', 'select');
getOrCreate('income-date', 'input');
getOrCreate('income-payment-method', 'select');
getOrCreate('income-notes', 'textarea');
getOrCreate('income-submit-btn', 'button');
getOrCreate('btn-mode-pocket', 'button');
getOrCreate('btn-mode-income', 'button');
getOrCreate('income-giver-section', 'div');
getOrCreate('income-giver-selected', 'div');
getOrCreate('income-list', 'div');
getOrCreate('income-total-display', 'span');

// Mock localStorage & window
const storageStore = {};
global.localStorage = {
  getItem: (k) => storageStore[k] || null,
  setItem: (k, v) => { storageStore[k] = String(v); },
  removeItem: (k) => { delete storageStore[k]; }
};

let toastMsg = '';
let renderedStatType = '';
global.window = {
  addEventListener() {},
  location: { protocol: 'https:' },
  app: {
    isPocketMoney: (inc) => Boolean(inc.isPocketMoney === true || inc.giver || inc.category === 'Family Support' || inc.category === 'Pocket Money'),
    showToast: (msg) => { toastMsg = msg; },
    updateSummaryMetrics: () => {},
    activeStatType: 'pocket_money',
    renderStatDetailsModal: (type) => { renderedStatType = type; }
  },
  charts: {
    renderAll: () => {}
  }
};

// Load storage.js
const storageCode = fs.readFileSync('public/js/storage.js', 'utf8');
eval(storageCode);

// Load expenses.js
const expensesCode = fs.readFileSync('public/js/expenses.js', 'utf8');
eval(expensesCode);
const mgr = window.expenses;
assert(mgr, 'ExpenseManager instance must exist');

console.log('--- TEST 1: StorageManager addIncome & updateIncome ---');
const created = window.storage.addIncome({
  title: 'Dad cash support',
  amount: 1000,
  category: 'Family Support',
  paymentMethod: 'Cash',
  date: '2026-11-01',
  notes: 'Emergency allowance',
  giver: 'Dad',
  isPocketMoney: true
});

assert(created.id, 'Created income must have an ID');
assert.strictEqual(created.amount, 1000);

const updated = window.storage.updateIncome({
  id: created.id,
  title: 'Dad allowance',
  amount: 1500,
  category: 'Family Support',
  notes: 'Increased allowance'
});

assert.strictEqual(updated.id, created.id);
assert.strictEqual(updated.amount, 1500);
assert.strictEqual(updated.title, 'Dad allowance');
assert.strictEqual(updated.notes, 'Increased allowance');
console.log('PASS: StorageManager updateIncome updates fields accurately.');

console.log('--- TEST 2: openEditIncomeModal for Pocket Money entry ---');
mgr.openEditIncomeModal(created.id);
assert.strictEqual(elements['income-id'].value, created.id, 'Hidden income-id must be set');
assert.strictEqual(elements['income-title'].value, 'Dad allowance');
assert.strictEqual(elements['income-amount'].value, 1500);
assert.strictEqual(elements['income-notes'].value, 'Increased allowance');
assert.strictEqual(mgr.currentIncomeMode, 'pocket');
assert(elements['income-modal-title'].innerHTML.includes('Edit Pocket Money Entry'), 'Title must reflect editing pocket money');
assert(elements['income-submit-btn'].innerHTML.includes('Update Pocket Money'), 'Submit button must say Update Pocket Money');
console.log('PASS: openEditIncomeModal properly populates form in edit mode.');

console.log('--- TEST 3: handleSaveIncome in Edit Mode ---');
const editFormData = new Map([
  ['incomeId', created.id],
  ['title', 'Dad monthly pocket money'],
  ['amount', '2000'],
  ['category', 'Family Support'],
  ['paymentMethod', 'UPI'],
  ['date', '2026-11-01'],
  ['notes', 'Updated via edit modal']
]);

mgr.handleSaveIncome(editFormData);
assert.strictEqual(toastMsg, '💜 Pocket Money entry updated!');
assert.strictEqual(renderedStatType, 'pocket_money', 'Stat details modal should be re-rendered');

const finalCheck = window.storage.getIncomes().find(i => i.id === created.id);
assert.strictEqual(finalCheck.amount, 2000);
assert.strictEqual(finalCheck.title, 'Dad monthly pocket money');
console.log('PASS: handleSaveIncome updates income record and notifies user.');

console.log('--- TEST 4: HTML Template Edit Buttons Check ---');
const appJsCode = fs.readFileSync('public/js/app.js', 'utf8');
assert(appJsCode.includes("onclick=\"if (window.expenses) window.expenses.openEditIncomeModal('${i.id}');\" title=\"Edit pocket money record\""),
  'app.js must include edit button for pocket_money modal');
assert(appJsCode.includes("onclick=\"if (window.expenses) window.expenses.openEditIncomeModal('${inc.id}');\" title=\"Edit income record\""),
  'app.js must include edit button for incomes modal');

const expensesJsCode = fs.readFileSync('public/js/expenses.js', 'utf8');
assert(expensesJsCode.includes("onclick=\"window.expenses.openEditIncomeModal('${inc.id}')\" title=\"Edit Income\""),
  'expenses.js must include edit button in renderIncomeList');
assert(expensesJsCode.includes("onclick=\"window.expenses.openEditIncomeModal('${item.id}')\" title=\"Edit Pocket Money\""),
  'expenses.js must include edit button in renderPocketGiverPanel');

console.log('PASS: All edit buttons successfully verified in code.');
console.log('\nAll income edit tests passed with 100% precision!');
