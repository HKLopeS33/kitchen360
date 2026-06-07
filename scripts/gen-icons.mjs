import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });

// Ícone: prato com folha — cores da marca (verde #2D5016 / verde claro #6BA534)
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2D5016"/>
  <circle cx="256" cy="256" r="150" fill="#f7f5f0"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#6BA534" stroke-width="14"/>
  <path d="M256 150c64 0 96 48 96 106 0 64-43 106-96 106s-96-42-96-106c0-58 32-106 96-106z" fill="#6BA534"/>
  <path d="M256 150v212" stroke="#2D5016" stroke-width="10" stroke-linecap="round"/>
  <path d="M256 196c34 18 50 50 50 84M256 196c-34 18-50 50-50 84" stroke="#2D5016" stroke-width="8" fill="none" stroke-linecap="round"/>
</svg>`;

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  console.log(`gerado icon-${size}.png`);
}

// Ícone "maskable" com mais respiro nas bordas (safe zone ~ 80%)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2D5016"/>
  <circle cx="256" cy="256" r="120" fill="#f7f5f0"/>
  <circle cx="256" cy="256" r="120" fill="none" stroke="#6BA534" stroke-width="12"/>
  <path d="M256 176c52 0 78 38 78 84 0 52-35 84-78 84s-78-32-78-84c0-46 26-84 78-84z" fill="#6BA534"/>
  <path d="M256 176v168" stroke="#2D5016" stroke-width="8" stroke-linecap="round"/>
</svg>`;

await sharp(Buffer.from(maskableSvg))
  .resize(512, 512)
  .png()
  .toFile('public/icons/icon-maskable-512.png');
console.log('gerado icon-maskable-512.png');
