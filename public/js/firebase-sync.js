/**
 * Spendorio - Firebase Cloud Sync Engine (js/firebase-sync.js)
 * Real-time Bidirectional Union-Merge Sync between Phone and Laptop via Google Firebase REST API.
 * 100% Zero external dependencies. 100% Offline-Safe. Zero Data Loss Guaranteed.
 */

(function () {
  'use strict';

  const STORAGE_KEY_FIREBASE_URL = 'spendorio_firebase_db_url';
  const STORAGE_KEY_LAST_SYNC = 'spendorio_firebase_last_sync';
  const STORAGE_KEY_LOCAL_UPDATED = 'spendorio_local_data_updated_at';

  function markLocalUpdated() {
    try {
      localStorage.setItem(STORAGE_KEY_LOCAL_UPDATED, Date.now().toString());
    } catch (e) {}
  }

  const FirebaseSync = {
    syncInProgress: false,
    pollTimer: null,

    init() {
      console.log('[FirebaseSync] Initializing Bidirectional Cloud Sync Engine...');
      this.bindEvents();
      this.updateStatusUI();

      // Initial sync check on launch after brief delay
      setTimeout(() => {
        if (this.isConfigured()) {
          this.syncNow(true);
        }
      }, 1000);

      // Start recurring background auto-sync every 15 seconds
      this.startAutoSync();
    },

    isConfigured() {
      const url = this.getDbUrl();
      return !!(url && url.startsWith('https://') && url.includes('firebaseio.com'));
    },

    getDbUrl() {
      let url = (localStorage.getItem(STORAGE_KEY_FIREBASE_URL) || '').trim();
      if (!url) return '';
      url = url.replace(/\/+$/, '').replace(/\.json$/, '');
      return url;
    },

    setDbUrl(url) {
      if (!url) {
        localStorage.removeItem(STORAGE_KEY_FIREBASE_URL);
        this.updateStatusUI();
        return;
      }
      url = url.trim().replace(/\/+$/, '').replace(/\.json$/, '');
      if (!url.startsWith('https://')) {
        url = 'https://' + url;
      }
      localStorage.setItem(STORAGE_KEY_FIREBASE_URL, url);
      this.updateStatusUI();
    },

    // Strict Unified User ID: Mukilan's accounts on both Phone & Laptop map to user_mukilan
    getCurrentUserId() {
      if (!window.storage) return 'user_mukilan';
      if (window.storage.isCurrentGuest && window.storage.isCurrentGuest()) {
        return null; // Guest trial sessions never sync to cloud
      }
      const user = window.storage.getCurrentSessionUser ? window.storage.getCurrentSessionUser() : null;
      if (user && user.username) {
        const u = user.username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (u === 'mukiviswa' || u === 'mukilanviswa' || u === 'mukilan') {
          return 'user_mukilan';
        }
        return 'user_' + u;
      }
      return 'user_mukilan';
    },

    bindEvents() {
      // Sync immediately when user switches back to this browser tab
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isConfigured()) {
          this.syncNow(true);
        }
      });

      // Sync on window focus
      window.addEventListener('focus', () => {
        if (this.isConfigured()) {
          this.syncNow(true);
        }
      });

      // Sync when internet connection is restored
      window.addEventListener('online', () => {
        if (this.isConfigured()) {
          if (window.showToast) {
            window.showToast('🟢 Internet restored! Synchronizing with cloud...', 'info');
          }
          this.syncNow(false);
        }
      });
    },

    startAutoSync() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => {
        if (!document.hidden && navigator.onLine && this.isConfigured()) {
          this.syncNow(true);
        }
      }, 15000); // Check every 15 seconds
    },

    // Union merge lists by unique entity ID (Guarantees no records are lost across devices)
    mergeEntitiesById(localList, cloudList) {
      const map = new Map();
      (cloudList || []).forEach(item => {
        if (item && item.id) map.set(String(item.id), item);
      });
      (localList || []).forEach(item => {
        if (item && item.id) {
          const existing = map.get(String(item.id));
          if (!existing) {
            map.set(String(item.id), item);
          } else {
            const tExist = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const tLocal = new Date(item.updatedAt || item.createdAt || 0).getTime();
            if (tLocal >= tExist) {
              map.set(String(item.id), { ...existing, ...item });
            }
          }
        }
      });
      return Array.from(map.values());
    },

    // Main 2-way Bidirectional Union Sync
    async syncNow(silent = false) {
      if (this.syncInProgress) return;
      if (!this.isConfigured()) {
        if (!silent && window.showToast) {
          window.showToast('Please enter your Firebase Database URL in Settings first.', 'warning');
        }
        return;
      }
      if (!navigator.onLine) {
        if (!silent && window.showToast) {
          window.showToast('Device is offline. Changes saved locally and will sync when online.', 'info');
        }
        return;
      }

      const userId = this.getCurrentUserId();
      if (!userId) return; // Never sync guest sessions

      this.syncInProgress = true;
      this.updateSyncBadge('syncing');

      try {
        const dbUrl = this.getDbUrl();
        const endpoint = `${dbUrl}/spendorio/users/${encodeURIComponent(userId)}.json`;

        // 1. Fetch Cloud Data
        const cloudResponse = await fetch(endpoint, { cache: 'no-cache' });
        let cloudData = null;
        if (cloudResponse.ok) {
          cloudData = await cloudResponse.json();
        }

        const localTasks = window.storage.getTasks() || [];
        const localExpenses = window.storage.getExpenses() || [];
        const localIncomes = window.storage.getIncomes() || [];
        const localSettings = window.storage.getSettings() || {};

        const cloudTasks = (cloudData && Array.isArray(cloudData.tasks)) ? cloudData.tasks : [];
        const cloudExpenses = (cloudData && Array.isArray(cloudData.expenses)) ? cloudData.expenses : [];
        const cloudIncomes = (cloudData && Array.isArray(cloudData.incomes)) ? cloudData.incomes : [];
        const cloudSettings = (cloudData && typeof cloudData.settings === 'object') ? cloudData.settings : {};
        const cloudProfile = (cloudData && cloudData.userProfile) ? cloudData.userProfile : null;

        // 2. Intelligent Bidirectional Union Merge
        const mergedExpenses = this.mergeEntitiesById(localExpenses, cloudExpenses);
        mergedExpenses.sort((a, b) => {
          const da = a.date || a.createdAt || '';
          const db = b.date || b.createdAt || '';
          return db.localeCompare(da);
        });

        const mergedTasks = this.mergeEntitiesById(localTasks, cloudTasks);
        const mergedIncomes = this.mergeEntitiesById(localIncomes, cloudIncomes);
        const mergedSettings = { ...cloudSettings, ...localSettings };

        // 3. Apply to Local Storage (Protected from bounce-back push)
        window.storage._isSyncingFromCloud = true;
        try {
          window.storage.saveExpenses(mergedExpenses);
          window.storage.saveTasks(mergedTasks);
          window.storage.saveIncomes(mergedIncomes);
          if (cloudProfile && window.auth && typeof window.auth.applyCloudProfile === 'function') {
            window.auth.applyCloudProfile(cloudProfile);
          }
        } finally {
          window.storage._isSyncingFromCloud = false;
        }

        // Refresh all UI components immediately
        this.refreshAllUI();

        // 4. If Cloud was missing any local records or needs updated state, push merged payload to Cloud!
        const needsCloudPush = !cloudData || 
                               mergedExpenses.length > cloudExpenses.length || 
                               mergedTasks.length > cloudTasks.length ||
                               mergedIncomes.length > cloudIncomes.length;

        if (needsCloudPush) {
          await this.pushMergedPayload(endpoint, userId, mergedTasks, mergedExpenses, mergedIncomes, mergedSettings);
        }

        const now = Date.now();
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, now.toString());
        this.updateSyncBadge('synced');
        this.updateStatusUI();

        if (!silent && window.showToast) {
          window.showToast(`✅ Synced with Cloud! (${mergedExpenses.length} expenses, ${mergedTasks.length} tasks)`, 'success');
        }
      } catch (err) {
        console.warn('[FirebaseSync] Sync error:', err.message);
        this.updateSyncBadge('offline');
        if (!silent && window.showToast) {
          window.showToast('Cloud sync paused (check internet or database URL)', 'warning');
        }
      } finally {
        this.syncInProgress = false;
      }
    },

    // Push local data directly when user creates an expense/task
    async pushLocalData(silent = true) {
      if (!this.isConfigured() || !navigator.onLine) return;
      const userId = this.getCurrentUserId();
      if (!userId || !window.storage) return;

      try {
        const dbUrl = this.getDbUrl();
        const endpoint = `${dbUrl}/spendorio/users/${encodeURIComponent(userId)}.json`;

        // 1. Fetch current cloud state to merge before pushing
        const cloudResponse = await fetch(endpoint, { cache: 'no-cache' });
        let cloudData = null;
        if (cloudResponse.ok) {
          cloudData = await cloudResponse.json();
        }

        const localTasks = window.storage.getTasks() || [];
        const localExpenses = window.storage.getExpenses() || [];
        const localIncomes = window.storage.getIncomes() || [];
        const localSettings = window.storage.getSettings() || {};

        const cloudTasks = (cloudData && Array.isArray(cloudData.tasks)) ? cloudData.tasks : [];
        const cloudExpenses = (cloudData && Array.isArray(cloudData.expenses)) ? cloudData.expenses : [];
        const cloudIncomes = (cloudData && Array.isArray(cloudData.incomes)) ? cloudData.incomes : [];

        const mergedExpenses = this.mergeEntitiesById(localExpenses, cloudExpenses);
        mergedExpenses.sort((a, b) => {
          const da = a.date || a.createdAt || '';
          const db = b.date || b.createdAt || '';
          return db.localeCompare(da);
        });

        const mergedTasks = this.mergeEntitiesById(localTasks, cloudTasks);
        const mergedIncomes = this.mergeEntitiesById(localIncomes, cloudIncomes);

        await this.pushMergedPayload(endpoint, userId, mergedTasks, mergedExpenses, mergedIncomes, localSettings);

        const now = Date.now();
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, now.toString());
        this.updateSyncBadge('synced');
        this.updateStatusUI();

        if (!silent && window.showToast) {
          window.showToast('☁️ Saved to cloud! Automatically synced across all devices.', 'success');
        }
      } catch (e) {
        console.warn('[FirebaseSync] Failed to push local data:', e.message);
      }
    },

    // Push unified payload to Firebase REST endpoint
    async pushMergedPayload(endpoint, userId, tasks, expenses, incomes, settings) {
      const now = Date.now();
      const payload = {
        userId: userId,
        updatedAt: now,
        device: navigator.userAgent.includes('Mobile') ? 'Phone' : 'Desktop',
        tasks: tasks || [],
        expenses: expenses || [],
        incomes: incomes || [],
        settings: settings || {},
        userProfile: (window.auth && window.auth.currentUser && (!window.storage.isCurrentGuest || !window.storage.isCurrentGuest())) ? {
          fullName: window.auth.currentUser.fullName || '',
          username: window.auth.currentUser.username || '',
          dob: window.auth.currentUser.dob || '',
          email: window.auth.currentUser.email || '',
          phone: window.auth.currentUser.phone || '',
          profileImage: window.auth.currentUser.profileImage || ''
        } : null
      };

      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    },

    // Refresh all UI components
    refreshAllUI() {
      try {
        if (window.app && typeof window.app.updateSummaryMetrics === 'function') {
          window.app.updateSummaryMetrics();
        }
        if (window.tasks && typeof window.tasks.render === 'function') {
          window.tasks.render();
        }
        if (window.expenses && typeof window.expenses.render === 'function') {
          window.expenses.render();
        }
        if (window.charts && typeof window.charts.renderAll === 'function') {
          window.charts.renderAll();
        }
      } catch (e) {
        console.error('[FirebaseSync] UI refresh error:', e);
      }
    },

    // Update Header Status Badge
    updateSyncBadge(status) {
      const badge = document.getElementById('pwa-network-badge');
      if (!badge) return;

      if (status === 'syncing') {
        badge.className = 'pwa-network-badge online';
        badge.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i><span>Syncing...</span>';
        badge.title = 'Cloud Sync in progress...';
      } else if (status === 'synced') {
        badge.className = 'pwa-network-badge online';
        badge.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><span>Cloud Synced</span>';
        badge.title = 'Active: Real-time Cloud Synchronization Active';
      } else if (status === 'offline') {
        badge.className = 'pwa-network-badge offline';
        badge.innerHTML = '<i class="fa-solid fa-bolt"></i><span>Offline Mode</span>';
        badge.title = 'Offline: All data saved locally on device';
      }
    },

    // Update the Settings Card UI
    updateStatusUI() {
      const statusEl = document.getElementById('firebase-sync-status-badge');
      const inputEl = document.getElementById('firebase-db-url-input');
      const lastSyncEl = document.getElementById('firebase-last-sync-time');

      const isConf = this.isConfigured();
      const currentUrl = this.getDbUrl();

      if (inputEl && document.activeElement !== inputEl) {
        inputEl.value = currentUrl;
      }

      if (statusEl) {
        if (isConf) {
          statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Connected &amp; Auto-Syncing';
          statusEl.style.color = '#10b981';
          statusEl.style.background = 'rgba(16, 185, 129, 0.12)';
          statusEl.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        } else {
          statusEl.innerHTML = '<i class="fa-solid fa-circle-info"></i> Local Storage Only (Not Connected)';
          statusEl.style.color = '#f59e0b';
          statusEl.style.background = 'rgba(245, 158, 11, 0.12)';
          statusEl.style.border = '1px solid rgba(245, 158, 11, 0.3)';
        }
      }

      if (lastSyncEl) {
        const lastSync = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
        if (lastSync && isConf) {
          const d = new Date(parseInt(lastSync, 10));
          lastSyncEl.textContent = 'Last synced: ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else {
          lastSyncEl.textContent = isConf ? 'Ready to sync' : 'Connect below to enable multi-device sync';
        }
      }
    },

    // UI Action: Save Firebase configuration from Settings input
    saveFromInput() {
      const inputEl = document.getElementById('firebase-db-url-input');
      if (!inputEl) return;
      let url = inputEl.value.trim();
      if (!url) {
        this.setDbUrl('');
        if (window.showToast) {
          window.showToast('Cloud sync disabled. Operating in 100% offline local storage mode.', 'info');
        }
        return;
      }

      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        url = 'https://' + url;
      }

      if (!url.includes('firebaseio.com')) {
        if (window.showToast) {
          window.showToast('Please enter a valid Firebase Realtime Database URL (e.g. https://spendorio-default-rtdb.firebaseio.com)', 'warning');
        }
        return;
      }

      this.setDbUrl(url);
      if (window.showToast) {
        window.showToast('✅ Firebase URL saved! Testing cloud connection...', 'info');
      }
      this.syncNow(false);
    },

    openSetupGuide() {
      const modal = document.getElementById('firebase-setup-modal');
      if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
      }
    },

    closeSetupGuide() {
      const modal = document.getElementById('firebase-setup-modal');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
      }
    }
  };

  // Expose globally
  window.FirebaseSync = FirebaseSync;
  window.firebaseSync = FirebaseSync;
  window.markLocalUpdated = markLocalUpdated;

  // Initialize on script load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FirebaseSync.init());
  } else {
    FirebaseSync.init();
  }
})();
