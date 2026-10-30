const fs = require('fs');

['public/js/pwa.js', 'docs/js/pwa.js'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');

  // Replace promptInstall desktop branch to prioritize native 1-click install over downloading files
  const oldDesktopBlock = `      // Desktop installation workflow
      if (!isMobile()) {
        // 1. Immediately trigger the direct desktop launcher shortcut download
        this.downloadDesktopShortcut();

        // 2. If native browser PWA install prompt is ready, trigger it too
        if (deferredPrompt) {
          try {
            deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            console.log('[Spendorio PWA] User install choice:', choice.outcome);
            if (choice.outcome === 'accepted') {
              deferredPrompt = null;
              this.showInstallButtons(false);
              const banner = document.getElementById('pwa-install-banner');
              if (banner) banner.style.display = 'none';
            }
          } catch (err) {
            console.warn('[Spendorio PWA] Error triggering native prompt:', err);
          }
        }

        // 3. Open desktop confirmation modal with clear instructions
        this.openGenericInstallModal();
        return;
      }`;

  const newDesktopBlock = `      // Desktop installation workflow (Clean 1-Click Native Install)
      if (!isMobile()) {
        if (deferredPrompt) {
          try {
            deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            console.log('[Spendorio PWA] User install choice:', choice.outcome);
            if (choice.outcome === 'accepted') {
              deferredPrompt = null;
              this.showInstallButtons(false);
              const banner = document.getElementById('pwa-install-banner');
              if (banner) banner.style.display = 'none';
              if (window.showToast) {
                window.showToast('🎉 Spendorio installed directly on your Desktop!', 'success');
              }
              return;
            }
          } catch (err) {
            console.warn('[Spendorio PWA] Error triggering native prompt:', err);
          }
        }

        // If native prompt is not active, open guided desktop install modal
        this.openGenericInstallModal();
        return;
      }`;

  if (code.includes('this.downloadDesktopShortcut();\n\n        // 2. If native browser PWA install prompt')) {
    code = code.replace(oldDesktopBlock, newDesktopBlock);
  }

  // Also update openGenericInstallModal for desktop
  const oldModalHtml = `            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 12px; margin-bottom: 1rem; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 1.5rem;"></i>
              <div>
                <div style="font-weight: 700; color: #10b981; font-size: 0.9rem;">Desktop Shortcut Downloaded!</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Check your browser's <strong>Downloads</strong> folder.</div>
              </div>
            </div>

            <div class="pwa-step-item">
              <div class="pwa-step-num">1</div>
              <div class="pwa-step-text">Drag or move <strong>Spendorio-App.url</strong> from Downloads to your <strong>Desktop</strong>.</div>
            </div>
            <div class="pwa-step-item">
              <div class="pwa-step-num">2</div>
              <div class="pwa-step-text">Double-click it anytime on your computer to launch Spendorio instantly!</div>
            </div>
            <div class="pwa-step-item">
              <div class="pwa-step-num">3</div>
              <div class="pwa-step-text"><strong>Standalone Window App:</strong> You can also click the <strong>App (⊕) icon</strong> in your browser's address bar to install as a dedicated window.</div>
            </div>

            <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color); text-align: center;">
              <button type="button" class="btn-insta-gradient" onclick="window.SpendorioPWA.downloadDesktopShortcut()" style="width: 100%; padding: 0.65rem 1rem; font-size: 0.85rem; font-weight: 700; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fa-solid fa-download"></i>
                <span>Download Desktop Shortcut (.url) Again</span>
              </button>
            </div>`;

  const newModalHtml = `            <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 12px; margin-bottom: 1rem; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-desktop" style="color: #6366f1; font-size: 1.5rem;"></i>
              <div>
                <div style="font-weight: 700; color: #6366f1; font-size: 0.9rem;">Install Directly to Windows Desktop</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">No file downloads needed — installs with 1 click!</div>
              </div>
            </div>

            <div class="pwa-step-item">
              <div class="pwa-step-num">1</div>
              <div class="pwa-step-text">Look at the <strong>right side of your browser's address bar</strong> (near the bookmark star).</div>
            </div>
            <div class="pwa-step-item">
              <div class="pwa-step-num">2</div>
              <div class="pwa-step-text">Click the <strong>Install App icon</strong> (looks like a monitor with a down arrow <i class="fa-solid fa-download"></i> or ⊕).</div>
            </div>
            <div class="pwa-step-item">
              <div class="pwa-step-num">3</div>
              <div class="pwa-step-text">Click <strong>"Install"</strong>. Windows will automatically place the Spendorio app icon on your Desktop and Start Menu!</div>
            </div>

            <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color); text-align: center;">
              <button type="button" class="btn-insta-gradient" onclick="window.SpendorioPWA.downloadDesktopShortcut()" style="width: 100%; padding: 0.65rem 1rem; font-size: 0.85rem; font-weight: 700; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; opacity: 0.85;">
                <i class="fa-solid fa-download"></i>
                <span>Or Download .url Shortcut File</span>
              </button>
            </div>`;

  if (code.includes('Desktop Shortcut Downloaded!')) {
    code = code.replace(oldModalHtml, newModalHtml);
  }

  fs.writeFileSync(file, code, 'utf8');
  console.log('Updated', file);
});
