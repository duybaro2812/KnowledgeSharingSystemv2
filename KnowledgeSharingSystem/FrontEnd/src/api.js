const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const toQueryString = (query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });
  return params.toString();
};

export const apiRequest = async (path, { method = 'GET', token, body, isForm = false, query } = {}) => {
  const qs = toQueryString(query);
  const url = `${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`;
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Cannot connect API: ${url}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload?.message ? payload.message : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

export { API_BASE_URL };
