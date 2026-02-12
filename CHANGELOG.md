# Changelog

All notable changes to FlipFeed are documented in this file.

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
