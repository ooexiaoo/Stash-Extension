# StashList Browser Extension - Complete Setup Guide

## Overview
The StashList browser extension allows you to quickly save links from any webpage to your StashList boards without leaving the current page. The extension features a neubrutalist design that matches the StashList website aesthetic.

## Features
- Save current page URL to your StashList boards with one click
- Auto-extract page metadata (title, description, featured image)
- Select which board to save to
- Add custom details (URL, title, description, image URL)
- Add up to 5 tags per link
- Neubrutalist design consistent with the StashList website
- Secure authentication via API tokens

## Installation

### Chrome/Edge
1. Download the extension files or clone the repository
2. Navigate to `chrome://extensions` (or `edge://extensions`)
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `browser-extension/src` folder
6. The extension icon should now appear in your browser toolbar

### Firefox
1. Download the extension files or clone the repository
2. Navigate to `about:debugging`
3. Click "This Firefox" on the left sidebar
4. Click "Load Temporary Add-on"
5. Select any file in the `browser-extension/src` folder
6. The extension should now appear in your browser toolbar

## Authentication Setup

The extension uses API tokens for secure authentication. You have two options:

### Option 1: Extension Settings
1. Click the extension icon and then click "Extension Settings" in the login section
2. Click "Log In to StashList" to open the login page
3. Log in to StashList in your browser
4. Return to the settings page and click "Check Current Status"
5. Your authentication will be detected automatically if you're logged in to StashList in the same browser

### Option 2: Manual Token Entry
1. Log in to your StashList account at https://stashed.in
2. Go to your profile settings
3. Generate an API token if you don't have one
4. Copy the API token (it should start with "stk_")
5. Open the extension settings page
6. Paste the API token in the "Authentication Token" field
7. Click "Save Token"

## Usage

### Saving a Link
1. Navigate to the webpage you want to save
2. Click the StashList extension icon in your browser toolbar
3. Select the board where you want to save the link
4. The URL, title, and description will be automatically populated
5. Edit any details as needed and add tags (up to 5)
6. Click "Save Link" to add it to your board

### Managing Your API Token
1. Click the extension icon and then click "Extension Settings"
2. You can generate a new token, copy your current token, or revoke your token
3. If you revoke your token, you'll need to set up authentication again

## Troubleshooting

### Extension Not Working
- Make sure you're logged in to StashList in the same browser
- Check that your API token is valid and hasn't expired
- Verify that you have internet connection
- Try refreshing the extension by going to `chrome://extensions` and clicking the refresh icon

### Authentication Issues
- If automatic detection isn't working, try manual token entry
- Make sure your API token starts with "stk_"
- Generate a new API token in your StashList profile settings if needed

### Link Saving Issues
- Verify that you've selected a board
- Make sure the URL is valid
- Check that you have permission to save to the selected board

## Security
- API tokens are stored locally on your device only
- All communication with the StashList API is encrypted via HTTPS
- The extension has minimal permissions required for its functionality
- You can revoke your API token at any time from your profile settings

## Development

### Building the Extension
To create a ZIP file for distribution:
```bash
cd browser-extension
npm run zip
```

### Modifying the Extension
The extension source code is located in the `browser-extension/src` directory:
- `manifest.json` - Extension configuration
- `popup.html/css/js` - The popup interface that appears when clicking the extension icon
- `settings.html/css/js` - The settings page for managing authentication
- `background.js` - Background script that handles API communication
- `content.js` - Content script that extracts page metadata

## Support
If you encounter issues with the extension:
1. Check that your StashList account is active and in good standing
2. Verify your API token is correct and hasn't expired
3. Ensure you have a stable internet connection
4. Contact support through the StashList website if issues persist

## Privacy
The extension only accesses the current webpage to extract metadata when you explicitly choose to save a link. No browsing data is stored or transmitted without your consent.