# PWA Install Prompt Guide

## 📍 Where the Install Button Appears

The install button appears as a **floating card in the bottom-right corner** of your screen when the app is installable.

**Location**: Fixed position, bottom-right corner (`bottom-4 right-4`)

**Appearance**: 
- A card with "Install FinTrack" heading
- Description text
- "Install App" button (primary)
- "Later" button (secondary)
- Close (X) button in top-right

---

## ⏰ When You'll See the Install Button

### ✅ Conditions for Install Prompt to Appear:

1. **App meets PWA requirements**:
   - ✅ Has valid manifest.json
   - ✅ Served over HTTPS (or localhost)
   - ✅ Has service worker registered
   - ✅ Has required icons (192px, 512px)

2. **Browser supports PWA installation**:
   - ✅ Chrome/Edge (Desktop & Android)
   - ✅ Safari (iOS 16.4+)
   - ❌ Firefox (doesn't support manifest-based install)

3. **App is NOT already installed**:
   - If app is already installed, button won't show

4. **User hasn't dismissed it**:
   - If user clicks "Later" or closes it, it's stored in localStorage
   - Won't show again unless localStorage is cleared

5. **Browser fires `beforeinstallprompt` event**:
   - This event only fires when browser determines app is installable
   - Usually happens after user visits site a few times
   - May take a few seconds after page load

---

## 🧪 How to Test the Install Prompt

### Method 1: Production (Recommended)
1. **Deploy your app** to Firebase Hosting (HTTPS required)
2. **Visit the deployed site** in Chrome/Edge
3. **Wait a few seconds** - browser needs to evaluate installability
4. **Button should appear** in bottom-right corner

### Method 2: Local Development
1. **Run on localhost** (HTTPS not required for localhost)
2. **Open in Chrome/Edge**
3. **May need to visit site 2-3 times** before prompt appears
4. **Check browser console** for any errors

### Method 3: Force Show (For Testing)
You can temporarily modify the component to always show:

```tsx
// In InstallPrompt.tsx, temporarily change:
if (isInstalled || !showInstallButton) {
  return null
}
// To:
if (isInstalled) {
  return null
}
// And set showInstallButton to true initially
```

---

## 🔍 Troubleshooting: Why Button Doesn't Show

### Check These:

1. **Is app already installed?**
   - Check if app icon exists on home screen
   - If installed, button won't show

2. **Is it served over HTTPS?**
   - Required for production
   - localhost is OK for development

3. **Is service worker registered?**
   - Open DevTools → Application → Service Workers
   - Should see `/sw.js` registered

4. **Does manifest exist?**
   - Visit `/manifest.json` in browser
   - Should return valid JSON

5. **Browser support?**
   - Chrome/Edge: ✅ Full support
   - Safari (iOS 16.4+): ✅ Works
   - Firefox: ❌ Not supported

6. **User dismissed it?**
   - Check localStorage: `localStorage.getItem("installPromptDismissed")`
   - Clear it to show again: `localStorage.removeItem("installPromptDismissed")`

7. **Browser hasn't evaluated yet?**
   - May take a few page visits
   - Browser needs to determine installability
   - Try visiting site multiple times

---

## 📱 Browser Behavior

### Desktop (Chrome/Edge)
- Install button appears in **bottom-right corner** (your custom component)
- Browser may ALSO show install icon in **address bar**
- Both work - your custom button is more prominent

### Mobile (Android Chrome)
- Install button appears in **bottom-right corner**
- Browser may ALSO show install banner at **bottom of screen**
- Your custom button provides better UX

### iOS (Safari)
- `beforeinstallprompt` event **doesn't fire** on iOS
- Users must use Safari's "Add to Home Screen" manually
- Your component won't show, but that's expected

---

## 🎨 Customizing the Install Button

### Change Position
Edit `InstallPrompt.tsx`:
```tsx
// Change from bottom-right:
<div className="fixed bottom-4 right-4 z-50 max-w-sm">

// To top-right:
<div className="fixed top-4 right-4 z-50 max-w-sm">

// To bottom-center:
<div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm">
```

### Change Styling
The card uses Tailwind classes - modify as needed:
- `bg-background` - Card background
- `border rounded-lg shadow-lg` - Card styling
- `p-4 space-y-3` - Padding and spacing

---

## 💡 Best Practices

1. **Don't show immediately** - Let user explore first
2. **Show after engagement** - Maybe after 30 seconds or page interaction
3. **Respect user choice** - If dismissed, don't show again
4. **Provide value** - Explain benefits in the description
5. **Make it dismissible** - Always provide close button

---

## 🔧 Current Implementation

The component is now added to `layout.tsx`, so it will appear on **all pages** when conditions are met.

**Location in code**: `frontend/components/InstallPrompt.tsx`
**Where it's used**: `frontend/app/layout.tsx`

---

## 📊 Expected Behavior Summary

| Scenario | Will Button Show? |
|----------|-------------------|
| First visit, HTTPS, Chrome | ✅ Yes (after browser evaluation) |
| Already installed | ❌ No |
| User dismissed it | ❌ No (until localStorage cleared) |
| Firefox browser | ❌ No (not supported) |
| iOS Safari | ❌ No (event doesn't fire) |
| localhost development | ✅ Yes (after evaluation) |
| No service worker | ❌ No (not installable) |
| Invalid manifest | ❌ No (not installable) |

---

**Note**: The install prompt is a browser feature - it may take a few visits or some time before the browser determines your app is installable and fires the event. This is normal behavior!

