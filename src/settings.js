document.addEventListener('DOMContentLoaded', function() {
  const authStatus = document.getElementById('auth-status');
  const authButtons = document.getElementById('auth-buttons');
  const loginBtn = document.getElementById('login-btn');
  const checkAuthBtn = document.getElementById('check-auth-btn');
  const setupSection = document.getElementById('setup-section');
  const currentTokenSection = document.getElementById('current-token-section');
  const authTokenInput = document.getElementById('auth-token');
  const currentTokenDisplay = document.getElementById('current-token-display');
  const showTokenBtn = document.getElementById('show-token-btn');
  const copyTokenBtn = document.getElementById('copy-token-btn');
  const removeTokenBtn = document.getElementById('remove-token-btn');
  const saveConfigBtn = document.getElementById('save-config-btn');
  const openProfileBtn = document.getElementById('open-profile-btn');
  const themeSelect = document.getElementById('theme-select');
  const themePreviewItems = document.querySelectorAll('.theme-preview-item');

  // Load and apply theme on settings page load
  loadTheme();

  // Load theme from storage
  async function loadTheme() {
    const result = await chrome.storage.local.get(['theme']);
    const theme = result.theme || 'auto';
    themeSelect.value = theme;
    applyThemeToSettingsPage(theme);
  }

  // Apply theme to settings page preview
  function applyThemeToSettingsPage(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      // Auto - detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }

    // Update preview selection
    themePreviewItems.forEach(item => {
      const itemTheme = item.getAttribute('data-theme');
      if (theme === itemTheme || (theme === 'auto' && itemTheme === 'light')) {
        item.style.borderColor = 'var(--primary)';
        item.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
      } else {
        item.style.borderColor = 'var(--gray-200)';
        item.style.boxShadow = 'none';
      }
    });
  }

  // Save theme preference
  async function saveTheme(theme) {
    await chrome.storage.local.set({ theme });
    applyThemeToSettingsPage(theme);
  }

  // Theme select change handler
  themeSelect.addEventListener('change', function() {
    saveTheme(this.value);
  });

  // Theme preview click handlers
  themePreviewItems.forEach(item => {
    item.addEventListener('click', function() {
      const theme = this.getAttribute('data-theme');
      themeSelect.value = theme;
      saveTheme(theme);
    });
  });

  // Listen for system theme changes when in auto mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (themeSelect.value === 'auto') {
      if (e.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  });

  // Check current auth status on load
  checkAuthStatus();

  // Show/hide token functionality
  let tokenVisible = false;

  showTokenBtn.addEventListener('click', function() {
    if (currentTokenDisplay.value) {
      if (tokenVisible) {
        currentTokenDisplay.type = 'password';
        showTokenBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
        tokenVisible = false;
      } else {
        currentTokenDisplay.type = 'text';
        showTokenBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 17a5 5 0 0 1-12 0"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
        tokenVisible = true;
      }
    }
  });

  // Copy token to clipboard
  copyTokenBtn.addEventListener('click', async function() {
    if (currentTokenDisplay.value) {
      try {
        await navigator.clipboard.writeText(currentTokenDisplay.value);
        const originalText = copyTokenBtn.textContent;
        copyTokenBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyTokenBtn.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy token: ', err);
        alert('Failed to copy token to clipboard');
      }
    }
  });

  // Remove token functionality
  removeTokenBtn.addEventListener('click', async function() {
    if (confirm('Are you sure you want to disconnect? This will require you to enter a new token to use the extension.')) {
      await chrome.storage.local.remove(['authToken']);
      currentTokenDisplay.value = '';
      currentTokenSection.style.display = 'none';
      setupSection.style.display = 'block';
      authButtons.style.display = 'flex';
      authStatus.innerHTML = '<p style="color: #64748b;">Disconnected. Please log in again to continue using the extension.</p>';
    }
  });

  // Open profile page button
  openProfileBtn.addEventListener('click', function() {
    chrome.tabs.create({
      url: 'https://stashed.in/edit-profile'
    });
  });

  // Login button handler
  loginBtn.addEventListener('click', function() {
    // Open StashList login in a new tab
    chrome.tabs.create({
      url: 'https://stashed.in/login'
    });

    // Show instructions
    authStatus.innerHTML = `
      <div class="status-box info">
        <strong>✓ Login page opened!</strong><br>
        After logging in, go to <strong>Edit Profile</strong> → Scroll to <strong>Browser Extension Access</strong> → Copy your API token.<br><br>
        Then return here and paste it in the "Manual Token Entry" section below.
      </div>
    `;
  });

  // Check auth status handler
  checkAuthBtn.addEventListener('click', checkAuthStatus);

  // Save configuration handler
  saveConfigBtn.addEventListener('click', async function() {
    const token = authTokenInput.value.trim();

    if (!token) {
      authStatus.innerHTML = '<div class="status-box warning">Please enter an authentication token.</div>';
      return;
    }

    // Validate token format (should start with 'stk_')
    if (!token.startsWith('stk_')) {
      authStatus.innerHTML = '<div class="status-box warning">Invalid token format. API tokens should start with "stk_".</div>';
      return;
    }

    // Show loading state
    authStatus.innerHTML = '<div class="status-box info">Validating token...</div>';
    saveConfigBtn.disabled = true;
    saveConfigBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: -2px;" class="animate-spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Validating...';

    try {
      const response = await fetch('https://stashlist-extension-api-production.wolfr13.workers.dev/api/extension/boards', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok || response.status === 403) {
        await chrome.storage.local.set({ authToken: token });
        authStatus.innerHTML = '<div class="status-box success"><strong>✓ Token saved successfully!</strong><br>You can now use the extension to save links to your stashes.</div>';
        setTimeout(() => checkAuthStatus(), 1500);
      } else {
        const errorText = await response.text();
        throw new Error(`Invalid token: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      if (error.message.includes('Failed to fetch')) {
        authStatus.innerHTML = '<div class="status-box warning">Error validating token: Unable to connect to the API. Please check your internet connection.</div>';
      } else if (error.message.includes('401')) {
        authStatus.innerHTML = '<div class="status-box warning">Error: Invalid or expired token. Please generate a new token in your Edit Profile page.</div>';
      } else {
        authStatus.innerHTML = `<div class="status-box warning">Error: ${error.message}</div>`;
      }
    } finally {
      saveConfigBtn.disabled = false;
      saveConfigBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: -2px;"><polyline points="20 6 9 17 4 12"/></svg> Save Token';
    }
  });

  // Function to check authentication status
  async function checkAuthStatus() {
    try {
      const result = await chrome.storage.local.get(['authToken']);

      if (!result.authToken) {
        authStatus.innerHTML = `
          <div class="status-box warning">
            <strong>⚠️ Not authenticated</strong><br>
            You need to set up authentication to save links to your stashes.<br><br>
            Click "Log In to Stashed.in" above or follow the step-by-step instructions below.
          </div>
        `;
        authButtons.style.display = 'flex';
        setupSection.style.display = 'block';
        currentTokenSection.style.display = 'none';
        return;
      }

      // Only show token if it's a valid API token (starts with stk_)
      // Ignore JWT session tokens that start with eyJ
      if (result.authToken.startsWith('stk_')) {
        currentTokenDisplay.value = result.authToken;
        currentTokenSection.style.display = 'block';
        authButtons.style.display = 'none';
        setupSection.style.display = 'none';

        try {
          const response = await fetch('https://stashlist-extension-api-production.wolfr13.workers.dev/api/extension/boards', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${result.authToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok || response.status === 403) {
            authStatus.innerHTML = `
              <div class="status-box success">
                <strong>✓ Connected</strong><br>
                The extension is ready to use! You can now save links to your stashes from any webpage.
              </div>
            `;
          } else {
            const errorText = await response.text();
            authStatus.innerHTML = `
              <div class="status-box warning">
                <strong>⚠️ Token may be expired</strong><br>
                Response: ${response.status}<br>
                Please log in again or update your token.
              </div>
            `;
            setupSection.style.display = 'block';
          }
        } catch (apiError) {
          authStatus.innerHTML = `
            <div class="status-box warning">
              <strong>⚠️ API not accessible</strong><br>
              Token is stored, but we couldn't verify it. Check your internet connection.
            </div>
          `;
          setupSection.style.display = 'block';
        }
      } else {
        // Invalid token format (likely JWT), clear it and show setup
        await chrome.storage.local.remove(['authToken']);
        authStatus.innerHTML = `
          <div class="status-box warning">
            <strong>⚠️ Invalid token detected</strong><br>
            Please enter your API token (starts with stk_) from the Edit Profile page.
          </div>
        `;
        authButtons.style.display = 'flex';
        setupSection.style.display = 'block';
        currentTokenSection.style.display = 'none';
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      authStatus.innerHTML = `
        <div class="status-box warning">
          Error checking authentication status: ${error.message}<br>
          Please try again or manually enter your token.
        </div>
      `;
      setupSection.style.display = 'block';
      currentTokenSection.style.display = 'none';
      authButtons.style.display = 'flex';
    }
  }
});
