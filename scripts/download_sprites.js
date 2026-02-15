#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, 'pok_catalog.js');
const INDEX_PATH = path.join(ROOT, 'index.html');
const OUT_DIR = path.join(ROOT, 'assets', 'sprites');
const MANIFEST_PATH = path.join(ROOT, 'runtime_sprite_manifest.js');
const API_BASE = 'https://pokeapi.co/api/v2/pokemon/';
const CONCURRENCY = Number(process.env.SPRITE_DL_CONCURRENCY || 8);
const REFRESH = process.argv.includes('--refresh');

const SPRITE_SELECTORS = {
  anim_front_default: data => data?.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default || null,
  anim_back_default: data => data?.sprites?.versions?.['generation-v']?.['black-white']?.animated?.back_default || null,
  anim_front_shiny: data => data?.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_shiny || null,
  anim_back_shiny: data => data?.sprites?.versions?.['generation-v']?.['black-white']?.animated?.back_shiny || null,
  front_default: data => data?.sprites?.front_default || null,
  back_default: data => data?.sprites?.back_default || null,
  front_shiny: data => data?.sprites?.front_shiny || null,
  back_shiny: data => data?.sprites?.back_shiny || null
};

function toPosix(inputPath) {
  return inputPath.split(path.sep).join('/');
}

function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('.gif')) return '.gif';
    if (pathname.endsWith('.png')) return '.png';
    if (pathname.endsWith('.jpg')) return '.jpg';
    if (pathname.endsWith('.jpeg')) return '.jpeg';
    if (pathname.endsWith('.webp')) return '.webp';
  } catch {}
  return '.png';
}

async function loadSpeciesNames() {
  const src = await fs.readFile(CATALOG_PATH, 'utf8');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(`${src}\nthis.__speciesNames = Object.keys(POKEMON_SPECIES);`, ctx);
  return ctx.__speciesNames || [];
}

async function loadSlugMap() {
  const html = await fs.readFile(INDEX_PATH, 'utf8');
  const match = html.match(/const SLUG_MAP = \{([\s\S]*?)\};/);
  if (!match) return {};
  const body = `{${match[1]}}`;
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(`this.__slugMap = ${body};`, ctx);
  return ctx.__slugMap || {};
}

function toSlug(name, slugMap) {
  if (slugMap[name]) return slugMap[name];

  const normalized = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\u2640/g, '-f')
    .replace(/\u2642/g, '-m')
    .replace(/[.'\u2019]/g, '')
    .replace(/\s+/g, '-');

  if (normalized === 'nidoran-f' || normalized === 'nidoranf') return 'nidoran-f';
  if (normalized === 'nidoran-m' || normalized === 'nidoranm') return 'nidoran-m';
  return normalized;
}

async function withRetry(fn, attempts = 3, delayMs = 400) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}

async function fetchJson(url) {
  return withRetry(async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
  });
}

async function downloadFile(url, filePath) {
  if (!REFRESH) {
    try {
      await fs.access(filePath);
      return false;
    } catch {}
  }

  const buffer = await withRetry(async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return Buffer.from(await res.arrayBuffer());
  });
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return true;
}

async function processSlug(slug) {
  const data = await fetchJson(`${API_BASE}${slug}`);
  const entry = {};
  let downloaded = 0;
  let reused = 0;

  for (const [key, pickUrl] of Object.entries(SPRITE_SELECTORS)) {
    const spriteUrl = pickUrl(data);
    if (!spriteUrl) {
      entry[key] = null;
      continue;
    }

    const ext = extFromUrl(spriteUrl);
    const outPath = path.join(OUT_DIR, slug, `${key}${ext}`);
    const didDownload = await downloadFile(spriteUrl, outPath);
    if (didDownload) downloaded += 1;
    else reused += 1;

    entry[key] = toPosix(path.relative(ROOT, outPath));
  }

  return { slug, entry, downloaded, reused };
}

async function runWorkers(items, workerCount, workerFn) {
  const queue = [...items];
  const out = [];
  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      out.push(await workerFn(item));
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  const speciesNames = await loadSpeciesNames();
  const slugMap = await loadSlugMap();
  const slugs = Array.from(new Set(speciesNames.map(name => toSlug(name, slugMap)))).sort();

  console.log(`Species in catalog: ${speciesNames.length}`);
  console.log(`Unique slugs to sync: ${slugs.length}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Refresh mode: ${REFRESH ? 'on' : 'off'}`);

  const manifest = {};
  let totalDownloaded = 0;
  let totalReused = 0;
  let failed = 0;

  const results = await runWorkers(slugs, Math.max(1, CONCURRENCY), async (slug) => {
    try {
      const result = await processSlug(slug);
      return { ok: true, ...result };
    } catch (error) {
      return { ok: false, slug, error: String(error && error.message ? error.message : error) };
    }
  });

  for (const row of results) {
    if (!row.ok) {
      failed += 1;
      console.warn(`Failed ${row.slug}: ${row.error}`);
      continue;
    }
    manifest[row.slug] = row.entry;
    totalDownloaded += row.downloaded;
    totalReused += row.reused;
  }

  const payload = [
    '// Auto-generated by scripts/download_sprites.js',
    `// Generated at: ${new Date().toISOString()}`,
    `window.LOCAL_SPRITES = ${JSON.stringify(manifest, null, 2)};`,
    ''
  ].join('\n');

  await fs.writeFile(MANIFEST_PATH, payload, 'utf8');

  console.log(`Manifest written: ${toPosix(path.relative(ROOT, MANIFEST_PATH))}`);
  console.log(`Downloaded files: ${totalDownloaded}`);
  console.log(`Reused files: ${totalReused}`);
  console.log(`Failed slugs: ${failed}`);
  if (failed > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
