/* ============================================================
   FlipFeed — background service worker (Manifest V3)
   ============================================================ */

importScripts('shared.js');

// --------------- constants (from shared) ---------------
const RSS_BASE = 'https://www.youtube.com/feeds/videos.xml?channel_id=';

// --------------- in-memory caches ---------------
const rssCache = new Map();       // channelId → { ts, entries[] }
const durationCache = new Map();  // videoId  → { ts, seconds }

// --------------- seed data ---------------
const DEFAULT_CHANNELS = [
  { url: 'https://www.youtube.com/@mkbhd',          displayName: 'MKBHD',           iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@veritasium',      displayName: 'Veritasium',       iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@LinusTechTips',   displayName: 'Linus Tech Tips',  iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@kurzgesagt',      displayName: 'Kurzgesagt',       iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@3blue1brown',     displayName: '3Blue1Brown',      iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@MarkRober',        displayName: 'Mark Rober',        iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@smartereveryday',  displayName: 'SmarterEveryDay', iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@ColdFusion',      displayName: 'ColdFusion',       iconUrl: '', channelId: '' },
  { url: 'https://www.youtube.com/@TomScottGo',      displayName: 'Tom Scott',        iconUrl: '', channelId: '' }
];

const DEFAULT_KEY_MAP = { 1:0, 2:1, 3:2, 4:3, 5:4, 6:5, 7:6, 8:7, 9:8 };

// --------------- fetch with timeout helper ---------------
function fetchWithTimeout(url, timeoutMs = FF_CONFIG.FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// --------------- install / seed + migration ---------------
chrome.runtime.onInstalled.addListener(async (details) => {
  const { data } = await ffStorage.get(FF_CONFIG.STORAGE_KEYS);

  // Migrate old pages format → flat channels
  if (data.pages && !data.channels) {
    const flat = [];
    for (const page of data.pages) {
      for (const ch of page) {
        if (ch && ch.url) flat.push(ch);
      }
    }
    await ffStorage.set({ channels: flat });
    await ffStorage.remove('pages');
    return;
  }

  // Fresh install seed
  if (details.reason === 'install' && !data.channels) {
    await ffStorage.set({
      channels: DEFAULT_CHANNELS,
      keyMap: DEFAULT_KEY_MAP,
      openMode: FF_CONFIG.DEFAULTS.openMode,
      zapAction: FF_CONFIG.DEFAULTS.zapAction,
      gridSize: FF_CONFIG.DEFAULTS.gridSize
    });
  }
});

// --------------- command listener ---------------
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-widget') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.startsWith('https://www.youtube.com')) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_WIDGET' }).catch(() => {});
    }
  }
});

// --------------- message router ---------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ZAP_CHANNEL') {
    handleZap(msg.channel, msg.openMode, msg.zapAction, sender.tab)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'RESOLVE_CHANNEL') {
    resolveChannel(msg.url)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'ADD_CURRENT_CHANNEL') {
    handleAddCurrentChannel(msg.url, msg.absoluteIndex)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

// --------------- zap logic ---------------
async function handleZap(channel, openMode, zapAction, currentTab) {
  if (!channel || !channel.url || !channel.url.trim()) {
    return { error: 'Channel has no valid URL' };
  }

  if (zapAction === 'channelPage') {
    const channelUrl = channel.url.replace(/\/$/, '') + '/videos?view=0&sort=dd&flow=grid';
    await openUrl(channelUrl, openMode, currentTab);
    return { ok: true };
  }

  const channelId = channel.channelId;
  if (!channelId) {
    const fallbackUrl = channel.url.replace(/\/$/, '') + '/videos?view=0&sort=dd&flow=grid';
    await openUrl(fallbackUrl, openMode, currentTab);
    return { ok: true, fallback: 'channel_page' };
  }

  try {
    const videoUrl = await findLatestNonShort(channelId);
    if (videoUrl) {
      await openUrl(videoUrl, openMode, currentTab);
      return { ok: true };
    }
  } catch (_) { /* fall through */ }

  const fallbackUrl = channel.url.replace(/\/$/, '') + '/videos?view=0&sort=dd&flow=grid';
  await openUrl(fallbackUrl, openMode, currentTab);
  return { ok: true, fallback: 'channel_page' };
}

// Concurrent duration checks with early-win: resolves as soon as any video in batch qualifies
async function findLatestNonShort(channelId) {
  const entries = await fetchRSS(channelId);
  const candidates = entries.slice(0, 10);

  const CONCURRENCY = 3;
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);

    // Race: resolve immediately when any candidate qualifies (> 61s)
    const winner = await new Promise((resolve) => {
      let pending = batch.length;
      const settled = [];

      batch.forEach((entry, idx) => {
        fetchDuration(entry.videoId).then((seconds) => {
          if (seconds !== null && seconds > 61) {
            resolve(entry.videoId); // early win
            return;
          }
          settled[idx] = { videoId: entry.videoId, seconds };
          if (--pending === 0) resolve(null); // no winner in this batch
        }).catch(() => {
          settled[idx] = null;
          if (--pending === 0) resolve(null);
        });
      });
    });

    if (winner) {
      return `https://www.youtube.com/watch?v=${winner}`;
    }
  }

  if (candidates.length > 0) {
    return `https://www.youtube.com/watch?v=${candidates[0].videoId}`;
  }
  return null;
}

// --------------- add current channel ---------------
async function handleAddCurrentChannel(pageUrl, absoluteIndex) {
  const resolved = await resolveChannel(pageUrl);

  const { data } = await ffStorage.get(['channels']);
  const channels = data.channels || [];

  // Check duplicates
  const resolvedUrl = pageUrl.replace(/\/$/, '').toLowerCase();
  for (const ch of channels) {
    if (!ch || !ch.url) continue;
    const existingUrl = ch.url.replace(/\/$/, '').toLowerCase();
    if (existingUrl === resolvedUrl) {
      return { error: 'duplicate', displayName: ch.displayName || ch.url };
    }
    if (resolved.channelId && ch.channelId && ch.channelId === resolved.channelId) {
      return { error: 'duplicate', displayName: ch.displayName || ch.url };
    }
  }

  const channel = {
    url: pageUrl,
    displayName: resolved.displayName || '',
    iconUrl: resolved.iconUrl || '',
    channelId: resolved.channelId || ''
  };

  // Expand array if needed and place at absoluteIndex
  while (channels.length <= absoluteIndex) channels.push(null);
  channels[absoluteIndex] = channel;

  await ffStorage.set({ channels });
  return { ok: true, channel };
}

// --------------- RSS fetch with cache + timeout ---------------
async function fetchRSS(channelId) {
  const cached = rssCache.get(channelId);
  if (cached && Date.now() - cached.ts < FF_CONFIG.CACHE_TTL) return cached.entries;

  const url = RSS_BASE + channelId;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error('RSS fetch failed');
  const text = await res.text();

  const entries = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(text)) !== null) {
    const block = m[1];
    const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (idMatch) {
      entries.push({ videoId: idMatch[1] });
    }
  }

  rssCache.set(channelId, { ts: Date.now(), entries });
  return entries;
}

// --------------- duration fetch with cache + timeout ---------------
async function fetchDuration(videoId) {
  const cached = durationCache.get(videoId);
  if (cached && Date.now() - cached.ts < FF_CONFIG.CACHE_TTL) return cached.seconds;

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
    if (!match) return null;
    const seconds = parseInt(match[1], 10);
    durationCache.set(videoId, { ts: Date.now(), seconds });
    return seconds;
  } catch (_) {
    return null;
  }
}

// --------------- tab helpers ---------------
async function openUrl(url, openMode, currentTab) {
  if (!isYouTubeUrl(url)) {
    throw new Error('Navigation blocked: not a YouTube URL');
  }
  if (openMode === 'newTab') {
    await chrome.tabs.create({ url });
    return { opened: 'newTab' };
  }
  if (currentTab && currentTab.id) {
    await chrome.tabs.update(currentTab.id, { url });
    return { opened: 'sameTab' };
  }
  // sameTab requested but no current tab available — fall back to new tab
  console.warn('[FlipFeed] sameTab requested but no active tab found; opening in new tab');
  await chrome.tabs.create({ url });
  return { opened: 'newTab', fallbackReason: 'no_active_tab' };
}

// --------------- channel resolver ---------------
const CHANNEL_PATH_RE = /^\/(@[\w.-]+|channel\/UC[\w-]+|c\/[\w.-]+|user\/[\w.-]+)(\/.*)?$/;

async function resolveChannel(inputUrl) {
  let url = inputUrl.trim();
  if (!url.startsWith('http')) url = 'https://www.youtube.com/' + url.replace(/^\/+/, '');

  if (!isYouTubeUrl(url)) {
    throw new Error('Only YouTube URLs are supported');
  }

  const parsed = new URL(url);
  if (!CHANNEL_PATH_RE.test(parsed.pathname)) {
    throw new Error('URL does not look like a YouTube channel (expected @handle, /channel/UC..., /c/..., or /user/...)');
  }

  const directMatch = url.match(/\/channel\/(UC[\w-]+)/);
  if (directMatch) {
    const channelId = directMatch[1];
    const meta = await fetchChannelMeta(url);
    return { channelId, displayName: meta.displayName, iconUrl: meta.iconUrl };
  }

  const meta = await fetchChannelMeta(url);
  return { channelId: meta.channelId, displayName: meta.displayName, iconUrl: meta.iconUrl };
}

async function fetchChannelMeta(url) {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { channelId: '', displayName: '', iconUrl: '' };
    const html = await res.text();

    let channelId = '';
    const cidMatch = html.match(/(?:browseId|channelId)"\s*:\s*"(UC[\w-]+)"/);
    if (cidMatch) channelId = cidMatch[1];

    let displayName = '';
    const nameMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    if (nameMatch) displayName = nameMatch[1];

    let iconUrl = '';
    const imgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
    if (imgMatch && isSafeImageUrl(imgMatch[1])) iconUrl = imgMatch[1];

    return { channelId, displayName, iconUrl };
  } catch (_) {
    return { channelId: '', displayName: '', iconUrl: '' };
  }
}
