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
const ffStorage = {
  _useFallback: false,

  async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, (data) => {
        if (chrome.runtime.lastError) {
          ffStorage._useFallback = true;
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
    const area = ffStorage._useFallback ? chrome.storage.local : chrome.storage.sync;
    return new Promise((resolve, reject) => {
      area.set(obj, () => {
        if (chrome.runtime.lastError) {
          // If sync failed, try local as last resort
          if (!ffStorage._useFallback) {
            ffStorage._useFallback = true;
            chrome.storage.local.set(obj, () => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve({ fallback: true });
            });
          } else {
            reject(new Error(chrome.runtime.lastError.message));
          }
        } else {
          resolve({ fallback: ffStorage._useFallback });
        }
      });
    });
  },

  async remove(key) {
    const area = ffStorage._useFallback ? chrome.storage.local : chrome.storage.sync;
    return new Promise((resolve) => {
      area.remove(key, () => resolve());
    });
  }
};
