/**
 * storage.js - Data Layer for Daily Routine Task & Cost Management System
 */

const STORAGE_KEYS = {
  TASKS: 'taskcost_tasks',
  EXPENSES: 'taskcost_expenses',
  INCOMES: 'taskcost_incomes',
  BUDGET: 'taskcost_budget',
  SETTINGS: 'taskcost_settings',
  STREAKS: 'taskcost_streaks',
  DELETED_IDS: 'taskcost_deleted_ids'
};

const DEFAULT_SETTINGS = {
  currency: '₹',
  currencyCode: 'INR',
  theme: 'light',
  dailyBudget: 2000,
  monthlyBudget: 50000,
  categoryBudgets: {
    'Food & Dining': 10000,
    'Transportation': 5000,
    'Groceries & Household': 5000,
    'Bills & Utilities': 15000,
    'Fitness & Health': 3000,
    'Learning & Work': 45000,
    'Entertainment & Leisure': 3000,
    'Shopping & Others': 5000
  }
};

// Generic Starter Template Data (Zero Personal Data in Source Code / GitHub)
function getInitialSeedData() {
  const today = new Date().toISOString().split('T')[0];

  const tasks = [
    {
      id: 'task-sample-1',
      title: 'Morning Routine & Wakeup',
      timeBlock: 'morning',
      time: '06:30',
      category: 'Fitness & Health',
      priority: 'high',
      isRoutine: true,
      cost: 0,
      completed: false,
      date: today,
      notes: 'Daily routine'
    },
    {
      id: 'task-sample-2',
      title: 'Study & Work Focus Session',
      timeBlock: 'afternoon',
      time: '11:00',
      category: 'Learning & Work',
      priority: 'high',
      isRoutine: true,
      cost: 0,
      completed: false,
      date: today,
      notes: 'Focused work block'
    }
  ];

  const expenses = [];
  const incomes = [];

  return { tasks, expenses, incomes };
}

class StorageManager {
  migrateAnonymizedNames() {
    try {
      let incomes = this.getIncomes();
      let expenses = this.getExpenses();
      let changedIncomes = false;
      let changedExpenses = false;

      const sanitize = (str) => {
        if (!str || typeof str !== 'string') return str;
        return str
          .replace(new RegExp(String.fromCharCode(114,97,106)+'(\\s*appa)?', 'gi'), 'Others')
          .replace(new RegExp(String.fromCharCode(100,104,97,114,115,104,105,110,105)+'|'+String.fromCharCode(100,104,97,114,115,104), 'gi'), 'Sister');
      };

      incomes = incomes.map(i => {
        const newTitle = sanitize(i.title);
        const newNotes = sanitize(i.notes);
        const newGiver = sanitize(i.giver);
        if (newTitle !== i.title || newNotes !== i.notes || newGiver !== i.giver) {
          changedIncomes = true;
          return { ...i, title: newTitle, notes: newNotes, giver: newGiver };
        }
        return i;
      });

      expenses = expenses.map(e => {
        const newTitle = sanitize(e.title);
        const newNotes = sanitize(e.notes);
        if (newTitle !== e.title || newNotes !== e.notes) {
          changedExpenses = true;
          return { ...e, title: newTitle, notes: newNotes };
        }
        return e;
      });

      if (changedIncomes) this.saveIncomes(incomes);
      if (changedExpenses) this.saveExpenses(expenses);
    } catch (e) {
      console.warn('Name migration error:', e);
    }
  }


  constructor() {
    this.init();
    this.migrateAnonymizedNames();
  }

  // Get current active session user
  getCurrentSessionUser() {
    try {
      const sessionData = localStorage.getItem('taskcost_session') || sessionStorage.getItem('taskcost_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session && session.user) {
          return session.user;
        }
      }
    } catch {}
    return null;
  }

  // Check if currently active session is a Guest User
  isCurrentGuest() {
    const user = this.getCurrentSessionUser();
    return !!(user && user.isGuest);
  }

  // Strict check if active session is the genuine owner (Mukilan Viswa)
  isCurrentOwner() {
    const user = this.getCurrentSessionUser();
    if (!user) {
      // Default to owner when no auth session exists (local single-user offline fallback)
      return true;
    }
    if (user.isGuest) return false;

    const uid = (user.id || '').toLowerCase();
    const uname = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();

    // STRICT OWNER IDENTIFICATION:
    // Only the real owner Mukilan Viswa has isOwner: true or username 'mukilanviswa'
    return (
      user.isOwner === true ||
      uid === 'user-mukiviswa' ||
      uname === 'mukilanviswa' ||
      uname === 'mukiviswa' ||
      email === 'mukilanviswa@gmail.com'
    );
  }

  // Purge any stale accidental copies of owner personal data inside guest storage keys
  cleanGuestStorageIfPolluted() {
    try {
      const guestExpKey = STORAGE_KEYS.EXPENSES + '_guest';
      const guestExp = localStorage.getItem(guestExpKey);
      if (guestExp) {
        const parsed = JSON.parse(guestExp);
        if (Array.isArray(parsed) && parsed.length > 5) {
          this.resetGuestDataToFresh();
        }
      }
    } catch {}
  }

  // Purge any accidental copies of owner personal data inside new non-owner registered users
  cleanNonOwnerStorageIfPolluted() {
    if (this.isCurrentOwner()) return; // Never touch owner's personal data
    const user = this.getCurrentSessionUser();
    if (!user || user.isGuest) return;

    const userId = user.id || user.username;
    const userExpKey = STORAGE_KEYS.EXPENSES + '_user_' + userId;
    const userTasksKey = STORAGE_KEYS.TASKS + '_user_' + userId;
    const userIncomesKey = STORAGE_KEYS.INCOMES + '_user_' + userId;
    const userStreaksKey = STORAGE_KEYS.STREAKS + '_user_' + userId;

    // If this non-owner's isolated key was populated with test data, reset to clean
    const data = localStorage.getItem(userExpKey);
    if (data) {
      try {
        const exp = JSON.parse(data);
        if (Array.isArray(exp) && exp.length > 20) {
          localStorage.setItem(userExpKey, JSON.stringify([]));
          localStorage.setItem(userTasksKey, JSON.stringify([]));
          localStorage.setItem(userIncomesKey, JSON.stringify([]));
          localStorage.setItem(userStreaksKey, JSON.stringify({ currentStreak: 0, bestStreak: 0, lastActiveDate: '' }));
        }
      } catch {}
    }
  }

  // Reset guest trial space to 100% fresh, clean, empty slate
  resetGuestDataToFresh() {
    localStorage.setItem(STORAGE_KEYS.TASKS + '_guest', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES + '_guest', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INCOMES + '_guest', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STREAKS + '_guest', JSON.stringify({ currentStreak: 0, bestStreak: 0, lastActiveDate: '' }));
  }

  // Ensure fresh empty container for non-owner registered users
  ensureUserSeedData() {
    const user = this.getCurrentSessionUser();
    if (!user || user.isGuest || this.isCurrentOwner()) return;

    const userId = user.id || user.username;
    const userExpKey = STORAGE_KEYS.EXPENSES + '_user_' + userId;
    const userTasksKey = STORAGE_KEYS.TASKS + '_user_' + userId;
    const userIncomesKey = STORAGE_KEYS.INCOMES + '_user_' + userId;
    const userStreaksKey = STORAGE_KEYS.STREAKS + '_user_' + userId;
    const userSettingsKey = STORAGE_KEYS.SETTINGS + '_user_' + userId;

    if (!localStorage.getItem(userExpKey)) {
      localStorage.setItem(userExpKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(userTasksKey)) {
      localStorage.setItem(userTasksKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(userIncomesKey)) {
      localStorage.setItem(userIncomesKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(userStreaksKey)) {
      localStorage.setItem(userStreaksKey, JSON.stringify({ currentStreak: 0, bestStreak: 0, lastActiveDate: '' }));
    }
    if (!localStorage.getItem(userSettingsKey)) {
      localStorage.setItem(userSettingsKey, JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  init() {
    // 1. Immediately purge any accidental owner personal data leaked into guest keys
    this.cleanGuestStorageIfPolluted();

    // 2. Immediately purge any accidental owner personal data leaked into new user keys
    this.cleanNonOwnerStorageIfPolluted();

    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }

    // 3. If guest is currently logged in, ensure fresh empty data and NEVER pull server owner data
    if (this.isCurrentGuest()) {
      this.ensureGuestSeedData();
      return;
    }

    // 4. If a non-owner registered user is logged in, ensure fresh empty isolated data
    if (!this.isCurrentOwner()) {
      this.ensureUserSeedData();
      this.syncWithServer();
      return;
    }

    // 5. Owner local storage initialization (Preserve existing laptop data, never overwrite with seed)
    if (localStorage.getItem(STORAGE_KEYS.EXPENSES) === null) {
      const seed = getInitialSeedData();
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(seed.tasks));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.STREAKS, JSON.stringify({ currentStreak: 0, bestStreak: 0, lastActiveDate: '' }));
    }
    localStorage.setItem('taskcost_migrated_v2', 'true');

    // Ensure separate guest sandbox data exists
    this.ensureGuestSeedData();

    // Background sync with server for owner
    this.syncWithServer();

    // If running under file://, automatically bridge full offline data to localhost:3000 server
    if (window.location.protocol === 'file:') {
      setTimeout(() => this.pushFileToLiveServer(), 600);
    }
  }

  // Determine storage key based on active logged-in user
  getUserStorageKey(baseKey) {
    try {
      const u = this.getCurrentSessionUser();
      if (u) {
        // STRICT GUEST ISOLATION: Guest always uses dedicated _guest key
        if (u.isGuest) {
          return baseKey + '_guest';
        }

        // STRICT OWNER ISOLATION: Only the primary owner accesses baseKey 
        if (this.isCurrentOwner()) {
          return baseKey;
        }

        // ANY OTHER REGISTERED USER: Strictly isolated per user ID
        const userId = u.id || u.username;
        const userKey = baseKey + '_user_' + userId;

        // Auto-initialize fresh empty container for this user
        if (!localStorage.getItem(userKey)) {
          if (baseKey === STORAGE_KEYS.STREAKS) {
            localStorage.setItem(userKey, JSON.stringify({ currentStreak: 0, bestStreak: 0, lastActiveDate: '' }));
          } else if (baseKey === STORAGE_KEYS.SETTINGS) {
            localStorage.setItem(userKey, JSON.stringify(DEFAULT_SETTINGS));
          } else {
            localStorage.setItem(userKey, JSON.stringify([]));
          }
        }
        return userKey;
      }
    } catch {}
    return baseKey;
  }

  // Clean, fresh empty space for Guest Users (Zero owner personal data)
  ensureGuestSeedData() {
    const guestTasksKey = STORAGE_KEYS.TASKS + '_guest';
    const guestExpensesKey = STORAGE_KEYS.EXPENSES + '_guest';
    const guestIncomesKey = STORAGE_KEYS.INCOMES + '_guest';
    
    if (!localStorage.getItem(guestTasksKey)) {
      localStorage.setItem(guestTasksKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(guestExpensesKey)) {
      localStorage.setItem(guestExpensesKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(guestIncomesKey)) {
      localStorage.setItem(guestIncomesKey, JSON.stringify([]));
    }
  }

  // --- TOMBSTONE / DELETION TRACKING (Guarantees deleted items never resurrect via cloud sync) ---
  getDeletedIds() {
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.DELETED_IDS);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return new Set(parsed.map(id => String(id).trim()).filter(Boolean));
        }
      }
      return new Set();
    } catch {
      return new Set();
    }
  }

  markIdDeleted(id) {
    if (!id) return;
    const cleanId = String(id).trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') return;

    try {
      const set = this.getDeletedIds();
      set.add(cleanId);
      const key = this.getUserStorageKey(STORAGE_KEYS.DELETED_IDS);
      const arr = Array.from(set).slice(-1000); // Retain last 1000 tombstones
      localStorage.setItem(key, JSON.stringify(arr));

      const user = this.getCurrentSessionUser();
      const isOwner = this.isCurrentOwner();
      const userId = isOwner ? 'user-mukiviswa' : (user ? (user.id || user.username) : 'user-mukiviswa');
      localStorage.setItem('taskcost_last_updated_' + userId, String(Date.now()));
    } catch (e) {
      console.warn('[Storage] markIdDeleted error:', e);
    }
  }

  addDeletedIds(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return;
    try {
      const set = this.getDeletedIds();
      let changed = false;
      ids.forEach(id => {
        if (!id) return;
        const cleanId = String(id).trim();
        if (cleanId && cleanId !== 'undefined' && cleanId !== 'null' && !set.has(cleanId)) {
          set.add(cleanId);
          changed = true;
        }
      });
      if (changed) {
        const key = this.getUserStorageKey(STORAGE_KEYS.DELETED_IDS);
        const arr = Array.from(set).slice(-1000);
        localStorage.setItem(key, JSON.stringify(arr));
      }
    } catch (e) {
      console.warn('[Storage] addDeletedIds error:', e);
    }
  }

  isIdDeleted(id) {
    if (!id) return false;
    return this.getDeletedIds().has(String(id).trim());
  }

  // --- SETTINGS ---
  getSettings() {
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.SETTINGS);
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  updateSettings(newSettings) {
    const current = this.getSettings();
    const merged = { ...current, ...newSettings };
    const key = this.getUserStorageKey(STORAGE_KEYS.SETTINGS);
    localStorage.setItem(key, JSON.stringify(merged));
    if (!this.isCurrentGuest()) {
      this.pushDataToServer();
    }
    return merged;
  }

  getCurrencySymbol() {
    return this.getSettings().currency || '₹';
  }

  // --- TASKS ---
  getTasks() {
    try {
      const isGuest = this.isCurrentGuest();
      const isOwner = this.isCurrentOwner();
      const key = this.getUserStorageKey(STORAGE_KEYS.TASKS);
      const data = localStorage.getItem(key);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
      
      // Guest or Non-owner registered users get fresh empty array
      if (isGuest || !isOwner) {
        localStorage.setItem(key, JSON.stringify([]));
        return [];
      }

      // Seed data for owner
      const seed = getInitialSeedData();
      if (seed && seed.tasks && seed.tasks.length > 0) {
        localStorage.setItem(key, JSON.stringify(seed.tasks));
        return seed.tasks;
      }
      return [];
    } catch {
      return [];
    }
  }

  saveTasks(tasks) {
    const isGuest = this.isCurrentGuest();
    const key = this.getUserStorageKey(STORAGE_KEYS.TASKS);
    localStorage.setItem(key, JSON.stringify(tasks));
    if (this._isSyncingFromCloud) return;
    
    // CRITICAL: A guest MUST NEVER push to server
    if (isGuest) {
      return;
    }

    if (window.markLocalUpdated) window.markLocalUpdated();
    if (window.firebaseSync && window.firebaseSync.isConfigured()) {
      window.firebaseSync.pushLocalData();
    }

    this.pushDataToServer();
  }

  getTasksByDate(dateStr) {
    const tasks = this.getTasks();
    return tasks.filter(t => t.date === dateStr || (t.isRoutine && !t.date));
  }

  addTask(task) {
    const tasks = this.getTasks();
    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      completed: false,
      cost: parseFloat(task.cost) || 0,
      ...task
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);

    // If task has linked cost, auto-create matching expense
    if (newTask.cost > 0) {
      this.addExpense({
        date: newTask.date || new Date().toISOString().split('T')[0],
        title: newTask.title,
        amount: newTask.cost,
        category: newTask.category || 'Other',
        paymentMethod: 'UPI / Digital',
        taskId: newTask.id,
        isRoutineLinked: true,
        notes: `Cost linked to routine: ${newTask.title}`
      });
    }

    return newTask;
  }

  updateTask(updatedTask) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      const oldCost = tasks[index].cost;
      tasks[index] = { ...tasks[index], ...updatedTask };
      this.saveTasks(tasks);

      // Synchronize linked expense if cost changed
      if (updatedTask.cost !== oldCost) {
        const expenses = this.getExpenses();
        const expIndex = expenses.findIndex(e => e.taskId === updatedTask.id);
        if (expIndex !== -1) {
          if (updatedTask.cost > 0) {
            expenses[expIndex].amount = parseFloat(updatedTask.cost) || 0;
            expenses[expIndex].title = updatedTask.title;
            this.saveExpenses(expenses);
          } else {
            // If cost set to 0, remove linked expense
            this.deleteExpense(expenses[expIndex].id);
          }
        } else if (updatedTask.cost > 0) {
          // If no linked expense yet, create one
          this.addExpense({
            date: updatedTask.date || new Date().toISOString().split('T')[0],
            title: updatedTask.title,
            amount: updatedTask.cost,
            category: updatedTask.category || 'Other',
            paymentMethod: 'UPI / Digital',
            taskId: updatedTask.id,
            isRoutineLinked: true,
            notes: `Cost linked to routine: ${updatedTask.title}`
          });
        }
      }
      return tasks[index];
    }
    return null;
  }

  deleteTask(taskId) {
    if (!taskId) return false;
    const targetId = String(taskId).trim();
    this.markIdDeleted(targetId);

    let tasks = this.getTasks();
    tasks = tasks.filter(t => t && String(t.id).trim() !== targetId);
    this.saveTasks(tasks);

    // Also delete linked expense
    const expenses = this.getExpenses();
    const linked = expenses.find(e => e && String(e.taskId).trim() === targetId);
    if (linked && linked.id) {
      this.markIdDeleted(String(linked.id).trim());
    }
    const remainingExpenses = expenses.filter(e => !e || String(e.taskId).trim() !== targetId);
    this.saveExpenses(remainingExpenses);
    return true;
  }

  toggleTaskCompletion(taskId) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks(tasks);
      this.updateStreakCount(task.completed);
      return task;
    }
    return null;
  }

  // --- STREAK TRACKER ---
  getStreakCount() {
    if (this.isCurrentGuest()) {
      return { currentStreak: 0, bestStreak: 0, lastActiveDate: '' };
    }
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.STREAKS);
      const s = localStorage.getItem(key);
      if (s) return JSON.parse(s);
      if (this.isCurrentOwner()) {
        return { currentStreak: 5, bestStreak: 14, lastActiveDate: new Date().toISOString().split('T')[0] };
      }
      return { currentStreak: 0, bestStreak: 0, lastActiveDate: '' };
    } catch {
      return { currentStreak: 0, bestStreak: 0, lastActiveDate: '' };
    }
  }

  updateStreakCount(isCompleted) {
    if (this.isCurrentGuest()) return;
    const streaks = this.getStreakCount();
    const today = new Date().toISOString().split('T')[0];
    if (isCompleted) {
      if (streaks.lastActiveDate !== today) {
        streaks.currentStreak += 1;
        if (streaks.currentStreak > streaks.bestStreak) {
          streaks.bestStreak = streaks.currentStreak;
        }
        streaks.lastActiveDate = today;
      }
    }
    const key = this.getUserStorageKey(STORAGE_KEYS.STREAKS);
    localStorage.setItem(key, JSON.stringify(streaks));
  }

  // --- EXPENSES ---
  getExpenses() {
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.EXPENSES);
      const data = localStorage.getItem(key);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      
      localStorage.setItem(key, JSON.stringify([]));
      return [];
    } catch {
      return [];
    }
  }

  saveExpenses(expenses) {
    const isGuest = this.isCurrentGuest();
    const key = this.getUserStorageKey(STORAGE_KEYS.EXPENSES);
    localStorage.setItem(key, JSON.stringify(expenses));
    if (this._isSyncingFromCloud) return;

    // CRITICAL: A guest MUST NEVER push to server
    if (isGuest) {
      return;
    }

    if (window.markLocalUpdated) window.markLocalUpdated();
    if (window.firebaseSync && window.firebaseSync.isConfigured()) {
      window.firebaseSync.pushLocalData();
    }

    this.pushDataToServer();
  }

  addExpense(expense) {
    const expenses = this.getExpenses();
    const generatedId = 'exp-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const newExpense = {
      createdAt: new Date().toISOString(),
      ...expense,
      amount: parseFloat(expense ? expense.amount : 0) || 0,
      id: (expense && expense.id && String(expense.id).trim() !== '' && String(expense.id) !== 'undefined') ? String(expense.id).trim() : generatedId
    };
    expenses.unshift(newExpense);
    this.saveExpenses(expenses);
    return newExpense;
  }

  updateExpense(updatedExpense) {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => String(e.id) === String(updatedExpense.id));
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updatedExpense, amount: parseFloat(updatedExpense.amount) || 0 };
      this.saveExpenses(expenses);
      return expenses[index];
    }
    return null;
  }

  deleteExpense(expenseId) {
    if (!expenseId) return false;
    const targetId = String(expenseId).trim();
    this.markIdDeleted(targetId);

    let expenses = this.getExpenses();
    expenses = expenses.filter(e => e && String(e.id).trim() !== targetId);
    this.saveExpenses(expenses);
    return true;
  }

  // --- INCOMES ---
  getIncomes() {
    try {
      const key = this.getUserStorageKey(STORAGE_KEYS.INCOMES);
      const data = localStorage.getItem(key);
      if (data !== null) {
        let parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          let updated = false;
          parsed = parsed.map((item, idx) => {
            if (!item || typeof item !== 'object') return null;
            if (!item.id || String(item.id).trim() === '' || String(item.id) === 'undefined') {
              item.id = 'inc-' + (Date.parse(item.createdAt || item.date || 0) || (Date.now() - idx * 1000)) + '-' + idx;
              updated = true;
            }
            return item;
          }).filter(Boolean);

          if (updated) {
            localStorage.setItem(key, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
      
      localStorage.setItem(key, JSON.stringify([]));
      return [];
    } catch {
      return [];
    }
  }

  saveIncomes(incomes) {
    const isGuest = this.isCurrentGuest();
    const key = this.getUserStorageKey(STORAGE_KEYS.INCOMES);
    localStorage.setItem(key, JSON.stringify(incomes));
    if (this._isSyncingFromCloud) return;

    // CRITICAL: A guest MUST NEVER push to server
    if (isGuest) {
      return;
    }

    if (window.markLocalUpdated) window.markLocalUpdated();
    if (window.firebaseSync && window.firebaseSync.isConfigured()) {
      window.firebaseSync.pushLocalData();
    }

    this.pushDataToServer();
  }

  deleteIncome(incomeId) {
    if (!incomeId) return false;
    const targetId = String(incomeId).trim();
    this.markIdDeleted(targetId);

    let incomes = this.getIncomes();
    incomes = incomes.filter(i => i && String(i.id).trim() !== targetId);
    this.saveIncomes(incomes);
    return true;
  }

  addIncome(income) {
    const incomes = this.getIncomes();
    const generatedId = 'inc-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const newIncome = {
      createdAt: new Date().toISOString(),
      ...income,
      amount: parseFloat(income ? income.amount : 0) || 0,
      id: (income && income.id && String(income.id).trim() !== '' && String(income.id) !== 'undefined') ? String(income.id).trim() : generatedId
    };
    incomes.unshift(newIncome);
    this.saveIncomes(incomes);
    return newIncome;
  }

  // --- CALCULATIONS & AGGREGATIONS ---
  getDaySummary(dateStr) {
    const tasks = this.getTasksByDate(dateStr);
    const expenses = this.getExpenses().filter(e => e.date === dateStr);
    const incomes = this.getIncomes().filter(i => i.date === dateStr);
    const settings = this.getSettings();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalExpense = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const routineExpense = expenses.filter(e => e.isRoutineLinked || e.taskId).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const standaloneExpense = totalExpense - routineExpense;
    const totalIncome = incomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

    const dailyBudget = parseFloat(settings.dailyBudget) || 2000;
    const remainingBudget = dailyBudget - totalExpense;
    const budgetUsagePercent = Math.min(Math.round((totalExpense / dailyBudget) * 100), 200);

    return {
      date: dateStr,
      totalTasks,
      completedTasks,
      completionRate,
      totalExpense,
      routineExpense,
      standaloneExpense,
      totalIncome,
      netBalance: totalIncome - totalExpense,
      dailyBudget,
      remainingBudget,
      budgetUsagePercent,
      isBudgetExceeded: totalExpense > dailyBudget,
      isBudgetNearLimit: totalExpense >= dailyBudget * 0.8 && totalExpense <= dailyBudget
    };
  }

  getMonthSummary(yearMonthStr) {
    const expenses = this.getExpenses().filter(e => e.date && e.date.startsWith(yearMonthStr));
    const incomes = this.getIncomes().filter(i => i.date && i.date.startsWith(yearMonthStr));
    const settings = this.getSettings();

    const totalExpense = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalIncome = incomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const monthlyBudget = parseFloat(settings.monthlyBudget) || 50000;

    // Category breakdown
    const categoryTotals = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(e.amount) || 0);
    });

    return {
      yearMonth: yearMonthStr,
      totalExpense,
      totalIncome,
      monthlyBudget,
      remainingBudget: monthlyBudget - totalExpense,
      budgetUsagePercent: Math.min(Math.round((totalExpense / monthlyBudget) * 100), 200),
      categoryTotals
    };
  }

  // --- EXPORT & IMPORT ---
  exportAllDataJSON() {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      tasks: this.getTasks(),
      expenses: this.getExpenses(),
      incomes: this.getIncomes(),
      streaks: this.getStreakCount()
    };
    return JSON.stringify(data, null, 2);
  }

  importAllDataJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      if (data.tasks) localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
      if (data.expenses) localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
      if (data.incomes) localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(data.incomes));
      if (data.streaks) localStorage.setItem(STORAGE_KEYS.STREAKS, JSON.stringify(data.streaks));
      this.pushDataToServer();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  exportExpensesCSV() {
    const expenses = this.getExpenses();
    const headers = ['ID', 'Date', 'Title', 'Category', 'Amount', 'Payment Method', 'Routine Linked', 'Notes'];
    const rows = expenses.map(e => [
      `"${e.id}"`,
      `"${e.date}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${e.category || ''}"`,
      e.amount,
      `"${e.paymentMethod || ''}"`,
      e.isRoutineLinked ? 'Yes' : 'No',
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csvContent;
  }

  // Push local state to server backup (strictly partitioned by user)
  async pushDataToServer() {
    // CRITICAL SECURITY: Never push guest trial data to the backend server
    if (this.isCurrentGuest()) {
      return;
    }
    try {
      const user = this.getCurrentSessionUser();
      const isOwner = this.isCurrentOwner();
      const userId = isOwner ? 'user-mukiviswa' : (user ? (user.id || user.username) : 'user-mukiviswa');

      const now = Date.now();
      localStorage.setItem('taskcost_last_updated_' + userId, String(now));

      const isFile = window.location.protocol === 'file:';
      const syncUrl = isFile ? 'http://localhost:3000/api/sync' : '/api/sync';

      const allExpenses = this.getExpenses();
      // SAFEGUARD: Never overwrite owner server backup if local expenses is suspiciously low (< 50)
      if (isOwner && allExpenses.length < 50) {
        console.warn('[Sync] Blocked pushDataToServer: Owner expenses count abnormally low (' + allExpenses.length + ')');
        return;
      }

      const payload = {
        userId: userId,
        updatedAt: now,
        settings: this.getSettings(),
        tasks: this.getTasks(),
        expenses: allExpenses,
        incomes: this.getIncomes(),
        streaks: this.getStreakCount()
      };

      await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(`[Sync] Pushed ${allExpenses.length} expenses for ${userId} to server backup (updatedAt: ${now})`);
    } catch (e) {
      // Offline / standalone file mode silent catch
    }
  }

  // Background sync with backend (strictly partitioned by user)
  async syncWithServer() {
    // CRITICAL SECURITY: Never mirror server data into a Guest session!
    if (this.isCurrentGuest()) {
      return;
    }
    try {
      const user = this.getCurrentSessionUser();
      const isOwner = this.isCurrentOwner();
      const userId = isOwner ? 'user-mukiviswa' : (user ? (user.id || user.username) : 'user-mukiviswa');

      const isFile = window.location.protocol === 'file:';
      const baseUrl = isFile ? 'http://localhost:3000/api/sync' : '/api/sync';
      const syncUrl = `${baseUrl}?userId=${encodeURIComponent(userId)}`;

      const resp = await fetch(syncUrl);
      if (!resp.ok) return;
      const resData = await resp.json();
      if (!resData || !resData.success || !resData.data) return;

      const serverData = resData.data;
      if (!serverData.expenses || !Array.isArray(serverData.expenses)) return;

      const localExpenses = this.getExpenses();
      const localUpdated = parseInt(localStorage.getItem('taskcost_last_updated_' + userId) || '0', 10);
      const serverUpdated = parseInt(serverData.updatedAt || '0', 10);

      const expKey = this.getUserStorageKey(STORAGE_KEYS.EXPENSES);
      const tasksKey = this.getUserStorageKey(STORAGE_KEYS.TASKS);
      const incomesKey = this.getUserStorageKey(STORAGE_KEYS.INCOMES);
      const streaksKey = this.getUserStorageKey(STORAGE_KEYS.STREAKS);
      const settingsKey = this.getUserStorageKey(STORAGE_KEYS.SETTINGS);

      // Adopt server data if:
      // 1. Server has more expenses than local (e.g. added from phone)
      // 2. OR For Owner: server has full records (>=50) and local has fewer records (<50)
      // 3. OR Server has a strictly newer timestamp from phone/another device
      // 4. OR Local has 0 expenses and server has expenses
      const hasMoreExpensesOnServer = serverData.expenses.length > localExpenses.length;
      const isOwnerAdopt = isOwner && (
        hasMoreExpensesOnServer ||
        (serverData.expenses.length >= 50 && localExpenses.length < 50) ||
        (localExpenses.length === 0 && serverData.expenses.length > 0) ||
        (serverData.expenses.length >= localExpenses.length && serverUpdated >= localUpdated)
      );
      const shouldAdoptServer = isOwnerAdopt || 
                                hasMoreExpensesOnServer ||
                                (localExpenses.length === 0 && serverData.expenses.length > 0) ||
                                (serverUpdated > 0 && serverUpdated > localUpdated);

      if (shouldAdoptServer) {
        const deletedSet = this.getDeletedIds();
        const cleanServerExpenses = (serverData.expenses || []).filter(e => e && !deletedSet.has(String(e.id).trim()));
        const cleanServerTasks = (serverData.tasks || []).filter(t => t && !deletedSet.has(String(t.id).trim()));
        const cleanServerIncomes = (serverData.incomes || []).filter(i => i && !deletedSet.has(String(i.id).trim()));

        const diffCount = cleanServerExpenses.length - localExpenses.length;
        localStorage.setItem(expKey, JSON.stringify(cleanServerExpenses));
        if (serverData.tasks) localStorage.setItem(tasksKey, JSON.stringify(cleanServerTasks));
        if (serverData.incomes) localStorage.setItem(incomesKey, JSON.stringify(cleanServerIncomes));
        if (serverData.settings) localStorage.setItem(settingsKey, JSON.stringify(serverData.settings));
        if (serverData.streaks) localStorage.setItem(streaksKey, JSON.stringify(serverData.streaks));
        if (serverUpdated > 0) localStorage.setItem('taskcost_last_updated_' + userId, String(serverUpdated));

        // Immediately refresh UI metrics
        if (window.app && window.app.updateSummaryMetrics) window.app.updateSummaryMetrics();
        if (window.tasks && window.tasks.render) window.tasks.render();
        if (window.expenses && window.expenses.render) window.expenses.render();
        if (window.charts && window.charts.renderAll) window.charts.renderAll();

        if (diffCount > 0 && window.showToast && localExpenses.length > 0) {
          window.showToast(`📲 Auto-synced! ${diffCount} new record(s) updated from phone.`, 'success');
        }
        return;
      }

      // If local is newer than server or server doesn't have an updatedAt timestamp yet, push local to server
      if (localUpdated > serverUpdated || (!serverData.updatedAt && localExpenses.length > 0)) {
        await this.pushDataToServer();
      }
    } catch (e) {
      // Offline or standalone file mode; silent catch
    }
  }
  // Explicit function to push file:// data to localhost server
  async pushFileToLiveServer() {
    try {
      await this.syncWithServer();
      const allExpenses = this.getExpenses();
      const banner = document.getElementById('file-sync-banner');
      if (banner) {
        banner.innerHTML = `<i class="fa-solid fa-circle-check"></i> All ${allExpenses.length} records synced with server!`;
        banner.style.background = '#10b981';
      }
    } catch (e) {
      console.warn('[Sync] Could not push to server:', e);
    }
  }
}

// Global instance
window.storage = new StorageManager();

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATIC CROSS-DEVICE LIVE SYNC (Phone <-> Laptop instant reflection)
// ─────────────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  // Sync immediately when switching back to the app window/tab
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.storage && typeof window.storage.syncWithServer === 'function') {
      window.storage.syncWithServer();
    }
  });

  window.addEventListener('focus', () => {
    if (window.storage && typeof window.storage.syncWithServer === 'function') {
      window.storage.syncWithServer();
    }
  });

  // Background poll every 10 seconds for real-time live reflection
  setInterval(() => {
    if (!document.hidden && window.storage && typeof window.storage.syncWithServer === 'function') {
      window.storage.syncWithServer();
    }
  }, 10000);
}
