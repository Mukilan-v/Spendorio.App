const fs = require('fs');

// Patch storage.js to guard against bounce-back during cloud sync
function patchStorage() {
  ['public/js/storage.js', 'docs/js/storage.js'].forEach(file => {
    let code = fs.readFileSync(file, 'utf8');

    // In saveTasks
    if (!code.includes('if (this._isSyncingFromCloud) return;')) {
      code = code.replace(
        'saveTasks(tasks) {\n    const isGuest = this.isCurrentGuest();\n    const key = this.getUserStorageKey(STORAGE_KEYS.TASKS);\n    localStorage.setItem(key, JSON.stringify(tasks));',
        'saveTasks(tasks) {\n    const isGuest = this.isCurrentGuest();\n    const key = this.getUserStorageKey(STORAGE_KEYS.TASKS);\n    localStorage.setItem(key, JSON.stringify(tasks));\n    if (this._isSyncingFromCloud) return;'
      );

      code = code.replace(
        'saveExpenses(expenses) {\n    const isGuest = this.isCurrentGuest();\n    const key = this.getUserStorageKey(STORAGE_KEYS.EXPENSES);\n    localStorage.setItem(key, JSON.stringify(expenses));',
        'saveExpenses(expenses) {\n    const isGuest = this.isCurrentGuest();\n    const key = this.getUserStorageKey(STORAGE_KEYS.EXPENSES);\n    localStorage.setItem(key, JSON.stringify(expenses));\n    if (this._isSyncingFromCloud) return;'
      );

      code = code.replace(
        'saveIncomes(incomes) {\n    const isGuest = this.isCurrentGuest();\n    const key = this.getUserStorageKey(STORAGE_KEYS.INCOMES);\n    localStorage.setItem(key, JSON.stringify(incomes));',
        'saveIncomes(incomes) {\n    const isGuest = this.isCurrentGuest();\n    const key = this.getUserStorageKey(STORAGE_KEYS.INCOMES);\n    localStorage.setItem(key, JSON.stringify(incomes));\n    if (this._isSyncingFromCloud) return;'
      );
    }

    fs.writeFileSync(file, code, 'utf8');
  });
  console.log('storage.js patched with _isSyncingFromCloud guard!');
}

patchStorage();
