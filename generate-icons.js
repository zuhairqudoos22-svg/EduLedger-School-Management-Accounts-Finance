import fs from 'fs';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makePng(width, height, isMaskable = false) {
  const rowBytes = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowBytes);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.48 : 0.42);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Deep Indigo #1E1B4B to #312E81 gradient
      let r = 30 + Math.floor((x / width) * 20);
      let g = 27 + Math.floor((y / height) * 25);
      let b = 75 + Math.floor(((x + y) / (width + height)) * 60);
      let a = 255;

      // Inner circular badge or shield
      if (dist < radius) {
        // Vibrant Indigo/Violet #4F46E5 to #6366F1
        const t = (x + y) / (width + height);
        r = Math.floor(79 + t * 20);
        g = Math.floor(70 + t * 30);
        b = Math.floor(229 + t * 26);

        // Gold coin / graduation accent in center
        if (Math.abs(dx) < width * 0.22 && Math.abs(dy) < height * 0.18) {
          r = 245; g = 158; b = 11; // Amber 500
        }
        if (Math.abs(dx) < width * 0.15 && Math.abs(dy) < height * 0.10) {
          r = 254; g = 243; b = 199; // Amber 100
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcTarget = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(crcTarget);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function makeScreenshot(width, height, isDesktop = true) {
  const rowBytes = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowBytes);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Base app slate-900 background #0f172a
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      if (isDesktop) {
        // Desktop Top Navbar (height ~60px)
        if (y < 60) {
          r = 30; g = 27; b = 75; // #1e1b4b
        }
        // Left Sidebar (width ~240px)
        else if (x < 240) {
          r = 24; g = 31; b = 54;
        }
        // Main content area
        else {
          // 4 Top KPI cards
          const inCardY = y >= 80 && y <= 200;
          if (inCardY) {
            const cardW = (width - 240 - 50) / 4;
            const cardIdx = Math.floor((x - 260) / cardW);
            const cardX = (x - 260) % cardW;
            if (cardIdx >= 0 && cardIdx < 4 && cardX > 10 && cardX < cardW - 10) {
              if (cardIdx === 0) { r = 49; g = 46; b = 129; } // Indigo card
              else if (cardIdx === 1) { r = 6; g = 78; b = 59; } // Emerald card
              else if (cardIdx === 2) { r = 120; g = 53; b = 15; } // Amber card
              else { r = 30; g = 41; b = 59; } // Slate card
            }
          }
          // Main Table or Chart Panel
          const inPanelY = y >= 230 && y <= height - 40;
          const inPanelX = x >= 260 && x <= width - 30;
          if (inPanelY && inPanelX) {
            r = 30; g = 41; b = 59; // Slate-800
          }
        }
      } else {
        // Mobile Header (height ~60px)
        if (y < 60) {
          r = 30; g = 27; b = 75;
        }
        // Mobile bottom navigation bar
        else if (y > height - 70) {
          r = 30; g = 27; b = 75;
        }
        // Mobile cards
        else {
          const cardY = y >= 80 && y <= 220;
          const cardX = x >= 24 && x <= width - 24;
          if (cardY && cardX) {
            r = 49; g = 46; b = 129;
          }
          const listY = y >= 240 && y <= height - 90;
          if (listY && cardX) {
            r = 30; g = 41; b = 59;
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
}

fs.writeFileSync('./public/pwa-192x192.png', makePng(192, 192, false));
fs.writeFileSync('./public/pwa-512x512.png', makePng(512, 512, false));
fs.writeFileSync('./public/pwa-maskable-512x512.png', makePng(512, 512, true));
fs.writeFileSync('./public/apple-touch-icon.png', makePng(180, 180, false));
fs.writeFileSync('./public/favicon.ico', makePng(32, 32, false));
fs.writeFileSync('./public/screenshot-desktop.png', makeScreenshot(1280, 720, true));
fs.writeFileSync('./public/screenshot-mobile.png', makeScreenshot(720, 1280, false));

console.log('PWA icons and screenshots created successfully');
