# Privacy Policy — FlipFeed

**Last updated:** February 12, 2026

FlipFeed ("the Extension") is a Chrome browser extension that lets users quickly switch between their favorite YouTube channels. This privacy policy explains what data the Extension collects, how it is used, and how it is stored.

## Data Collection

FlipFeed does **not** collect, transmit, or share any personal data. The Extension does not use analytics, tracking pixels, cookies, or any third-party services.

### What is stored locally

The Extension stores the following user-configured preferences in Chrome's built-in storage (`chrome.storage.sync` or `chrome.storage.local`):

- YouTube channel URLs, display names, and avatar image URLs added by the user
- Keyboard key-to-slot mappings
- Grid size preference
- Zap action preference (latest video or channel page)
- Open mode preference (same tab or new tab)

This data is entered manually by the user through the Extension's options page. No data is collected automatically from browsing activity.

### Network requests

The Extension makes requests exclusively to `youtube.com` for the following purposes:

- **RSS feeds** (`youtube.com/feeds/videos.xml`): to retrieve the latest videos from channels configured by the user
- **Video watch pages** (`youtube.com/watch?v=...`): to read video duration metadata and filter out YouTube Shorts
- **Channel pages** (`youtube.com/@...`): to resolve channel names and avatar images when the user adds a new channel

No data from these requests is sent to any server other than YouTube. No browsing history, watch history, or user activity is recorded or transmitted.

### Data shared with third parties

None. FlipFeed does not send any data to third parties. All network communication occurs directly between the user's browser and YouTube.

## Data Storage

All configuration data is stored locally in the user's browser using Chrome's storage API. If Chrome Sync is enabled, settings may sync across the user's devices through Google's infrastructure. No external database or server is used.

## Data Retention

Data persists until the user modifies or removes it through the Extension's options page, or until the Extension is uninstalled. Uninstalling the Extension removes all stored data.

## Changes to This Policy

If this privacy policy is updated, the changes will be reflected in this document with an updated date. Continued use of the Extension after changes constitutes acceptance of the revised policy.

## Contact

For questions about this privacy policy or the Extension, please open an issue on the GitHub repository.
