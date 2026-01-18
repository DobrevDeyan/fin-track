const fs = require('fs');
const path = require('path');

// This script uses sharp to convert SVG to PNG
// Install with: npm install sharp --save-dev

const sizes = [32, 72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = __dirname;
const svgPath = path.join(iconsDir, 'logo.svg');

async function generateIcons() {
  try {
    // Try to require sharp
    const sharp = require('sharp');
    
    console.log('🎨 Generating icons from logo.svg...\n');
    
    // Read the SVG file
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate each size
    for (const size of sizes) {
      try {
        await sharp(svgBuffer)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
        
        console.log(`✓ Generated icon-${size}x${size}.png`);
      } catch (error) {
        console.error(`✗ Failed to generate icon-${size}x${size}.png:`, error.message);
      }
    }
    
    console.log('\n✅ All icons generated successfully!');
    console.log(`📁 Icons saved to: ${iconsDir}`);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ Sharp module not found.');
      console.log('\n📦 Please install sharp first:');
      console.log('   cd frontend');
      console.log('   npm install sharp --save-dev');
      console.log('\n   Then run this script again:');
      console.log('   node public/icons/generate-all-icons.js');
      console.log('\n💡 Alternative: Use the HTML generator (icon-generator.html) in your browser.');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Check if SVG exists
if (!fs.existsSync(svgPath)) {
  console.error(`❌ SVG file not found: ${svgPath}`);
  process.exit(1);
}

generateIcons();
