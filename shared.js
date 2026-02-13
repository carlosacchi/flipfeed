/* ============================================================
   FlipFeed — shared constants & helpers
   Loaded by background.js, contentScript.js, and options.html.
   ============================================================ */

const FF_DEFAULT_CHANNELS = Object.freeze([
  { url: 'https://www.youtube.com/@mkbhd',          displayName: 'MKBHD',           iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@veritasium',      displayName: 'Veritasium',       iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@LinusTechTips',   displayName: 'Linus Tech Tips',  iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@kurzgesagt',      displayName: 'Kurzgesagt',       iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@3blue1brown',     displayName: '3Blue1Brown',      iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@MarkRober',       displayName: 'Mark Rober',       iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@smartereveryday',  displayName: 'SmarterEveryDay', iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@ColdFusion',      displayName: 'ColdFusion',       iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@TomScottGo',      displayName: 'Tom Scott',        iconUrl: '', channelId: '' }
]);

const FF_DEFAULT_KEY_MAP = Object.freeze({ 1:0, 2:1, 3:2, 4:3, 5:4, 6:5, 7:6, 8:7, 9:8 });

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

// --------------- storage helpers with split backend ---------------
// Storage architecture (v1.6.0+):
// - channels: stored in chrome.storage.local (5-10MB limit) to support large lists (100+ channels)
// - keyMap, openMode, zapAction, gridSize: stored in chrome.storage.sync (cross-device sync)
// - Legacy 'pages' key: removed from both backends when detected
//
// This split avoids chrome.storage.sync QUOTA_BYTES_PER_ITEM limit (8KB per item),
// which was causing silent failures when saving 30+ channels.
const ffStorage = {
  async get(keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const channelKeys = keysArray.filter(k => k === 'channels' || k === 'pages');
    const syncKeys = keysArray.filter(k => k !== 'channels' && k !== 'pages');

    return new Promise((resolve) => {
      let localData = {};
      let syncData = {};
      let pending = 2;
      let syncFallback = false;

      // Fetch channels from local
      chrome.storage.local.get(channelKeys, (result) => {
        localData = result || {};
        if (--pending === 0) finish();
      });

      // Fetch settings from sync (with fallback to local)
      if (syncKeys.length > 0) {
        chrome.storage.sync.get(syncKeys, (result) => {
          if (chrome.runtime.lastError) {
            // Sync failed — fallback to local for these keys too
            syncFallback = true;
            chrome.storage.local.get(syncKeys, (localResult) => {
              syncData = localResult || {};
              if (--pending === 0) finish();
            });
          } else {
            syncData = result || {};
            if (--pending === 0) finish();
          }
        });
      } else {
        if (--pending === 0) finish();
      }

      function finish() {
        resolve({ data: { ...localData, ...syncData }, fallback: syncFallback });
      }
    });
  },

  async set(obj) {
    return new Promise((resolve, reject) => {
      const channelObj = {};
      const syncObj = {};

      for (const [key, value] of Object.entries(obj)) {
        if (key === 'channels') {
          channelObj[key] = value;
        } else {
          syncObj[key] = value;
        }
      }

      let pending = 0;
      let syncFallback = false;
      const errors = [];

      function finish() {
        if (--pending > 0) return;
        if (errors.length > 0) reject(new Error(errors.join('; ')));
        else resolve({ fallback: syncFallback });
      }

      // Save channels to local
      if (Object.keys(channelObj).length > 0) {
        pending++;
        chrome.storage.local.set(channelObj, () => {
          if (chrome.runtime.lastError) {
            errors.push('local(channels): ' + chrome.runtime.lastError.message);
          }
          finish();
        });
      }

      // Save settings to sync (with fallback to local)
      if (Object.keys(syncObj).length > 0) {
        pending++;
        chrome.storage.sync.set(syncObj, () => {
          if (chrome.runtime.lastError) {
            // Sync failed — fallback to local
            syncFallback = true;
            chrome.storage.local.set(syncObj, () => {
              if (chrome.runtime.lastError) {
                errors.push('local(settings fallback): ' + chrome.runtime.lastError.message);
              }
              finish();
            });
          } else {
            // Sync succeeded — mirror to local for consistency
            chrome.storage.local.set(syncObj, () => { /* best-effort */ });
            finish();
          }
        });
      }

      if (pending === 0) resolve({ fallback: false });
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
