document.addEventListener('DOMContentLoaded', async function() {
  const statusDiv = document.getElementById('status');
  const linkForm = document.getElementById('link-form');
  const authSection = document.getElementById('auth-section');
  const boardSelect = document.getElementById('board-select'); // Hidden input
  const boardCombobox = document.getElementById('board-combobox');
  const boardDropdown = document.getElementById('board-dropdown');
  const boardOptions = document.getElementById('board-options');
  const boardSearch = document.getElementById('board-search');
  const comboboxEmpty = document.getElementById('combobox-empty');
  const comboboxToggle = document.querySelector('.combobox-toggle');
  const comboboxInputWrapper = document.querySelector('.combobox-input-wrapper');
  const settingsHeaderBtn = document.getElementById('settings-header-btn');
  
  const linkUrlInput = document.getElementById('link-url');
  const linkTitleInput = document.getElementById('link-title');
  const linkDescriptionInput = document.getElementById('link-description');
  const linkImageInput = document.getElementById('link-image');
  const linkTagsInput = document.getElementById('link-tags');
  const tagCounter = document.getElementById('tag-counter');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const loginBtn = document.getElementById('login-btn');
  const toastContainer = document.getElementById('toast-container');
  const metadataLoading = document.getElementById('metadata-loading');
  const metadataStatus = document.getElementById('metadata-status');
  const tagSuggestionsDiv = document.getElementById('tag-suggestions');
  const tagSuggestionsList = document.getElementById('tag-suggestions-list');

  // State for metadata fetching and tag suggestions
  let currentAuthToken = null;
  let fetchedMetadata = { title: null, description: null, image: null };
  let boardTags = [];
  let addedTags = [];
  let metadataFetchTimeout = null;
  
  // State for combobox
  let allBoards = [];
  let filteredBoards = [];
  let recentBoardIds = [];
  let highlightedIndex = -1;
  let isDropdownOpen = false;

  // Apply theme on load
  applyTheme();

  // Load theme from storage or auto-detect
  async function applyTheme() {
    const result = await chrome.storage.local.get(['theme']);
    const theme = result.theme;
    
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      // Auto-detect from system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    chrome.storage.local.get(['theme']).then((result) => {
      if (!result.theme || result.theme === 'auto') {
        if (e.matches) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
    });
  });

  // Load recent boards from storage
  async function loadRecentBoards() {
    const result = await chrome.storage.local.get(['recentBoards']);
    recentBoardIds = result.recentBoards || [];
  }

  // Save board to recent history
  async function saveBoardToRecent(boardId) {
    // Remove if already exists, then add to front
    recentBoardIds = recentBoardIds.filter(id => id !== boardId);
    recentBoardIds.unshift(boardId);
    // Keep only last 5
    recentBoardIds = recentBoardIds.slice(0, 5);
    await chrome.storage.local.set({ recentBoards: recentBoardIds });
  }

  // Toast notification helper functions
  function showToast(message, type = 'success', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconSvg = type === 'success'
      ? `<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
      : `<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <span class="toast-message">${message}</span>
      </div>
      <button class="toast-close" aria-label="Close">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;

    toastContainer.appendChild(toast);

    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => removeToast(toast), duration);
    }
  }

  function removeToast(toast) {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }

  // Format error message for better display
  function formatErrorMessage(error) {
    const message = error.message;

    // Handle duplicate link error
    if (message.includes('duplicate key value') || message.includes('already exists')) {
      // Try to extract the URL from the error details
      const urlMatch = message.match(/url, board_id\)=\(([^,]+),/);
      if (urlMatch && urlMatch[1]) {
        const url = urlMatch[1];
        return {
          title: 'Link Already Exists',
          description: `This URL is already in your board:`,
          url: url
        };
      }
      return {
        title: 'Link Already Exists',
        description: 'This URL has already been saved to the selected board.'
      };
    }

    // Handle authentication errors
    if (message.includes('Authentication required') || message.includes('Unauthorized')) {
      return {
        title: 'Authentication Required',
        description: 'Please log in to continue.'
      };
    }

    // Handle network/server errors
    if (message.includes('500') || message.includes('Failed to save')) {
      return {
        title: 'Server Error',
        description: message.replace('Failed to save link: ', '')
      };
    }

    // Default: return the original message
    return {
      title: 'Error',
      description: message
    };
  }

  // Fetch metadata for a URL
  async function fetchLinkMetadata(url) {
    if (!url || !currentAuthToken) return;

    try {
      metadataLoading.style.display = 'flex';
      metadataStatus.textContent = 'Fetching page info...';
      metadataStatus.className = 'metadata-status';

      const response = await chrome.runtime.sendMessage({
        action: 'fetchMetadata',
        url: url,
        authToken: currentAuthToken
      });

      if (response && response.success && response.metadata) {
        fetchedMetadata = response.metadata;

        // Auto-fill title if available and field is empty
        if (fetchedMetadata.title && !linkTitleInput.value) {
          linkTitleInput.value = fetchedMetadata.title;
        }

        // Auto-fill description if available and field is empty
        if (fetchedMetadata.description && !linkDescriptionInput.value) {
          linkDescriptionInput.value = fetchedMetadata.description;
        }

        // Auto-fill image if available and field is empty
        if (fetchedMetadata.image && !linkImageInput.value) {
          linkImageInput.value = fetchedMetadata.image;
        }

        metadataStatus.textContent = '✓ Page info loaded';
        metadataStatus.className = 'metadata-status success';
      } else {
        metadataStatus.textContent = 'Could not fetch page info';
        metadataStatus.className = 'metadata-status error';
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      metadataStatus.textContent = 'Failed to fetch page info';
      metadataStatus.className = 'metadata-status error';
    } finally {
      metadataLoading.style.display = 'none';
    }
  }

  // Load tags from the selected board
  async function loadBoardTags(boardId) {
    if (!boardId || !currentAuthToken) return;

    try {
      console.log('Loading tags for board:', boardId);
      const response = await chrome.runtime.sendMessage({
        action: 'getBoardTags',
        boardId: boardId,
        authToken: currentAuthToken
      });

      console.log('Board tags response:', response);

      if (response && response.success && response.tags) {
        boardTags = response.tags;
        console.log('Loaded board tags:', boardTags);
        addedTags = linkTagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        renderTagSuggestions();
      } else {
        console.log('No tags found or response not successful');
      }
    } catch (error) {
      console.error('Error loading board tags:', error);
    }
  }

  // Render tag suggestions
  function renderTagSuggestions() {
    console.log('Rendering tag suggestions. boardTags:', boardTags, 'addedTags:', addedTags);

    if (!boardTags || boardTags.length === 0) {
      console.log('No board tags to suggest');
      tagSuggestionsDiv.style.display = 'none';
      return;
    }

    // Filter out tags that are already added
    const availableTags = boardTags.filter(tag => !addedTags.includes(tag.name));
    console.log('Available tags to suggest:', availableTags);

    if (availableTags.length === 0) {
      console.log('All tags already added');
      tagSuggestionsDiv.style.display = 'none';
      return;
    }

    tagSuggestionsList.innerHTML = '';
    availableTags.forEach(tag => {
      const chip = document.createElement('div');
      chip.className = 'tag-chip';
      chip.innerHTML = `
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        ${tag.name}
      `;
      chip.addEventListener('click', () => addTag(tag.name));
      tagSuggestionsList.appendChild(chip);
    });

    tagSuggestionsDiv.style.display = 'block';
    console.log('Tag suggestions displayed');
  }

  // Add a tag to the input
  function addTag(tagName) {
    const currentTags = linkTagsInput.value.split(',').map(t => t.trim()).filter(t => t);
    if (!currentTags.includes(tagName) && currentTags.length < 5) {
      currentTags.push(tagName);
      linkTagsInput.value = currentTags.join(', ');
      tagCounter.textContent = `${currentTags.length}/5 tags`;
      addedTags = currentTags;
      renderTagSuggestions();
    }
  }

  // Combobox Functions
  function openDropdown() {
    isDropdownOpen = true;
    boardDropdown.style.display = 'flex';
    comboboxInputWrapper.setAttribute('aria-expanded', 'true');
    boardCombobox.classList.add('selected');
    boardSearch.value = '';
    filteredBoards = allBoards;
    renderBoardOptions();
    setTimeout(() => boardSearch.focus(), 100);
  }

  function closeDropdown() {
    isDropdownOpen = false;
    boardDropdown.style.display = 'none';
    comboboxInputWrapper.setAttribute('aria-expanded', 'false');
    highlightedIndex = -1;
  }

  function toggleDropdown() {
    if (isDropdownOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function renderBoardOptions() {
    boardOptions.innerHTML = '';
    
    if (filteredBoards.length === 0) {
      comboboxEmpty.style.display = 'block';
      return;
    }
    
    comboboxEmpty.style.display = 'none';
    
    // Split boards into recent and all
    const recentBoards = filteredBoards.filter(b => recentBoardIds.includes(b.id));
    const otherBoards = filteredBoards.filter(b => !recentBoardIds.includes(b.id));
    
    // Render recent section
    if (recentBoards.length > 0) {
      const recentSection = document.createElement('div');
      recentSection.className = 'combobox-section';
      
      const recentTitle = document.createElement('div');
      recentTitle.className = 'combobox-section-title';
      recentTitle.textContent = 'Recent';
      recentSection.appendChild(recentTitle);
      
      recentBoards.forEach((board, index) => {
        const option = createBoardOption(board, recentBoardIds.indexOf(board.id));
        recentSection.appendChild(option);
      });
      
      boardOptions.appendChild(recentSection);
      
      // Add divider if there are more boards
      if (otherBoards.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'combobox-divider';
        boardOptions.appendChild(divider);
      }
    }
    
    // Render all other boards
    if (otherBoards.length > 0) {
      const allSection = document.createElement('div');
      allSection.className = 'combobox-section';
      
      if (recentBoards.length === 0) {
        const allTitle = document.createElement('div');
        allTitle.className = 'combobox-section-title';
        allTitle.textContent = 'All Boards';
        allSection.appendChild(allTitle);
      }
      
      otherBoards.forEach((board, index) => {
        const option = createBoardOption(board, (recentBoards.length > 0 ? recentBoards.length : 0) + index);
        allSection.appendChild(option);
      });
      
      boardOptions.appendChild(allSection);
    }
    
    // Update highlighted option
    updateHighlightedOption();
  }

  function createBoardOption(board, index) {
    const option = document.createElement('div');
    option.className = 'combobox-option';
    option.setAttribute('role', 'option');
    option.setAttribute('data-index', index);
    
    if (board.id === boardSelect.value) {
      option.classList.add('selected');
    }
    
    option.innerHTML = `
      <div class="combobox-option-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div class="combobox-option-content">
        <div class="combobox-option-title">${escapeHtml(board.title || board.id)}</div>
        <div class="combobox-option-count">${board.link_count || 0} links</div>
      </div>
    `;
    
    option.addEventListener('click', () => selectBoard(board));
    option.addEventListener('mouseenter', () => {
      highlightedIndex = index;
      updateHighlightedOption();
    });
    
    return option;
  }

  function updateHighlightedOption() {
    const options = boardOptions.querySelectorAll('.combobox-option');
    options.forEach((opt, idx) => {
      if (idx === highlightedIndex) {
        opt.classList.add('highlighted');
        opt.scrollIntoView({ block: 'nearest' });
      } else {
        opt.classList.remove('highlighted');
      }
    });
  }

  function selectBoard(board) {
    boardSelect.value = board.id;
    boardCombobox.value = board.title || board.id;
    boardCombobox.classList.add('selected');
    closeDropdown();
    saveBoardToRecent(board.id);
    loadBoardTags(board.id);
    console.log('Selected board:', board.id, board.title);
  }

  function filterBoards(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      filteredBoards = allBoards;
    } else {
      filteredBoards = allBoards.filter(board => 
        (board.title || board.id).toLowerCase().includes(term)
      );
    }
    highlightedIndex = -1;
    renderBoardOptions();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Keyboard navigation for combobox
  function handleComboboxKeydown(e) {
    if (!isDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        boardCombobox.focus();
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (highlightedIndex < filteredBoards.length - 1) {
          highlightedIndex++;
          updateHighlightedOption();
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (highlightedIndex > 0) {
          highlightedIndex--;
          updateHighlightedOption();
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredBoards.length) {
          selectBoard(filteredBoards[highlightedIndex]);
        }
        break;
        
      case 'Tab':
        closeDropdown();
        break;
    }
  }

  // Wait a bit for background script to initialize
  await new Promise(resolve => setTimeout(resolve, 100));

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Load recent boards first
  await loadRecentBoards();

  // Get saved authentication state
  const result = await chrome.storage.local.get(['authToken']);
  console.log('Popup loaded, authToken exists:', !!result.authToken);

  // Validate token format - only accept stk_ API tokens, not JWT session tokens
  const isValidToken = result.authToken && result.authToken.startsWith('stk_');

  if (isValidToken) {
    // Store auth token for later use
    currentAuthToken = result.authToken;

    // User is authenticated, fetch boards and show form
    loadBoards(result.authToken);
    getTabMetadata(tab);
  } else {
    // Show login prompt
    statusDiv.style.display = 'none';
    authSection.style.display = 'block';
  }

  // Combobox event listeners
  comboboxToggle.addEventListener('click', toggleDropdown);
  
  boardCombobox.addEventListener('click', (e) => {
    e.preventDefault();
    toggleDropdown();
  });
  
  boardCombobox.addEventListener('keydown', handleComboboxKeydown);
  
  boardSearch.addEventListener('input', (e) => {
    filterBoards(e.target.value);
  });
  
  boardSearch.addEventListener('keydown', handleComboboxKeydown);
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (isDropdownOpen && !e.target.closest('.combobox-container')) {
      closeDropdown();
    }
  });

  // Update tag counter
  linkTagsInput.addEventListener('input', function() {
    const tags = this.value.split(',').filter(tag => tag.trim() !== '');
    const count = Math.min(tags.length, 5);
    tagCounter.textContent = `${count}/5 tags`;
    addedTags = tags;
    renderTagSuggestions();
  });

  // Auto-fetch metadata when URL changes (with debounce)
  linkUrlInput.addEventListener('blur', function() {
    const url = this.value.trim();
    if (url) {
      // Clear any pending fetch
      if (metadataFetchTimeout) {
        clearTimeout(metadataFetchTimeout);
      }
      // Fetch metadata after a short delay
      metadataFetchTimeout = setTimeout(() => {
        fetchLinkMetadata(url);
      }, 500);
    }
  });

  // Login button handler
  loginBtn.addEventListener('click', function() {
    // Open StashList login in a new tab
    chrome.tabs.create({ url: 'https://stashed.in/login' });
  });

  // Settings button handler
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function() {
      // Open the extension's options page
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        // Fallback for older Chrome versions
        window.open(chrome.runtime.getURL('settings.html'));
      }
    });
  }

  // Header settings button handler
  if (settingsHeaderBtn) {
    settingsHeaderBtn.addEventListener('click', function() {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('settings.html'));
      }
    });
  }

  // Old settings link handler (for backwards compatibility)
  const settingsLink = document.getElementById('settings-link');
  if (settingsLink) {
    settingsLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('settings.html'));
      }
    });
  }

  // Cancel button handler
  cancelBtn.addEventListener('click', function() {
    window.close();
  });

  // Form submission
  linkForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      // Get auth token
      const result = await chrome.storage.local.get(['authToken']);
      if (!result.authToken) {
        throw new Error('Authentication required. Please log in first.');
      }

      // Validate form fields
      if (!boardSelect.value) {
        throw new Error('Please select a board to save the link to.');
      }

      if (!linkUrlInput.value) {
        throw new Error('URL is required.');
      }

      // Validate URL format
      try {
        new URL(linkUrlInput.value);
      } catch (e) {
        throw new Error('Please enter a valid URL.');
      }

      // Prepare link data
      const linkData = {
        board_id: boardSelect.value,
        url: linkUrlInput.value,
        title: linkTitleInput.value || null,
        description: linkDescriptionInput.value || null,
        image_url: linkImageInput.value || null,
        tags: linkTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '') || []
      };

      // Limit tags to 5
      if (linkData.tags.length > 5) {
        throw new Error('You can only add up to 5 tags per link.');
      }

      // Send link data to background script
      const response = await chrome.runtime.sendMessage({
        action: 'saveLink',
        linkData: linkData,
        authToken: result.authToken
      });

      if (response && response.success) {
        // Show success toast with confirmation
        showToast('✓ Link saved successfully!', 'success', 3000);

        // Clear form
        linkForm.reset();
        tagCounter.textContent = '0/5 tags';

        // Close popup after a short delay to show the confirmation
        setTimeout(() => window.close(), 2000);
      } else {
        throw new Error(response?.error || 'Failed to save link. Please try again.');
      }
    } catch (error) {
      console.error('Error saving link:', error);

      // Format and display error
      const formattedError = formatErrorMessage(error);

      // Build error message with title and description
      let errorMessage = `<strong>${formattedError.title}</strong><br>${formattedError.description}`;
      if (formattedError.url) {
        // Truncate long URLs
        const displayUrl = formattedError.url.length > 50
          ? formattedError.url.substring(0, 47) + '...'
          : formattedError.url;
        errorMessage += `<br><code style="display: block; margin-top: 6px; padding: 6px 8px; background: rgba(0,0,0,0.05); border-radius: 4px; font-size: 11px; word-break: break-all;">${displayUrl}</code>`;
      }

      // Show error toast - don't auto-close so user can see the error
      showToast(errorMessage, 'error', 0);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Link';
    }
  });

  // Function to load user's boards
  async function loadBoards(authToken) {
    try {
      console.log('Loading boards with token:', authToken ? 'present' : 'missing');
      const response = await chrome.runtime.sendMessage({
        action: 'getBoards',
        authToken: authToken
      });

      console.log('Boards response:', response);

      if (response && response.success && response.boards) {
        allBoards = response.boards;
        filteredBoards = allBoards;

        if (allBoards.length === 0) {
          // Show message if no boards exist
          boardCombobox.placeholder = 'No boards available - create one first';
          boardCombobox.disabled = true;

          // Show form but inform user to create a board
          statusDiv.innerHTML = '<p style="color: #64748b;">No boards found. Create a board first on Stashed.in.</p>';
          linkForm.style.display = 'block';
        } else {
          // Show the form
          statusDiv.style.display = 'none';
          linkForm.style.display = 'block';
          
          // Pre-select the most recent board if available
          const firstRecentBoard = allBoards.find(b => recentBoardIds.includes(b.id));
          if (firstRecentBoard) {
            selectBoard(firstRecentBoard);
          } else {
            // Otherwise select the first board
            selectBoard(allBoards[0]);
          }
        }
      } else {
        console.error('Boards response was not successful:', response);
        throw new Error(response?.error || 'Failed to load boards');
      }
    } catch (error) {
      console.error('Error loading boards:', error);
      const formattedError = formatErrorMessage(error);
      showToast(`<strong>${formattedError.title}</strong><br>${formattedError.description}`, 'error', 0);
      authSection.style.display = 'block';
    }
  }


  // Function to get current tab metadata
  async function getTabMetadata(tab) {
    if (tab && tab.url) {
      linkUrlInput.value = tab.url;

      // Send message to content script to extract page metadata
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageMetadata' });
        if (response && response.metadata) {
          linkTitleInput.value = response.metadata.title || '';
          linkDescriptionInput.value = response.metadata.description || '';
          linkImageInput.value = response.metadata.image || '';
        }
      } catch (error) {
        // Content script not available or error, continue without metadata
        console.log('Could not get page metadata from content script:', error);
      }

      // Also fetch metadata from server for better accuracy
      setTimeout(() => {
        fetchLinkMetadata(tab.url);
      }, 300);
    }
  }
});
