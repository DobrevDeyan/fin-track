/**
 * App version management
 * Update this version whenever you deploy a new version to force cache refresh
 * IMPORTANT: Also update version in:
 * - manifest.json (version field)
 * - sw.js (CACHE_NAME version number)
 */
export const APP_VERSION = '2.2.0';

/**
 * Get app version from localStorage or return default
 */
export function getStoredVersion(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('app_version');
}

/**
 * Store app version in localStorage
 */
export function storeVersion(version: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('app_version', version);
}

/**
 * Check if there's a new version available
 */
export function hasNewVersion(): boolean {
  const storedVersion = getStoredVersion();
  if (!storedVersion) return false;
  return storedVersion !== APP_VERSION;
}

/**
 * Initialize version tracking
 */
export function initVersionTracking(): boolean {
  const storedVersion = getStoredVersion();
  const hasUpdate = storedVersion && storedVersion !== APP_VERSION;
  
  // Store current version
  storeVersion(APP_VERSION);
  
  return hasUpdate || false;
}
