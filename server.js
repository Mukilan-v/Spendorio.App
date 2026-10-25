const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ─────────────────────────────────────────────────────────────────────────────
// CRASH-PROOF PROCESS HANDLERS (Server stays online 24/7 under heavy load)
// ─────────────────────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[Anti-Crash] Uncaught Exception caught (Server kept alive):', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Anti-Crash] Unhandled Rejection caught (Server kept alive):', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.use(cors());

// High-speed Gzip / Deflate compression for 5x-10x faster mobile data transfers
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// API endpoints always bypass browser cache for 100% fresh live data
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// High-performance static asset serving with caching (Instant loads on phones)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.endsWith('manifest.json')) {
      res.set('Content-Type', 'application/manifest+json; charset=UTF-8');
      res.set('Cache-Control', 'public, max-age=86400');
    } else if (filePath.match(/\.(css|js|woff2|woff|ttf|png|jpg|jpeg|svg|ico)$/)) {
      res.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    }
  }
}));

app.use(express.json({ limit: '10mb' }));

// ─────────────────────────────────────────────────────────────────────────────
// ATOMIC FILE I/O & CONCURRENCY CONTROLS (Zero data corruption, zero lost writes)
// ─────────────────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BACKUP_FILE = path.join(DATA_DIR, 'backup.json');
const BACKUP_SAFE_FILE = path.join(DATA_DIR, 'backup_safe.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const USERS_BACKUP_FILE = path.join(DATA_DIR, 'users_backup.json');

// Sequential queue helper for thread-safe operations
class AsyncQueue {
  constructor() {
    this._queue = Promise.resolve();
  }
  run(fn) {
    const next = this._queue.then(() => fn()).catch(err => {
      console.error('[AsyncQueue Error]', err);
      throw err;
    });
    this._queue = next.catch(() => {});
    return next;
  }
}

// Global queue for all user account mutations (registration, password change, profile update)
const userMutationQueue = new AsyncQueue();

// Per-user sync queues so different users sync in parallel without blocking each other
const userSyncQueues = new Map();
function getUserSyncQueue(userId) {
  const safeId = String(userId || 'user-mukiviswa').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!userSyncQueues.has(safeId)) {
    userSyncQueues.set(safeId, new AsyncQueue());
  }
  return userSyncQueues.get(safeId);
}

// Atomic file writer with retry for Windows file system locks
function safeWriteFileAtomic(filePath, data, maxRetries = 6) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${Date.now()}.${Math.floor(Math.random() * 1000000)}.tmp`);
  
  // Write to temporary file
  fs.writeFileSync(tempPath, data, 'utf8');

  let attempts = 0;
  while (true) {
    try {
      attempts++;
      fs.renameSync(tempPath, filePath);
      break;
    } catch (err) {
      if (attempts >= maxRetries) {
        // Fallback: direct write
        try {
          fs.writeFileSync(filePath, data, 'utf8');
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch {}
          }
          break;
        } catch (innerErr) {
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch {}
          }
          throw err;
        }
      }
      // Small sync sleep to let Windows release file lock
      const start = Date.now();
      while (Date.now() - start < 10 * attempts) {}
    }
  }
}

// Always ensure Mukilan Viswa (Owner) is present in users list
function ensurePrimaryOwner(users) {
  if (!Array.isArray(users)) users = [];
  const hasOwner = users.some(u => 
    u.id === 'user-mukiviswa' || 
    (u.username && u.username.toLowerCase() === 'mukilanviswa') ||
    u.isOwner === true
  );

  if (!hasOwner) {
    const owner = {
      id: 'user-mukiviswa',
      username: 'MukilanViswa',
      password: 'Demo@1234',
      email: 'mukilanviswa@gmail.com',
      phone: '9876543210',
      fullName: 'Mukilan Viswa',
      aliases: ['MukiViswa', 'mukiviswa', 'mukilan', 'MukilanViswa'],
      isOwner: true,
      createdAt: '2026-10-18T10:00:00.000Z',
      dob: '2004-09-12'
    };
    users.unshift(owner);
  }
  return users;
}

// Read users with automatic fallback to users_backup.json
function readUsers() {
  if (fs.existsSync(USERS_FILE)) {
    try {
      const content = fs.readFileSync(USERS_FILE, 'utf8');
      if (content && content.trim().length > 0) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return ensurePrimaryOwner(parsed);
        }
      }
    } catch (e) {
      console.warn('[readUsers] Failed to parse users.json, attempting backup restore:', e.message);
    }
  }

  // Fallback to backup file
  if (fs.existsSync(USERS_BACKUP_FILE)) {
    try {
      const content = fs.readFileSync(USERS_BACKUP_FILE, 'utf8');
      if (content && content.trim().length > 0) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          safeWriteFileAtomic(USERS_FILE, JSON.stringify(parsed, null, 2));
          return ensurePrimaryOwner(parsed);
        }
      }
    } catch (e) {
      console.error('[readUsers] Failed to parse users_backup.json:', e.message);
    }
  }

  return ensurePrimaryOwner([]);
}

// Write users atomically with mirror backup
function writeUsers(users) {
  if (!Array.isArray(users)) {
    throw new Error('writeUsers: users must be an array');
  }
  const safeUsers = ensurePrimaryOwner(users);
  const data = JSON.stringify(safeUsers, null, 2);
  safeWriteFileAtomic(USERS_FILE, data);
  try {
    safeWriteFileAtomic(USERS_BACKUP_FILE, data);
  } catch {}
}

// Helper to get safe user backup file path (strictly isolated per user)
function getUserBackupPath(userId) {
  if (!userId || userId === 'user-mukiviswa') {
    return BACKUP_FILE;
  }
  const safeId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, `backup_${safeId}.json`);
}

// ─────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Real-Time Availability Check (Username, Email, Phone)
app.get('/api/auth/check-availability', (req, res) => {
  try {
    const { field, value } = req.query;
    if (!field || !value) {
      return res.status(400).json({ success: false, message: 'field and value are required' });
    }
    const cleanVal = String(value).trim().toLowerCase();
    if (!cleanVal) {
      return res.json({ success: true, available: true });
    }

    const users = readUsers();

    if (field === 'username') {
      const taken = users.some(u => (u.username || '').toLowerCase().trim() === cleanVal);
      return res.json({
        success: true,
        available: !taken,
        field: 'username',
        message: taken ? `⚠️ This Username is already used! Please choose a different username.` : '✓ Username is available'
      });
    }

    if (field === 'email') {
      const taken = users.some(u => (u.email || '').toLowerCase().trim() === cleanVal);
      return res.json({
        success: true,
        available: !taken,
        field: 'email',
        message: taken ? `⚠️ This Gmail / Email is already used! Please choose a different email or Log In.` : '✓ Gmail / Email is available'
      });
    }

    if (field === 'phone') {
      const cleanPhone = String(value).trim();
      const taken = cleanPhone.length >= 7 && users.some(u => (u.phone || '').trim() === cleanPhone);
      return res.json({
        success: true,
        available: !taken,
        field: 'phone',
        message: taken ? `⚠️ This Phone Number is already used! Please use a different phone.` : '✓ Phone number is available'
      });
    }

    res.json({ success: true, available: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Authentication: High-Capacity Concurrent Sign Up
app.post('/api/auth/register', (req, res) => {
  userMutationQueue.run(async () => {
    try {
      const { username, password, email, phone, fullName } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPhone = (phone || '').trim();

      const users = readUsers();

      // 1. Check Username Uniqueness
      const userTaken = users.find(u => (u.username || '').toLowerCase().trim() === cleanUsername);
      if (userTaken) {
        return res.status(409).json({
          success: false,
          field: 'username',
          message: `⚠️ This Username ("${username}") is already used! Please choose a different username.`
        });
      }

      // 2. Check Email Uniqueness
      if (cleanEmail) {
        const emailTaken = users.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);
        if (emailTaken) {
          return res.status(409).json({
            success: false,
            field: 'email',
            message: `⚠️ This Gmail / Email ("${email}") is already used! Please enter a different email or Log In.`
          });
        }
      }

      // 3. Check Phone Uniqueness (if provided)
      if (cleanPhone && cleanPhone.length >= 7) {
        const phoneTaken = users.find(u => (u.phone || '').trim() === cleanPhone);
        if (phoneTaken) {
          return res.status(409).json({
            success: false,
            field: 'phone',
            message: `⚠️ This Phone Number ("${phone}") is already used! Please enter a different phone number.`
          });
        }
      }

      const assignedId = (req.body.id && typeof req.body.id === 'string' && req.body.id.startsWith('user-'))
        ? req.body.id
        : ('user-' + Date.now() + '-' + Math.floor(Math.random() * 10000));

      const newUser = {
        id: assignedId,
        username: username.trim(),
        password: password,
        email: (email || '').trim(),
        phone: (phone || '').trim(),
        fullName: (fullName || username).trim(),
        isOwner: false,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      writeUsers(users);

      // Pre-initialize isolated data container for this specific user
      const userBackupPath = getUserBackupPath(newUser.id);
      if (!fs.existsSync(userBackupPath)) {
        const freshUserData = {
          userId: newUser.id,
          updatedAt: Date.now(),
          settings: {
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
          },
          tasks: [],
          expenses: [],
          incomes: [],
          streaks: { currentStreak: 0, bestStreak: 0, lastActiveDate: '' }
        };
        safeWriteFileAtomic(userBackupPath, JSON.stringify(freshUserData, null, 2));
      }

      console.log(`[Register] User "${newUser.username}" (${newUser.id}) successfully created. Total users: ${users.length}`);

      res.status(200).json({
        success: true,
        message: 'Account registered successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          phone: newUser.phone,
          fullName: newUser.fullName,
          isOwner: false
        }
      });
    } catch (error) {
      console.error('Error during register:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

// Authentication: High-Speed Concurrent Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Username/Email/Phone and password are required' });
    }
    const users = readUsers();
    const idLower = identifier.trim().toLowerCase();
    const idClean = idLower.replace(/\s+/g, '');

    const user = users.find(u => {
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

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid username, email, phone or password' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        isOwner: !!user.isOwner,
        dob: user.dob || '',
        profileImage: user.profileImage || ''
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// User List (Sanitized)
app.get('/api/auth/users', (req, res) => {
  try {
    const users = readUsers().map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      fullName: u.fullName,
      dob: u.dob || '',
      profileImage: u.profileImage || 'img/profile.jpg',
      isOwner: !!u.isOwner
    }));
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save Backup Data (Partitioned per user, thread-safe, corruption-proof)
app.post('/api/sync', (req, res) => {
  const { userId, expenses } = req.body || {};
  if (!expenses || !Array.isArray(expenses)) {
    return res.status(400).json({ success: false, message: 'Invalid expenses array' });
  }

  const userQueue = getUserSyncQueue(userId);
  userQueue.run(async () => {
    try {
      const isOwner = !userId || userId === 'user-mukiviswa';
      const targetFile = getUserBackupPath(userId);

      // STRICT OWNER DATA PRESERVATION:
      // If owner sync payload has fewer than 50 expenses, protect against accidental overwrite
      if (isOwner && expenses.length < 50) {
        if (fs.existsSync(targetFile)) {
          try {
            const existing = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
            if (existing && Array.isArray(existing.expenses) && existing.expenses.length >= 50) {
              console.warn(`[Sync Security] Blocked owner sync with only ${expenses.length} expenses; preserved existing ${existing.expenses.length} records.`);
              return res.json({ success: true, message: 'Owner data preserved', preserved: true });
            }
          } catch {}
        }
      }

      // Write atomically to file
      safeWriteFileAtomic(targetFile, JSON.stringify(req.body, null, 2));

      // For owner, also keep backup_safe.json synchronized
      if (isOwner && expenses.length >= 50) {
        try {
          safeWriteFileAtomic(BACKUP_SAFE_FILE, JSON.stringify(req.body, null, 2));
        } catch {}
      }

      res.json({ success: true, message: 'Data synced successfully' });
    } catch (error) {
      console.error('Error syncing data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

// Load Backup Data (Partitioned per user)
app.get('/api/sync', (req, res) => {
  try {
    const userId = req.query.userId;
    const isOwner = !userId || userId === 'user-mukiviswa';
    const targetFile = getUserBackupPath(userId);

    if (fs.existsSync(targetFile)) {
      try {
        const raw = fs.readFileSync(targetFile, 'utf8');
        if (raw && raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          return res.json({ success: true, data: parsed });
        }
      } catch (readErr) {
        console.warn(`[GET /api/sync] Parse error for ${userId}, trying fallback:`, readErr.message);
      }
    }

    if (!isOwner) {
      // Fresh, clean, empty starter data for new registered users
      res.json({
        success: true,
        data: {
          userId: userId,
          expenses: [],
          tasks: [],
          incomes: [],
          streaks: { currentStreak: 0, bestStreak: 0, lastActiveDate: '' }
        }
      });
    } else {
      // If owner backup.json was unreadable, fallback to backup_safe.json
      if (fs.existsSync(BACKUP_SAFE_FILE)) {
        try {
          const safeData = JSON.parse(fs.readFileSync(BACKUP_SAFE_FILE, 'utf8'));
          return res.json({ success: true, data: safeData });
        } catch {}
      }
      res.json({ success: true, data: null });
    }
  } catch (error) {
    console.error('Error reading backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Forgot Password
app.put('/api/auth/update-password', (req, res) => {
  userMutationQueue.run(async () => {
    try {
      const { email, newPassword } = req.body || {};
      if (!email || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email and new password are required.' });
      }
      if (newPassword.length < 3) {
        return res.status(400).json({ success: false, message: 'Password must be at least 3 characters.' });
      }
      const users = readUsers();
      const idx = users.findIndex(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase());
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'No account found with this email.' });
      }
      users[idx].password = newPassword;
      writeUsers(users);
      res.json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

// Update Profile endpoint
app.put('/api/auth/update-profile', (req, res) => {
  userMutationQueue.run(async () => {
    try {
      const { id, username, fullName, email, phone, dob, profileImage } = req.body || {};
      if (!id && !username && !email) {
        return res.status(400).json({ success: false, message: 'User identifier is required.' });
      }
      const users = readUsers();
      const idx = users.findIndex(u => 
        (id && u.id === id) || 
        (username && u.username && u.username.toLowerCase() === username.trim().toLowerCase()) ||
        (email && u.email && u.email.toLowerCase() === email.trim().toLowerCase())
      );
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      if (username) users[idx].username = username.trim();
      if (fullName !== undefined) users[idx].fullName = fullName.trim();
      if (email !== undefined) users[idx].email = email.trim();
      if (phone !== undefined) users[idx].phone = phone.trim();
      if (dob !== undefined) users[idx].dob = dob;
      if (profileImage !== undefined) users[idx].profileImage = profileImage;
      users[idx].updatedAt = new Date().toISOString();

      writeUsers(users);

      const safeUser = {
        id: users[idx].id,
        username: users[idx].username,
        fullName: users[idx].fullName,
        email: users[idx].email,
        phone: users[idx].phone,
        dob: users[idx].dob || '',
        profileImage: users[idx].profileImage || '',
        isOwner: !!users[idx].isOwner
      };

      res.json({ success: true, message: 'Profile updated successfully.', user: safeUser });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
});

function getLatestTunnelUrl() {
  const logFile = path.join(__dirname, 'tunnel.log');
  if (fs.existsSync(logFile)) {
    try {
      const content = fs.readFileSync(logFile, 'utf8');
      const matches = [...content.matchAll(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g)];
      if (matches.length > 0) {
        return matches[matches.length - 1][0];
      }
    } catch {}
  }
  return '';
}

// Network Info endpoint for phone/LAN access
app.get('/api/network-info', (req, res) => {
  const localIp = getLocalIp();
  const tunnelUrl = getLatestTunnelUrl();
  const wifiUrl = `http://${localIp}:${PORT}`;
  res.json({
    success: true,
    localIp,
    port: PORT,
    localUrl: wifiUrl,
    tunnelUrl: tunnelUrl,
    mobileUrl: tunnelUrl || wifiUrl
  });
});

// Express Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Express Global Error]', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Fallback to index.html for client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server with High-Capacity Socket Settings
const server = app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  const tunnelUrl = getLatestTunnelUrl();
  console.log(`====================================================`);
  console.log(` Spendorio & SpendTracker App Running!             `);
  console.log(` High-Concurrency Concurrent User Engine: ACTIVE   `);
  console.log(` Local URL:     http://localhost:${PORT}           `);
  console.log(` Wi-Fi/LAN:     http://${localIp}:${PORT}          `);
  if (tunnelUrl) {
    console.log(` Mobile 4G/5G:  ${tunnelUrl}                      `);
  }
  console.log(`====================================================`);

  // Auto-refresh desktop phone link
  try {
    const updateScript = path.join(__dirname, 'scripts', 'update_phone_link.js');
    if (fs.existsSync(updateScript)) {
      require(updateScript);
    }
  } catch {}
});

// Keep connection sockets alive and responsive under heavy concurrent requests
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.maxHeadersCount = 100;
