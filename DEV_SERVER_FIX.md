# Dev Server 404 Errors Fix

## 🐛 Problem

After running `npm run build`, hard refresh causes 404 errors for static chunks because:
- Build creates production files in `.next` folder
- Dev server is still running with different file hashes
- Browser requests new hashes that don't exist in dev mode

## ✅ Solution

### Option 1: Don't Build While Dev Server is Running (Recommended)

**Rule**: Never run `npm run build` while `npm run dev` is running.

**Workflow**:
1. **For Development**: Only use `npm run dev`
2. **For Production**: Stop dev server, then build

```bash
# Stop dev server (Ctrl+C)
# Then build
npm run build
```

### Option 2: Restart Dev Server After Building

If you need to build while testing:

```bash
# 1. Stop dev server (Ctrl+C)
# 2. Clean build
rmdir /s /q .next
# 3. Start dev server fresh
npm run dev
```

### Option 3: Use Separate Terminals

- **Terminal 1**: `npm run dev` (keep running)
- **Terminal 2**: `npm run build` (only when needed)

But still restart dev server after building.

---

## 🔧 Quick Fix Right Now

1. **Stop dev server**: `Ctrl+C`
2. **Clean .next folder**:
   ```bash
   rmdir /s /q .next
   ```
3. **Restart dev server**:
   ```bash
   npm run dev
   ```
4. **Hard refresh browser**: `Ctrl+Shift+R`

The 404s should be gone!

---

## 📝 Why This Happens

1. **Dev Mode**: Next.js generates files with hash `v=1764327790058`
2. **Build Mode**: Creates different files with hash `v=1764327818596`
3. **Hard Refresh**: Browser requests new hash from build
4. **Dev Server**: Still serving old hash → 404 error

**Solution**: Keep dev and build separate, or restart dev after building.

---

## ✅ Best Practice

**Development**:
- Use `npm run dev` only
- Never run `npm run build` during development
- Dev server handles everything automatically

**Production**:
- Stop dev server
- Run `npm run build`
- Deploy the build output

---

**The 404s are harmless but annoying. Just restart your dev server after building!** 🚀

