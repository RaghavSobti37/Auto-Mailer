/**
 * API Configuration
 * Loads configuration from environment variables and backend
 * NEVER hardcode sensitive values in this file
 */

// Default to environment variables (set in Vercel/build)
// Falls back to localhost for local development
let API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  API_KEY: process.env.REACT_APP_API_KEY || 'dev-key-for-local-only',
  TIMEOUT: 10000,
};

// Override with runtime environment if available
if (typeof window !== 'undefined') {
  if (window.__API_CONFIG__) {
    API_CONFIG = { ...API_CONFIG, ...window.__API_CONFIG__ };
  }
}

console.log(`[API Config] Using API: ${API_CONFIG.BASE_URL}`);

/**
 * Make an authenticated API call
 * Automatically prepends the base URL and adds auth header
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  const headers = {
    'X-API-Key': API_CONFIG.API_KEY,
    ...options.headers,
  };

  // Only add Content-Type if not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error(`API Call Failed: ${endpoint}`, error);
    throw error;
  }
}

/**
 * Helper: GET request
 */
function apiGet(endpoint, data = null, options = {}) {
  return apiCall(endpoint, {
    method: 'GET',
    ...options,
  });
}

/**
 * Helper: POST request
 */
function apiPost(endpoint, data = {}, options = {}) {
  const body = data instanceof FormData ? data : JSON.stringify(data);
  return apiCall(endpoint, {
    method: 'POST',
    body,
    ...options,
  });
}

/**
 * Helper: PUT request
 */
function apiPut(endpoint, data = {}, options = {}) {
  const body = data instanceof FormData ? data : JSON.stringify(data);
  return apiCall(endpoint, {
    method: 'PUT',
    body,
    ...options,
  });
}

/**
 * Helper: DELETE request
 */
function apiDelete(endpoint, options = {}) {
  return apiCall(endpoint, {
    method: 'DELETE',
    ...options,
  });
}
