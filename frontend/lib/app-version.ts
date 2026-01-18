/**
 * App version management
 * 
 * This file reads from the central version.json file.
 * To update the version, only edit frontend/version.json
 * Then run: npm run sync-version
 */
let versionData: { version: string; cacheVersion: number };

try {
  // Try to import the version file
  versionData = require('../../version.json');
} catch {
  // Fallback if version.json doesn't exist yet
  versionData = { version: '2.2.0', cacheVersion: 8 };
}

export const APP_VERSION = versionData.version;
export const CACHE_VERSION = versionData.cacheVersion;

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
