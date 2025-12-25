# Favicon Setup Guide

## Quick Steps to Get Your Black & White FT Favicon Working

### 1. Generate the Icons

Open `icon-generator.html` in your browser and click **"Generate All Icons"**. This will download all icon sizes including the 32x32 favicon.

### 2. Place Icons in the Correct Location

Move all downloaded icon files to: `frontend/public/icons/`

Make sure you have these files:
- ✅ icon-32x32.png (for favicon)
- ✅ icon-192x192.png (main icon)
- ✅ icon-512x512.png (high-res)

### 3. Clear Browser Cache

After generating and placing the icons:

**Chrome/Edge:**
- Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
- Select "Cached images and files"
- Click "Clear data"
- Or do a hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

**Firefox:**
- Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
- Select "Cache"
- Click "Clear Now"
- Or do a hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### 4. Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 5. Check the Favicon

1. Open your app in the browser
2. Look at the browser tab - you should see a black square with white "FT" text
3. If you still see the old icon, try:
   - Closing and reopening the browser tab
   - Opening in an incognito/private window
   - Clearing browser cache again

### Troubleshooting

**If the favicon still doesn't show:**
1. Check that `icon-32x32.png` exists in `frontend/public/icons/`
2. Verify the icon file is actually a black square with white "FT" (open it in an image viewer)
3. Check browser console for any 404 errors for icon files
4. Try accessing the icon directly: `http://localhost:3001/icons/icon-32x32.png`

**For Production:**
After deploying, the favicon should automatically work. If not, make sure all icon files are included in your build output.

