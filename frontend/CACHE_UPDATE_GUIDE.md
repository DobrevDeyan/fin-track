# Cache Update Guide

This guide explains how to force cache refresh when you push a new version of the app.

## How It Works

The app uses a version-based cache invalidation system that:
1. Tracks the app version in localStorage
2. Detects when a new version is available
3. Shows a notification to users to update
4. Clears old caches and activates the new service worker

## Steps to Force Cache Refresh on New Version

When you deploy a new version, follow these steps:

### 1. Update App Version

Update the version in **3 places**:

#### A. `frontend/lib/app-version.ts`
```typescript
export const APP_VERSION = '2.2.1'; // Increment this
```

#### B. `frontend/public/manifest.json`
```json
{
  "version": "2.2.1"  // Update this
}
```

#### C. `frontend/public/sw.js`
```javascript
const CACHE_NAME = 'fintrack-v9'; // Increment the version number (e.g., v7 -> v8 -> v9)
```

### 2. Deploy Your Changes

Deploy the new version as usual. The app will automatically:
- Detect the version change
- Download the new service worker
- Show an update notification to users
- Clear old caches when users click "Update Now"

### 3. How Users Get Updates

#### Automatic Detection
- The app checks for updates every 10 minutes
- Updates are also checked when:
  - User returns to the tab (visibility change)
  - App loads
  - Service worker detects a new version

#### User Notification
When a new version is available, users see a toast notification:
```
New version available!
A new version of the app is ready. Click to update now.

[Update Now] [Later]
```

#### What Happens When User Clicks "Update Now"
1. New service worker is activated immediately
2. Old caches are cleared
3. Page reloads with the new version
4. All assets are fetched fresh from the server

## Manual Cache Refresh (For Development)

If you need to manually clear cache during development:

### Browser DevTools
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear storage"
4. Check "Cache storage" and "Local storage"
5. Click "Clear site data"

### Programmatic
```javascript
// In browser console
localStorage.removeItem('app_version')
caches.keys().then(names => names.forEach(name => caches.delete(name)))
location.reload()
```

## Testing Updates

### 1. Test Update Detection
1. Set `APP_VERSION` to a new version (e.g., '2.2.1')
2. Build and deploy
3. Open app in browser (with old version)
4. Wait a few seconds or refresh
5. You should see the update notification

### 2. Test Update Process
1. Click "Update Now" in the notification
2. Page should reload
3. Check console - should see cache cleanup logs
4. Verify new assets are loaded

## Troubleshooting

### Users Not Getting Updates

**Problem:** Users still see old version after deployment.

**Solutions:**
1. Make sure you updated all 3 version locations
2. Check that service worker is registered: `navigator.serviceWorker.controller`
3. Verify new service worker is downloaded: Check Network tab for `sw.js` request
4. Try hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Update Notification Not Showing

**Problem:** New version available but notification doesn't appear.

**Solutions:**
1. Check browser console for errors
2. Verify `toast` from `sonner` is working
3. Check if notification was dismissed - it won't show again
4. Try clearing localStorage and reloading

### Service Worker Not Updating

**Problem:** Service worker shows as "installed" but not "activated".

**Solutions:**
1. Close all tabs with the app open
2. Reopen the app
3. Check service worker status in DevTools > Application > Service Workers
4. Manually click "Update" button in DevTools

## Version Numbering

Use semantic versioning:
- **Major** (x.0.0): Breaking changes, major features
- **Minor** (0.x.0): New features, backwards compatible
- **Patch** (0.0.x): Bug fixes, small improvements

Example: `2.2.0` → `2.2.1` (patch), `2.3.0` (minor), `3.0.0` (major)

## Important Notes

1. **Always update all 3 version locations** - they work together
2. **Test updates in production-like environment** before deploying
3. **Don't skip waiting automatically** - let users choose when to update
4. **Monitor cache sizes** - old caches are cleaned up automatically
5. **Icons and manifest** are always fetched fresh (never cached aggressively)

## Cache Strategy

- **HTML Pages**: Never cached, always fresh
- **Static Assets** (JS/CSS): Cached, but checked for updates
- **Icons & Manifest**: Always fetched fresh from network
- **Service Worker**: Checks for updates every 10 minutes and on visibility change
