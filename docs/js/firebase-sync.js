/**
 * Spendorio - Firebase Cloud Sync Engine (js/firebase-sync.js)
 * Real-time two-way synchronization between Phone and Laptop via Google Firebase.
 * 100% Zero-dependency REST architecture (Lightweight, Fast, 100% Offline-Safe).
 */

(function () {
  'use strict';

  const STORAGE_KEY_FIREBASE_URL = 'spendorio_firebase_db_url';
  const STORAGE_KEY_LAST_SYNC = 'spendorio_firebase_last_sync';
  const STORAGE_KEY_LOCAL_UPDATED = 'spendorio_local_data_updated_at';

  // Mark local change whenever user modifies tasks or expenses
  function markLocalUpdated() {
    try {
      localStorage.setItem(STORAGE_KEY_LOCAL_UPDATED, Date.now().toString());
    } catch (e) {}
  }

  const FirebaseSync = {
    syncInProgress: false,
    pollTimer: null,

    init() {
      console.log('[FirebaseSync] Initializing Cloud Sync Engine...');
      this.bindEvents();
      this.updateStatusUI();

      // Initial sync check on page load after a brief settling delay
      setTimeout(() => {
        if (this.isConfigured()) {
          this.syncNow(true);
        }
      }, 1500);

      // Start automatic background sync poll every 15 seconds when tab is active
      this.startAutoSync();
    },

    // Check if user has entered their Firebase Realtime Database URL
    isConfigured() {
      const url = this.getDbUrl();
      return !!(url && url.startsWith('https://') && url.includes('firebaseio.com'));
    },

    // Get cleaned database base URL
    getDbUrl() {
      let url = (localStorage.getItem(STORAGE_KEY_FIREBASE_URL) || '').trim();
      if (!url) return '';
      // Remove trailing slash and .json if accidentally entered by user
      url = url.replace(/\/+$/, '').replace(/\.json$/, '');
      return url;
    },

    // Save and validate Firebase Database URL
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

    // Get current partitioned user cloud ID
    getCurrentUserId() {
      if (!window.storage) return 'default_user';
      if (window.storage.isCurrentGuest && window.storage.isCurrentGuest()) {
        return null; // Guest trial never syncs to owner cloud
      }
      const user = window.storage.getCurrentSessionUser ? window.storage.getCurrentSessionUser() : null;
      if (user && user.username) {
        return 'user_' + user.username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      }
      if (window.storage.isCurrentOwner && window.storage.isCurrentOwner()) {
        return 'user_mukiviswa';
      }
      return 'user_mukiviswa';
    },

    // Attach listeners for automatic cross-device sync
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
      }, 20000); // Poll every 20 seconds
    },

    // Main 2-way sync method
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
      if (!userId) return; // Do not sync guest sessions

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

        const localUpdatedAt = parseInt(localStorage.getItem(STORAGE_KEY_LOCAL_UPDATED) || '0', 10);
        const cloudUpdatedAt = cloudData ? (cloudData.updatedAt || 0) : 0;

        // Case A: Cloud is newer than local device (e.g. You added tasks on phone, now viewing laptop!)
        if (cloudData && cloudUpdatedAt > localUpdatedAt && (cloudData.tasks || cloudData.expenses)) {
          console.log('[FirebaseSync] Cloud data is newer! Updating local device with latest records...');
          this.applyCloudDataToLocal(cloudData);
          localStorage.setItem(STORAGE_KEY_LOCAL_UPDATED, cloudUpdatedAt.toString());
          localStorage.setItem(STORAGE_KEY_LAST_SYNC, Date.now().toString());
          this.updateSyncBadge('synced');
          this.updateStatusUI();

          if (!silent && window.showToast) {
            window.showToast('☁️ Live Sync: Updated latest tasks & expenses from cloud!', 'success');
          }
          return;
        }

        // Case B: Local is newer or cloud is empty (You made edits locally that need to push to cloud)
        if (!cloudData || localUpdatedAt > cloudUpdatedAt) {
          console.log('[FirebaseSync] Local device has newer changes. Pushing to cloud...');
          await this.pushLocalData(silent);
          return;
        }

        // Case C: Already fully in sync
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, Date.now().toString());
        this.updateSyncBadge('synced');
        this.updateStatusUI();
        if (!silent && window.showToast) {
          window.showToast('✅ All data is up-to-date with cloud!', 'success');
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

    // Push local tasks, expenses, and incomes to Firebase cloud
    async pushLocalData(silent = true) {
      if (!this.isConfigured() || !navigator.onLine) return;
      const userId = this.getCurrentUserId();
      if (!userId || !window.storage) return;

      try {
        const dbUrl = this.getDbUrl();
        const endpoint = `${dbUrl}/spendorio/users/${encodeURIComponent(userId)}.json`;

        const now = Date.now();
        const payload = {
          userId: userId,
          updatedAt: now,
          device: navigator.userAgent.includes('Mobile') ? 'Phone' : 'Desktop',
          tasks: window.storage.getTasks() || [],
          expenses: window.storage.getExpenses() || [],
          incomes: window.storage.getIncomes() || [],
          settings: window.storage.getSettings() || {},
          userProfile: (window.auth && window.auth.currentUser && (!window.storage.isCurrentGuest || !window.storage.isCurrentGuest())) ? {
            fullName: window.auth.currentUser.fullName || '',
            username: window.auth.currentUser.username || '',
            dob: window.auth.currentUser.dob || '',
            email: window.auth.currentUser.email || '',
            phone: window.auth.currentUser.phone || '',
            profileImage: window.auth.currentUser.profileImage || ''
          } : null
        };

        const resp = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (resp.ok) {
          localStorage.setItem(STORAGE_KEY_LOCAL_UPDATED, now.toString());
          localStorage.setItem(STORAGE_KEY_LAST_SYNC, now.toString());
          this.updateSyncBadge('synced');
          this.updateStatusUI();
          console.log(`[FirebaseSync] Successfully uploaded ${payload.tasks.length} tasks and ${payload.expenses.length} expenses to cloud!`);
          if (!silent && window.showToast) {
            window.showToast('☁️ Saved to cloud! Automatically synced across all devices.', 'success');
          }
        }
      } catch (e) {
        console.warn('[FirebaseSync] Failed to push local data:', e.message);
      }
    },

    // Apply cloud data to local storage and refresh UI
    applyCloudDataToLocal(cloudData) {
      if (!window.storage) return;
      try {
        if (Array.isArray(cloudData.tasks)) {
          window.storage.saveTasks(cloudData.tasks);
        }
        if (Array.isArray(cloudData.expenses)) {
          window.storage.saveExpenses(cloudData.expenses);
        }
        if (Array.isArray(cloudData.incomes)) {
          window.storage.saveIncomes(cloudData.incomes);
        }
        if (cloudData.settings && typeof cloudData.settings === 'object') {
          window.storage.updateSettings(cloudData.settings);
        }
        if (cloudData.userProfile && window.auth && typeof window.auth.applyCloudProfile === 'function') {
          window.auth.applyCloudProfile(cloudData.userProfile);
        }

        // Trigger UI updates across all modules
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
        console.error('[FirebaseSync] Error applying cloud data:', e);
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
      const url = inputEl.value.trim();
      if (!url) {
        this.setDbUrl('');
        if (window.showToast) {
          window.showToast('Cloud sync disabled. Operating in 100% offline local storage mode.', 'info');
        }
        return;
      }

      if (!url.includes('firebaseio.com') && !url.includes('http')) {
        if (window.showToast) {
          window.showToast('Please enter a valid Firebase Realtime Database URL (e.g. https://my-app-default-rtdb.firebaseio.com)', 'warning');
        }
        return;
      }

      this.setDbUrl(url);
      if (window.showToast) {
        window.showToast('✅ Firebase URL saved! Testing cloud connection...', 'info');
      }
      this.syncNow(false);
    },

    // Open step-by-step Setup Guide Modal
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
