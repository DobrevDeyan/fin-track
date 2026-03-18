# Authentication Flow & PWA Setup Audit

**Date**: 2026-03-18
**Status**: ✅ PASSING with Minor Recommendations
**TypeScript**: ✅ No Errors
**Overall Grade**: B+ (Professional, but has optimization opportunities)

---

## Executive Summary

Your authentication flow is **functionally correct** and **secure**. The PWA setup is **professionally implemented**. However, there are **sequence inconsistencies** and **potential UX issues** that could affect mobile/desktop users, particularly around redirects and race conditions.

---

## 1. Entry Point Analysis

### 1.1 Root Landing Page (`/`)

**File**: `frontend/app/(marketing)/page.tsx`

✅ **Strengths**:
- Auto-redirects authenticated users to `/dashboard`
- Supports `?landing` query param for authenticated users to view landing page
- Shows loading spinner during auth check
- Handles hash navigation for anchor links

⚠️ **Issues**:

1. **Race Condition Gap** (Line 86):
```typescript
if (!showLanding && (loading || redirecting || !!user)) {
  return <loading screen>
}
```
**Problem**: There's a **one-render gap** where `loading=false`, `redirecting=false`, but `user=<User>` exists. The comment acknowledges this but doesn't fully prevent hero animations from briefly appearing.

**Impact**: On slow devices or PWA launch from home screen, users might see a **flash of landing page** before redirect.

2. **Hard Redirect** (Line 59):
```typescript
window.location.href = "/dashboard"
```
**Problem**: Uses full page reload instead of Next.js router navigation. This:
- Loses React state
- Requires full page re-render
- Interrupts service worker cache
- Slower than client-side navigation

**Recommendation**: Use Next.js router for authenticated users:
```typescript
import { useRouter } from "next/navigation"
const router = useRouter()
// Then:
router.push("/dashboard")
```

---

### 1.2 Login Page (`/auth/login`)

**File**: `frontend/app/auth/login/page.tsx`

✅ **Strengths**:
- Comprehensive form validation (email regex, required fields)
- Real-time error clearing on input change
- Accessible error messages
- Google OAuth integration
- "Back to Home" link for easy navigation
- Redirects authenticated users (lines 25-29)

✅ **Security**:
- No password exposed in state logs
- Error messages use localization (i18n)
- Proper error handling for Firebase Auth

⚠️ **Issue**:

**Mixed Navigation Methods** (Lines 27, 71, 88):
```typescript
useEffect(() => {
  if (!authLoading && user) {
    router.push("/dashboard");  // ✅ Client-side navigation
  }
}, [user, authLoading, router]);

// But then:
await signIn(email, password);
router.push("/dashboard");  // ⚠️ Race with useEffect
```

**Problem**: The `useEffect` will ALSO trigger when `user` updates after `signIn()`. This means:
1. `signIn()` completes → `user` becomes truthy
2. `router.push("/dashboard")` executes (line 71)
3. Component re-renders with `user` set
4. `useEffect` triggers → ANOTHER `router.push("/dashboard")` (line 27)

**Impact**: **Double navigation** can cause:
- Router history pollution
- Confusion in browser back button
- Potential state inconsistencies

**Recommendation**: Remove manual `router.push()` from `handleSubmit` and rely ONLY on the `useEffect` redirect:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // ... validation ...
  setLoading(true);
  try {
    await signIn(email, password);
    // ❌ Remove this line - let useEffect handle redirect
    // router.push("/dashboard");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("signInError");
    setError(message);
  } finally {
    setLoading(false);
  }
};
```

---

### 1.3 Register Page (`/auth/register`)

**File**: `frontend/app/auth/register/page.tsx`

✅ **Strengths**:
- Password confirmation validation
- Minimum 6 character password requirement
- Real-time password match checking (lines 174-178)
- Same redirect pattern as login

⚠️ **Same Issues as Login**:
1. Double navigation (useEffect + manual router.push)
2. Google sign-in comment mentions redirect (line 111) but code doesn't handle OAuth redirect flow

---

### 1.4 Forgot Password Page

**File**: `frontend/app/auth/forgot-password/page.tsx`

✅ **Strengths**:
- Success state with clear instructions
- Proper error handling
- Email validation
- "Back to Login" link

✅ **No Issues**: This page is correctly implemented.

---

## 2. Authentication Context Analysis

### 2.1 AuthProvider & AuthContext

**File**: `frontend/contexts/AuthContext.tsx`

✅ **Strengths**:
- Centralized auth state management
- Auto-creates Firestore user documents on sign-up/sign-in
- Session timeout with warning (30 min inactivity)
- Proper Firebase Auth state listener
- Error message localization

⚠️ **Critical Issues**:

### **Issue #1: Hard Redirects in Context** (Lines 100, 173, 180)

```typescript
const logout = async () => {
  try {
    await signOut(auth);
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.location.href = "/auth/login";  // ⚠️ HARD REDIRECT
      }, 100);
    }
  }
}

// Session timeout
onTimeout: async () => {
  await signOut(auth);
  window.location.href = "/auth/login";  // ⚠️ HARD REDIRECT
}
```

**Problem**:
- Context should NOT handle navigation - that's a **separation of concerns violation**
- Using `window.location.href` forces **full page reload**
- The 100ms timeout is a **hack** to wait for auth state - race condition prone

**Impact on PWA**:
- **Home screen launch**: User opens PWA → sees flash → hard redirect → loses instant-feel
- **Service worker**: Hard reload bypasses client-side routing, forcing network fetch
- **State loss**: Any in-memory state (form inputs, scroll position) is lost

**Recommendation**:
```typescript
// ❌ Remove navigation from context
// ✅ Let components/pages handle redirects via useEffect watching user state

const logout = async () => {
  await signOut(auth);
  // Just sign out - let the component handle redirect
};
```

Then in components:
```typescript
const { user } = useAuth();
const router = useRouter();

useEffect(() => {
  if (!user) {
    router.push("/auth/login");
  }
}, [user, router]);
```

### **Issue #2: AuthProvider Delays Children Render** (Line 197)

```typescript
return (
  <AuthContext.Provider value={value}>
    {!loading && children}  // ⚠️ Blocks ALL rendering
  </AuthContext.Provider>
);
```

**Problem**:
- If Firebase auth takes 2-3 seconds to initialize (common on slow mobile), the **entire app shows blank screen**
- No loading indicator shown during this time
- PWA users expect **instant UI** on home screen launch

**Impact**:
- **Poor perceived performance** on PWA launch
- Users think app is broken/frozen
- Violates PWA best practice of "app shell" instant load

**Recommendation**:
```typescript
return (
  <AuthContext.Provider value={value}>
    {children}  {/* ✅ Always render - let pages handle loading */}
  </AuthContext.Provider>
);
```

Each page can then show its own loading state:
```typescript
const { user, loading } = useAuth();

if (loading) {
  return <LoadingSpinner />;
}
```

---

## 3. Route Protection Analysis

### 3.1 AuthGuard Component

**File**: `frontend/components/auth/AuthGuard.tsx`

✅ **Strengths**:
- Mounted state check prevents hydration mismatch
- Loading state handled
- Redirects unauthenticated users

⚠️ **Issues**:

### **Issue #1: Hard Redirect Again** (Line 21)

```typescript
useEffect(() => {
  if (typeof window === "undefined") return
  if (!authLoading && !user) {
    window.location.href = "/auth/login"  // ⚠️ HARD REDIRECT
  }
}, [user, authLoading])
```

**Same problems** as before - use Next.js router.

### **Issue #2: No Return Path Preservation**

**Problem**: When user is redirected to login, there's **no mechanism to return to the original page** after authentication.

**Example**:
1. User clicks `/reports` from external link
2. Not authenticated → redirected to `/auth/login`
3. User logs in → sent to `/dashboard`
4. **User wanted `/reports`, not `/dashboard`**

**Recommendation**: Add return URL parameter:
```typescript
useEffect(() => {
  if (!authLoading && !user) {
    const returnUrl = encodeURIComponent(window.location.pathname);
    router.push(`/auth/login?returnUrl=${returnUrl}`);
  }
}, [user, authLoading, router]);
```

Then in login page after successful auth:
```typescript
const searchParams = useSearchParams();
const returnUrl = searchParams.get('returnUrl') || '/dashboard';
router.push(returnUrl);
```

---

### 3.2 App Layout Protection

**File**: `frontend/app/(app)/layout.tsx`

✅ **Strengths**:
- Clean route group pattern
- AuthGuard wraps all protected routes
- Includes AppNavbar for consistent navigation

✅ **No Issues**: Well-structured.

---

### 3.3 Dashboard Page

**File**: `frontend/app/(app)/dashboard/page.tsx`

✅ **Strengths**:
- Early return `if (!user)` prevents rendering before auth
- Wraps content in `DashboardProvider` for state management
- Handles Stripe checkout success redirect
- Onboarding flow for new users

⚠️ **Minor Issue**:

**Empty Render on No User** (Line 328):
```typescript
if (!user) {
  return null;  // ⚠️ Renders nothing
}
```

**Better**:
```typescript
if (!user) {
  return <LoadingSpinner />; // Show loader instead of blank
}
```

---

## 4. PWA Configuration Analysis

### 4.1 Manifest Configuration

**File**: `frontend/public/manifest.json`

✅ **Strengths**:
- Comprehensive icon sizes (72px → 512px)
- `purpose: "any maskable"` for adaptive icons on Android
- **Critical**: `start_url: "/dashboard"` - PWA launches directly to dashboard
- Categories, screenshots, shortcuts all present
- Orientation set to `portrait-primary` for mobile

✅ **Professional Setup**: No issues.

---

### 4.2 Service Worker Registration

**File**: `frontend/app/register-sw.tsx`

✅ **Strengths**:
- Only registers in production
- `updateViaCache: "none"` prevents stale SW
- Periodic update checks (every 10 min)
- Visibility-based update checks (when tab refocused)
- User-controlled updates (toast notification)
- Version tracking with cache invalidation

✅ **Excellent Implementation**: Industry-standard PWA practices.

---

### 4.3 Service Worker Logic

**File**: `frontend/public/sw.js`

✅ **Strengths**:
- Cache versioning (`CACHE_NAME = 'fintrack-v13'`)
- Pre-cache critical app shell (/, /dashboard/, manifest, icons)
- Stale-while-revalidate for static assets
- Network-first for navigation (HTML pages)
- Offline fallback to cached home page
- Icon/manifest cache invalidation on activate
- Skips non-GET and non-HTTP requests

⚠️ **Potential Issue**:

### **Offline Navigation Fallback** (Lines 63-74)

```typescript
if (request.mode === 'navigate') {
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to cached home page
            return caches.match('/')
              .then(response => response || caches.match('/dashboard'));
          });
      })
  );
}
```

**Problem**:
- User navigates to `/reports` while offline
- `/reports` not in cache → fallback to `/` (home)
- But home page (`/`) redirects authenticated users to `/dashboard`
- Result: **Confusing redirect chain while offline**

**Better Approach**:
```typescript
// Fallback to a dedicated offline page
return caches.match('/offline.html')
  .then(response => response || caches.match('/dashboard'));
```

Then create `frontend/public/offline.html` with friendly offline message.

---

### 4.4 Install Prompt

**File**: `frontend/components/InstallPrompt.tsx`

✅ **Strengths**:
- Detects if already installed via `display-mode: standalone`
- Captures `beforeinstallprompt` event
- Custom UI instead of browser default
- localStorage persistence for dismissal
- Handles `appinstalled` event
- Clean, accessible UI

✅ **No Issues**: Excellent implementation.

---

## 5. PWA Launch & Redirect Flow Analysis

### Scenario 1: **User Installs PWA, Opens from Home Screen (Mobile)**

**Expected Flow**:
1. User taps PWA icon on home screen
2. App opens to `/dashboard` (from `manifest.json` `start_url`)
3. Service worker serves cached app shell instantly
4. AuthGuard checks auth state
5. If authenticated → shows dashboard
6. If not authenticated → redirects to `/auth/login`

**Current Behavior**:
1. ✅ App opens to `/dashboard`
2. ✅ Service worker serves cache
3. ✅ AuthGuard checks auth
4. ⚠️ **Hard redirect to `/auth/login`** (full page reload)
5. ⚠️ User sees **flash/stutter** - not smooth

**Issue**: The hard redirect (`window.location.href`) **breaks the instant-feeling** that PWAs should provide.

---

### Scenario 2: **User Opens PWA, Already Logged In**

**Expected Flow**:
1. User taps PWA icon
2. App opens to `/dashboard`
3. Service worker serves cache
4. Dashboard renders immediately (app shell)
5. Data loads from Firebase in background

**Current Behavior**:
1. ✅ App opens to `/dashboard`
2. ✅ Service worker serves cache
3. ⚠️ **Blank screen** while `AuthProvider` checks auth (line 197: `{!loading && children}`)
4. ⚠️ Once `loading=false`, dashboard renders
5. ✅ Data loads

**Issue**: The **blank screen delay** violates PWA instant-load principle.

---

### Scenario 3: **User Logs Out**

**Current Behavior**:
1. User clicks logout
2. `AuthContext.logout()` runs
3. ⚠️ **Hard redirect after 100ms** (line 173)
4. ⚠️ Full page reload to `/auth/login`
5. User sees loading spinner, then login page

**Issue**: Should be **smooth client-side transition**, not page reload.

---

### Scenario 4: **Session Timeout**

**Current Behavior**:
1. User inactive for 30 min
2. Warning dialog appears
3. If no response → auto-logout
4. ⚠️ **Hard redirect** (line 100)
5. ⚠️ User loses any unsaved form data

**Issue**:
- Should **save draft state** before redirect
- Should use **client-side navigation**

---

## 6. Mobile vs Desktop Behavior

### 6.1 Mobile (PWA Installed)

✅ **Working**:
- Icons display correctly (maskable)
- Splash screen appears on launch
- Standalone mode (no browser chrome)
- Orientation locked to portrait
- Install prompt shows on first visit

⚠️ **Issues**:
- **Perceived performance** hurt by hard redirects
- **Offline experience** could show confusing redirect chain
- No **pull-to-refresh** implementation

---

### 6.2 Desktop (PWA Installed)

✅ **Working**:
- Window opens in standalone mode
- Desktop shortcuts work (`/dashboard`, `/calendar`, `/reports` from manifest)
- Consistent experience with mobile

⚠️ **Issues**:
- Manifest forces `orientation: portrait-primary` - **not ideal for desktop**
- Desktop users might prefer wider layouts - should detect screen size

**Recommendation**:
```json
"orientation": "any"  // Let device decide
```

---

## 7. Critical Flaws Summary

### 🔴 **HIGH PRIORITY** (User Experience Impact)

1. **Hard Redirects Throughout App**
   - **Where**: AuthContext logout, AuthGuard, home page, login/register success
   - **Impact**: Breaks PWA instant-feel, loses state, poor UX
   - **Fix**: Use Next.js `router.push()` everywhere

2. **AuthProvider Blocks Rendering**
   - **Where**: Line 197 in `AuthContext.tsx`
   - **Impact**: Blank screen on PWA launch (2-3 sec delay)
   - **Fix**: Remove `{!loading && children}` condition, handle loading per-page

3. **Double Navigation on Login/Register**
   - **Where**: Login/register pages
   - **Impact**: Router history pollution, potential state bugs
   - **Fix**: Remove manual `router.push()` after sign-in, rely on useEffect

---

### 🟡 **MEDIUM PRIORITY** (Enhancement Opportunities)

4. **No Return URL After Login**
   - **Impact**: Users can't resume interrupted navigation
   - **Fix**: Add `?returnUrl` query param

5. **Offline Navigation Fallback Confusion**
   - **Impact**: Offline users see unexpected redirects
   - **Fix**: Add dedicated `/offline.html` page

6. **Landing Page Flash Before Redirect**
   - **Impact**: Brief visual glitch on authenticated access to `/`
   - **Fix**: Improve race condition handling in home page

7. **Orientation Locked on Desktop**
   - **Impact**: Desktop PWA users see narrow portrait layout
   - **Fix**: Set `orientation: "any"` in manifest

---

### 🟢 **LOW PRIORITY** (Polish)

8. **No Pull-to-Refresh on Mobile**
   - **Impact**: Users can't manually refresh data
   - **Fix**: Add `overscroll-behavior` CSS + gesture handler

9. **No Loading Indicator in AuthGuard Blank State**
   - **Impact**: User sees nothing during auth check
   - **Fix**: Show spinner instead of `null`

---

## 8. Recommended Fixes (Priority Order)

### **Phase 1: Critical UX Fixes** (1-2 hours)

```typescript
// 1. Fix AuthContext.tsx - Remove navigation
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        await createUserDocument(user);
      }
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    // ❌ REMOVE: window.location.href = "/auth/login";
    // Components will handle redirect via useEffect
  };

  return (
    <AuthContext.Provider value={value}>
      {children}  {/* ✅ Always render */}
    </AuthContext.Provider>
  );
}

// 2. Fix AuthGuard.tsx - Use router
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();  // ✅ Add router

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      router.push(`/auth/login?returnUrl=${returnUrl}`);  // ✅ Use router
    }
  }, [user, authLoading, mounted, router]);

  if (!mounted || authLoading) {
    return <LoadingSpinner />;  // ✅ Show spinner
  }

  if (!user) return null;

  return <>{children}</>;
}

// 3. Fix login/register - Remove duplicate redirects
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    await signIn(email, password);
    // ❌ REMOVE: router.push("/dashboard");
    // useEffect will handle redirect
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// 4. Fix login useEffect - Handle return URL
useEffect(() => {
  if (!authLoading && user) {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('returnUrl') || '/dashboard';
    router.push(decodeURIComponent(returnUrl));  // ✅ Use return URL
  }
}, [user, authLoading, router]);

// 5. Fix home page - Use router
useEffect(() => {
  if (!loading && user && !params.has("landing")) {
    setRedirecting(true);
    router.push("/dashboard");  // ✅ Use router instead of window.location.href
  }
}, [user, loading, router]);
```

---

### **Phase 2: PWA Enhancements** (30 min)

```json
// 1. Fix manifest.json
{
  "orientation": "any",  // ✅ Let device decide
}
```

```html
<!-- 2. Add frontend/public/offline.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Pocket</title>
  <style>
    body {
      font-family: system-ui;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 { color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📡 You're Offline</h1>
    <p>No internet connection. Please check your network and try again.</p>
    <button onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>
```

```javascript
// 3. Update sw.js offline fallback
if (request.mode === 'navigate') {
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return caches.match('/offline.html')  // ✅ Dedicated offline page
            .then(response => response || caches.match('/dashboard'));
        });
    })
  );
}
```

---

### **Phase 3: Polish** (1 hour)

```typescript
// 1. Add pull-to-refresh (in app layout or dashboard)
useEffect(() => {
  let startY = 0;
  const handleTouchStart = (e: TouchEvent) => {
    startY = e.touches[0].clientY;
  };
  const handleTouchMove = (e: TouchEvent) => {
    const currentY = e.touches[0].clientY;
    if (currentY > startY + 100 && window.scrollY === 0) {
      window.location.reload();  // Or call refresh function
    }
  };
  document.addEventListener('touchstart', handleTouchStart);
  document.addEventListener('touchmove', handleTouchMove);
  return () => {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
  };
}, []);
```

---

## 9. Testing Checklist

After implementing fixes, test these scenarios:

### **Desktop Browser**
- [ ] Register new account → redirects to dashboard smoothly
- [ ] Login existing user → redirects to dashboard smoothly
- [ ] Access `/reports` while logged out → redirects to login with return URL → after login, returns to `/reports`
- [ ] Logout → smooth transition to login (no page reload)
- [ ] Session timeout → shows warning → logs out smoothly

### **Mobile Browser**
- [ ] Same as desktop tests
- [ ] Install prompt appears
- [ ] Install app → opens to dashboard

### **PWA Installed (Mobile)**
- [ ] Open from home screen → instant load (no blank screen)
- [ ] Open from home screen while logged in → dashboard appears immediately
- [ ] Open from home screen while logged out → login page appears smoothly
- [ ] Use app shortcuts (`/calendar`, `/reports`) → opens correct page → if logged out, saves return URL
- [ ] Go offline → navigate to uncached page → see offline page (not error)
- [ ] Go offline → navigate to cached page → works normally

### **PWA Installed (Desktop)**
- [ ] Open window → displays properly (not narrow portrait)
- [ ] Same behavior as mobile PWA tests

---

## 10. Final Verdict

### Overall: **B+ (Professional with Optimization Needed)**

✅ **What's Great**:
- Firebase Auth integration is secure and robust
- PWA manifest and service worker are professionally configured
- Form validation and error handling are excellent
- Session timeout and security features work correctly
- Code is well-organized and TypeScript-safe

⚠️ **What Needs Work**:
- **Navigation architecture**: Mixing hard redirects with client-side routing breaks PWA feel
- **Rendering strategy**: Blocking children while auth loads creates poor UX
- **Redirect logic**: Duplicate redirects and lack of return URL preservation
- **Offline experience**: Could confuse users with redirect chains

### **Production Readiness**:
✅ **Safe to deploy** as-is (no critical bugs)
⚠️ **Recommended to fix** hard redirects before launch for optimal PWA UX
🎯 **Ideal state**: Implement Phase 1 fixes (1-2 hours) for professional-grade experience

---

## Appendix: User Journey Flowcharts

### A. Current Flow (With Issues)

```
[User Opens PWA from Home Screen]
           ↓
    start_url: /dashboard
           ↓
    Service Worker Cache Hit ✅
           ↓
    DashboardPage Mounts
           ↓
    AuthProvider loading=true
           ↓
    BLANK SCREEN (2-3 sec) ⚠️
           ↓
    Auth resolves: user=null
           ↓
    AuthGuard redirects
           ↓
    window.location.href = "/auth/login" ⚠️
           ↓
    FULL PAGE RELOAD ⚠️
           ↓
    Login page appears
```

### B. Ideal Flow (After Fixes)

```
[User Opens PWA from Home Screen]
           ↓
    start_url: /dashboard
           ↓
    Service Worker Cache Hit ✅
           ↓
    DashboardPage Mounts
           ↓
    Shows Loading Spinner ✅
           ↓
    Auth resolves: user=null
           ↓
    AuthGuard detects no user
           ↓
    router.push("/auth/login?returnUrl=/dashboard") ✅
           ↓
    SMOOTH CLIENT-SIDE TRANSITION ✅
           ↓
    Login page appears
           ↓
    User logs in
           ↓
    router.push("/dashboard") ✅
           ↓
    INSTANT DASHBOARD RENDER ✅
```

---

**End of Audit Report**

Would you like me to:
1. Implement the Phase 1 fixes automatically?
2. Create a separate testing script for all scenarios?
3. Generate a video walkthrough of the issues?
