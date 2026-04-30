const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000);

const toQueryString = (query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });
  return params.toString();
};

export const apiRequest = async (
  path,
  { method = 'GET', token, body, isForm = false, query, timeoutMs = API_TIMEOUT_MS } = {},
) => {
  const qs = toQueryString(query);
  const url = `${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`;
  const headers = {};
  const controller = new AbortController();
  const requestTimeoutMs = Number(timeoutMs) > 0 ? Number(timeoutMs) : API_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    headers['X-Request-Id'] = crypto.randomUUID();
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new Error(`Request timeout (${requestTimeoutMs}ms): ${url}`);
    }
    throw new Error(`Cannot connect API: ${url}`);
  }
  clearTimeout(timeoutId);

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message = typeof payload === 'object' && payload?.message ? payload.message : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

export { API_BASE_URL, API_ORIGIN, API_TIMEOUT_MS };
