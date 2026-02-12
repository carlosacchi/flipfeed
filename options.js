/* ============================================================
   FlipFeed — Options page logic
   Single flat channel list. Widget paginates automatically.
   Uses FF_CONFIG and ffStorage from shared.js.
   ============================================================ */

(() => {
  'use strict';

  const channelsList = document.getElementById('channels-list');
  const addBtn = document.getElementById('add-channel');
  const saveBtn = document.getElementById('save');
  const statusEl = document.getElementById('status');
  const keymapList = document.getElementById('keymap-list');
  const versionEl = document.getElementById('version');

  let channels = [];  // flat array
  let keyMap = {};
  let openMode = FF_CONFIG.DEFAULTS.openMode;
  let zapAction = FF_CONFIG.DEFAULTS.zapAction;
  let gridSize = FF_CONFIG.DEFAULTS.gridSize;

  // --------------- load ---------------
  async function load() {
    const { data, fallback } = await ffStorage.get(FF_CONFIG.STORAGE_KEYS);
    if (fallback) flash('Using local storage (sync unavailable)', true);

    if (data.channels) {
      channels = data.channels.filter(Boolean);
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
  }

  // --------------- render channels ---------------
  function renderChannels() {
    channelsList.innerHTML = '';

    channels.forEach((ch, i) => {
      const row = document.createElement('div');
      row.className = 'channel-row';
      row.draggable = true;
      row.dataset.idx = i;

      row.innerHTML = `
        <span class="drag-handle" title="Drag to reorder">&#x2630;</span>
        <span class="slot-num">${i + 1}</span>
        <input type="text" class="ch-url" value="${escHtml(ch.url || '')}" placeholder="YouTube URL or @handle">
        <div class="ch-info">
          ${ch.iconUrl && isSafeImageUrl(ch.iconUrl) ? `<img class="ch-avatar" src="${escHtml(ch.iconUrl)}" alt="">` : ''}
          <span class="ch-name">${escHtml(ch.displayName || '')}</span>
        </div>
        <button class="btn btn-small btn-resolve" data-idx="${i}">Resolve</button>
        <button class="btn btn-small btn-remove" data-idx="${i}">&times;</button>
      `;

      if (!ch.displayName || !ch.iconUrl) {
        const fb = document.createElement('div');
        fb.style.cssText = 'display:flex;gap:6px;margin-top:6px;width:100%;padding-left:48px;';

        const nameIn = document.createElement('input');
        nameIn.type = 'text';
        nameIn.placeholder = 'Display name (manual)';
        nameIn.value = ch.displayName || '';
        nameIn.style.flex = '1';
        nameIn.addEventListener('input', () => { channels[i].displayName = nameIn.value; });

        const iconIn = document.createElement('input');
        iconIn.type = 'text';
        iconIn.placeholder = 'Icon URL (manual)';
        iconIn.value = ch.iconUrl || '';
        iconIn.style.flex = '1';
        iconIn.addEventListener('input', () => { channels[i].iconUrl = iconIn.value; });

        fb.appendChild(nameIn);
        fb.appendChild(iconIn);
        row.appendChild(fb);
      }

      // drag events
      row.addEventListener('dragstart', onDragStart);
      row.addEventListener('dragover', onDragOver);
      row.addEventListener('drop', onDrop);
      row.addEventListener('dragend', onDragEnd);

      channelsList.appendChild(row);
    });

    // button events
    channelsList.querySelectorAll('.btn-resolve').forEach((btn) => {
      btn.addEventListener('click', () => resolveChannel(parseInt(btn.dataset.idx)));
    });
    channelsList.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', () => { channels.splice(parseInt(btn.dataset.idx), 1); renderChannels(); });
    });
    channelsList.querySelectorAll('.ch-url').forEach((input) => {
      const row = input.closest('.channel-row');
      const i = parseInt(row.dataset.idx);
      input.addEventListener('change', () => { channels[i].url = input.value.trim(); });
    });
  }

  // --------------- drag & drop reorder ---------------
  let dragIdx = null;

  function onDragStart(e) {
    dragIdx = parseInt(e.currentTarget.dataset.idx);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const row = e.currentTarget;
    row.classList.add('drag-over');
  }

  function onDrop(e) {
    e.preventDefault();
    const targetIdx = parseInt(e.currentTarget.dataset.idx);
    e.currentTarget.classList.remove('drag-over');
    if (dragIdx !== null && dragIdx !== targetIdx) {
      const [moved] = channels.splice(dragIdx, 1);
      channels.splice(targetIdx, 0, moved);
      renderChannels();
    }
  }

  function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    channelsList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    dragIdx = null;
  }

  // --------------- render keymap ---------------
  function renderKeyMap() {
    keymapList.innerHTML = '';
    const maxSlots = FF_CONFIG.GRID_SLOTS[gridSize] || 9;
    for (let i = 0; i < maxSlots; i++) {
      const currentKey = findKeyForSlot(i);
      const row = document.createElement('div');
      row.className = 'keymap-row';
      row.innerHTML = `
        <label>Slot ${i + 1}:</label>
        <input type="text" class="km-input" data-slot="${i}" value="${escHtml(currentKey || '')}" maxlength="1" placeholder="key">
      `;
      keymapList.appendChild(row);
    }

    keymapList.querySelectorAll('.km-input').forEach((input) => {
      input.addEventListener('input', () => {
        const slot = parseInt(input.dataset.slot);
        for (const [k, v] of Object.entries(keyMap)) {
          if (v === slot) delete keyMap[k];
        }
        const newKey = input.value.trim();
        if (newKey) keyMap[newKey] = slot;
      });
    });
  }

  function findKeyForSlot(slotIndex) {
    for (const [key, slot] of Object.entries(keyMap)) {
      if (slot === slotIndex) return key;
    }
    return null;
  }

  // --------------- resolve channel ---------------
  async function resolveChannel(idx) {
    const urlInput = channelsList.querySelector(`.btn-resolve[data-idx="${idx}"]`)
      ?.closest('.channel-row')?.querySelector('.ch-url');
    const url = urlInput ? urlInput.value.trim() : (channels[idx]?.url || '');
    if (!url) return;

    channels[idx].url = url;

    const resolveBtn = channelsList.querySelector(`.btn-resolve[data-idx="${idx}"]`);
    const origText = resolveBtn.textContent;
    resolveBtn.innerHTML = '<span class="spinner"></span>';
    resolveBtn.disabled = true;

    try {
      const result = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'RESOLVE_CHANNEL', url }, (resp) => {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
          if (resp && resp.error) return reject(new Error(resp.error));
          resolve(resp);
        });
      });

      if (result.channelId) channels[idx].channelId = result.channelId;
      if (result.displayName) channels[idx].displayName = result.displayName;
      if (result.iconUrl) channels[idx].iconUrl = result.iconUrl;

      renderChannels();
      flash(result.channelId ? 'Resolved!' : 'Partial — fill manually');
    } catch (err) {
      flash('Error: ' + err.message, true);
    } finally {
      if (resolveBtn) {
        resolveBtn.textContent = origText;
        resolveBtn.disabled = false;
      }
    }
  }

  // --------------- add channel ---------------
  addBtn.addEventListener('click', () => {
    channels.push({ url: '', displayName: '', iconUrl: '', channelId: '' });
    renderChannels();
    channelsList.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
  });

  // --------------- set as my defaults ---------------
  const setDefaultsBtn = document.getElementById('set-defaults');
  setDefaultsBtn.addEventListener('click', () => {
    const cleanChannels = channels.filter(ch => ch && ch.url && ch.url.trim());
    const snapshot = {
      channels: cleanChannels.map(ch => ({ ...ch })),
      keyMap: { ...keyMap },
      openMode: document.querySelector('input[name="openMode"]:checked')?.value || openMode,
      zapAction: document.querySelector('input[name="zapAction"]:checked')?.value || zapAction,
      gridSize: document.querySelector('input[name="gridSize"]:checked')?.value || gridSize
    };
    chrome.storage.local.set({ customDefaults: snapshot }, () => {
      flash('Current config saved as your defaults');
      updateResetBtnState();
    });
  });

  // --------------- reset to my defaults ---------------
  const resetBtn = document.getElementById('reset-defaults');
  resetBtn.addEventListener('click', () => {
    chrome.storage.local.get('customDefaults', (result) => {
      if (!result.customDefaults) {
        flash('No custom defaults saved yet', true);
        return;
      }
      if (!confirm('Replace current settings with your saved defaults?')) return;
      applySnapshot(result.customDefaults);
      flash('Your defaults restored — click Save to persist');
    });
  });

  // --------------- reset to factory ---------------
  const resetFactoryBtn = document.getElementById('reset-factory');
  resetFactoryBtn.addEventListener('click', () => {
    if (!confirm('Replace all channels and settings with factory defaults?')) return;
    applySnapshot({
      channels: FF_DEFAULT_CHANNELS.map(ch => ({ ...ch })),
      keyMap: { ...FF_DEFAULT_KEY_MAP },
      openMode: FF_CONFIG.DEFAULTS.openMode,
      zapAction: FF_CONFIG.DEFAULTS.zapAction,
      gridSize: FF_CONFIG.DEFAULTS.gridSize
    });
    flash('Factory defaults restored — click Save to persist');
  });

  function applySnapshot(snap) {
    channels = (snap.channels || []).map(ch => ({ ...ch }));
    keyMap = { ...snap.keyMap };
    openMode = snap.openMode || FF_CONFIG.DEFAULTS.openMode;
    zapAction = snap.zapAction || FF_CONFIG.DEFAULTS.zapAction;
    gridSize = snap.gridSize || FF_CONFIG.DEFAULTS.gridSize;

    const r1 = document.querySelector(`input[name="openMode"][value="${openMode}"]`);
    if (r1) r1.checked = true;
    const r2 = document.querySelector(`input[name="zapAction"][value="${zapAction}"]`);
    if (r2) r2.checked = true;
    const r3 = document.querySelector(`input[name="gridSize"][value="${gridSize}"]`);
    if (r3) r3.checked = true;

    renderChannels();
    renderKeyMap();
  }

  function updateResetBtnState() {
    chrome.storage.local.get('customDefaults', (result) => {
      resetBtn.disabled = !result.customDefaults;
      resetBtn.title = result.customDefaults ? 'Restore your saved defaults' : 'No custom defaults saved yet';
    });
  }

  // --------------- save ---------------
  saveBtn.addEventListener('click', async () => {
    openMode = document.querySelector('input[name="openMode"]:checked')?.value || FF_CONFIG.DEFAULTS.openMode;
    zapAction = document.querySelector('input[name="zapAction"]:checked')?.value || FF_CONFIG.DEFAULTS.zapAction;
    gridSize = document.querySelector('input[name="gridSize"]:checked')?.value || FF_CONFIG.DEFAULTS.gridSize;

    const cleanChannels = channels.filter(ch => ch && ch.url && ch.url.trim());

    try {
      const result = await ffStorage.set({ channels: cleanChannels, keyMap, openMode, zapAction, gridSize });
      await ffStorage.remove('pages');

      channels = cleanChannels;
      renderChannels();
      renderKeyMap();
      flash(result.fallback ? 'Saved (local storage — sync unavailable)' : 'Settings saved!');
    } catch (err) {
      flash('Save failed: ' + err.message, true);
    }
  });

  // --------------- helpers ---------------
  function flash(msg, isError) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? '#e57373' : '#4caf50';
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
  }

  function escHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --------------- auto-refresh on external storage changes (e.g. from widget) ---------------
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'sync' && area !== 'local') return;
    const relevant = FF_CONFIG.STORAGE_KEYS.some(k => k in changes);
    if (!relevant) return;

    await load();

    const r1 = document.querySelector(`input[name="openMode"][value="${openMode}"]`);
    if (r1) r1.checked = true;
    const r2 = document.querySelector(`input[name="zapAction"][value="${zapAction}"]`);
    if (r2) r2.checked = true;
    const r3 = document.querySelector(`input[name="gridSize"][value="${gridSize}"]`);
    if (r3) r3.checked = true;

    renderChannels();
    renderKeyMap();
    flash('Settings updated externally');
  });

  // --------------- init ---------------
  async function init() {
    versionEl.textContent = 'v' + chrome.runtime.getManifest().version;

    await load();

    const r1 = document.querySelector(`input[name="openMode"][value="${openMode}"]`);
    if (r1) r1.checked = true;
    const r2 = document.querySelector(`input[name="zapAction"][value="${zapAction}"]`);
    if (r2) r2.checked = true;
    const r3 = document.querySelector(`input[name="gridSize"][value="${gridSize}"]`);
    if (r3) r3.checked = true;

    renderChannels();
    renderKeyMap();
    updateResetBtnState();
  }

  init();
})();
