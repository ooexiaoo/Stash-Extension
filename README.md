# Stashed.in Browser Extension

[![Release](https://img.shields.io/github/v/release/stashed-in/stashlist-extension?style=flat-square)](https://github.com/stashed-in/stashlist-extension/releases/latest)
[![License](https://img.shields.io/github/license/stashed-in/stashlist-extension?style=flat-square)](https://github.com/stashed-in/stashlist-extension/blob/main/LICENSE)

📌 Save links from anywhere on the web directly to your Stashed.in boards with just one click.

![Extension Preview](.github/screenshots/preview.png)

## Features

- ⚡ **One-Click Save** - Save links from any webpage without leaving your current tab
- 🎨 **Auto Metadata** - Automatically extracts title, description, and images from pages
- 🏷️ **Tag Support** - Add up to 5 tags per link with smart suggestions from your boards
- 🌓 **Dark Mode** - Auto-detects system theme or choose your preferred appearance
- 🔒 **Secure** - Uses API tokens stored locally on your device
- 📱 **Smart Board Selection** - Quick access to recent boards with search functionality
- 🎯 **Neubrutalist Design** - Beautiful UI that matches the Stashed.in aesthetic

## Download

### Chrome & Chromium-based Browsers
Download the latest release from our [Releases Page](https://github.com/stashed-in/stashlist-extension/releases/latest) and install manually:
1. Download `stashlist-extension.zip` from the latest release
2. Extract the ZIP file
3. Open Chrome and go to `chrome://extensions`
4. Enable "Developer mode" (toggle in top-right)
5. Click "Load unpacked"
6. Select the extracted folder

### Firefox
Coming soon to Firefox Add-ons store! For now, download from [Releases](https://github.com/stashed-in/stashlist-extension/releases/latest) and install temporarily:
1. Download `stashlist-extension.zip`
2. Extract the ZIP file
3. Open Firefox and go to `about:debugging#/runtime/this-firefox`
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the extracted folder

> **Note:** Firefox version requires manifest V3 conversion. See [Firefox Support](#firefox-support) for details.

## Installation

### Quick Install (Development)

1. **Clone or download** this repository
2. **Open your browser** and navigate to:
   - Chrome/Edge: `chrome://extensions`
   - Firefox: `about:debugging`
3. **Enable Developer Mode**
4. **Load the extension**:
   - Chrome: Click "Load unpacked" → Select the `src` folder
   - Firefox: Click "Load Temporary Add-on" → Select `src/manifest.json`

### Production Install (from Release)

1. Go to [Releases](https://github.com/yourusername/stashlist-extension/releases/latest)
2. Download `stashlist-extension.zip`
3. Extract the ZIP file to a permanent location (e.g., `~/Documents/stashlist-extension`)
4. Follow steps 2-4 from Quick Install
5. Load the extracted folder

> ⚠️ **Important:** For Chrome, the extension folder must remain in its location. Don't delete or move it after loading.

## Authentication Setup

The extension requires a Stashed.in API token to work.

### Step 1: Get Your API Token

1. Go to [Stashed.in](https://stashed.in) and log in
2. Navigate to **Edit Profile** (click your avatar → Edit Profile)
3. Scroll to **Browser Extension Access** section
4. Click **"Generate API Token"**
5. Copy the generated token (starts with `stk_`)

### Step 2: Configure Extension

1. Click the extension icon in your browser
2. Click **"Extension Settings"**
3. Paste your API token in the **Manual Token Entry** section
4. Click **"Save Token"**

Alternatively, the extension can auto-detect your token if you're logged into Stashed.in in the same browser profile.

## Usage

1. **Navigate to any webpage** you want to save
2. **Click the extension icon** in your browser toolbar
3. **Select a board** from the dropdown (recent boards shown first)
4. **Review auto-filled details** (URL, title, description, image)
5. **Add tags** (optional) - get suggestions from your board's existing tags
6. **Click "Save Link"**

### Pro Tips

- 🔍 **Search boards** - Type in the board selector to quickly find boards
- ⌨️ **Keyboard shortcuts** - Use arrow keys and Enter to navigate the board selector
- 📋 **Quick copy** - Click the copy button to copy your API token
- 🌓 **Theme switch** - Change appearance in Extension Settings

## Development

### Project Structure

```
stashlist-extension/
├── src/
│   ├── manifest.json      # Extension configuration
│   ├── background.js      # Service worker for API calls
│   ├── popup.html         # Main popup interface
│   ├── popup.js          # Popup logic
│   ├── popup.css         # Popup styles
│   ├── content.js        # Content script for metadata
│   ├── settings.html     # Settings page
│   ├── settings.js       # Settings logic
│   ├── settings.css      # Settings styles
│   └── icons/            # Extension icons
├── .github/
│   └── workflows/
│       └── build.yml     # Automated build workflow
├── package.json
└── README.md
```

### Building

```bash
# Install dependencies (if any)
npm install

# Build ZIP for distribution
npm run build

# Or manually
cd src && zip -r ../stashlist-extension.zip *
```

### Development Mode

1. Run `npm run dev` (if using a bundler) or load `src` directly
2. Make changes to files
3. Click the refresh icon on the extension card in `chrome://extensions`
4. Test your changes

### Publishing a New Release

1. Update version in `src/manifest.json`
2. Commit changes
3. Create a new Git tag: `git tag v1.0.1`
4. Push tag: `git push origin v1.0.1`
5. GitHub Actions will automatically build and create a release

## Firefox Support

Currently, the extension uses Manifest V3 which is supported by:
- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Opera 74+
- 🔄 Firefox (requires Manifest V2 or MV3 with modifications)

### Firefox Version

To use in Firefox, create a Firefox-specific manifest:

```json
{
  "manifest_version": 2,
  "browser_specific_settings": {
    "gecko": {
      "id": "extension@stashed.in",
      "strict_min_version": "109.0"
    }
  }
}
```

See `manifest.json` for the full Chrome version.

## Troubleshooting

### Extension not working

1. **Check authentication** - Ensure your API token is valid and not expired
2. **Refresh the page** - Some pages require a refresh for the content script
3. **Check console** - Open DevTools console for error messages

### Can't save links

- Verify your API token in Extension Settings
- Check that you have at least one board on Stashed.in
- Ensure you have an internet connection

### Dark mode not working

- Go to Extension Settings → Appearance
- Select "Dark" or "Auto (System)"
- Check your system's dark mode settings

### Board selector is empty

- Create a board on Stashed.in first
- Refresh the extension popup
- Check that your API token has board access

## Privacy

- 🔒 **No data collection** - The extension only communicates with Stashed.in API
- 💾 **Local storage** - Your API token is stored locally in browser storage
- 🚫 **No tracking** - No analytics, no telemetry, no third-party services
- 🔐 **Open source** - All code is visible and auditable

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Stashed.in](https://stashed.in) - Main website
- [Report Bug](https://github.com/stashed-in/stashlist-extension/issues)
- [Request Feature](https://github.com/stashed-in/stashlist-extension/issues)
- [Changelog](https://github.com/stashed-in/stashlist-extension/releases)

---

Made with ❤️ for the Stashed.in community
