#!/usr/bin/env node

/**
 * Version Sync Script
 * 
 * This script reads from version.json and updates all version references:
 * - manifest.json
 * - sw.js
 * 
 * Run: node scripts/sync-versions.js
 * Or: npm run sync-version
 */

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join(__dirname, '../version.json');
const MANIFEST_FILE = path.join(__dirname, '../public/manifest.json');
const SW_FILE = path.join(__dirname, '../public/sw.js');

// Read version.json and auto-increment cacheVersion on every build
const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
const { version } = versionData;
const cacheVersion = (versionData.cacheVersion || 0) + 1;

// Write incremented cacheVersion back to version.json
versionData.cacheVersion = cacheVersion;
fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2) + '\n');

console.log(`🔄 Syncing version ${version} (cache v${cacheVersion} — auto-incremented)...\n`);

// Update manifest.json
if (fs.existsSync(MANIFEST_FILE)) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  // Use full semantic version in manifest
  manifest.version = version;
  
  // Add/update cache-busting query parameter to all icon URLs
  // This forces browsers to fetch new icons when version changes
  const cacheBuster = `?v=${version}`;

  // Helper to update icon src with new version (replaces existing version param)
  const updateIconSrc = (src) => {
    if (!src) return src;
    // Remove existing query params and add new cache buster
    const basePath = src.split('?')[0];
    return basePath + cacheBuster;
  };

  if (manifest.icons && Array.isArray(manifest.icons)) {
    manifest.icons = manifest.icons.map(icon => {
      icon.src = updateIconSrc(icon.src);
      return icon;
    });
  }

  // Update shortcuts icons too
  if (manifest.shortcuts && Array.isArray(manifest.shortcuts)) {
    manifest.shortcuts = manifest.shortcuts.map(shortcut => {
      if (shortcut.icons && Array.isArray(shortcut.icons)) {
        shortcut.icons = shortcut.icons.map(icon => {
          icon.src = updateIconSrc(icon.src);
          return icon;
        });
      }
      return shortcut;
    });
  }
  
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✓ Updated manifest.json: version = ${version} (icons with cache busting)`);
} else {
  console.warn(`⚠ manifest.json not found at ${MANIFEST_FILE}`);
}

// Update sw.js
if (fs.existsSync(SW_FILE)) {
  let swContent = fs.readFileSync(SW_FILE, 'utf8');
  
  // Update CACHE_NAME version
  const cacheNamePattern = /const CACHE_NAME = ['"]fintrack-v\d+['"]/;
  if (cacheNamePattern.test(swContent)) {
    swContent = swContent.replace(
      cacheNamePattern,
      `const CACHE_NAME = 'fintrack-v${cacheVersion}'`
    );
    console.log(`✓ Updated sw.js: CACHE_NAME = fintrack-v${cacheVersion}`);
  } else {
    console.warn('⚠ Could not find CACHE_NAME pattern in sw.js');
  }
  
  // Update version comment
  const versionCommentPattern = /\/\/ IMPORTANT: Update this version in both sw.js and app-version.ts when deploying a new version/;
  if (versionCommentPattern.test(swContent)) {
    swContent = swContent.replace(
      versionCommentPattern,
      `// IMPORTANT: Version is synced from version.json. Run: npm run sync-version`
    );
  }
  
  fs.writeFileSync(SW_FILE, swContent);
} else {
  console.warn(`⚠ sw.js not found at ${SW_FILE}`);
}

// Update app-version.ts comment
const APP_VERSION_FILE = path.join(__dirname, '../lib/app-version.ts');
if (fs.existsSync(APP_VERSION_FILE)) {
  let appVersionContent = fs.readFileSync(APP_VERSION_FILE, 'utf8');

  const commentPattern = /\/\*\*[\s\S]*?IMPORTANT:.*?\*\//;
  const newComment = `/**
 * App version management
 *
 * This file reads from the central version.json file.
 * To update the version, only edit frontend/version.json
 */`;

  if (commentPattern.test(appVersionContent)) {
    appVersionContent = appVersionContent.replace(commentPattern, newComment);
    fs.writeFileSync(APP_VERSION_FILE, appVersionContent);
    console.log(`✓ Updated app-version.ts comment`);
  }
}

// Update layout.tsx icon cache busting (both href= and url: patterns)
const LAYOUT_FILE = path.join(__dirname, '../app/layout.tsx');
if (fs.existsSync(LAYOUT_FILE)) {
  let layoutContent = fs.readFileSync(LAYOUT_FILE, 'utf8');
  let updated = false;

  // Update href="/icons/..." pattern (apple-touch-icons in head)
  const hrefPattern = /href="(\/icons\/icon-[^"]+\.png)(\?v=[^"]*)?"/g;
  const afterHref = layoutContent.replace(hrefPattern, `href="$1?v=${version}"`);
  if (afterHref !== layoutContent) {
    layoutContent = afterHref;
    updated = true;
  }

  // Update url: "/icons/..." pattern (metadata icons object)
  const urlPattern = /url: "(\/icons\/icon-[^"]+\.png)(\?v=[^"]*)?"/g;
  const afterUrl = layoutContent.replace(urlPattern, `url: "$1?v=${version}"`);
  if (afterUrl !== layoutContent) {
    layoutContent = afterUrl;
    updated = true;
  }

  // Update shortcut: "/icons/..." pattern
  const shortcutPattern = /shortcut: "(\/icons\/icon-[^"]+\.png)(\?v=[^"]*)?"/g;
  const afterShortcut = layoutContent.replace(shortcutPattern, `shortcut: "$1?v=${version}"`);
  if (afterShortcut !== layoutContent) {
    layoutContent = afterShortcut;
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(LAYOUT_FILE, layoutContent);
    console.log(`✓ Updated layout.tsx: all icon references with ?v=${version}`);
  }
}

console.log(`\n✅ Version sync complete!`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Update version in: frontend/version.json`);
console.log(`   2. Run: npm run sync-version`);
console.log(`   3. Commit and deploy\n`);
