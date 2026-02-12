/* ============================================================
   FlipFeed — shared constants & helpers
   Loaded by background.js, contentScript.js, and options.html.
   ============================================================ */

const FF_CONFIG = Object.freeze({
  GRID_SLOTS: Object.freeze({ '3x3': 9, '3x4': 12, '3x5': 15, '3x6': 18 }),
  STORAGE_KEYS: Object.freeze(['channels', 'pages', 'keyMap', 'openMode', 'zapAction', 'gridSize']),
  DEFAULTS: Object.freeze({
    openMode: 'sameTab',
    zapAction: 'latestVideo',
    gridSize: '3x3'
  }),
  YOUTUBE_ORIGIN: 'https://www.youtube.com',
  SAFE_IMAGE_HOSTS: Object.freeze(['yt3.ggpht.com', 'yt3.googleusercontent.com', 'i.ytimg.com', 'www.youtube.com']),
  FETCH_TIMEOUT_MS: 8000,
  CACHE_TTL: 60_000
});

function isYouTubeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin === FF_CONFIG.YOUTUBE_ORIGIN && parsed.protocol === 'https:';
  } catch { return false; }
}

function isSafeImageUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
      FF_CONFIG.SAFE_IMAGE_HOSTS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch { return false; }
}

// --------------- storage helpers with sync→local fallback ---------------
// Each operation independently tries sync first; no sticky per-context flag.
// set() writes to both backends for cross-context consistency.
// remove() cleans both backends to avoid stale keys.
const ffStorage = {
  async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, (data) => {
        if (chrome.runtime.lastError) {
          chrome.storage.local.get(keys, (localData) => {
            resolve({ data: localData || {}, fallback: true });
          });
        } else {
          resolve({ data, fallback: false });
        }
      });
    });
  },

  async set(obj) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(obj, () => {
        if (chrome.runtime.lastError) {
          // Sync failed — write to local as primary
          chrome.storage.local.set(obj, () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve({ fallback: true });
          });
        } else {
          // Sync succeeded — mirror to local for cross-context consistency
          chrome.storage.local.set(obj, () => { /* best-effort */ });
          resolve({ fallback: false });
        }
      });
    });
  },

  async remove(key) {
    return new Promise((resolve, reject) => {
      let errors = [];
      let done = 0;
      const finish = () => {
        if (++done < 2) return;
        if (errors.length === 2) reject(new Error(errors.join('; ')));
        else resolve();
      };
      chrome.storage.sync.remove(key, () => {
        if (chrome.runtime.lastError) errors.push('sync: ' + chrome.runtime.lastError.message);
        finish();
      });
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime.lastError) errors.push('local: ' + chrome.runtime.lastError.message);
        finish();
      });
    });
  }
};
