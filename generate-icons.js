import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Create a simple SVG icon for the rails game
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#2563eb"/>
  <g transform="translate(256, 256)">
    <!-- Rails tracks -->
    <line x1="-180" y1="-150" x2="180" y2="-150" stroke="white" stroke-width="12"/>
    <line x1="-180" y1="150" x2="180" y2="150" stroke="white" stroke-width="12"/>
    <line x1="-180" y1="-120" x2="-180" y2="120" stroke="white" stroke-width="8"/>
    <line x1="-120" y1="-120" x2="-120" y2="120" stroke="white" stroke-width="8"/>
    <line x1="-60" y1="-120" x2="-60" y2="120" stroke="white" stroke-width="8"/>
    <line x1="0" y1="-120" x2="0" y2="120" stroke="white" stroke-width="8"/>
    <line x1="60" y1="-120" x2="60" y2="120" stroke="white" stroke-width="8"/>
    <line x1="120" y1="-120" x2="120" y2="120" stroke="white" stroke-width="8"/>
    <line x1="180" y1="-120" x2="180" y2="120" stroke="white" stroke-width="8"/>
    <!-- Train -->
    <rect x="-80" y="-80" width="160" height="100" rx="15" fill="#fbbf24"/>
    <rect x="-70" y="-60" width="60" height="40" fill="#1e3a8a"/>
    <rect x="10" y="-60" width="60" height="40" fill="#1e3a8a"/>
    <circle cx="-50" cy="50" r="20" fill="#1f2937"/>
    <circle cx="50" cy="50" r="20" fill="#1f2937"/>
    <circle cx="-50" cy="50" r="8" fill="#6b7280"/>
    <circle cx="50" cy="50" r="8" fill="#6b7280"/>
  </g>
</svg>
`;

// Generate 192x192 icon
sharp(Buffer.from(svgIcon))
  .resize(192, 192)
  .png()
  .toFile('public/pwa-192x192.png')
  .then(() => console.log('Generated 192x192 icon'))
  .catch(err => console.error('Error generating 192x192 icon:', err));

// Generate 512x512 icon
sharp(Buffer.from(svgIcon))
  .resize(512, 512)
  .png()
  .toFile('public/pwa-512x512.png')
  .then(() => console.log('Generated 512x512 icon'))
  .catch(err => console.error('Error generating 512x512 icon:', err));
