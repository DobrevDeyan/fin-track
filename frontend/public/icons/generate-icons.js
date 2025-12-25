const fs = require('fs');
const path = require('path');

// This script requires 'canvas' package: npm install canvas
// For now, use the HTML generator in icon-generator.html

console.log('Icon Generator Script');
console.log('====================');
console.log('');
console.log('To generate the black and white FT icons:');
console.log('1. Open icon-generator.html in your browser');
console.log('2. Click "Generate All Icons" button');
console.log('3. All icon files will be downloaded');
console.log('4. Move them to the frontend/public/icons/ directory');
console.log('');
console.log('Or use a canvas library:');
console.log('npm install canvas');
console.log('Then run this script with Node.js');

// If canvas is available, generate icons
try {
  const { createCanvas } = require('canvas');
  
  const sizes = [32, 72, 96, 128, 144, 152, 192, 384, 512];
  const iconsDir = __dirname;
  
  function drawIcon(ctx, size) {
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Black square background with slightly rounded corners
    const radius = size * 0.1;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    
    // Solid black background
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Draw "FT" text in white, centered
    ctx.fillStyle = '#FFFFFF';
    const fontSize = size * 0.35;
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FT', size / 2, size / 2);
  }
  
  sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    drawIcon(ctx, size);
    
    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(iconsDir, `icon-${size}x${size}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`✓ Generated icon-${size}x${size}.png`);
  });
  
  console.log('');
  console.log('All icons generated successfully!');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.log('Canvas module not found. Using HTML generator instead.');
  } else {
    console.error('Error:', error.message);
  }
}

