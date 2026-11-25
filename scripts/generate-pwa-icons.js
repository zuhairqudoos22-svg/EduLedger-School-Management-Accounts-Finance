import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="50%" stop-color="#3730A3" />
      <stop offset="100%" stop-color="#1E1B4B" />
    </linearGradient>
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="40%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="capTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F1F5F9" />
    </linearGradient>
    <linearGradient id="capBottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E0E7FF" />
      <stop offset="100%" stop-color="#C7D2FE" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0F172A" flood-opacity="0.4" />
    </filter>
    <filter id="coinShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#0F172A" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Background Squircle with smooth rx="116" -->
  <rect width="512" height="512" rx="116" fill="url(#bgGrad)"/>
  
  <!-- Outer subtle circular orbit/accent line -->
  <circle cx="256" cy="256" r="192" stroke="rgba(255,255,255,0.15)" stroke-width="5" fill="none" stroke-dasharray="8 8" />

  <!-- Graduation Cap (School) -->
  <g filter="url(#shadow)">
    <!-- Cap Underbody -->
    <path d="M168 215 V276 C168 318 256 348 256 348 C256 348 344 318 344 276 V215 L256 261 Z" fill="url(#capBottomGrad)" />
    <!-- Cap Top Diamond -->
    <path d="M256 122 L392 192 L256 262 L120 192 Z" fill="url(#capTopGrad)" stroke="#FFFFFF" stroke-width="1.5" />
    <!-- Cap Top Button -->
    <ellipse cx="256" cy="192" rx="7" ry="4" fill="#E2E8F0" />
    <!-- Tassel Cord & Button -->
    <path d="M368 200 V292" stroke="#F59E0B" stroke-width="8" stroke-linecap="round" />
    <circle cx="368" cy="298" r="8" fill="#F59E0B" />
  </g>

  <!-- Growth Chart Bars in Green -->
  <g>
    <rect x="178" y="358" width="22" height="52" rx="6" fill="url(#barGrad)" />
    <rect x="212" y="332" width="22" height="78" rx="6" fill="url(#barGrad)" />
    <rect x="246" y="306" width="22" height="104" rx="6" fill="url(#barGrad)" />
  </g>

  <!-- Financial Coin Badge (Accounts & Finance) -->
  <g filter="url(#coinShadow)">
    <circle cx="360" cy="355" r="76" fill="url(#coinGrad)" stroke="#FFFFFF" stroke-width="8" />
    <circle cx="360" cy="355" r="66" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
    <!-- Centered Currency Dollar Symbol -->
    <text x="360" y="380" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="72" font-weight="900" fill="#78350F" text-anchor="middle">$</text>
  </g>
</svg>`;

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="50%" stop-color="#3730A3" />
      <stop offset="100%" stop-color="#1E1B4B" />
    </linearGradient>
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="40%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="capTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F1F5F9" />
    </linearGradient>
    <linearGradient id="capBottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E0E7FF" />
      <stop offset="100%" stop-color="#C7D2FE" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0F172A" flood-opacity="0.4" />
    </filter>
    <filter id="coinShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#0F172A" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Full-bleed background for maskable adaptive icons -->
  <rect width="512" height="512" fill="url(#bgGrad)"/>
  
  <!-- Outer subtle circular orbit/accent line centered in safe zone -->
  <circle cx="256" cy="256" r="165" stroke="rgba(255,255,255,0.15)" stroke-width="4.5" fill="none" stroke-dasharray="7 7" />

  <!-- Sized slightly inside 80% safe zone (scale ~0.86 centered around 256, 256) -->
  <g transform="translate(36, 36) scale(0.86)">
    <!-- Graduation Cap (School) -->
    <g filter="url(#shadow)">
      <path d="M168 215 V276 C168 318 256 348 256 348 C256 348 344 318 344 276 V215 L256 261 Z" fill="url(#capBottomGrad)" />
      <path d="M256 122 L392 192 L256 262 L120 192 Z" fill="url(#capTopGrad)" stroke="#FFFFFF" stroke-width="1.5" />
      <ellipse cx="256" cy="192" rx="7" ry="4" fill="#E2E8F0" />
      <path d="M368 200 V292" stroke="#F59E0B" stroke-width="8" stroke-linecap="round" />
      <circle cx="368" cy="298" r="8" fill="#F59E0B" />
    </g>

    <!-- Growth Chart Bars in Green -->
    <g>
      <rect x="178" y="358" width="22" height="52" rx="6" fill="url(#barGrad)" />
      <rect x="212" y="332" width="22" height="78" rx="6" fill="url(#barGrad)" />
      <rect x="246" y="306" width="22" height="104" rx="6" fill="url(#barGrad)" />
    </g>

    <!-- Financial Coin Badge (Accounts & Finance) -->
    <g filter="url(#coinShadow)">
      <circle cx="360" cy="355" r="76" fill="url(#coinGrad)" stroke="#FFFFFF" stroke-width="8" />
      <circle cx="360" cy="355" r="66" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
      <text x="360" y="380" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="72" font-weight="900" fill="#78350F" text-anchor="middle">$</text>
    </g>
  </g>
</svg>`;

async function generateIcons() {
  console.log('Generating PWA Icons from verified SVG vector source...');

  // 1. Update public/icon.svg
  fs.writeFileSync('public/icon.svg', standardSvg.trim() + '\n');
  console.log('Updated public/icon.svg');

  // 2. Generate public/pwa-512x512.png (purpose: "any")
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile('public/pwa-512x512.png');
  console.log('Generated public/pwa-512x512.png (512x512)');

  // 3. Generate public/pwa-192x192.png (purpose: "any")
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile('public/pwa-192x192.png');
  console.log('Generated public/pwa-192x192.png (192x192)');

  // 4. Generate public/pwa-maskable-512x512.png (purpose: "maskable" with full bleed and safe-zone margin)
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile('public/pwa-maskable-512x512.png');
  console.log('Generated public/pwa-maskable-512x512.png (512x512 maskable)');

  // 5. Generate public/apple-touch-icon.png (180x180 for iOS Safari home screen)
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile('public/apple-touch-icon.png');
  console.log('Generated public/apple-touch-icon.png (180x180)');

  // 6. Generate public/favicon.ico (32x32 PNG icon recognized by browsers)
  await sharp(Buffer.from(standardSvg))
    .resize(32, 32)
    .png({ compressionLevel: 9 })
    .toFile('public/favicon.ico');
  console.log('Generated public/favicon.ico (32x32)');

  console.log('All PWA application icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
