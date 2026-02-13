# FlipFeed — Your YouTube Remote Control

**FlipFeed** is the Chrome extension that transforms YouTube into your personal TV. Just like channel surfing with a classic remote control, you can instantly zap between your favorite YouTube channels — no searching, no scrolling, just press a key and watch.

An intelligent overlay widget lets you jump directly to the latest video (skipping Shorts) from any saved channel. Think of FlipFeed as your **YouTube channel hopper**: fast, customizable, and always one keyboard shortcut away.

## Install

**[Get FlipFeed on the Chrome Web Store](https://chromewebstore.google.com/detail/flipfeed-%E2%80%94-video-zapping/hgpnhgogfocccboaommnmmhcgpgijnnj)** — Install your YouTube remote control in seconds.

Or load it manually for development:

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked** and select this folder
4. The extension is ready — navigate to YouTube and start zapping

## Usage — Start Channel Surfing

### Toggle the widget
Press **Alt+Z** (default shortcut) on any YouTube page to summon your channel remote control in the bottom-right corner. Press it again to hide.

**Pro tip:** Customize the shortcut at `chrome://extensions/shortcuts` and change the "Show/hide the FlipFeed zapping widget" binding.

### Zap to a channel — Instant navigation
- **Click** any channel button in the widget, or
- Press the mapped **number key** (1–9 by default) while the widget is visible

It's like pressing channel buttons on a TV remote — instant, satisfying, and addictive.

### Zap action — Choose your landing
Configurable in Options:
- **Latest video** (default): opens the most recent non-Short video via RSS feed intelligence
- **Channel page**: opens the channel's videos page sorted by latest uploads

### Add current channel — One-click save
When browsing a YouTube channel page, open the widget and look for empty slots showing an **"+ Add channel"** button. Click it to instantly save the current channel (smart duplicate detection included).

### Grid size & pagination — Scale to your needs
Choose your preferred remote control layout in Options: **3x3**, **3x4**, **3x5**, or **3x6** grids. Got more channels than slots? Use the **left/right arrows** (or keyboard Arrow keys) to navigate pages. The widget remembers your last page position.

### Close the widget
- Press **ESC**, or
- Click the **✕** close button

## Configuration — Customize Your Remote

Right-click the extension icon → **Options** (or go to `chrome://extensions` → FlipFeed → Details → Extension options).

### Channels — Your personal lineup
- Add **unlimited** YouTube channels and drag to reorder (pagination with 30 channels per page)
- Paste any YouTube URL format: `@handle`, `/channel/UC...`, `/user/...`, or vanity URLs
- Click **Resolve** to auto-detect channel ID, display name, and avatar
- If auto-resolve fails, fill in the name and icon URL manually
- **Set as my defaults**: save your current configuration as a personal snapshot
- **Reset to my defaults**: restore your saved personal configuration
- **Reset to factory**: restore the original default channels

### Key mapping — Program your buttons
- Map any keyboard key to a channel slot (defaults: 1–9, like classic TV remotes)
- Key bindings apply to the currently visible widget page

### Open mode — Navigation behavior
- **Same tab** (default): smooth navigation in the current tab, like changing TV channels
- **New tab**: opens each zap in a new tab (multitasking mode)

## Technical details — Under the hood

Built for speed, privacy, and reliability:

- **Manifest V3** — modern Chrome extension standard, no build step required (vanilla JS + HTML + CSS)
- **Shadow DOM** — widget CSS is perfectly isolated from YouTube's styling
- **RSS-based intelligence** — no YouTube API key needed, works directly with YouTube feeds
- **Smart Short filtering** — automatically detects and skips videos <= 61 seconds by fetching duration metadata
- **Smart caching** — RSS and duration results cached for 60 seconds to minimize network requests
- **Fetch timeout** — all network requests abort after 8 seconds to prevent hanging
- **Concurrent duration checks** — processes batches of 3 videos with early-win strategy for lightning-fast Short detection
- **URL validation** — strict security: only YouTube URLs are navigated; icon URLs restricted to trusted Google domains
- **Split storage architecture** — channels stored in `chrome.storage.local` (5-10MB limit, supports 100+ channels); settings (`keyMap`, `openMode`, `zapAction`, `gridSize`) stored in `chrome.storage.sync` for cross-device synchronization. This smart split avoids `chrome.storage.sync` quota limits (8KB per item, 100KB total).
- **Live sync** — widget auto-refreshes instantly when you save settings in the options page
- **Context resilience** — comprehensive error handling protects against extension reloads and Chrome API invalidation

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

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Partnerships

FlipFeed ships with a curated set of default channels to showcase the zapping experience out of the box. If you are a content creator or brand interested in being featured as a default channel, we welcome partnership inquiries. Please reach out to discuss sponsorship opportunities and terms.

## Credits

Created and maintained by **Carlo Sacchi**.

## License

This software is proprietary. See [LICENSE](LICENSE) for terms.

---

## Keywords & SEO

**YouTube extension**, **channel zapping**, **YouTube remote control**, **channel surfing**, **YouTube channel hopper**, **keyboard shortcuts YouTube**, **YouTube productivity**, **YouTube navigation**, **quick channel switch**, **YouTube overlay widget**, **channel switcher**, **YouTube TV mode**, **fast YouTube navigation**, **YouTube channel manager**, **Chrome extension for YouTube**, **YouTube zapper**, **instant channel switch**, **YouTube automation**, **channel favorites**, **YouTube tools**, **video surfing**, **content discovery**, **YouTube workflow**, **RSS YouTube**, **skip YouTube Shorts**, **YouTube power user**, **YouTube keyboard navigation**, **YouTube channel organizer**

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed version history.
