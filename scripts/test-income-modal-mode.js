const assert = require('assert');
const fs = require('fs');

// Simple DOM Mock
class ElementMock {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.style = {};
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.placeholder = '';
    this.classList = {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    };
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
  getElementById(id) {
    return elements[id] || getOrCreate(id);
  }
};

// Initialize elements matching index.html
getOrCreate('income-modal', 'div');
getOrCreate('income-form', 'form');
elements['income-form'].reset = function() {};
getOrCreate('income-modal-title', 'h3');
getOrCreate('income-title-label', 'label');
getOrCreate('income-title', 'input');
getOrCreate('income-amount', 'input');
getOrCreate('income-category', 'select');
getOrCreate('income-date', 'input');
getOrCreate('income-notes', 'textarea');
getOrCreate('income-submit-btn', 'button');
getOrCreate('btn-mode-pocket', 'button');
getOrCreate('btn-mode-income', 'button');
getOrCreate('income-giver-section', 'div');
getOrCreate('income-giver-selected', 'div');
getOrCreate('income-list', 'div');
getOrCreate('income-total-display', 'span');

// Mock window and storage
let storedIncomes = [];
global.window = {
  storage: {
    getCurrencySymbol: () => '₹',
    getIncomes: () => storedIncomes,
    getExpenses: () => [],
    getCategoryBudgets: () => ({}),
    getDaySummary: () => ({ totalExpense: 0, routineExpense: 0, standaloneExpense: 0, dailyBudget: 0 }),
    getMonthSummary: () => ({ totalExpense: 0, routineExpense: 0, standaloneExpense: 0, monthlyBudget: 0 }),
    getSettings: () => ({ monthlyBudget: 0 }),
    addIncome: (inc) => { storedIncomes.push(inc); }
  },
  app: {
    isPocketMoney: (inc) => Boolean(inc.isPocketMoney === true || inc.giver || inc.category === 'Family Support' || inc.category === 'Pocket Money'),
    showToast: () => {},
    updateSummaryMetrics: () => {}
  },
  charts: {
    renderAll: () => {}
  }
};

// Load ExpenseManager class from public/js/expenses.js
const code = fs.readFileSync('public/js/expenses.js', 'utf8');
eval(code);

const mgr = window.expenses;
assert(mgr, 'ExpenseManager instance must exist');

console.log('--- TEST 1: Open in earned income mode ---');
mgr.openIncomeModal('income');
assert.strictEqual(mgr.currentIncomeMode, 'income', 'currentIncomeMode should be income');
assert.strictEqual(elements['income-giver-section'].style.display, 'none', 'Giver section must be HIDDEN in income mode');
assert.strictEqual(elements['income-title-label'].textContent, 'Income Title / Source *', 'Title label must reflect earned income');
assert(elements['income-category'].innerHTML.includes('Salary / Wages'), 'Categories must include Salary');
assert(!elements['income-category'].innerHTML.includes('Family Support'), 'Categories must NOT include Family Support in income mode');
assert.strictEqual(mgr.selectedGiver, null, 'selectedGiver must be null in income mode');
console.log('PASS: Earned income mode hides giver section and sets proper fields.');

console.log('--- TEST 2: Save earned income ---');
const earnedFormData = new Map([
  ['title', 'October Salary'],
  ['amount', '45000'],
  ['category', 'Salary'],
  ['paymentMethod', 'Bank Transfer'],
  ['date', mgr.currentDate],
  ['notes', 'Direct company bank deposit']
]);
mgr.handleSaveIncome(earnedFormData);
const savedEarned = storedIncomes[storedIncomes.length - 1];
assert.strictEqual(savedEarned.title, 'October Salary');
assert.strictEqual(savedEarned.giver, '', 'Giver must be empty string for earned income');
assert.strictEqual(savedEarned.isPocketMoney, false, 'isPocketMoney must be false for earned income');
console.log('PASS: Earned income saved with giver="" and isPocketMoney=false.');

console.log('--- TEST 3: Switch to pocket money mode ---');
mgr.setIncomeModalMode('pocket');
assert.strictEqual(mgr.currentIncomeMode, 'pocket', 'currentIncomeMode should be pocket');
assert.strictEqual(elements['income-giver-section'].style.display, 'block', 'Giver section must be VISIBLE in pocket mode');
assert.strictEqual(elements['income-title-label'].textContent, 'Pocket Money / Source Title *', 'Title label must reflect pocket money');
assert(elements['income-category'].innerHTML.includes('Family Support &amp; Pocket Money'), 'Categories must include Family Support');

mgr.selectPocketMoneyGiver('Dad', '👨', '#3b82f6');
assert.strictEqual(mgr.selectedGiver.name, 'Dad', 'selectedGiver should be Dad');

const pocketFormData = new Map([
  ['title', 'Received from Dad'],
  ['amount', '1000'],
  ['category', 'Family Support'],
  ['paymentMethod', 'UPI'],
  ['date', mgr.currentDate],
  ['notes', 'Pocket money from Dad']
]);
mgr.handleSaveIncome(pocketFormData);
const savedPocket = storedIncomes[storedIncomes.length - 1];
assert.strictEqual(savedPocket.title, 'Received from Dad');
assert.strictEqual(savedPocket.giver, 'Dad', 'Giver must be Dad for pocket money');
assert.strictEqual(savedPocket.isPocketMoney, true, 'isPocketMoney must be true for pocket money');
console.log('PASS: Pocket money saved with giver="Dad" and isPocketMoney=true.');

console.log('--- TEST 4: Switch back to income mode ---');
mgr.setIncomeModalMode('income');
assert.strictEqual(mgr.currentIncomeMode, 'income');
assert.strictEqual(elements['income-giver-section'].style.display, 'none', 'Giver section must be HIDDEN when returning to income mode');
assert.strictEqual(mgr.selectedGiver, null, 'selectedGiver must be reset to null');
console.log('PASS: Returning to income mode hides giver section and resets selectedGiver.');

console.log('--- TEST 5: renderIncomeList strictly includes earned incomes ---');
mgr.renderIncomeList();
assert.strictEqual(elements['income-total-display'].textContent, '₹45,000', 'Total Income displayed must strictly be ₹45,000 (excluding pocket money)');
assert(elements['income-list'].innerHTML.includes('October Salary'), 'List must include October Salary');
assert(!elements['income-list'].innerHTML.includes('Received from Dad'), 'List must NOT include pocket money from Dad');
assert(!elements['income-list'].innerHTML.includes('Pocket Money • Dad'), 'List must NOT include giver details');
assert(elements['income-list'].innerHTML.includes('💼 Earned'), 'List must render 💼 Earned tag');
console.log('PASS: Monthly Incomes board strictly displays earned income and excludes pocket money and giver details.');

console.log('\nAll tests passed successfully!');
