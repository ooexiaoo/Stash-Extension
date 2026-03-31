// Background script for Stashed.in extension
// Configuration - API endpoint for proxy
let API_BASE_URL = 'https://stashlist-extension-api-production.wolfr13.workers.dev';  // Deployed API endpoint (production)

// Initialize API configuration (no more Supabase config needed)
async function initializeConfig() {
  // API base URL can be configured if needed, but defaults to production
  const config = await chrome.storage.local.get(['apiBaseUrl']);
  API_BASE_URL = config.apiBaseUrl || 'https://stashlist-extension-api-production.wolfr13.workers.dev';
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Handle messages synchronously to keep message channel open
  if (request.action === 'getBoards') {
    // Don't await here - handle async internally
    (async () => {
      await initializeConfig();
      const result = await getBoards(request.authToken);
      sendResponse(result);
    })();
    return true; // Keep message channel open
  } else if (request.action === 'saveLink') {
    (async () => {
      await initializeConfig();
      const result = await saveLink(request.linkData, request.authToken);
      sendResponse(result);
    })();
    return true; // Keep message channel open
  } else if (request.action === 'fetchMetadata') {
    (async () => {
      await initializeConfig();
      const result = await fetchMetadata(request.url, request.authToken);
      sendResponse(result);
    })();
    return true; // Keep message channel open
  } else if (request.action === 'getBoardTags') {
    (async () => {
      await initializeConfig();
      const result = await getBoardTags(request.boardId, request.authToken);
      sendResponse(result);
    })();
    return true; // Keep message channel open
  } else if (request.action === 'setAuthToken') {
    chrome.storage.local.set({ authToken: request.authToken }).then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open
  } else if (request.action === 'getAuthToken') {
    chrome.storage.local.get(['authToken']).then((result) => {
      sendResponse({ success: true, authToken: result.authToken });
    });
    return true; // Keep message channel open
  } else if (request.action === 'setApiConfig') {
    const { apiBaseUrl } = request.config;
    chrome.storage.local.set({ apiBaseUrl }).then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open
  } else if (request.action === 'validateAndSetConfig') {
    sendResponse({
      success: true,
      message: 'Configuration validation not required with proxy API'
    });
    return true; // Keep message channel open
  }

  return true; // Keep message channel open for all cases
});


// Function to get user's boards from the proxy API
async function getBoards(authToken) {
  try {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Use the proxy API to get user's boards
    const response = await fetch(`${API_BASE_URL}/api/extension/boards`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      } else if (response.status === 403) {
        throw new Error('Access denied. Please check your account permissions.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to fetch boards: ${response.status} - ${errorText}`);
      }
    }

    const result = await response.json();

    // Check if the response has the expected format
    if (!result || !result.boards || !Array.isArray(result.boards)) {
      throw new Error('Invalid response format from server');
    }

    console.log(`Fetched ${result.boards.length} boards for user`);

    return {
      success: true,
      boards: result.boards
    };
  } catch (error) {
    console.error('Error fetching boards:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to save a link to the proxy API
async function saveLink(linkData, authToken) {
  try {
    // Prepare link data with proper validation
    const linkPayload = {
      ...linkData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      position: linkData.position || 0
    };

    // Validate required fields before sending
    if (!linkPayload.board_id || !linkPayload.url) {
      throw new Error('Board ID and URL are required to save a link');
    }

    // Send link data to proxy API
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${API_BASE_URL}/api/extension/links`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(linkPayload)
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
      } else if (response.status === 400) {
        const errorText = await response.text();
        throw new Error(`Invalid request: ${errorText}`);
      } else if (response.status === 403) {
        throw new Error('Access denied. You may not have permission to save to this board.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to save link: ${response.status} - ${errorText}`);
      }
    }

    const result = await response.json();

    if (!result.link) {
      throw new Error('Invalid response format from server');
    }

    console.log('Link saved successfully:', result.link.id);

    return {
      success: true,
      link: result.link
    };
  } catch (error) {
    console.error('Error saving link:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to fetch metadata for a URL
async function fetchMetadata(url, authToken) {
  try {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${API_BASE_URL}/api/extension/metadata`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch metadata: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      metadata: result.metadata || { title: null, description: null, image: null }
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return {
      success: false,
      error: error.message,
      metadata: { title: null, description: null, image: null }
    };
  }
}

// Function to get tags from a specific board
async function getBoardTags(boardId, authToken) {
  try {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${API_BASE_URL}/api/extension/board-tags?board_id=${encodeURIComponent(boardId)}`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch board tags: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      tags: result.tags || []
    };
  } catch (error) {
    console.error('Error fetching board tags:', error);
    return {
      success: false,
      error: error.message,
      tags: []
    };
  }
}


