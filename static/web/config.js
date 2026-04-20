/**
 * API Configuration
 * Points to Render backend at https://auto-mailer-5e54.onrender.com
 */

const API_CONFIG = {
  BASE_URL: 'https://auto-mailer-5e54.onrender.com',
  TIMEOUT: 10000,
};

console.log(`[API] Using backend: ${API_CONFIG.BASE_URL}`);

/**
 * Get authorization header from stored session token
 */
function getAuthHeader() {
  const token = localStorage.getItem('auth_token');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

/**
 * Make an API call to the backend
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  const headers = {
    ...getAuthHeader(),
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

    if (response.status === 401) {
      // Clear invalid token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      return;
    }

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
function apiGet(endpoint, options = {}) {
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
