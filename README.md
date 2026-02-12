# FlipFeed — Video zapping for YouTube

Chrome extension that lets you "zap" between your favorite YouTube channels via a quick overlay widget. Select a channel and instantly jump to its latest non-Short video.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked** and select this folder
4. The extension is ready — navigate to YouTube to use it

## Usage

### Toggle the widget
Press **Alt+Z** (default shortcut) on any YouTube page to show/hide the zapping widget in the bottom-right corner.

To customize the shortcut: go to `chrome://extensions/shortcuts` and change the "Show/hide the FlipFeed zapping widget" binding.

### Zap to a channel
- **Click** any channel button in the widget, or
- Press the mapped **number key** (1–9 by default) while the widget is visible

### Zap action
Configurable in Options:
- **Latest video** (default): opens the most recent non-Short video via RSS
- **Channel page**: opens the channel's videos page sorted by latest

### Add current channel
When browsing a YouTube channel page, open the widget — empty slots show an **"+ Add channel"** button. Click it to save the current channel directly (duplicate detection included).

### Grid size & pagination
Choose your preferred grid layout in Options: **3×3**, **3×4**, **3×5**, or **3×6**. If you have more channels than slots, use the **left/right arrows** (or Arrow keys) to navigate pages.

### Close the widget
- Press **ESC**, or
- Click the **×** button

## Configuration

Right-click the extension icon → **Options** (or go to `chrome://extensions` → FlipFeed → Details → Extension options).

### Channels
- Add unlimited YouTube channels (drag to reorder)
- Paste a URL in any format: `@handle`, `/channel/UC...`, `/user/...`, or vanity URL
- Click **Resolve** to auto-detect channel ID, display name, and avatar
- If auto-resolve fails, fill in the name and icon URL manually

### Key mapping
- Map any key to a channel slot (defaults: 1–9)
- Key mapping applies to the current visible page

### Open mode
- **Same tab** (default): navigates the current tab
- **New tab**: opens a new tab for each zap

## Technical details

- **Manifest V3** — no build step, vanilla JS + HTML + CSS
- **Shadow DOM** — widget CSS is isolated from YouTube
- **RSS-based zapping** — no YouTube API key needed
- **Short filtering** — fetches video duration from watch pages, skips videos ≤ 61 seconds
- **Caching** — RSS and duration results cached for 60 seconds to reduce requests
- **Fetch timeout** — all network requests abort after 8 seconds to prevent stalls
- **Concurrent duration checks** — batches of 3 for faster Short detection
- **URL validation** — only YouTube URLs are navigated; icon URLs restricted to trusted Google domains
- **Storage fallback** — automatically falls back to `chrome.storage.local` if sync is unavailable

### Permissions used
| Permission | Reason |
|---|---|
| `storage` | Save channel config and settings |
| `commands` | Global keyboard shortcut to toggle widget |
| `tabs` | Open videos in same/new tab |
| `host_permissions: youtube.com` | Inject widget, fetch RSS and video pages |

## Privacy

- **No tracking** — zero analytics, no external services
- **Local/sync storage only** — all data stays in your browser (Chrome sync if enabled)
- **No data sent to third parties** — all fetches go directly to youtube.com

## Version

1.3.0
