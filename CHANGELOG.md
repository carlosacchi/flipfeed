# Changelog

All notable changes to FlipFeed are documented in this file.

## [1.6.7] — 2026-02-13

### Added
- **Widget page persistence**: when you click a channel from page 2 (or any page), the widget remembers your position and reopens on the same page next time. No more resetting to page 1 after every zap.

## [1.6.6] — 2026-02-13

### Fixed
- Comprehensive protection for ALL Chrome API calls: `getManifest()`, `getURL()`, `onMessage`, `onChanged` listeners. Extension now fully resilient to context invalidation.

## [1.6.5] — 2026-02-13

### Fixed
- Complete error handling for all `chrome.runtime.sendMessage` calls (zap, add channel, open settings). Prevents crashes when extension is reloaded.

## [1.6.4] — 2026-02-13

### Fixed
- "Extension context invalidated" error when reloading extension while YouTube is open. Added proper error handling for storage operations.

## [1.6.3] — 2026-02-13

### Changed
- Improved widget header layout: settings and close buttons now properly aligned to the right with elegant separator (|) between them.

## [1.6.2] — 2026-02-13

### Added
- **Settings button** in widget header: gear icon (⚙️) opens Options page directly from the widget. Includes rotate animation on hover.

## [1.6.1] — 2026-02-13

### Added
- **Channels list pagination** in Options page: displays 30 channels per page with Previous/Next navigation controls. Prevents long scrolling when managing large channel lists (100+ channels).

## [1.6.0] — 2026-02-13

### Changed
- **Storage architecture redesign**: channels now stored in `chrome.storage.local` (5-10MB limit) to support large lists (100+ channels). Settings (`keyMap`, `openMode`, `zapAction`, `gridSize`) remain in `chrome.storage.sync` for cross-device synchronization.
- Fixes silent save failures when adding 30+ channels (previously hit `chrome.storage.sync` 8KB per-item quota limit).

## [1.5.0] — 2026-02-12

### Added
- **"Set as my defaults"** button in Options: saves current channels and settings as a personal snapshot.
- **"Reset to my defaults"** button: restores the saved personal snapshot (disabled if none saved).
- **"Reset to factory"** button: restores the original hardcoded default channels and settings.

### Changed
- Old "Reset to defaults" button replaced with the two-tier reset system (personal defaults + factory).

## [1.4.9] — 2026-02-12

### Added
- When on a channel page and the last widget page is full, an extra page is available with empty "Add channel" slots, allowing unlimited channel additions directly from the widget.

## [1.4.8] — 2026-02-12

### Added
- Options page auto-refreshes when storage changes externally (e.g. channel added from widget). Bidirectional live sync between widget and options.

## [1.4.7] — 2026-02-12

### Fixed
- "Add channel" now reads the current URL at click time instead of using a stale closure from render time. Fixes the bug where navigating from channel A to channel B and clicking "Add channel" would still try to add channel A.
- Widget re-renders on YouTube SPA navigation (`yt-navigate-finish`), so empty slots correctly update between "Add channel" and "Slot N" when moving between channel pages and other pages.

## [1.4.6] — 2026-02-12

### Changed
- Widget stays open during zapping — closes only via X, ESC, or Alt+Z (true zapping UX).
- Widget auto-restores after same-tab navigation (open state persisted in storage).

### Fixed
- "Add channel" button appears only on channel pages, not on homepage or video pages.
- Channel page detection handles URLs with query params (`?si=...`, `?feature=...`).
- Duplicate detection uses channelId only (eliminates false "Already saved" from URL mismatches).

## [1.4.2] — 2026-02-12

### Added
- Chrome Web Store install link in README.
- Proprietary license (`LICENSE`).
- Changelog (`CHANGELOG.md`).
- Credits section (Carlo Sacchi).
- Partnerships section for sponsored default channel inquiries.
- Widget auto-refresh via `chrome.storage.onChanged` listener.

## [1.4.1] — 2026-02-12

### Added
- Brand icon in the widget header bar and options page header.
- **Save settings** button moved to sticky top-right header for quick access.
- **Reset to defaults** button to restore original channel list and settings.
- Live sync: widget auto-refreshes when settings change from the options page.
- Default channels and key map moved to shared module (`shared.js`) for consistency.
- `web_accessible_resources` in manifest for icon display in content script.

## [1.4.0] — 2026-02-12

### Added
- Error toast in widget overlay when zap fails (visible feedback).
- Channel path validation in resolver (rejects non-channel YouTube URLs).
- Early-win strategy in duration batch processing for faster Short detection.

### Changed
- Storage layer rewritten: removed sticky `_useFallback` flag; each operation independently tries sync first; `set()` mirrors to both backends for cross-context consistency.
- `ffStorage.remove()` now cleans both sync and local backends.
- `escHtml()` guards against non-string input.
- Widget stylesheet attached once to shadow DOM; subsequent renders only replace content.
- Options page applies `isSafeImageUrl` gating on channel avatars (same policy as widget).
- `openUrl()` logs a warning when sameTab falls back to new tab due to missing active tab.

### Fixed
- Channels with missing or invalid URLs can no longer be saved or rendered as clickable.
- `handleZap()` validates channel URL before attempting navigation.

## [1.3.0] — 2026-02-12

### Added
- Privacy policy (`PRIVACY.md`).
- Configurable grid sizes: 3x3, 3x4, 3x5, 3x6 with automatic pagination.
- Zap action setting: open latest video (skip Shorts) or open channel page.
- Add current channel directly from the widget when on a YouTube channel page.
- Drag-and-drop reorder in options page.
- Shared constants and storage helpers (`shared.js`).
- Image URL safety validation (`isSafeImageUrl`).
- Fetch timeout (8s) on all network requests.

### Changed
- Migrated from `pages` array format to flat `channels` array.
- Storage fallback from `chrome.storage.sync` to `chrome.storage.local`.

## [1.0.0] — 2025-02-12

### Added
- Initial release.
- Overlay widget with 3x3 channel grid (Shadow DOM).
- Global keyboard shortcut (Alt+Z) to toggle widget.
- RSS-based zapping to latest non-Short video.
- Short filtering via duration check (<=61s).
- Options page: channel management, key mapping, open mode.
- Seed with 9 default channels on first install.
- Chrome Web Store release workflow.
