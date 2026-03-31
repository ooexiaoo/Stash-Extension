// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getPageMetadata') {
    const metadata = {
      title: document.title,
      description: getMetaContent('description') || getMetaContent('og:description') || getMetaContent('twitter:description'),
      image: getMetaContent('og:image') || getMetaContent('twitter:image') || getFirstImageSrc(),
      url: window.location.href
    };

    sendResponse({ metadata: metadata });
  } else if (request.action === 'checkStashlistAuth') {
    // Check if we're on Stashed.in domain and user is authenticated
    if (window.location.hostname.includes('stashed.in') || window.location.hostname.includes('localhost')) {
      // Try to get Supabase configuration from the page (if the website exposes it)
      let detectedSupabaseUrl = null;
      let detectedSupabaseAnonKey = null;

      try {
        // Look for any script elements that might contain configuration
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          if (script.textContent && script.textContent.trim() !== '') {
            // Look for Supabase initialization patterns
            const text = script.textContent;

            // Look for Supabase URL patterns
            const urlMatches = text.match(/https:\/\/[a-z0-9-]+\.supabase\.co/g);
            if (urlMatches) {
              detectedSupabaseUrl = urlMatches[0]; // Take the first match
            }

            // Look for patterns like supabaseUrl or VITE_SUPABASE_URL
            const supabaseUrlMatches = text.match(/(supabaseUrl|VITE_SUPABASE_URL)\s*[:=]\s*["'](https:\/\/[a-z0-9-]+\.supabase\.co)["']/gi);
            if (supabaseUrlMatches) {
              // Extract the URL from the match
              const urlMatch = supabaseUrlMatches[0].match(/https:\/\/[a-z0-9-]+\.supabase\.co/);
              if (urlMatch) {
                detectedSupabaseUrl = urlMatch[0];
              }
            }

            // Look for patterns like supabaseAnonKey or VITE_SUPABASE_ANON_KEY (though unlikely to be exposed)
            const anonKeyMatches = text.match(/(supabaseAnonKey|VITE_SUPABASE_ANON_KEY)\s*[:=]\s*["']([a-zA-Z0-9._-]+)["']/gi);
            if (anonKeyMatches) {
              // Extract the key from the match (this is unlikely to work due to security)
              const keyMatch = anonKeyMatches[0].match(/["']([a-zA-Z0-9._-]+)["']/);
              if (keyMatch) {
                detectedSupabaseAnonKey = keyMatch[1];
              }
            }

            // Look for Supabase client initialization
            if (text.includes('supabase.co') && text.includes('createClient')) {
              // Extract URL from createClient calls
              const createClientMatch = text.match(/createClient\s*\(\s*["'](https:\/\/[a-z0-9-]+\.supabase\.co)["']\s*,\s*["']([^"']+)["']/i);
              if (createClientMatch) {
                detectedSupabaseUrl = createClientMatch[1];
                detectedSupabaseAnonKey = createClientMatch[2];
              }
            }
          }
        }

        // Check for any meta tags that might contain configuration
        const metaTags = document.querySelectorAll('meta');
        for (const meta of metaTags) {
          if (meta.name && meta.name.includes('supabase')) {
            if (meta.name === 'supabase-url') {
              detectedSupabaseUrl = meta.content;
            }
          }
        }

        // Check for data attributes on the body or other elements
        const bodyData = document.body.dataset;
        if (bodyData && bodyData.supabaseUrl) {
          detectedSupabaseUrl = bodyData.supabaseUrl;
        }
      } catch (e) {
        console.log('Could not extract Supabase config from page:', e);
      }

      // First, check the URL for OAuth tokens (common after OAuth redirects)
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove the '#'
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          // Also try to get the Supabase URL from localStorage
          const supabaseKeys = Object.keys(localStorage).filter(key =>
            key.startsWith('sb-') && key.includes('auth')
          );

          if (!detectedSupabaseUrl && supabaseKeys.length > 0) {
            // Extract the URL from the key name (sb-{projectId}-auth-token)
            const keyParts = supabaseKeys[0].split('-');
            if (keyParts.length >= 3) {
              const projectId = keyParts[1]; // The project ID
              detectedSupabaseUrl = `https://${projectId}.supabase.co`;
            }
          }

          sendResponse({
            authenticated: true,
            token: accessToken,
            refreshToken: refreshToken,
            user: null, // User details will be retrieved by settings.js when validating
            supabaseUrl: detectedSupabaseUrl, // Include the detected Supabase URL
            supabaseAnonKey: detectedSupabaseAnonKey // Include any detected ANON key
          });
          return; // Early return to prevent the default sendResponse
        }
      }

      // Look for Supabase session in localStorage
      const supabaseKeys = Object.keys(localStorage).filter(key =>
        key.startsWith('sb-') && key.includes('auth')
      );

      if (supabaseKeys.length > 0) {
        // Look for the most recent session data
        for (const key of supabaseKeys) {
          const sessionData = localStorage.getItem(key);
          if (sessionData) {
            try {
              const session = JSON.parse(sessionData);
              // Handle different session formats
              if (session?.currentSession?.access_token) {
                // Extract Supabase URL from the key name if not already set
                if (!detectedSupabaseUrl) {
                  const keyParts = key.split('-');
                  if (keyParts.length >= 3) {
                    const projectId = keyParts[1]; // The project ID
                    detectedSupabaseUrl = `https://${projectId}.supabase.co`;
                  }
                }

                sendResponse({
                  authenticated: true,
                  token: session.currentSession.access_token,
                  refreshToken: session.currentSession.refresh_token,
                  user: session.currentSession.user,
                  supabaseUrl: detectedSupabaseUrl,
                  supabaseAnonKey: detectedSupabaseAnonKey
                });
                return; // Early return to prevent the default sendResponse
              } else if (session?.access_token) {
                // Extract Supabase URL from the key name if not already set
                if (!detectedSupabaseUrl) {
                  const keyParts = key.split('-');
                  if (keyParts.length >= 3) {
                    const projectId = keyParts[1]; // The project ID
                    detectedSupabaseUrl = `https://${projectId}.supabase.co`;
                  }
                }

                sendResponse({
                  authenticated: true,
                  token: session.access_token,
                  refreshToken: session.refresh_token,
                  user: session.user,
                  supabaseUrl: detectedSupabaseUrl,
                  supabaseAnonKey: detectedSupabaseAnonKey
                });
                return; // Early return to prevent the default sendResponse
              }
            } catch (e) {
              console.log('Could not parse session data from key:', key, e);
            }
          }
        }
      }
    }

    sendResponse({ authenticated: false });
  }

  return true; // Keep message channel open for async response
});

// Add closing bracket for the file

// Helper function to get content from meta tags
function getMetaContent(name) {
  const metaTag = document.querySelector(`meta[name="${name}"]`) ||
                  document.querySelector(`meta[property="${name}"]`);
  return metaTag ? metaTag.getAttribute('content') : null;
}

// Helper function to get the first image from the page
function getFirstImageSrc() {
  const images = document.querySelectorAll('img');
  for (let img of images) {
    if (img.src && !img.src.includes('data:')) {
      return img.src;
    }
  }
  return null;
}