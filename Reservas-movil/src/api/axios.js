import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const DEFAULT_TIMEOUT_MS = 15000;

const encodeQuery = (params) => {
  if (!params || typeof params !== 'object') return '';
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
};

const buildUrl = (path, params) => {
  const base = (API_URL || '').replace(/\/+$/, '');
  const cleanPath = (path || '').startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}${encodeQuery(params)}`;
};

const parseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async (method, path, data, config = {}) => {
  const timeoutMs = config.timeout ?? DEFAULT_TIMEOUT_MS;
  const token = await SecureStore.getItemAsync('auth_token').catch(() => null);

  const headers = {
    'Content-Type': 'application/json',
    ...(config.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = buildUrl(path, config.params);
  const init = { method, headers };
  if (data !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(data);
  }

  try {
    const response = await Promise.race([
      fetch(url, init),
      new Promise((_, reject) =>
        setTimeout(() => {
          const timeoutError = new Error('timeout');
          timeoutError.code = 'ETIMEDOUT';
          reject(timeoutError);
        }, timeoutMs)
      ),
    ]);

    const responseData = await parseBody(response);
    const result = { data: responseData, status: response.status, headers: {} };

    if (!response.ok) {
      if (response.status === 401) {
        await SecureStore.deleteItemAsync('auth_token').catch(() => null);
      }
      const error = new Error(
        (responseData && typeof responseData === 'object' && responseData.message) || `HTTP ${response.status}`
      );
      error.response = { status: response.status, data: responseData };
      error.__where = `api ${method} ${url}`;
      throw error;
    }

    return result;
  } catch (error) {
    if (error && typeof error === 'object' && !error.__where) {
      error.__where = `api ${method} ${url}`;
    }
    throw error;
  }
};

const api = {
  get: (path, config) => request('GET', path, undefined, config),
  post: (path, data, config) => request('POST', path, data, config),
  put: (path, data, config) => request('PUT', path, data, config),
  delete: (path, config) => request('DELETE', path, undefined, config),
};

export default api;
