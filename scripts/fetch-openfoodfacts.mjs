#!/usr/bin/env node

// ---------------------------------------------------------------------------
// fetch-openfoodfacts.mjs
// Fetch real food products from the Open Food Facts API by country & retailer,
// apply quality filters, map to app categories, and write per-country packs.
// ---------------------------------------------------------------------------

import { normalizeName, mapCategory, isPlausibleNutrition, energyConsistent, buildFoodId, pickUnit, dedupe } from './lib/offNormalize.mjs';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// CLI options
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const opts = { limit: 40, country: null, dryRun: false };
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) opts.limit = Math.max(1, parseInt(args[i + 1], 10) || 40);
  if (args[i] === '--country' && args[i + 1]) opts.country = args[i + 1];
  if (args[i] === '--dry-run') opts.dryRun = true;
}

const LIMIT_PER_STORE = opts.limit;
const COUNTRY_FILTER = opts.country;
const DRY_RUN = opts.dryRun;

// ---------------------------------------------------------------------------
// Country → retailers configuration
// ---------------------------------------------------------------------------
const CONFIG = [
  { country: 'France', countryTag: 'france', retailers: ['Carrefour', 'Auchan', 'E.Leclerc'] },
  { country: 'Espagne', countryTag: 'spain', retailers: ['Mercadona', 'Carrefour', 'Lidl'] },
  { country: 'Allemagne', countryTag: 'germany', retailers: ['Edeka', 'Rewe', 'Aldi'] },
  { country: 'Italie', countryTag: 'italy', retailers: ['Coop', 'Conad', 'Esselunga'] },
  { country: 'Belgique', countryTag: 'belgium', retailers: ['Delhaize', 'Colruyt', 'Carrefour'] },
  { country: 'Royaume-Uni', countryTag: 'united-kingdom', retailers: ["Tesco", "Sainsbury's", 'Asda'] },
];

// File name mapping
const COUNTRY_FILE = {
  'France': 'foods-france.json',
  'Espagne': 'foods-espagne.json',
  'Allemagne': 'foods-allemagne.json',
  'Italie': 'foods-italie.json',
  'Belgique': 'foods-belgique.json',
  'Royaume-Uni': 'foods-royaume-uni.json',
};

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
const BASE = 'https://world.openfoodfacts.org';
const UA = 'LifeSportTracker/1.0 (contact GitHub soulgp22/sport-tracker)';
const FIELDS = 'code,product_name,brands,stores,countries_tags,categories_tags,quantity,nutriments';

// Store name → OFF stores_tags alias (API uses lowercase-hyphenated tags)
const STORE_ALIASES = {
  'E.Leclerc': 'e-leclerc',
  "Sainsbury's": 'sainsbury-s',
};

// Module-level slot so searchStore can inspect the last permanent API error
let _lastApiError = null;

async function fetchJson(url, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': UA } });

      if (resp.status === 429) {
        const wait = Math.min(60000, 1000 * Math.pow(2, attempt) + Math.random() * 1000);
        console.error(`  ⚠ 429 – retrying in ${Math.round(wait / 1000)}s…`);
        await sleep(wait);
        continue;
      }

      // Read body as text first so we can detect HTML / non-JSON responses
      const text = await resp.text();

      if (!resp.ok) {
        const preview = text.substring(0, 300).replace(/\s+/g, ' ').trim();
        console.error(`  ✗ HTTP ${resp.status} for ${url}`);
        console.error(`    Body preview: ${preview || '(empty)'}`);
        if (attempt < retries - 1) {
          const wait = Math.min(30000, 1000 * Math.pow(2, attempt) + Math.random() * 500);
          console.error(`  ⚠ Retrying in ${Math.round(wait / 1000)}s (attempt ${attempt + 1}/${retries})`);
          await sleep(wait);
          continue;
        }
        _lastApiError = { url, status: resp.status, bodyPreview: preview };
        return null;
      }

      // Try to parse as JSON – HTML/text pages will throw
      try {
        return JSON.parse(text);
      } catch {
        const preview = text.substring(0, 300).replace(/\s+/g, ' ').trim();
        console.error(`  ✗ Non-JSON response (HTML/text) for ${url}`);
        console.error(`    Body preview: ${preview || '(empty)'}`);
        if (attempt < retries - 1) {
          const wait = Math.min(30000, 1000 * Math.pow(2, attempt) + Math.random() * 500);
          console.error(`  ⚠ Retrying in ${Math.round(wait / 1000)}s (attempt ${attempt + 1}/${retries})`);
          await sleep(wait);
          continue;
        }
        _lastApiError = { url, status: resp.status, bodyPreview: preview, error: 'non-json' };
        return null;
      }
    } catch (e) {
      if (attempt < retries - 1) {
        const wait = Math.min(30000, 1000 * Math.pow(2, attempt) + Math.random() * 500);
        console.error(`  ⚠ Network error - retrying in ${Math.round(wait / 1000)}s (attempt ${attempt + 1}/${retries})`);
        await sleep(wait);
        continue;
      }
      console.error(`  ✗ Fetch failed: ${e.message}`);
      _lastApiError = { url, error: `Network: ${e.message}` };
      return null;
    }
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Search products by country + store
// ---------------------------------------------------------------------------
async function searchStore(countryTag, store, limit) {
  const all = [];
  const pageSize = Math.min(limit, 50);
  const pages = Math.ceil(limit / pageSize);
  const storeTag = STORE_ALIASES[store] || store;
  let apiError = null;

  for (let page = 1; page <= pages; page++) {
    const url = `${BASE}/cgi/search.pl?action=process&tagtype_0=countries&tag_contains_0=contains&tag_0=${encodeURIComponent(countryTag)}&tagtype_1=stores&tag_contains_1=contains&tag_1=${encodeURIComponent(storeTag)}&page=${page}&page_size=${pageSize}&fields=${FIELDS}&sort_by=unique_scans_n&json=1`;

    console.log(`  GET page ${page} …`);
    const data = await fetchJson(url);
    if (!data || !data.products || !Array.isArray(data.products)) {
      if (_lastApiError) {
        apiError = _lastApiError;
        _lastApiError = null;
      }
      console.error(`  ✗ No products returned`);
      break;
    }

    for (const p of data.products) {
      all.push(p);
      if (all.length >= limit) break;
    }

    if (all.length >= limit) break;
    if (data.products.length < pageSize) break; // no more pages

    // Rate limiting: >= 1s between requests
    await sleep(1100);
  }

  const result = all.slice(0, limit);
  result.apiError = apiError;
  return result;
}

// ---------------------------------------------------------------------------
// Product-level quality filters & mapping
// ---------------------------------------------------------------------------
function processProduct(raw, country, store) {
  const reasons = [];

  // --- Name ---
  const name = (raw.product_name || '').trim();
  if (!name) { reasons.push('empty-name'); return { ok: false, reasons }; }

  // --- Nutrition ---
  const nut = raw.nutriments || {};
  if (!isPlausibleNutrition(nut)) { reasons.push('bad-macros'); return { ok: false, reasons }; }

  const kcal = Number(nut['energy-kcal_100g']);
  const prot = Number(nut['proteins_100g']);
  const carbs = Number(nut['carbohydrates_100g']);
  const fat = Number(nut['fat_100g']);

  // --- Calories bounds ---
  if (kcal < 0 || kcal > 900) { reasons.push('calories-oob'); return { ok: false, reasons }; }
  if (prot < 0 || prot > 100) { reasons.push('macro-oob'); return { ok: false, reasons }; }
  if (carbs < 0 || carbs > 100) { reasons.push('macro-oob'); return { ok: false, reasons }; }
  if (fat < 0 || fat > 100) { reasons.push('macro-oob'); return { ok: false, reasons }; }

  // --- Energy consistency ---
  if (!energyConsistent(nut, 0.3)) { reasons.push('energy-inconsistent'); return { ok: false, reasons }; }

  // --- Category mapping ---
  const catTags = raw.categories_tags || [];
  const category = mapCategory(catTags, name);
  if (!category) { reasons.push('unmapped-category'); return { ok: false, reasons }; }

  // --- Barcode ---
  const barcode = String(raw.code || '').trim();
  if (!barcode) { reasons.push('no-barcode'); return { ok: false, reasons }; }

  // --- Unit ---
  const unit = pickUnit(catTags);

  // --- Brand ---
  const brand = (raw.brands || '').split(',')[0].trim() || store;

  // --- Build food object ---
  const nutritionPer100g = {
    calories: Math.round(kcal),
    protein: Math.round(prot * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };

  // Optional fields
  if (nut.fiber_100g != null) {
    const fib = Number(nut.fiber_100g);
    if (!Number.isNaN(fib) && fib >= 0) nutritionPer100g.fiber = Math.round(fib * 10) / 10;
  }
  if (nut.sugars_100g != null) {
    const sug = Number(nut.sugars_100g);
    if (!Number.isNaN(sug) && sug >= 0) nutritionPer100g.sugar = Math.round(sug * 10) / 10;
  }
  if (nut.salt_100g != null) {
    const salt = Number(nut.salt_100g);
    if (!Number.isNaN(salt) && salt >= 0) nutritionPer100g.salt = Math.round(salt * 100) / 100;
  }

  return {
    ok: true,
    reasons: [],
    food: {
      id: buildFoodId(country, barcode),
      name,
      brand,
      retailer: store,
      country,
      category,
      unit,
      nutritionPer100g,
      barcode,
      sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
    },
  };
}

// For reporting
function classifyReason(reasons) {
  if (!reasons || reasons.length === 0) return 'unknown';
  return reasons[0];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const communityDir = resolve(__dirname, '..', 'community');

console.log('═══════════════════════════════════════════');
console.log('  Life Sport Tracker – Open Food Facts fetch');
console.log(`  Limit: ${LIMIT_PER_STORE}/store  |  ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`);
console.log('═══════════════════════════════════════════\n');

const report = [];

for (const cfg of CONFIG) {
  if (COUNTRY_FILTER && cfg.country !== COUNTRY_FILTER) continue;

  console.log(`\n▶ ${cfg.country} (${cfg.countryTag})`);
  const countryFoods = [];
  const stats = [];

  for (const store of cfg.retailers) {
    console.log(`  ▸ ${store}`);
    const rawProducts = await searchStore(cfg.countryTag, store, LIMIT_PER_STORE);
    const hasApiError = rawProducts.apiError || null;

    if (hasApiError) {
      const statusInfo = hasApiError.status ? ` HTTP ${hasApiError.status}` : '';
      console.log(`    → ⚠ API ERROR${statusInfo} – fetched ${rawProducts.length} products`);
    } else {
      console.log(`    → fetched ${rawProducts.length} products`);
    }

    const reasonCounts = {};
    let accepted = 0;

    for (const raw of rawProducts) {
      const result = processProduct(raw, cfg.country, store);
      if (result.ok) {
        countryFoods.push(result.food);
        accepted++;
      } else {
        const r = classifyReason(result.reasons);
        reasonCounts[r] = (reasonCounts[r] || 0) + 1;
      }
    }

    const rejected = rawProducts.length - accepted;
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');

    console.log(`    → accepted: ${accepted}, rejected: ${rejected}${rejected > 0 ? ` (${topReasons})` : ''}`);

    stats.push({ store, fetched: rawProducts.length, accepted, rejected, topReasons, apiError: hasApiError });

    // Rate limit between stores
    if (cfg.retailers.indexOf(store) < cfg.retailers.length - 1) {
      await sleep(1500);
    }
  }

  // Deduplicate at country level
  const beforeDedup = countryFoods.length;
  const uniqueFoods = dedupe(countryFoods);
  const dupesRemoved = beforeDedup - uniqueFoods.length;
  if (dupesRemoved > 0) console.log(`  → deduplication removed ${dupesRemoved}`);

  report.push({ country: cfg.country, stats, totalAccepted: uniqueFoods.length });

  // Write file
  if (uniqueFoods.length === 0) {
    console.log(`  ⚠ No valid products – skipping file write.`);
  } else if (!DRY_RUN) {
    const outName = COUNTRY_FILE[cfg.country] || `foods-${cfg.country.toLowerCase()}.json`;
    const outPath = resolve(communityDir, outName);

    if (!existsSync(communityDir)) mkdirSync(communityDir, { recursive: true });

    const pack = {
      version: 1,
      source: {
        name: `Produits ${cfg.country} — Open Food Facts`,
        country: cfg.country,
        retailers: cfg.retailers,
        official: false,
        license: 'ODbL — Open Food Facts',
        attribution: 'https://world.openfoodfacts.org',
        disclaimer: 'Sélection communautaire indicative issue d\'Open Food Facts. Vérifier les valeurs sur l\'emballage avant utilisation.',
      },
      foods: uniqueFoods,
    };

    writeFileSync(outPath, JSON.stringify(pack, null, 2) + '\n', 'utf-8');
    console.log(`  ✓ wrote ${uniqueFoods.length} foods → ${outName}`);
  } else {
    console.log(`  [dry-run] would write ${uniqueFoods.length} foods → ${COUNTRY_FILE[cfg.country]}`);
  }

  // Rate limit between countries
  if (CONFIG.indexOf(cfg) < CONFIG.length - 1) {
    await sleep(2000);
  }
}

// ---------------------------------------------------------------------------
// Final report
// ---------------------------------------------------------------------------
console.log('\n═══════════════════════════════════════════');
console.log('  REPORT');
console.log('═══════════════════════════════════════════\n');

for (const r of report) {
  console.log(`${r.country}: ${r.totalAccepted} foods written`);
  for (const s of r.stats) {
    if (s.apiError) {
      console.log(`  ${s.store.padEnd(14)} ⚠ API-ERROR${s.accepted > 0 ? `  accepted:${String(s.accepted).padStart(3)}` : ''}`);
    } else {
      const ratio = s.fetched > 0 ? Math.round((100 * s.accepted) / s.fetched) : 0;
      console.log(`  ${s.store.padEnd(14)} fetched:${String(s.fetched).padStart(3)}  accepted:${String(s.accepted).padStart(3)}  rejected:${String(s.rejected).padStart(3)}  (${ratio}%)`);
      if (s.topReasons) console.log(`    ↳ ${s.topReasons}`);
    }
  }
}

console.log('\n✓ Done.\n');