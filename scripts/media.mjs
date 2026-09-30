// Medya hattı: raw/ → public/ (WebP görseller, sıkıştırılmış video, yerel fontlar)
// Çalıştır: npm run media
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, statSync, existsSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const RAW = join(ROOT, 'raw');
const OUT = join(ROOT, 'public');
const WIDTHS = [400, 800, 1600];
const QUALITY = 72;

const newer = (src, dst) => !existsSync(dst) || statSync(src).mtimeMs > statSync(dst).mtimeMs;
const manifest = {};
let made = 0;

/* ---------- görseller ---------- */
const DIRS = ['dovme', 'nail', 'piercing', 'kirpik', 'genel', 'yeni'];
for (const dir of DIRS) {
  const src = join(RAW, dir);
  if (!existsSync(src)) continue;
  mkdirSync(join(OUT, 'img', dir), { recursive: true });
  for (const file of readdirSync(src).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) {
    const { name } = parse(file);
    const input = join(src, file);
    const img = sharp(input).rotate(); // EXIF yönünü uygula
    const meta = await img.metadata();
    const rotated = (meta.orientation || 1) >= 5;
    const w = rotated ? meta.height : meta.width;
    const h = rotated ? meta.width : meta.height;
    const widths = WIDTHS.filter((x) => x < w).concat(w <= 1600 ? [w] : []).filter((x, i, a) => a.indexOf(x) === i && x <= 1600);
    for (const tw of widths) {
      const dst = join(OUT, 'img', dir, `${name}-${tw}.webp`);
      if (!newer(input, dst)) continue;
      await sharp(input).rotate().resize({ width: tw, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5, smartSubsample: true }).toFile(dst);
      made++;
    }
    manifest[`${dir}/${name}`] = { w, h, widths };
  }
}

/* logo: şeffaf PNG → WebP (2x) */
for (const [f, out] of [['genel/logo-beyaz.png', 'logo.webp']]) {
  const input = join(RAW, f);
  const dst = join(OUT, 'img', out);
  if (existsSync(input) && newer(input, dst)) { await sharp(input).resize({ height: 72 }).webp({ quality: 90, alphaQuality: 100 }).toFile(dst); made++; }
}

/* paylaşım görseli 1200×630 */
{
  const input = join(RAW, 'dovme', '7.jpg');
  const dst = join(OUT, 'og.jpg');
  if (newer(input, dst)) {
    await sharp(input).rotate().resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80, mozjpeg: true }).toFile(dst);
    made++;
  }
}

/* ---------- video ---------- */
{
  const input = join(RAW, 'video.mp4');
  mkdirSync(join(OUT, 'media'), { recursive: true });
  const mp4 = join(OUT, 'media', 'reel.mp4');
  const poster = join(OUT, 'media', 'reel-poster.jpg');
  if (existsSync(input) && newer(input, mp4)) {
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', input, '-t', '20', '-an',
      '-vf', 'scale=720:-2,fps=30', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '30',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', '1', '-i', mp4, '-frames:v', '1', '-q:v', '5', poster]);
    made += 2;
  }
}

/* ---------- fontlar ---------- */
{
  mkdirSync(join(OUT, 'fonts'), { recursive: true });
  const pick = [
    ['@fontsource/instrument-serif', 'instrument-serif', ['latin-400-normal', 'latin-400-italic', 'latin-ext-400-normal', 'latin-ext-400-italic']],
    ['@fontsource/inter-tight', 'inter-tight', ['latin-400-normal', 'latin-500-normal', 'latin-600-normal', 'latin-ext-400-normal', 'latin-ext-500-normal', 'latin-ext-600-normal']],
  ];
  for (const [pkg, base, variants] of pick) {
    for (const v of variants) {
      const f = `${base}-${v}.woff2`;
      const src = join(ROOT, 'node_modules', pkg, 'files', f);
      const dst = join(OUT, 'fonts', f);
      if (newer(src, dst)) { copyFileSync(src, dst); made++; }
    }
  }
}

writeFileSync(join(ROOT, 'scripts', 'media-manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`Medya hazır: ${Object.keys(manifest).length} görsel, ${made} yeni dosya üretildi.`);
