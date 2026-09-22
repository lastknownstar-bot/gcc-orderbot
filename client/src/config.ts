/**
 * API Configuration & Base URL Resolver
 * Supports VITE_API_BASE_URL environment variable with automatic fallback to relative routing
 * or custom local storage URL (e.g. for Vercel -> Render cross-domain deployments).
 */

const STORAGE_KEY = 'gcc_api_base_url';

export const getApiBaseUrl = (): string => {
  // 1. Check Vite Environment Variable (e.g. set in Vercel project settings)
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Check localStorage for user-overridden backend URL
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem(STORAGE_KEY);
    if (customUrl && customUrl.trim() !== '') {
      return customUrl.trim().replace(/\/+$/, '');
    }
  }

  // 3. Fallback to relative routing (works when frontend is served by Express or via reverse proxy)
  return '';
};

/**
 * Builds a complete URL for an API endpoint
 * @param path e.g. '/api/orders' or 'api/orders'
 */
export const apiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

/**
 * Sets a custom backend URL in localStorage (persisted across sessions)
 */
export const setCustomApiBaseUrl = (url: string): void => {
  if (typeof window === 'undefined') return;
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, trimmed);
  }
};

export const getSavedCustomApiBaseUrl = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) || '';
};
