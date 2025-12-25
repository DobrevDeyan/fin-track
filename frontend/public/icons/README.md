# PWA Icons

## Icon Design

The FinTrack app icon features a simple black square with white "FT" text, matching the MarkerKit minimalist design style.

## Generate Icons

To generate the required PWA icons:

1. Open `icon-generator.html` in your browser
2. Click "Generate All Icons" button
3. All icon files will be downloaded automatically
4. Move the downloaded PNG files to this `icons` folder

### Alternative: Node.js Script

If you have the `canvas` package installed:
```bash
npm install canvas
node generate-icons.js
```

## Required Icon Sizes

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png (main icon)
- icon-384x384.png
- icon-512x512.png

## Alternative: Use Online Tool

You can also use online PWA icon generators:
- https://www.pwabuilder.com/imageGenerator
- https://realfavicongenerator.net/

Upload a 512x512 PNG image and it will generate all required sizes.

## Custom Icon

To use your own icon:
1. Create a 512x512 PNG image with your logo
2. Use the icon generator or online tool to create all sizes
3. Replace the files in this folder

