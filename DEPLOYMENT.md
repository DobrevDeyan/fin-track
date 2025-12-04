# Firebase Hosting Deployment Guide

This guide will help you deploy your FinTrack Next.js app to Firebase Hosting.

## Prerequisites

1. Firebase CLI installed globally:
   ```bash
   npm install -g firebase-tools
   ```

2. Logged in to Firebase:
   ```bash
   firebase login
   ```

3. Firebase project initialized (already done - `fin-track-adc2c`)

## Deployment Steps

### 1. Build the Next.js App

Navigate to the frontend directory and build the app:

```bash
cd frontend
npm run build
```

This will create a static export in the `frontend/out` directory.

### 2. Deploy to Firebase Hosting

From the root directory (where `firebase.json` is located):

```bash
# Deploy only hosting
firebase deploy --only hosting

# Or deploy everything (hosting + firestore rules)
firebase deploy
```

### 3. Verify Deployment

After deployment, Firebase will provide you with a hosting URL like:
- `https://fin-track-adc2c.web.app`
- `https://fin-track-adc2c.firebaseapp.com`

## Configuration Files

### `firebase.json`
- Configured to serve static files from `frontend/out`
- All routes redirect to `index.html` for client-side routing
- Cache headers set for optimal performance

### `next.config.js`
- Configured for static export (`output: 'export'`)
- Images set to unoptimized (required for static export)
- Trailing slash enabled for Firebase Hosting compatibility

## Troubleshooting

### Build Errors
- Make sure all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run lint`

### Deployment Errors
- Verify you're logged in: `firebase login`
- Check project ID matches: `firebase use fin-track-adc2c`
- Ensure build completed successfully before deploying

### Routing Issues
- All routes should work with the rewrite rule in `firebase.json`
- If routes don't work, check that `trailingSlash: true` is set in `next.config.js`

## Continuous Deployment (Optional)

You can set up GitHub Actions or similar CI/CD to automatically deploy on push to main branch.

## Updating the Deployment

To update your deployed app:

1. Make your changes
2. Build: `cd frontend && npm run build`
3. Deploy: `firebase deploy --only hosting`

That's it! Your app will be live at your Firebase Hosting URL.
