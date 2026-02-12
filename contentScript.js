/* ============================================================
   FlipFeed — content script (injected on youtube.com)
   Renders the overlay widget inside a Shadow DOM.
   ============================================================ */

(() => {
  'use strict';

  const VERSION = chrome.runtime.getManifest().version;
  // FF_CONFIG, isSafeImageUrl loaded from shared.js (injected before this script)

  let widgetVisible = false;
  let hostEl = null;
  let shadowRoot = null;
  let channels = [];   // flat array — single source of truth
  let currentPage = 0;
  let keyMap = {};
  let openMode = 'sameTab';
  let zapAction = 'latestVideo';
  let gridSize = '3x3';

  // --------------- derived helpers ---------------
  function slotsPerPage() { return FF_CONFIG.GRID_SLOTS[gridSize] || 9; }
  function totalPages() { return Math.max(1, Math.ceil(channels.length / slotsPerPage())); }
  function pageChannels() {
    const s = slotsPerPage();
    return channels.slice(currentPage * s, (currentPage + 1) * s);
  }

  // --------------- message from background ---------------
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TOGGLE_WIDGET') toggleWidget();
  });

  // --------------- auto-refresh on storage changes (e.g. from options page) ---------------
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'sync' && area !== 'local') return;
    const relevant = FF_CONFIG.STORAGE_KEYS.some(k => k in changes);
    if (!relevant) return;
    await loadSettings();
    if (widgetVisible) render();
  });

  // --------------- widget lifecycle ---------------
  function toggleWidget() {
    widgetVisible ? hideWidget() : showWidget();
  }

  async function showWidget() {
    await loadSettings();
    ensureHost();
    render();
    hostEl.style.display = 'block';
    widgetVisible = true;
  }

  function hideWidget() {
    if (hostEl) hostEl.style.display = 'none';
    widgetVisible = false;
  }

  // --------------- settings ---------------
  async function loadSettings() {
    const { data } = await ffStorage.get(FF_CONFIG.STORAGE_KEYS);
    if (data.channels) {
      channels = data.channels;
    } else if (data.pages) {
      channels = [];
      for (const page of data.pages) {
        for (const ch of page) {
          if (ch && ch.url) channels.push(ch);
        }
      }
    } else {
      channels = [];
    }
    keyMap = data.keyMap || {};
    openMode = data.openMode || FF_CONFIG.DEFAULTS.openMode;
    zapAction = data.zapAction || FF_CONFIG.DEFAULTS.zapAction;
    gridSize = data.gridSize || FF_CONFIG.DEFAULTS.gridSize;
    // clamp page
    const tp = totalPages();
    if (currentPage >= tp) currentPage = tp - 1;
    if (currentPage < 0) currentPage = 0;
  }

  // --------------- DOM host + shadow ---------------
  let styleAttached = false;

  function ensureHost() {
    if (hostEl) return;
    hostEl = document.createElement('flipfeed-widget');
    hostEl.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;display:none;';
    shadowRoot = hostEl.attachShadow({ mode: 'closed' });
    document.documentElement.appendChild(hostEl);
    styleAttached = false;
  }

  // --------------- detect if on a channel page ---------------
  function detectChannelUrl() {
    const url = location.href;
    const match = url.match(/^https:\/\/www\.youtube\.com\/(@[\w.-]+|channel\/UC[\w-]+|c\/[\w.-]+|user\/[\w.-]+)(\/.*)?$/);
    if (match) return 'https://www.youtube.com/' + match[1];
    return null;
  }

  // --------------- render ---------------
  function render() {
    // Attach stylesheet once; only rebuild content
    if (!styleAttached) {
      const style = document.createElement('style');
      style.textContent = getCSS();
      shadowRoot.appendChild(style);
      styleAttached = true;
    }
    // Remove previous content container (keep <style>)
    const oldContainer = shadowRoot.querySelector('.ff-container');
    if (oldContainer) oldContainer.remove();

    const container = document.createElement('div');
    container.className = 'ff-container';

    // header
    const header = document.createElement('div');
    header.className = 'ff-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'ff-title-wrap';

    const logo = document.createElement('img');
    logo.className = 'ff-logo';
    logo.src = chrome.runtime.getURL('assets/icon48.png');
    logo.alt = 'FlipFeed';
    titleWrap.appendChild(logo);

    const title = document.createElement('span');
    title.className = 'ff-title';
    title.textContent = 'FlipFeed';
    titleWrap.appendChild(title);

    const ver = document.createElement('span');
    ver.className = 'ff-version';
    ver.textContent = 'v' + VERSION;
    titleWrap.appendChild(ver);

    header.appendChild(titleWrap);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ff-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.title = 'Close (ESC)';
    closeBtn.addEventListener('click', hideWidget);
    header.appendChild(closeBtn);

    container.appendChild(header);

    // grid
    const slots = slotsPerPage();
    const visible = pageChannels();
    const channelPageUrl = detectChannelUrl();

    const grid = document.createElement('div');
    grid.className = 'ff-grid';

    for (let i = 0; i < slots; i++) {
      const ch = visible[i];
      const absoluteIdx = currentPage * slots + i;
      const btn = document.createElement('button');
      btn.className = 'ff-channel-btn';

      if (ch && ch.url && ch.url.trim()) {
        // filled slot with valid URL
        const img = document.createElement('img');
        img.className = 'ff-avatar';
        img.src = isSafeImageUrl(ch.iconUrl) ? ch.iconUrl : 'data:image/svg+xml,' + encodeURIComponent(placeholderSVG(i));
        img.alt = ch.displayName || 'Channel';
        img.onerror = function () { this.src = 'data:image/svg+xml,' + encodeURIComponent(placeholderSVG(i)); };
        btn.appendChild(img);

        const name = document.createElement('span');
        name.className = 'ff-name';
        name.textContent = ch.displayName || `Slot ${absoluteIdx + 1}`;
        btn.appendChild(name);

        const keyHint = findKeyForSlot(i);
        if (keyHint !== null) {
          const hint = document.createElement('span');
          hint.className = 'ff-hint';
          hint.textContent = keyHint;
          btn.appendChild(hint);
        }

        btn.addEventListener('click', () => zapChannel(ch));
      } else if (channelPageUrl) {
        // empty slot on a channel page → "Add current channel"
        btn.classList.add('ff-add-btn');

        const plusIcon = document.createElement('span');
        plusIcon.className = 'ff-plus-icon';
        plusIcon.textContent = '+';
        btn.appendChild(plusIcon);

        const label = document.createElement('span');
        label.className = 'ff-name';
        label.textContent = 'Add channel';
        btn.appendChild(label);

        btn.addEventListener('click', () => addCurrentChannel(channelPageUrl, absoluteIdx, btn));
      } else {
        btn.classList.add('ff-empty');
        const empty = document.createElement('span');
        empty.className = 'ff-name';
        empty.textContent = `Slot ${absoluteIdx + 1}`;
        btn.appendChild(empty);
      }

      grid.appendChild(btn);
    }

    container.appendChild(grid);

    // pagination footer
    const tp = totalPages();
    if (tp > 1 || channels.length > 0) {
      const footer = document.createElement('div');
      footer.className = 'ff-footer';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'ff-nav-btn';
      prevBtn.textContent = '\u25C0';
      prevBtn.disabled = currentPage <= 0;
      prevBtn.addEventListener('click', () => { currentPage--; render(); });
      footer.appendChild(prevBtn);

      const pageLabel = document.createElement('span');
      pageLabel.className = 'ff-page-label';
      pageLabel.textContent = `${currentPage + 1} / ${tp}`;
      footer.appendChild(pageLabel);

      const nextBtn = document.createElement('button');
      nextBtn.className = 'ff-nav-btn';
      nextBtn.textContent = '\u25B6';
      nextBtn.disabled = currentPage >= tp - 1;
      nextBtn.addEventListener('click', () => { currentPage++; render(); });
      footer.appendChild(nextBtn);

      container.appendChild(footer);
    }

    shadowRoot.appendChild(container);
  }

  function findKeyForSlot(slotIndex) {
    for (const [key, slot] of Object.entries(keyMap)) {
      if (slot === slotIndex) return key;
    }
    return null;
  }

  // --------------- zap ---------------
  function zapChannel(channel) {
    hideWidget();
    chrome.runtime.sendMessage({ type: 'ZAP_CHANNEL', channel, openMode, zapAction }, (result) => {
      if (chrome.runtime.lastError) {
        showToast('Zap failed: ' + chrome.runtime.lastError.message);
        return;
      }
      if (result && result.error) {
        showToast('Zap failed: ' + result.error);
      }
    });
  }

  function showToast(message) {
    ensureHost();
    const toast = document.createElement('div');
    toast.className = 'ff-toast';
    toast.textContent = message;
    shadowRoot.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // --------------- add current channel ---------------
  async function addCurrentChannel(channelUrl, absoluteIndex, btnEl) {
    btnEl.classList.add('ff-loading');
    btnEl.innerHTML = '<span class="ff-spinner"></span>';

    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'ADD_CURRENT_CHANNEL', url: channelUrl, absoluteIndex },
        resolve
      );
    });

    if (result && result.error === 'duplicate') {
      btnEl.classList.remove('ff-loading');
      btnEl.innerHTML = '';
      const warn = document.createElement('span');
      warn.className = 'ff-name';
      warn.style.color = '#ffb74d';
      warn.textContent = 'Already saved';
      btnEl.appendChild(warn);
      setTimeout(() => render(), 1500);
      return;
    }

    await loadSettings();
    render();
  }

  // --------------- keyboard handling ---------------
  function isEditableTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  document.addEventListener('keydown', (e) => {
    if (!widgetVisible) return;

    // Allow ESC even from editable fields
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      hideWidget();
      return;
    }

    // Skip mapped keys when user is typing in an input field
    if (isEditableTarget(e.target)) return;

    if (e.key === 'ArrowLeft' && currentPage > 0) {
      e.preventDefault();
      e.stopPropagation();
      currentPage--;
      render();
      return;
    }
    if (e.key === 'ArrowRight' && currentPage < totalPages() - 1) {
      e.preventDefault();
      e.stopPropagation();
      currentPage++;
      render();
      return;
    }

    const slotIndex = keyMap[e.key];
    const visible = pageChannels();
    if (slotIndex !== undefined && visible[slotIndex] && visible[slotIndex].url) {
      e.preventDefault();
      e.stopPropagation();
      zapChannel(visible[slotIndex]);
    }
  }, true);

  // --------------- placeholder SVG ---------------
  function placeholderSVG(index) {
    const colors = ['#e57373','#64b5f6','#81c784','#ffb74d','#ba68c8','#4dd0e1','#ff8a65','#a1887f','#90a4ae'];
    const c = colors[index % colors.length];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <rect width="48" height="48" rx="24" fill="${c}"/>
      <text x="24" y="30" text-anchor="middle" fill="#fff" font-size="20" font-family="sans-serif">${index + 1}</text>
    </svg>`;
  }

  // --------------- CSS ---------------
  function getCSS() {
    return `
      :host { all: initial; font-family: 'Segoe UI', Roboto, Arial, sans-serif; }

      .ff-container {
        width: 320px;
        background: #1e1e1e;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.45);
        overflow: hidden;
        color: #e0e0e0;
        border: 1px solid #333;
      }

      .ff-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: #282828;
        border-bottom: 1px solid #333;
      }

      .ff-title-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .ff-logo {
        width: 22px;
        height: 22px;
        border-radius: 4px;
      }

      .ff-title {
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.5px;
        color: #ff4444;
      }

      .ff-version {
        font-size: 10px;
        color: #666;
        font-weight: 400;
      }

      .ff-close {
        background: none;
        border: none;
        color: #aaa;
        font-size: 22px;
        cursor: pointer;
        line-height: 1;
        padding: 0 4px;
        transition: color 0.15s;
      }
      .ff-close:hover { color: #fff; }

      .ff-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        padding: 10px;
        max-height: 480px;
        overflow-y: auto;
      }

      .ff-channel-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 4px;
        background: #2a2a2a;
        border: 1px solid #3a3a3a;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
        position: relative;
        min-height: 70px;
        justify-content: center;
      }
      .ff-channel-btn:hover {
        background: #383838;
        border-color: #ff4444;
      }
      .ff-channel-btn.ff-empty {
        opacity: 0.35;
        cursor: default;
      }
      .ff-channel-btn.ff-empty:hover {
        border-color: #3a3a3a;
        background: #2a2a2a;
      }

      .ff-channel-btn.ff-add-btn {
        border-style: dashed;
        border-color: #555;
        opacity: 0.6;
        transition: opacity 0.15s, border-color 0.15s;
      }
      .ff-channel-btn.ff-add-btn:hover {
        opacity: 1;
        border-color: #4caf50;
        background: #2a3a2a;
      }

      .ff-channel-btn.ff-loading {
        opacity: 0.5;
        pointer-events: none;
      }

      .ff-plus-icon {
        font-size: 22px;
        color: #4caf50;
        line-height: 1;
      }

      .ff-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        background: #444;
      }

      .ff-name {
        font-size: 10px;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 85px;
        color: #ccc;
      }

      .ff-hint {
        position: absolute;
        top: 3px;
        right: 5px;
        font-size: 9px;
        color: #888;
        background: #1e1e1e;
        border-radius: 3px;
        padding: 1px 4px;
        font-weight: 600;
      }

      .ff-footer {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 8px 14px;
        background: #282828;
        border-top: 1px solid #333;
      }

      .ff-nav-btn {
        background: #333;
        border: 1px solid #444;
        color: #ccc;
        border-radius: 4px;
        padding: 3px 10px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .ff-nav-btn:hover:not(:disabled) {
        background: #555;
        color: #fff;
      }
      .ff-nav-btn:disabled {
        opacity: 0.3;
        cursor: default;
      }

      .ff-page-label {
        font-size: 11px;
        color: #888;
        min-width: 36px;
        text-align: center;
      }

      .ff-spinner {
        display: inline-block;
        width: 18px;
        height: 18px;
        border: 2px solid #555;
        border-top-color: #4caf50;
        border-radius: 50%;
        animation: ff-spin 0.6s linear infinite;
      }
      @keyframes ff-spin { to { transform: rotate(360deg); } }

      .ff-toast {
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: #b71c1c;
        color: #fff;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        z-index: 2147483647;
        animation: ff-toast-in 0.2s ease-out;
      }
      @keyframes ff-toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
  }
})();
