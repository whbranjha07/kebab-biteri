import sharp from 'sharp';
import path from 'path';

const svgLogo = `<svg viewBox="0 0 512 512" width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <circle cx="256" cy="256" r="240" fill="#FFFFFF" stroke="#18181B" stroke-width="24" />
  <g transform="translate(64, 64) scale(8)">
    <path d="M24 6 L8 18 L13 18 L13 40 L35 40 L35 18 L40 18 Z" stroke="#18181B" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
    <line x1="24" y1="12" x2="24" y2="38" stroke="#18181B" stroke-width="2.5" stroke-linecap="round" />
    <path d="M17 18 C17 16.5, 31 16.5, 31 18 L29 24 L19 24 Z" fill="#E50909" />
    <path d="M18.5 25 L29.5 25 L28 31 L20 31 Z" fill="#E50909" />
    <path d="M20 32 L28 32 L26.5 37 L21.5 37 Z" fill="#E50909" />
    <path d="M24 10 Q22 13 24 15 Q26 13 24 10 Z" fill="#F4BE2C" />
  </g>
</svg>`;

const svgMaskable = `<svg viewBox="0 0 512 512" width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#FFFDF2" />
  <circle cx="256" cy="256" r="190" fill="#FFFFFF" stroke="#18181B" stroke-width="20" />
  <g transform="translate(102, 102) scale(6.4)">
    <path d="M24 6 L8 18 L13 18 L13 40 L35 40 L35 18 L40 18 Z" stroke="#18181B" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
    <line x1="24" y1="12" x2="24" y2="38" stroke="#18181B" stroke-width="2.5" stroke-linecap="round" />
    <path d="M17 18 C17 16.5, 31 16.5, 31 18 L29 24 L19 24 Z" fill="#E50909" />
    <path d="M18.5 25 L29.5 25 L28 31 L20 31 Z" fill="#E50909" />
    <path d="M20 32 L28 32 L26.5 37 L21.5 37 Z" fill="#E50909" />
    <path d="M24 10 Q22 13 24 15 Q26 13 24 10 Z" fill="#F4BE2C" />
  </g>
</svg>`;

async function generate() {
  const iconsDir = path.join(process.cwd(), 'apps/web/public/icons');
  const publicDir = path.join(process.cwd(), 'apps/web/public');

  const svgBuffer = Buffer.from(svgLogo);
  const maskableBuffer = Buffer.from(svgMaskable);

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));

  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(svgBuffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
  await sharp(svgBuffer).resize(32, 32).toFile(path.join(publicDir, 'favicon.ico'));

  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512-maskable.png'));
  await sharp(maskableBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192-maskable.png'));

  console.log('✅ All Kebab Biteri logo icons generated successfully!');
}

generate().catch(console.error);
