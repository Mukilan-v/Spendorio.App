/**
 * auth.js - User Authentication & Session Management
 * Supports: Sign Up (Username, Password, Gmail/Email, Phone), Login, Remember Me, and Guest User Login
 * Works 100% offline (localStorage/sessionStorage) and syncs with Node backend if available.
 */

class AuthManager {
  constructor() {
    this.STORAGE_KEYS = {
      USERS: 'taskcost_users',
      SESSION: 'taskcost_session'
    };
    this.currentUser = null;
    this.cropper = {
      img: null,
      scale: 1,
      minScale: 0.4,
      maxScale: 3.5,
      x: 0,
      y: 0,
      rotation: 0,
      isDragging: false,
      startX: 0,
      startY: 0,
      boundEvents: false
    };
    this._rawOriginalImage = null;
    this._logoutReminderTimer = null;
    this._logoutDismissTimer = null;
    this.init();
  }

  init() {
    this.ensureDefaultUsers();
    this.clearSignupForm();
    this.checkSession();
    this.bindLiveAvailabilityChecks();
  }

  // Ensure primary owner user exists in local storage
  ensureDefaultUsers() {
    try {
      let users = this.getLocalUsers();
      const primaryUser = {
        id: 'user-mukiviswa',
        username: 'MukilanViswa',
        password: 'Demo@1234',
        email: 'mukiviswa@gmail.com',
        phone: '9876543210',
        fullName: 'MukiViswa',
        aliases: ['mukiviswa', 'mukilanviswa', 'mukilan'],
        isOwner: true,
        dob: '2004-09-12',
        profileImage: 'img/profile.jpg',
        createdAt: new Date().toISOString()
      };

      // Filter out old demo user 'mukilan' to ensure strict password requirement
      users = users.filter(u => u.username && u.username.toLowerCase() !== 'mukilan');

      const existingIndex = users.findIndex(u => 
        (u.id && u.id === 'user-mukiviswa') ||
        (u.username && (u.username.toLowerCase() === 'mukiviswa' || u.username.toLowerCase() === 'mukilanviswa'))
      );
      if (existingIndex !== -1) {
        // Keep existing custom edits while ensuring profileImage and dob are populated
        users[existingIndex] = {
          ...primaryUser,
          ...users[existingIndex],
          password: primaryUser.password,
          aliases: ['mukiviswa', 'mukilanviswa', 'mukilan'],
          isOwner: true,
          profileImage: users[existingIndex].profileImage || 'img/profile.jpg',
          dob: users[existingIndex].dob || '2004-09-12',
          fullName: users[existingIndex].fullName || 'MukiViswa'
        };
      } else {
        users.unshift(primaryUser);
      }
      this.saveLocalUsers(users);
    } catch (e) {
      console.warn('AuthManager: could not check local users', e);
    }
  }

  getLocalUsers() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveLocalUsers(users) {
    try {
      localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving local users:', e);
    }
  }

  // Check if a saved session exists (localStorage or sessionStorage)
  checkSession() {
    try {
      let sessionData = localStorage.getItem(this.STORAGE_KEYS.SESSION);
      if (!sessionData) {
        sessionData = sessionStorage.getItem(this.STORAGE_KEYS.SESSION);
      }

      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session && session.user) {
          // Rehydrate with latest user data from storage (profileImage, dob, etc.)
          const users = this.getLocalUsers();
          const freshUser = users.find(u => u.id === session.user.id || (u.username && u.username.toLowerCase() === (session.user.username || '').toLowerCase()));
          let merged = freshUser ? { ...session.user, ...freshUser } : session.user;
          const uname = (merged.username || '').toLowerCase();
          if (merged.isOwner || merged.id === 'user-mukiviswa' || uname.includes('muki') || uname.includes('viswa')) {
            if (!merged.profileImage) merged.profileImage = 'img/profile.jpg';
            if (!merged.dob) merged.dob = '2004-09-12';
            if (!merged.fullName || merged.fullName === 'User') merged.fullName = 'MukiViswa';
          }
          this.currentUser = merged;
          session.user = merged;
          if (localStorage.getItem(this.STORAGE_KEYS.SESSION)) {
            localStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(session));
          } else {
            sessionStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(session));
          }
          this.applySessionUI(true);
          return true;
        }
      }
    } catch (e) {
      console.warn('AuthManager: session parse error', e);
    }

    this.currentUser = null;
    this.applySessionUI(false);
    return false;
  }

  // Update DOM visibility between Auth Screen and Main App
  applySessionUI(isLoggedIn) {
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.querySelector('.app-container');

    if (isLoggedIn && this.currentUser) {
      if (authScreen) authScreen.style.display = 'none';
      if (appContainer) appContainer.style.display = 'flex';
      this.updateUserProfileBadges();
      // Start 1-minute gentle logout security reminder
      this.startLogoutReminderTimer();
    } else {
      if (authScreen) authScreen.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
      this.clearLogoutReminderTimer();
      const reminder = document.getElementById('logout-gentle-reminder');
      if (reminder) reminder.style.display = 'none';
    }
  }

  // Update user name/avatar in Top Header and Sidebar
  updateUserProfileBadges() {
    if (!this.currentUser) return;
    const user = this.currentUser;

    // Header profile pill
    const headerName = document.getElementById('header-user-name');
    const headerAvatar = document.getElementById('header-user-avatar');
    const headerRole = document.getElementById('header-user-role');

    if (headerName) {
      headerName.textContent = user.fullName || user.username;
    }
    if (headerAvatar) {
      if (user.profileImage) {
        headerAvatar.innerHTML = `<img src="${user.profileImage}" alt="${user.fullName || user.username}" class="user-avatar-circle user-avatar-header">`;
        if (headerAvatar.style) headerAvatar.style.background = 'transparent';
      } else {
        headerAvatar.innerHTML = user.isGuest
          ? '<i class="fa-solid fa-user-astronaut"></i>'
          : '<i class="fa-solid fa-user"></i>';
      }
    }
    if (headerRole) {
      if (user.dob) {
        const age = this.calculateDetailedAge(user.dob);
        const ageStr = age ? `Age ${age.years}` : '';
        const roleStr = user.isGuest ? 'Guest' : (user.isOwner ? 'Owner' : 'Member');
        headerRole.textContent = ageStr ? `${ageStr} • ${roleStr}` : roleStr;
      } else {
        headerRole.textContent = user.isGuest ? 'Guest User' : (user.isOwner ? 'Owner' : (user.email || user.username));
      }
    }

    // Sidebar profile widget
    const sbName = document.getElementById('sb-user-name');
    const sbEmail = document.getElementById('sb-user-email');
    const sbAvatar = document.getElementById('sb-user-avatar');

    if (sbName) sbName.textContent = user.fullName || user.username;
    if (sbEmail) {
      if (user.dob) {
        const age = this.calculateDetailedAge(user.dob);
        const ageStr = age ? `Age: ${age.years} yrs` : '';
        const subStr = user.email || user.phone || `@${user.username}`;
        sbEmail.textContent = user.isGuest ? 'Guest Mode' : (ageStr ? `${ageStr} • ${subStr}` : subStr);
      } else {
        sbEmail.textContent = user.isGuest ? 'Guest Mode' : (user.email || user.phone || `@${user.username}`);
      }
    }
    if (sbAvatar) {
      if (user.profileImage) {
        sbAvatar.innerHTML = `<img src="${user.profileImage}" alt="${user.fullName || user.username}" class="user-avatar-circle user-avatar-sidebar">`;
        if (sbAvatar.style) sbAvatar.style.background = 'transparent';
      } else {
        sbAvatar.innerHTML = user.isGuest
          ? '<i class="fa-solid fa-user-astronaut"></i>'
          : '<i class="fa-solid fa-user-check"></i>';
      }
    }

    // Update settings tab profile card
    this.updateSettingsProfileCard();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Profile Management & Age Calculation
  // ──────────────────────────────────────────────────────────────────────────

  calculateDetailedAge(dobString) {
    if (!dobString) return null;
    let y, m, d;
    const str = String(dobString).trim();

    // Support both YYYY-MM-DD and DD-MM-YYYY
    if (str.includes('-')) {
      const p = str.split('-').map(x => parseInt(x.trim(), 10));
      if (p.length === 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])) {
        if (p[0] >= 1900) {
          y = p[0]; m = p[1]; d = p[2];
        } else if (p[2] >= 1900) {
          y = p[2]; m = p[1]; d = p[0];
        }
      }
    } else if (str.includes('/')) {
      const p = str.split('/').map(x => parseInt(x.trim(), 10));
      if (p.length === 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])) {
        if (p[0] >= 1900) {
          y = p[0]; m = p[1]; d = p[2];
        } else if (p[2] >= 1900) {
          y = p[2]; m = p[1]; d = p[0];
        }
      }
    }

    // Fallback to standard Date parsing if not extracted
    if (!y || !m || !d) {
      const dt = new Date(str);
      if (!isNaN(dt.getTime())) {
        y = dt.getFullYear();
        m = dt.getMonth() + 1;
        d = dt.getDate();
      }
    }

    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null;

    const birthDate = new Date(y, m - 1, d);
    const now = new Date();
    if (isNaN(birthDate.getTime()) || birthDate > now) return null;

    let years = now.getFullYear() - birthDate.getFullYear();
    let months = now.getMonth() - birthDate.getMonth();
    let days = now.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonthDays;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    // Days until next birthday
    let nextBirthday = new Date(now.getFullYear(), m - 1, d);
    if (nextBirthday < now) {
      nextBirthday.setFullYear(now.getFullYear() + 1);
    }
    const diffMs = nextBirthday.getTime() - now.getTime();
    const daysToNextBday = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Total seconds & days lived
    const totalSeconds = Math.max(0, Math.floor((now.getTime() - birthDate.getTime()) / 1000));
    const totalDays = Math.max(0, Math.floor(totalSeconds / 86400));

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const bornFormatted = `${monthNames[m - 1] || ''} ${d}, ${y}`;

    return {
      years: Math.max(0, years),
      months: Math.max(0, months),
      days: Math.max(0, days),
      bornFormatted,
      daysToNextBday,
      totalDays,
      totalSeconds,
      isoDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      formattedText: `${years} Years, ${months} Months, ${days} Days`
    };
  }

  openProfileModal() {
    if (!this.currentUser) return;
    const user = this.currentUser;

    this._tempProfileImage = user.profileImage || '';

    const modal = document.getElementById('profile-modal');
    if (!modal) return;

    const fnInput = document.getElementById('pm-fullname');
    const unInput = document.getElementById('pm-username');
    const dobInput = document.getElementById('pm-dob');
    const emailInput = document.getElementById('pm-email');
    const phoneInput = document.getElementById('pm-phone');

    if (fnInput) fnInput.value = user.fullName || user.username || '';
    if (unInput) unInput.value = user.username || '';
    if (dobInput) {
      dobInput.value = user.dob || '';
      // Bind live events so every keystroke or date pick updates age instantly
      dobInput.oninput = () => this.handleDobChange(dobInput.value);
      dobInput.onchange = () => this.handleDobChange(dobInput.value);
      dobInput.onkeyup = () => this.handleDobChange(dobInput.value);
    }
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';

    this.renderProfileModalAvatarPreview(this._tempProfileImage);
    this.updateModalAgeDisplay(user.dob || (dobInput ? dobInput.value : ''));
    this.startAgeTicker();

    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }

  closeProfileModal() {
    this.stopAgeTicker();
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  }

  renderProfileModalAvatarPreview(imgSrc) {
    const previewContainer = document.getElementById('pm-avatar-preview-wrap');
    const adjustBtn = document.getElementById('pm-btn-adjust');
    const removeBtn = document.getElementById('pm-btn-remove');
    if (!previewContainer) return;

    if (imgSrc) {
      // Clean display without any annoying hover overlay over face
      previewContainer.innerHTML = `
        <img src="${imgSrc}" alt="Profile" class="user-avatar-circle user-avatar-modal-lg">
      `;
      if (adjustBtn) adjustBtn.style.display = 'inline-flex';
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
      const isGuest = this.currentUser && this.currentUser.isGuest;
      previewContainer.innerHTML = `
        <div class="user-avatar-circle user-avatar-modal-lg avatar-placeholder">
          <i class="${isGuest ? 'fa-solid fa-user-astronaut' : 'fa-solid fa-user'}"></i>
        </div>
      `;
      if (adjustBtn) adjustBtn.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'none';
    }
  }

  promptAvatarAction() {
    this.triggerProfileImagePick();
  }

  triggerProfileImagePick() {
    const fileInput = document.getElementById('profile-image-file-input');
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }

  handleProfileImageSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file (JPG, PNG, GIF, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target.result;
      this._rawOriginalImage = rawDataUrl;
      // Immediately open adjuster modal with circular fit and pixel specifications
      this.openImageAdjustModal(rawDataUrl);
    };
    reader.readAsDataURL(file);
  }

  openImageAdjustModal(imgSrc) {
    const source = imgSrc || this._rawOriginalImage || this._tempProfileImage || (this.currentUser && this.currentUser.profileImage);
    if (!source) {
      this.triggerProfileImagePick();
      return;
    }

    const modal = document.getElementById('image-adjust-modal');
    if (!modal) return;

    const img = new Image();
    img.onload = () => {
      this.cropper.img = img;

      // Display source dimensions
      const srcDimEl = document.getElementById('crop-src-dimensions');
      if (srcDimEl) {
        srcDimEl.textContent = `${img.naturalWidth || img.width} × ${img.naturalHeight || img.height} px`;
      }

      // Calculate initial scale to fit circle (diameter 230px inside 280x280 canvas)
      const minDim = Math.min(img.width, img.height);
      const initialScale = Math.max(0.1, 230 / minDim);
      this.cropper.scale = initialScale;
      this.cropper.fitScale = initialScale;
      this.cropper.minScale = Math.max(0.08, initialScale * 0.35);
      this.cropper.maxScale = Math.max(3.0, initialScale * 4.5);
      this.cropper.x = 0;
      this.cropper.y = 0;
      this.cropper.rotation = 0;

      const slider = document.getElementById('crop-zoom-slider');
      if (slider) {
        slider.min = (this.cropper.minScale).toFixed(2);
        slider.max = (this.cropper.maxScale).toFixed(2);
        slider.step = '0.02';
        slider.value = initialScale.toFixed(2);
      }
      this.updateCropZoomLabel();

      this.bindCropperEvents();
      this.renderCropCanvas();

      modal.classList.add('active');
    };
    img.src = source;
  }

  closeImageAdjustModal() {
    const modal = document.getElementById('image-adjust-modal');
    if (modal) modal.classList.remove('active');
  }

  bindCropperEvents() {
    const canvas = document.getElementById('cropper-canvas');
    const viewport = document.getElementById('cropper-viewport-wrap') || canvas;
    if (!canvas || this.cropper.boundEvents) return;
    this.cropper.boundEvents = true;

    const getPos = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };

    const onStart = (e) => {
      if (e.button && e.button !== 0) return;
      this.cropper.isDragging = true;
      const pos = getPos(e);
      this.cropper.startX = pos.x - this.cropper.x;
      this.cropper.startY = pos.y - this.cropper.y;
    };

    const onMove = (e) => {
      if (!this.cropper.isDragging) return;
      e.preventDefault();
      const pos = getPos(e);
      this.cropper.x = pos.x - this.cropper.startX;
      this.cropper.y = pos.y - this.cropper.startY;
      this.renderCropCanvas();
    };

    const onEnd = () => {
      this.cropper.isDragging = false;
    };

    viewport.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    viewport.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      this.adjustCropZoom(delta);
    }, { passive: false });
  }

  renderCropCanvas() {
    const canvas = document.getElementById('cropper-canvas');
    if (!canvas || !this.cropper.img) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const circleRadius = 115;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw transformed image
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(cx + this.cropper.x, cy + this.cropper.y);
    ctx.rotate((this.cropper.rotation * Math.PI) / 180);
    ctx.scale(this.cropper.scale, this.cropper.scale);
    ctx.drawImage(this.cropper.img, -this.cropper.img.width / 2, -this.cropper.img.height / 2);
    ctx.restore();

    // 2. Draw dark mask outside circular cutout
    ctx.save();
    ctx.fillStyle = 'rgba(11, 15, 25, 0.72)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2, true);
    ctx.fill();

    // 3. Subtle Rule-of-Thirds Grid inside circle for accurate face centering
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const d = circleRadius * 2;
    const x1 = cx - circleRadius + d / 3;
    const x2 = cx - circleRadius + (2 * d) / 3;
    ctx.beginPath();
    ctx.moveTo(x1, cy - circleRadius);
    ctx.lineTo(x1, cy + circleRadius);
    ctx.moveTo(x2, cy - circleRadius);
    ctx.lineTo(x2, cy + circleRadius);
    ctx.stroke();

    const y1 = cy - circleRadius + d / 3;
    const y2 = cy - circleRadius + (2 * d) / 3;
    ctx.beginPath();
    ctx.moveTo(cx - circleRadius, y1);
    ctx.lineTo(cx + circleRadius, y1);
    ctx.moveTo(cx - circleRadius, y2);
    ctx.lineTo(cx + circleRadius, y2);
    ctx.stroke();

    // Center crosshairs
    ctx.strokeStyle = 'rgba(225, 48, 108, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();
    ctx.restore();

    // 4. Draw circular guideline border
    ctx.beginPath();
    ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#e1306c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner subtle glow border
    ctx.beginPath();
    ctx.arc(cx, cy, circleRadius - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 5. Update Live Mini Preview Canvas (32x32 standard avatar size)
    this.renderMiniPreview();
  }

  renderMiniPreview() {
    const miniCanvas = document.getElementById('crop-mini-preview-canvas');
    if (!miniCanvas || !this.cropper.img) return;
    const mctx = miniCanvas.getContext('2d');
    const exportSize = 32;
    const circleRadius = 115;
    const ratio = exportSize / (circleRadius * 2);

    mctx.clearRect(0, 0, exportSize, exportSize);
    mctx.save();
    mctx.imageSmoothingEnabled = true;
    mctx.imageSmoothingQuality = 'high';
    mctx.beginPath();
    mctx.arc(exportSize / 2, exportSize / 2, exportSize / 2, 0, Math.PI * 2);
    mctx.clip();
    mctx.translate(exportSize / 2 + this.cropper.x * ratio, exportSize / 2 + this.cropper.y * ratio);
    mctx.rotate((this.cropper.rotation * Math.PI) / 180);
    mctx.scale(this.cropper.scale * ratio, this.cropper.scale * ratio);
    mctx.drawImage(this.cropper.img, -this.cropper.img.width / 2, -this.cropper.img.height / 2);
    mctx.restore();
  }

  setCropZoom(val) {
    this.cropper.scale = parseFloat(val);
    this.updateCropZoomLabel();
    this.renderCropCanvas();
  }

  adjustCropZoom(delta) {
    const slider = document.getElementById('crop-zoom-slider');
    let newScale = this.cropper.scale + delta;
    newScale = Math.max(this.cropper.minScale, Math.min(this.cropper.maxScale, newScale));
    this.cropper.scale = newScale;
    if (slider) slider.value = newScale.toFixed(2);
    this.updateCropZoomLabel();
    this.renderCropCanvas();
  }

  updateCropZoomLabel() {
    const lbl = document.getElementById('crop-zoom-label');
    if (lbl) {
      const baseScale = this.cropper.fitScale || this.cropper.minScale || 1;
      const pct = Math.round((this.cropper.scale / baseScale) * 100);
      lbl.textContent = `${pct}% Zoom`;
    }
  }

  fitImageToCircle() {
    if (!this.cropper.img) return;
    const minDim = Math.min(this.cropper.img.width, this.cropper.img.height);
    const fitScale = 230 / minDim;
    this.cropper.scale = fitScale;
    this.cropper.x = 0;
    this.cropper.y = 0;
    const slider = document.getElementById('crop-zoom-slider');
    if (slider) slider.value = fitScale.toFixed(2);
    this.updateCropZoomLabel();
    this.renderCropCanvas();
  }

  rotateCropImage() {
    this.cropper.rotation = (this.cropper.rotation + 90) % 360;
    this.renderCropCanvas();
  }

  resetCropPosition() {
    this.cropper.x = 0;
    this.cropper.y = 0;
    this.cropper.rotation = 0;
    this.renderCropCanvas();
  }

  applyCroppedImage() {
    if (!this.cropper.img) return;

    const exportSize = 360; // 360x360 px high-resolution circular profile picture
    const canvas = document.createElement('canvas');
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext('2d');

    const circleRadius = 115;
    const ratio = exportSize / (circleRadius * 2);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(exportSize / 2 + this.cropper.x * ratio, exportSize / 2 + this.cropper.y * ratio);
    ctx.rotate((this.cropper.rotation * Math.PI) / 180);
    ctx.scale(this.cropper.scale * ratio, this.cropper.scale * ratio);
    ctx.drawImage(this.cropper.img, -this.cropper.img.width / 2, -this.cropper.img.height / 2);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    this._tempProfileImage = dataUrl;
    this.renderProfileModalAvatarPreview(dataUrl);

    this.closeImageAdjustModal();

    if (window.app && window.app.showToast) {
      window.app.showToast('Profile photo adjusted! Click "Save Profile & Picture" to apply. 🎉', 'success');
    }
  }

  removeProfileImage() {
    this._tempProfileImage = '';
    this._rawOriginalImage = null;
    this.renderProfileModalAvatarPreview('');
  }

  handleDobChange(newDob) {
    if (!newDob) {
      const el = document.getElementById('pm-dob');
      if (el) newDob = el.value;
    }
    this.updateModalAgeDisplay(newDob);
  }

  updateModalAgeDisplay(dobVal) {
    if (!dobVal) {
      const el = document.getElementById('pm-dob');
      if (el) dobVal = el.value;
    }

    const ageValEl = document.getElementById('pm-age-years-text');
    const ageSubEl = document.getElementById('pm-age-sub-text');
    const ageSecEl = document.getElementById('pm-age-seconds-live');

    if (!dobVal) {
      if (ageValEl) ageValEl.innerHTML = '<span style="color: var(--text-muted); font-size: 0.95rem; font-weight: 500;">📅 Please select or enter your Date of Birth</span>';
      if (ageSubEl) ageSubEl.textContent = 'Select your Date of Birth above to automatically calculate your converted age.';
      if (ageSecEl) ageSecEl.textContent = '--';
      return;
    }

    const age = this.calculateDetailedAge(dobVal);
    if (!age) {
      if (ageValEl) ageValEl.innerHTML = '<span style="color: var(--danger); font-size: 0.9rem;">⚠️ Invalid Date (Birth date cannot be in the future)</span>';
      if (ageSubEl) ageSubEl.textContent = 'Please choose a valid birth date.';
      if (ageSecEl) ageSecEl.textContent = '--';
      return;
    }

    if (ageValEl) {
      ageValEl.innerHTML = `
        <div style="display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px;">
          <span><span class="age-num">${age.years}</span> <span class="age-lbl">Years</span></span>
          <span><span class="age-num">${age.months}</span> <span class="age-lbl">Months</span></span>
          <span><span class="age-num">${age.days}</span> <span class="age-lbl">Days</span></span>
        </div>
      `;
    }
    if (ageSubEl) {
      const bdayText = (age.daysToNextBday === 0 || age.daysToNextBday === 365)
        ? '🎉 Happy Birthday Today!' 
        : `🎂 Next birthday in <strong>${age.daysToNextBday}</strong> day${age.daysToNextBday > 1 ? 's' : ''}`;
      ageSubEl.innerHTML = `Born on <strong>${age.bornFormatted}</strong> • ${bdayText} • Lived <strong>${age.totalDays.toLocaleString()}</strong> days`;
    }
    if (ageSecEl) {
      ageSecEl.textContent = `⏱️ ${age.totalSeconds.toLocaleString()} seconds active`;
    }
  }

  startAgeTicker() {
    this.stopAgeTicker();
    this._ageTicker = setInterval(() => {
      const dobInput = document.getElementById('pm-dob');
      if (dobInput && dobInput.value) {
        const age = this.calculateDetailedAge(dobInput.value);
        if (age) {
          const ageSecEl = document.getElementById('pm-age-seconds-live');
          if (ageSecEl) {
            ageSecEl.textContent = `⏱️ ${age.totalSeconds.toLocaleString()} seconds active`;
          }
        }
      }
    }, 1000);
  }

  stopAgeTicker() {
    if (this._ageTicker) {
      clearInterval(this._ageTicker);
      this._ageTicker = null;
    }
  }

  async saveProfile() {
    if (!this.currentUser) return;

    const fnInput = document.getElementById('pm-fullname');
    const unInput = document.getElementById('pm-username');
    const dobInput = document.getElementById('pm-dob');
    const emailInput = document.getElementById('pm-email');
    const phoneInput = document.getElementById('pm-phone');

    const fullName = (fnInput?.value || '').trim();
    const username = (unInput?.value || '').trim();
    const dob = (dobInput?.value || '').trim();
    const email = (emailInput?.value || '').trim();
    const phone = (phoneInput?.value || '').trim();

    if (!username || username.length < 3) {
      alert('Username must be at least 3 characters.');
      return;
    }

    // Safeguard: Ensure new username is not already taken by another user
    const localUsers = this.getLocalUsers();
    const cleanNewUsername = username.toLowerCase().trim();
    const usernameTaken = localUsers.find(u => 
      u.id !== this.currentUser.id && 
      (u.username || '').toLowerCase().trim() === cleanNewUsername
    );
    if (usernameTaken) {
      if (window.app && window.app.showToast) {
        window.app.showToast(`⚠️ Username "${username}" is already taken by another person!`, 'warning');
      } else {
        alert(`Username "${username}" is already taken by another person.`);
      }
      return;
    }

    // Safeguard: Ensure email is not duplicate
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const emailTaken = localUsers.find(u => 
        u.id !== this.currentUser.id && 
        (u.email || '').toLowerCase().trim() === cleanEmail
      );
      if (emailTaken) {
        if (window.app && window.app.showToast) {
          window.app.showToast(`⚠️ Email "${email}" is already used by another account!`, 'warning');
        } else {
          alert(`Email "${email}" is already used by another account.`);
        }
        return;
      }
    }

    let cleanDob = dob;
    const ageResult = this.calculateDetailedAge(dob);
    if (ageResult && ageResult.isoDate) {
      cleanDob = ageResult.isoDate;
    }

    const updatedUser = {
      ...this.currentUser,
      fullName: fullName || username,
      username: username,
      dob: cleanDob,
      email: email,
      phone: phone,
      profileImage: this._tempProfileImage !== undefined ? this._tempProfileImage : (this.currentUser.profileImage || '')
    };

    // Update currentUser in memory
    this.currentUser = updatedUser;

    // Update session storage
    try {
      let sessionData = localStorage.getItem(this.STORAGE_KEYS.SESSION);
      if (sessionData) {
        const s = JSON.parse(sessionData);
        s.user = updatedUser;
        localStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(s));
      } else {
        sessionData = sessionStorage.getItem(this.STORAGE_KEYS.SESSION);
        if (sessionData) {
          const s = JSON.parse(sessionData);
          s.user = updatedUser;
          sessionStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(s));
        }
      }
    } catch (e) {
      console.warn('Session update error:', e);
    }

    // Update local users list
    try {
      const users = this.getLocalUsers();
      const idx = users.findIndex(u => u.id === updatedUser.id || (u.username && u.username.toLowerCase() === updatedUser.username.toLowerCase()));
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updatedUser };
      } else {
        users.push(updatedUser);
      }
      this.saveLocalUsers(users);
    } catch (e) {
      console.warn('Users storage update error:', e);
    }

    // Sync to backend
    try {
      fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      }).catch(() => {});
    } catch {}

    // Update all badges and previews
    this.updateUserProfileBadges();

    // Refresh storage metrics and views
    if (window.app) window.app.updateSummaryMetrics();
    if (window.tasks) window.tasks.render();
    if (window.expenses) window.expenses.render();

    // Close modal
    this.closeProfileModal();

    if (window.app && window.app.showToast) {
      window.app.showToast('Profile & Picture updated successfully! 🎉', 'success');
    }
  }

  updateSettingsProfileCard() {
    const card = document.getElementById('settings-profile-card');
    if (!card) return;
    if (!this.currentUser) return;

    const user = this.currentUser;
    const avatarEl = document.getElementById('sp-avatar');
    const nameEl = document.getElementById('sp-name');
    const usernameEl = document.getElementById('sp-username');
    const emailEl = document.getElementById('sp-email');
    const phoneEl = document.getElementById('sp-phone');
    const ageEl = document.getElementById('sp-age');
    const dobEl = document.getElementById('sp-dob');

    if (avatarEl) {
      if (user.profileImage) {
        avatarEl.innerHTML = `<img src="${user.profileImage}" alt="${user.fullName || user.username}" class="user-avatar-circle user-avatar-settings">`;
      } else {
        avatarEl.innerHTML = `<div class="user-avatar-circle user-avatar-settings avatar-placeholder"><i class="${user.isGuest ? 'fa-solid fa-user-astronaut' : 'fa-solid fa-user'}"></i></div>`;
      }
    }

    if (nameEl) nameEl.textContent = user.fullName || user.username || 'User';
    if (usernameEl) usernameEl.textContent = `@${user.username || 'user'}`;
    if (emailEl) emailEl.textContent = user.email || 'No email added';
    if (phoneEl) phoneEl.textContent = user.phone || 'No phone added';
    if (dobEl) dobEl.textContent = user.dob || 'Not set';

    if (ageEl) {
      if (user.dob) {
        const age = this.calculateDetailedAge(user.dob);
        if (age) {
          ageEl.innerHTML = `<strong>${age.years} Years, ${age.months} Mos, ${age.days} Days</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">(Lived ${age.totalDays.toLocaleString()} days)</span>`;
        } else {
          ageEl.textContent = 'Invalid date';
        }
      } else {
        ageEl.innerHTML = '<span style="color: var(--text-muted);">Not calculated (Set Date of Birth)</span>';
      }
    }
  }

  // Tab switcher between Login and Sign Up
  switchTab(tabName) {
    const loginForm = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');
    const loginTabBtn = document.getElementById('auth-tab-login-btn');
    const signupTabBtn = document.getElementById('auth-tab-signup-btn');
    const switchText = document.getElementById('auth-switch-text');
    const errorBox = document.getElementById('auth-error-msg');
    if (errorBox) errorBox.style.display = 'none';

    // ALWAYS reset and wipe the Sign Up form clean when switching so old details never stay
    this.clearSignupForm();

    if (tabName === 'signup') {
      if (loginForm) loginForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'flex';
      if (loginTabBtn) {
        loginTabBtn.classList.remove('active');
        loginTabBtn.removeAttribute('style');
      }
      if (signupTabBtn) {
        signupTabBtn.classList.add('active');
        signupTabBtn.removeAttribute('style');
      }
      if (switchText) {
        switchText.innerHTML = `Have an account? <a href="javascript:void(0)" onclick="window.auth.switchTab('login')" class="auth-switch-link">Log in</a>`;
      }
      document.getElementById('signup-fullname')?.focus();
    } else {
      if (loginForm) loginForm.style.display = 'flex';
      if (signupForm) signupForm.style.display = 'none';
      if (loginTabBtn) {
        loginTabBtn.classList.add('active');
        loginTabBtn.removeAttribute('style');
      }
      if (signupTabBtn) {
        signupTabBtn.classList.remove('active');
        signupTabBtn.removeAttribute('style');
      }
      if (switchText) {
        switchText.innerHTML = `Don't have an account? <a href="javascript:void(0)" onclick="window.auth.switchTab('signup')" class="auth-switch-link">Sign up</a>`;
      }
      document.getElementById('login-identifier')?.focus();
    }
  }

  // Clear all fields in the Sign Up form so no previous person's data is retained
  clearSignupForm() {
    const signupForm = document.getElementById('auth-signup-form');
    if (signupForm) {
      signupForm.reset();
    }
    const fields = ['signup-fullname', 'signup-username', 'signup-email', 'signup-phone', 'signup-password'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const hint = document.getElementById('signup-email-hint');
    if (hint) hint.style.display = 'none';

    // Reset all duplicate error and availability notices
    ['username', 'email', 'phone'].forEach(field => this.clearFieldStatus(field));
  }

  // ── Live Availability Checker (Detects Already Used details immediately) ──
  setFieldStatus(field, isAvailable, message) {
    const statusEl = document.getElementById('signup-' + field + '-status');
    const inputEl = document.getElementById('signup-' + field);
    if (!statusEl || !inputEl) return;

    if (isAvailable) {
      statusEl.className = 'auth-field-status status-success';
      statusEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${message}`;
      statusEl.style.display = 'flex';
      inputEl.classList.remove('input-duplicate-error');
      inputEl.classList.add('input-valid-success');
    } else {
      statusEl.className = 'auth-field-status status-error';
      statusEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${message}</span>`;
      statusEl.style.display = 'flex';
      inputEl.classList.remove('input-valid-success');
      inputEl.classList.add('input-duplicate-error');
    }
  }

  clearFieldStatus(field) {
    const statusEl = document.getElementById('signup-' + field + '-status');
    const inputEl = document.getElementById('signup-' + field);
    if (statusEl) {
      statusEl.style.display = 'none';
      statusEl.innerHTML = '';
      statusEl.className = 'auth-field-status';
    }
    if (inputEl) {
      inputEl.classList.remove('input-duplicate-error', 'input-valid-success');
    }
  }

  showFieldError(field, message) {
    this.showError(message);
    this.setFieldStatus(field, false, message);
    const inputEl = document.getElementById('signup-' + field);
    if (inputEl) {
      inputEl.focus();
      inputEl.classList.add('input-duplicate-error');
    }
  }

  async checkFieldLive(field, value) {
    const cleanVal = (value || '').trim();
    if (!cleanVal) {
      this.clearFieldStatus(field);
      return;
    }

    const localUsers = this.getLocalUsers();

    if (field === 'username') {
      const lower = cleanVal.toLowerCase();
      if (lower.length < 3) {
        this.clearFieldStatus(field);
        return;
      }
      const isTakenLocal = localUsers.some(u => (u.username || '').toLowerCase().trim() === lower);
      if (isTakenLocal) {
        this.setFieldStatus('username', false, '⚠️ This Username is already used by another person!');
        return;
      }
    } else if (field === 'email') {
      const lower = cleanVal.toLowerCase();
      if (!lower.includes('@') || !lower.includes('.')) {
        this.clearFieldStatus(field);
        return;
      }
      const isTakenLocal = localUsers.some(u => (u.email || '').toLowerCase().trim() === lower);
      if (isTakenLocal) {
        this.setFieldStatus('email', false, '⚠️ This Gmail / Email is already used by another person!');
        return;
      }
    } else if (field === 'phone') {
      if (cleanVal.length < 7) {
        this.clearFieldStatus(field);
        return;
      }
      const isTakenLocal = localUsers.some(u => (u.phone || '').trim() === cleanVal);
      if (isTakenLocal) {
        this.setFieldStatus('phone', false, '⚠️ This Phone Number is already registered.');
        return;
      }
    }

    // Also check server in real-time
    try {
      const resp = await fetch(`/api/auth/check-availability?field=${field}&value=${encodeURIComponent(cleanVal)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success) {
          if (!data.available) {
            this.setFieldStatus(field, false, data.message || '⚠️ Already used by another person!');
          } else {
            this.setFieldStatus(field, true, data.message || '✓ Available');
          }
        }
      }
    } catch {}
  }

  bindLiveAvailabilityChecks() {
    if (this._availabilityBound) return;
    this._availabilityBound = true;

    const setupField = (field, delay = 250) => {
      const el = document.getElementById('signup-' + field);
      if (!el) return;

      let timer = null;
      el.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.checkFieldLive(field, el.value), delay);
      });

      el.addEventListener('blur', () => {
        clearTimeout(timer);
        this.checkFieldLive(field, el.value);
      });
    };

    setupField('username');
    setupField('email');
    setupField('phone');
  }

  // Clear all fields in the Login form
  clearLoginForm() {
    const loginForm = document.getElementById('auth-login-form');
    if (loginForm) {
      loginForm.reset();
    }
    const fields = ['login-identifier', 'login-password'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  // ── Email Helper Tip Methods (Compulsory hint) ───────────────
  showEmailHint() {
    const hint = document.getElementById('signup-email-hint');
    if (hint) hint.style.display = 'flex';
  }

  hideEmailHintOnBlur() {
    const emailVal = (document.getElementById('signup-email')?.value || '').trim();
    if (!emailVal) {
      setTimeout(() => {
        const hint = document.getElementById('signup-email-hint');
        if (hint && document.activeElement !== document.getElementById('signup-email')) {
          hint.style.display = 'none';
        }
      }, 400);
    }
  }

  toggleEmailHint() {
    const hint = document.getElementById('signup-email-hint');
    if (hint) {
      hint.style.display = hint.style.display === 'none' ? 'flex' : 'none';
    }
  }

  // ── Guest Confirmation Modal Methods ─────────────────────────
  showGuestConfirmModal() {
    const modal = document.getElementById('guest-confirm-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  closeGuestConfirmModal(goToSignUp = false) {
    const modal = document.getElementById('guest-confirm-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
    if (goToSignUp) {
      this.switchTab('signup');
    }
  }

  confirmGuestLogin() {
    this.closeGuestConfirmModal(false);
    this.loginAsGuest();
  }

  // Toggle password visibility (eye icon)
  togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      if (icon) {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      }
    } else {
      input.type = 'password';
      if (icon) {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Forgot Password Flow
  // ──────────────────────────────────────────────────────────────────────────
  showForgotForm() {
    const loginForm = document.getElementById('auth-login-form');
    const forgotForm = document.getElementById('auth-forgot-form');
    const tabBar = document.querySelector('.auth-tab-bar');
    if (loginForm) loginForm.style.display = 'none';
    if (tabBar) tabBar.style.display = 'none';
    if (forgotForm) {
      forgotForm.style.display = 'flex';
      // Reset step 2
      const step2 = document.getElementById('forgot-step-newpw');
      const step1 = document.getElementById('forgot-step-email');
      if (step2) step2.style.display = 'none';
      if (step1) step1.style.display = 'block';
      const emailInput = document.getElementById('forgot-email');
      if (emailInput) { emailInput.value = ''; emailInput.focus(); }
    }
    this.clearError();
  }

  hideForgotForm() {
    const loginForm = document.getElementById('auth-login-form');
    const forgotForm = document.getElementById('auth-forgot-form');
    const tabBar = document.querySelector('.auth-tab-bar');
    if (forgotForm) forgotForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'flex';
    if (tabBar) tabBar.style.display = 'flex';
    this.clearError();
  }

  verifyForgotEmail() {
    this.clearError();
    const emailInput = document.getElementById('forgot-email');
    const email = (emailInput ? emailInput.value : '').trim().toLowerCase();

    if (!email) {
      this.showError('Please enter your registered email address.');
      return;
    }

    const users = this.getLocalUsers();
    const found = users.find(u => u.email && u.email.toLowerCase() === email);
    if (!found) {
      this.showError('No account found with this email. Only already-registered emails are allowed.');
      return;
    }

    // Save verified email for next step
    this._forgotVerifiedEmail = email;
    this._forgotVerifiedUserId = found.id;

    const step1 = document.getElementById('forgot-step-email');
    const step2 = document.getElementById('forgot-step-newpw');
    const label = document.getElementById('forgot-verified-email-label');

    if (step1) step1.style.display = 'none';
    if (step2) { step2.style.display = 'flex'; }
    if (label) label.textContent = `✅ ${found.email} — verified!`;

    const pwInput = document.getElementById('forgot-new-password');
    if (pwInput) pwInput.focus();
  }

  async resetPassword() {
    this.clearError();
    const newPw = (document.getElementById('forgot-new-password')?.value || '');
    const confirmPw = (document.getElementById('forgot-confirm-password')?.value || '');

    if (!newPw || newPw.length < 4) {
      this.showError('New password must be at least 4 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      this.showError('Passwords do not match. Please retype.');
      return;
    }
    if (!this._forgotVerifiedEmail) {
      this.showError('Session expired. Please start again.');
      this.hideForgotForm();
      return;
    }

    // Update in localStorage
    const users = this.getLocalUsers();
    const idx = users.findIndex(u => u.email && u.email.toLowerCase() === this._forgotVerifiedEmail);
    if (idx === -1) {
      this.showError('User not found. Please try again.');
      return;
    }
    users[idx].password = newPw;
    this.saveLocalUsers(users);

    // Sync to server if online
    try {
      await fetch('/api/auth/update-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this._forgotVerifiedEmail, newPassword: newPw })
      });
    } catch {}

    // Clean up
    this._forgotVerifiedEmail = null;
    this._forgotVerifiedUserId = null;

    this.hideForgotForm();

    if (window.app && window.app.showToast) {
      window.app.showToast('Password updated! Please log in with your new password.', 'success');
    } else {
      alert('Password updated successfully! Please log in with your new password.');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Welcome Popup
  // ──────────────────────────────────────────────────────────────────────────
  showWelcomePopup(user) {
    const popup = document.getElementById('welcome-popup');
    const nameEl = document.getElementById('welcome-popup-name');
    if (!popup) return;

    const displayName = user.fullName || user.username || 'User';
    if (nameEl) nameEl.textContent = `Hey, ${displayName}! 👋`;

    const ring = popup.querySelector('.welcome-avatar-ring');
    if (ring) {
      if (user.profileImage) {
        ring.innerHTML = `<img src="${user.profileImage}" alt="avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      } else {
        const iconClass = user.isGuest
          ? 'fa-solid fa-user-astronaut welcome-avatar-icon'
          : 'fa-solid fa-user-check welcome-avatar-icon';
        ring.innerHTML = `<i class="${iconClass}"></i>`;
      }
    }

    const titleEl = popup.querySelector('.welcome-popup-title');
    if (titleEl) {
      titleEl.textContent = user.isGuest ? 'Guest Mode 🚀' : 'Welcome Back! 🎉';
    }

    popup.style.display = 'flex';
    // Auto-close after 4 seconds
    clearTimeout(this._welcomeTimer);
    this._welcomeTimer = setTimeout(() => this.closeWelcomePopup(), 4000);
  }

  closeWelcomePopup() {
    const popup = document.getElementById('welcome-popup');
    if (popup) {
      popup.style.opacity = '0';
      popup.style.transition = 'opacity 0.35s ease';
      setTimeout(() => { popup.style.display = 'none'; popup.style.opacity = ''; popup.style.transition = ''; }, 370);
    }
    clearTimeout(this._welcomeTimer);
  }

  showError(msg) {
    const errorBox = document.getElementById('auth-error-msg');
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    } else {
      alert(msg);
    }
  }

  clearError() {
    const errorBox = document.getElementById('auth-error-msg');
    if (errorBox) errorBox.style.display = 'none';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Sign Up / Register
  // ──────────────────────────────────────────────────────────────────────────
  async handleSignUp(formData) {
    this.clearError();
    const fullName = (formData.get('fullName') || '').trim();
    const username = (formData.get('username') || '').trim();
    const password = (formData.get('password') || '');
    const email = (formData.get('email') || '').trim();
    const phone = (formData.get('phone') || '').trim();

    if (!fullName) {
      this.showError('Full Name is compulsory. Please enter your name.');
      document.getElementById('signup-fullname')?.focus();
      return false;
    }
    if (!username || username.length < 3) {
      this.showError('Username is compulsory and must be at least 3 characters long.');
      document.getElementById('signup-username')?.focus();
      return false;
    }
    if (!email) {
      this.showError('Gmail / Email is compulsory for signup. (Any demo email works, e.g. demo123@gmail.com).');
      this.showEmailHint();
      document.getElementById('signup-email')?.focus();
      return false;
    }
    if (!password || password.length < 3) {
      this.showError('Password is compulsory and must be at least 3 characters long.');
      document.getElementById('signup-password')?.focus();
      return false;
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();
    const localUsers = this.getLocalUsers();

    // 1. Check Username locally
    const userDup = localUsers.find(u => (u.username || '').toLowerCase().trim() === cleanUsername);
    if (userDup) {
      this.showFieldError('username', `⚠️ This Username ("${username}") is already used by another person! Please choose a different username.`);
      return false;
    }

    // 2. Check Email locally
    const emailDup = localUsers.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);
    if (emailDup) {
      this.showFieldError('email', `⚠️ This Gmail / Email ("${email}") is already used by another person! Please enter a different email or Log In.`);
      return false;
    }

    // 3. Check Phone locally (if provided)
    if (cleanPhone && cleanPhone.length >= 7) {
      const phoneDup = localUsers.find(u => (u.phone || '').trim() === cleanPhone);
      if (phoneDup) {
        this.showFieldError('phone', `⚠️ This Phone Number ("${phone}") is already used by another person! Please enter a different phone number.`);
        return false;
      }
    }

    const newUser = {
      id: 'user-' + Date.now(),
      username: username,
      password: password,
      email: email,
      phone: phone,
      fullName: fullName || username,
      isOwner: false,
      createdAt: new Date().toISOString()
    };

    // Register with server (validates uniqueness under concurrent load)
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (resp.status === 409 || resp.status === 400) {
        const data = await resp.json();
        if (data && !data.success) {
          const field = data.field || 'username';
          this.showFieldError(field, data.message || '⚠️ Already used! Please enter different details.');
          return false;
        }
      }
    } catch (e) {
      // Standalone/Offline mode fallback: allow offline creation
    }

    // Save to local storage
    localUsers.push(newUser);
    this.saveLocalUsers(localUsers);

    // Auto log in new user
    const sessionUser = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      phone: newUser.phone,
      fullName: newUser.fullName,
      dob: '',
      profileImage: '',
      isOwner: false,
      isGuest: false
    };

    const sessionPayload = {
      user: sessionUser,
      rememberMe: true,
      loggedInAt: new Date().toISOString()
    };

    localStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(sessionPayload));
    this.currentUser = sessionUser;
    this.clearSignupForm();
    this.applySessionUI(true);

    if (window.app && window.app.showToast) {
      window.app.showToast(`Welcome, ${sessionUser.fullName}! Account created & saved.`, 'success');
    }

    // Refresh metrics and views with storage verification
    if (window.storage) {
      if (window.storage.init) window.storage.init();
      if (window.storage.syncWithServer) window.storage.syncWithServer();
    }
    if (window.app && window.app.updateSummaryMetrics) window.app.updateSummaryMetrics();
    if (window.tasks && window.tasks.render) window.tasks.render();
    if (window.expenses && window.expenses.render) window.expenses.render();
    if (window.charts && window.charts.renderAll) setTimeout(() => window.charts.renderAll(), 100);

    return true;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Login / Sign In
  // ──────────────────────────────────────────────────────────────────────────
  async handleLogin(formData) {
    this.clearError();
    const identifier = (formData.get('identifier') || '').trim();
    const password = (formData.get('password') || '');
    const rememberMe = formData.get('rememberMe') === 'on';

    if (!identifier || !password) {
      this.showError('Please enter your Username, Gmail or Phone and Password.');
      return false;
    }

    const idLower = identifier.trim().toLowerCase();
    const idClean = idLower.replace(/\s+/g, '');
    const localUsers = this.getLocalUsers();

    // Check against local users first (instant offline support)
    let foundUser = localUsers.find(u => {
      const uLower = (u.username || '').toLowerCase().trim();
      const uClean = uLower.replace(/\s+/g, '');
      const fLower = (u.fullName || '').toLowerCase().trim();
      const fClean = fLower.replace(/\s+/g, '');
      const eLower = (u.email || '').toLowerCase().trim();
      const pClean = (u.phone || '').trim();
      const aliases = Array.isArray(u.aliases) ? u.aliases.map(a => a.toLowerCase().trim()) : [];

      return uLower === idLower ||
             uClean === idClean ||
             fLower === idLower ||
             fClean === idClean ||
             eLower === idLower ||
             pClean === identifier.trim() ||
             aliases.includes(idLower) ||
             aliases.includes(idClean) ||
             (idClean === 'mukilanviswa' && (uClean === 'mukiviswa' || u.isOwner)) ||
             (idClean === 'mukiviswa' && (uClean === 'mukilanviswa' || u.isOwner));
    });

    if (foundUser && foundUser.password === password) {
      this.completeLogin(foundUser, rememberMe);
      return true;
    }

    // Try server check if online
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await resp.json();
      if (data && data.success && data.user) {
        // Also save to local users cache
        if (!foundUser) {
          localUsers.push({ ...data.user, password });
          this.saveLocalUsers(localUsers);
        }
        this.completeLogin(data.user, rememberMe);
        return true;
      }
    } catch {}

    this.showError('Invalid Username, Email, Phone or Password. Please try again.');
    return false;
  }

  completeLogin(user, rememberMe = true) {
    let pImg = user.profileImage || '';
    let dob = user.dob || '';
    const uname = (user.username || '').toLowerCase();
    const uid = (user.id || '').toLowerCase();
    const isRealOwner = user.isOwner === true || uid === 'user-mukiviswa' || uname === 'mukilanviswa' || uname === 'mukiviswa';
    if (!pImg && isRealOwner) {
      pImg = 'img/profile.jpg';
      dob = dob || '2004-09-12';
    }

    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email || '',
      phone: user.phone || '',
      fullName: user.fullName || user.username || 'User',
      dob: dob,
      profileImage: pImg,
      isOwner: isRealOwner,
      isGuest: false
    };

    const sessionPayload = {
      user: sessionUser,
      rememberMe: rememberMe,
      loggedInAt: new Date().toISOString()
    };

    if (rememberMe) {
      localStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(sessionPayload));
      sessionStorage.removeItem(this.STORAGE_KEYS.SESSION);
    } else {
      sessionStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(sessionPayload));
      localStorage.removeItem(this.STORAGE_KEYS.SESSION);
    }

    this.currentUser = sessionUser;
    this.applySessionUI(true);

    if (window.app && window.app.showToast) {
      window.app.showToast(`Welcome back, ${sessionUser.fullName}!`, 'success');
    }

    // Show impressive welcome popup
    setTimeout(() => this.showWelcomePopup(sessionUser), 150);

    // Refresh metrics and views with storage verification
    if (window.storage) {
      if (window.storage.init) window.storage.init();
      if (window.storage.syncWithServer) window.storage.syncWithServer();
    }
    if (window.app && window.app.updateSummaryMetrics) window.app.updateSummaryMetrics();
    if (window.tasks && window.tasks.render) window.tasks.render();
    if (window.expenses && window.expenses.render) window.expenses.render();
    if (window.charts && window.charts.renderAll) setTimeout(() => window.charts.renderAll(), 100);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Guest User Login
  // ──────────────────────────────────────────────────────────────────────────
  loginAsGuest() {
    this.clearError();
    const guestUser = {
      id: 'guest',
      username: 'Guest',
      fullName: 'Guest User',
      email: '',
      phone: '',
      isGuest: true
    };

    const sessionPayload = {
      user: guestUser,
      rememberMe: false,
      loggedInAt: new Date().toISOString()
    };

    // Store in sessionStorage / localStorage
    localStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(sessionPayload));
    this.currentUser = guestUser;

    // Reset guest trial space to 100% fresh, clean, empty slate (Zero owner personal data)
    if (window.storage && window.storage.resetGuestDataToFresh) {
      window.storage.resetGuestDataToFresh();
    }

    this.applySessionUI(true);

    if (window.app && window.app.showToast) {
      window.app.showToast('Logged in as Guest User. Fresh clean workspace ready!', 'info');
    }

    // Show welcome popup
    setTimeout(() => this.showWelcomePopup(guestUser), 150);

    if (window.app) window.app.updateSummaryMetrics();
    if (window.tasks) window.tasks.render();
    if (window.expenses) window.expenses.render();
    if (window.charts && window.charts.renderAll) setTimeout(() => window.charts.renderAll(), 100);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Logout
  // ──────────────────────────────────────────────────────────────────────────
  logout() {
    const wasGuest = this.currentUser && this.currentUser.isGuest;
    const departingUser = this.currentUser ? { ...this.currentUser } : null;

    localStorage.removeItem(this.STORAGE_KEYS.SESSION);
    sessionStorage.removeItem(this.STORAGE_KEYS.SESSION);
    this.currentUser = null;

    // If logging out of Guest mode, immediately erase all temporary guest data
    if (wasGuest && window.storage && window.storage.resetGuestDataToFresh) {
      window.storage.resetGuestDataToFresh();
    }

    // Reset both login and signup form inputs completely
    this.clearLoginForm();
    this.clearSignupForm();

    this.applySessionUI(false);
    this.switchTab('login');

    this.clearLogoutReminderTimer();
    const reminder = document.getElementById('logout-gentle-reminder');
    if (reminder) reminder.style.display = 'none';

    // Show goodbye popup
    this.showGoodbyePopup(departingUser, wasGuest);
  }

  showGoodbyePopup(user, wasGuest) {
    const popup = document.getElementById('goodbye-popup');
    const nameEl = document.getElementById('goodbye-popup-name');
    if (!popup) return;

    const displayName = user ? (user.fullName || user.username || 'User') : 'User';
    const farewell = wasGuest
      ? `Thanks for trying Guest Mode! 🚀`
      : `Goodbye, ${displayName}! 👋`;

    if (nameEl) nameEl.textContent = farewell;

    const waveWrap = popup.querySelector('.goodbye-wave-wrap');
    if (waveWrap) {
      if (user && user.profileImage) {
        waveWrap.innerHTML = `<img src="${user.profileImage}" alt="avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2.5px solid #a5b4fc; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">`;
      } else {
        waveWrap.innerHTML = `<span class="goodbye-wave-emoji">👋</span>`;
      }
    }

    popup.style.display = 'flex';
    popup.style.opacity = '1';
    popup.style.transition = '';

    // Auto-dismiss after 2.8 seconds then fade out
    clearTimeout(this._goodbyeTimer);
    this._goodbyeTimer = setTimeout(() => {
      popup.style.transition = 'opacity 0.45s ease';
      popup.style.opacity = '0';
      setTimeout(() => {
        popup.style.display = 'none';
        popup.style.opacity = '';
        popup.style.transition = '';
      }, 470);
    }, 2800);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Gentle Non-Disturbing Logout Security Reminder
  // ──────────────────────────────────────────────────────────────────────────
  startLogoutReminderTimer() {
    this.clearLogoutReminderTimer();
    try {
      if (sessionStorage.getItem('spendorio_dismiss_logout_reminder') === 'true' || sessionStorage.getItem('spendora_dismiss_logout_reminder') === 'true') {
        return;
      }
    } catch (e) {}
    // 3 minutes after login (180,000 ms), show once
    this._logoutReminderTimer = setTimeout(() => {
      if (this.currentUser) {
        this.showGentleLogoutReminder();
      }
    }, 180000);
  }

  showGentleLogoutReminder() {
    const el = document.getElementById('logout-gentle-reminder');
    if (!el) return;

    el.style.display = 'block';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';

    // Auto-dismiss smoothly after 8 seconds so it never disturbs the user
    clearTimeout(this._logoutDismissTimer);
    this._logoutDismissTimer = setTimeout(() => {
      this.dismissLogoutReminder(false);
    }, 8000);
  }

  dismissLogoutReminder(userExplicitDismiss = false) {
    clearTimeout(this._logoutDismissTimer);
    this.clearLogoutReminderTimer();
    if (userExplicitDismiss) {
      try {
        sessionStorage.setItem('spendorio_dismiss_logout_reminder', 'true');
      } catch (e) {}
    }
    const el = document.getElementById('logout-gentle-reminder');
    if (el) {
      el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      setTimeout(() => {
        el.style.display = 'none';
        el.style.opacity = '';
        el.style.transform = '';
        el.style.transition = '';
      }, 420);
    }
    // If auto-dismissed without user click, wait 10 minutes before next reminder
    if (!userExplicitDismiss) {
      this._logoutReminderTimer = setTimeout(() => {
        if (this.currentUser) {
          this.showGentleLogoutReminder();
        }
      }, 600000);
    }
  }

  clearLogoutReminderTimer() {
    if (this._logoutReminderTimer) {
      clearTimeout(this._logoutReminderTimer);
      this._logoutReminderTimer = null;
    }
    if (this._logoutDismissTimer) {
      clearTimeout(this._logoutDismissTimer);
      this._logoutDismissTimer = null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // User Manual & Beginner Guide
  // ──────────────────────────────────────────────────────────────────────────
  openUserManual(activeTab = 'start') {
    const modal = document.getElementById('user-manual-modal');
    if (modal) {
      modal.style.display = 'flex';
      this.switchManualTab(activeTab);
    }
  }

  closeUserManual() {
    const modal = document.getElementById('user-manual-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  switchManualTab(tabId) {
    const sidebar = document.querySelector('.user-manual-sidebar');
    if (sidebar) {
      sidebar.querySelectorAll('.manual-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
    }
    document.querySelectorAll('.manual-tab-pane').forEach(pane => {
      pane.style.display = pane.id === `manual-tab-${tabId}` ? 'block' : 'none';
    });
    // Scroll content to top on tab switch
    const content = document.querySelector('.user-manual-content');
    if (content) content.scrollTop = 0;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Background Design Switcher
  // ──────────────────────────────────────────────────────────────────────────
  toggleBgPicker() {
    const menu = document.getElementById('auth-bg-picker-menu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    }
  }

  setAuthBackground(bgId) {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
      authScreen.setAttribute('data-bg', bgId);
      localStorage.setItem('spendorio_auth_bg', bgId);
    }
    // Update active state in picker menu
    document.querySelectorAll('.bg-opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bg === bgId);
    });
    const menu = document.getElementById('auth-bg-picker-menu');
    if (menu) menu.style.display = 'none';
  }

  initAuthBackground() {
    const saved = localStorage.getItem('spendorio_auth_bg') || localStorage.getItem('spendora_auth_bg') || 'cyber-glass';
    this.setAuthBackground(saved);

    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
      const wrap = document.querySelector('.auth-bg-picker-wrap');
      const menu = document.getElementById('auth-bg-picker-menu');
      if (wrap && menu && !wrap.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
  }

  isLoggedIn() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Global instance
window.auth = new AuthManager();

// Refresh and ensure session badges after DOM fully loads
document.addEventListener('DOMContentLoaded', () => {
  if (window.auth) {
    window.auth.checkSession();
    window.auth.initAuthBackground();
  }
});
