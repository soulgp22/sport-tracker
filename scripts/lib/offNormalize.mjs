// ---------------------------------------------------------------------------
// offNormalize – pure helper functions for Open Food Facts data normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise a product name for deduplication & comparison.
 * - Lowercase
 * - Decompose Unicode (NFD) and strip diacritical marks
 * - Replace non-alphanumeric runs with a single space
 * - Collapse whitespace & trim
 */
export function normalizeName(s) {
  if (typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// App categories (must match src/data/foods.default.json)
// ---------------------------------------------------------------------------
const APP_CATEGORIES = new Set([
  'Viande', 'Poisson', 'Œufs', 'Produits laitiers',
  'Féculents', 'Légumes', 'Fruits', 'Légumineuses',
  'Matières grasses', 'Noix & graines', 'Boissons', 'Snacks/Sucré',
]);

// ---------------------------------------------------------------------------
// Exact-slug category mapping sets (safe prefix-aware matching)
// Each slug = OFF category tag minus language prefix (e.g. "meats" from "en:meats")
// Suffix matching: "hazelnut-spreads" → strip "hazelnut-" → exact match "spreads"
// ---------------------------------------------------------------------------
const BOISSONS = new Set(['beverages','drinks','sodas','juices','water','waters','smoothies','plant-milks','milkshakes','coffees','coffee','teas','tea','hot-drinks','syrups','iced-tea','iced-teas','energy-drinks','beers','wines','alcohol','spirits','soft-drinks','fruit-juices','vegetable-juices','cola','lemonades','herbal-teas','coconut-water','non-alcoholic-beverages','alcoholic-beverages','cocktails','liqueurs','ciders','whiskies','vodkas','rums','champagne','sparkling-waters','mineral-waters','still-waters','carbonated-drinks','tonic-water','kombucha','fermented-drinks','soy-milks','almond-milks','oat-milks','rice-milks','coconut-milks','milks','plant-based-beverages','fruit-nectars','smoothie','orange-juices']);
const OEUFS = new Set(['eggs']);
const VIANDE = new Set(['meats','meat','poultry','beef','pork','veal','lamb','chicken','turkey','duck','goose','game','horse','rabbit','ham','hams','sausages','sausage','salami','charcuterie','cold-cuts','bacon','pates','terrines','foie-gras','prepared-meats','meat-analogues','beef-steaks','pork-chops','chicken-breasts','chicken-thighs','chicken-wings','ground-beef','ground-pork','minced-meat','meatballs','cutlets','steaks','roasts','ribs','merguez','chipolatas','chorizo','andouille','boudin','rillettes','pastrami','corned-beef','roast-beef','meat-loaf','luncheon-meats','cooked-ham','raw-ham','prosciutto','coppa','pancetta','pepperoni','mortadella','frankfurters','hot-dogs','hot-dog','red-meat','white-meat','offal']);
const POISSON = new Set(['fish','seafood','crustaceans','shellfish','molluscs','canned-fish','salmon','tuna','cod','shrimp','shrimps','sardines','mackerel','surimi','roe','smoked-fish','fish-fillets','trout','herring','anchovies','caviar','mussels','oysters','clams','scallops','squids','octopus','crab','lobster','crayfish','smoked-salmon','canned-tuna','canned-sardines','canned-mackerel']);


const MATIERES_GRASSES = new Set(['fats','oils','butters','margarines','cooking-oils','animal-fats','vegetable-fats','vegetable-oils','olive-oils','sunflower-oils','coconut-oil','lard']);
const PRODUITS_LAITIERS = new Set(['dairies','milk','cheese','yogurt','yogurts','yoghurt','cream','fromage','dairy-desserts','cottage-cheese','quark','fermented-milk','fermented-foods','kefir','skyr','whey']);
const NOIX_GRAINES = new Set(['nuts','seeds','almonds','walnuts','peanuts','cashews','hazelnuts','pistachios','pecan','macadamia','brazil-nuts','sunflower-seeds','pumpkin-seeds','flax-seeds','chia','sesame-seeds','pine-nuts','chestnuts','nut-butters','peanut-butters','almond-butters']);
const LEGUMINEUSES = new Set(['legumes','pulses','lentils','chickpeas','beans','peas','soybeans','fava-beans','kidney-beans','black-beans','split-peas','tofu','tempeh','edamame']);
const FECULENTS = new Set(['cereals','cereals-and-potatoes','potatoes','bread','pasta','pastas','rice','grains','noodles','couscous','quinoa','bulgur','semolina','flours','cereal-products','breakfast-cereals','muesli','porridge','oatmeal','brioche','crispbread','rusks','corn','wheat','mashed-potatoes','french-fries','sweet-potatoes','tortilla','wraps','pizza']);
const LEGUMES = new Set(['vegetables','vegetable','salads','tomatoes','carrots','broccoli','spinach','zucchini','cucumber','peppers','mushrooms','onions','garlic','cabbages','cauliflower','eggplant','asparagus','artichokes','leeks','celery','pickles','olives','canned-vegetables','frozen-vegetables','soups','vegetable-soups']);
const FRUITS = new Set(['fruits','fruit','apples','bananas','oranges','berries','grapes','pears','peaches','plums','apricots','cherries','melons','pineapple','mango','kiwi','figs','dates','avocados','citrus','tropical-fruits','stone-fruits','dried-fruits','fruit-compotes','fruit-sauces','fruit-salads','jams','marmalades','fruit-spreads']);
const SNACKS_SUCRE = new Set(['snacks','salty-snacks','salted-snacks','sweets','chocolate','biscuits','cakes','cookies','pastries','confectionery','sugars','honey','ice-cream','sorbets','frozen-desserts','sweet-pies','puddings','desserts','candy','marshmallows','caramel','nougat','sweet-spreads','spreads','hazelnut-spreads','chocolate-spreads','cocoa-and-hazelnuts-spreads','confectionary-based-spreads','pancakes','waffles','cereal-bars','energy-bars','protein-bars','chips','crisps','popcorn','appetizers','pretzels','breakfasts','petit-dejeuners','pates-a-tartiner','pates-a-tartiner-au-chocolat','pates-a-tartiner-aux-noisettes','pates-a-tartiner-aux-noisettes-et-au-cacao','produits-a-tartiner','produits-a-tartiner-sucres']);

const SUFFIX_RULES = [
  { suffix: '-spreads', category: 'Snacks/Sucré' },
  { suffix: '-a-tartiner', category: 'Snacks/Sucré' },
];

const CATEGORY_ORDER = [
  { set: BOISSONS,          name: 'Boissons' },
  { set: OEUFS,             name: 'Œufs' },
  { set: POISSON,           name: 'Poisson' },
  { set: VIANDE,            name: 'Viande' },
  { set: MATIERES_GRASSES,  name: 'Matières grasses' },
  { set: PRODUITS_LAITIERS, name: 'Produits laitiers' },
  { set: NOIX_GRAINES,      name: 'Noix & graines' },
  { set: LEGUMINEUSES,      name: 'Légumineuses' },
  { set: FECULENTS,         name: 'Féculents' },
  { set: LEGUMES,           name: 'Légumes' },
  { set: FRUITS,            name: 'Fruits' },
  { set: SNACKS_SUCRE,      name: 'Snacks/Sucré' },
];

const SLUG_TO_CATEGORY = new Map();
const CATEGORY_PRIORITY = new Map();

for (let i = CATEGORY_ORDER.length - 1; i >= 0; i--) {
  const { set, name } = CATEGORY_ORDER[i];
  CATEGORY_PRIORITY.set(name, i);
  for (const slug of set) {
    SLUG_TO_CATEGORY.set(slug, name);
  }
}

/**
 * Map OFF categories_tags to an app category using EXACT slug matching.
 * Strips language prefixes (en:, fr:, es:, de:, it:, …) then looks up the
 * resulting slug in a curated dictionary. Falls back to explicit suffix rules.
 * In case of multiple matches the most specific (highest priority) category wins.
 * Returns null when no reliable mapping exists.
 *
 * @param {string[]} categoriesTags – e.g. ["en:meats", "en:poultry"]
 * @param {string} [productName]    – unused; kept for API compatibility
 * @returns {string|null} app category or null if no reliable mapping
 */
export function mapCategory(categoriesTags, productName) {
  if (!Array.isArray(categoriesTags) || categoriesTags.length === 0) return null;

  const matched = new Set();

  for (const raw of categoriesTags) {
    if (typeof raw !== 'string') continue;
    const slug = raw.toLowerCase().replace(/^[a-z]{2}:/, '');

    // 1) Exact dictionary lookup
    let cat = SLUG_TO_CATEGORY.get(slug);

    // 2) Suffix fallback
    if (!cat) {
      for (const { suffix, category } of SUFFIX_RULES) {
        if (slug.endsWith(suffix)) {
          cat = category;
          break;
        }
      }
    }

    if (cat) matched.add(cat);
  }

  if (matched.size === 0) return null;
  if (matched.size === 1) return [...matched][0];

  // Multiple categories — pick the most specific (lowest priority index)
  let best = null;
  let bestPriority = Infinity;
  for (const cat of matched) {
    const prio = CATEGORY_PRIORITY.get(cat) ?? Infinity;
    if (prio < bestPriority) {
      bestPriority = prio;
      best = cat;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Nutrition plausibility & energy consistency
// ---------------------------------------------------------------------------

/**
 * Check that the four mandatory macro fields are present and within
 * reasonable bounds. n uses OFF field names.
 */
export function isPlausibleNutrition(n) {
  if (!n || typeof n !== 'object') return false;
  const kcal = n['energy-kcal_100g'];
  const prot = n['proteins_100g'];
  const carbs = n['carbohydrates_100g'];
  const fat = n['fat_100g'];

  if (kcal == null || prot == null || carbs == null || fat == null) return false;

  const c = Number(kcal);
  const p = Number(prot);
  const h = Number(carbs);
  const f = Number(fat);

  if ([c, p, h, f].some(v => Number.isNaN(v))) return false;

  if (c < 0 || c > 900) return false;
  if (p < 0 || p > 100) return false;
  if (h < 0 || h > 100) return false;
  if (f < 0 || f > 100) return false;

  return true;
}

/**
 * Verify energy consistency:
 *   |kcal − (4·prot + 4·carbs + 9·fat)| ≤ tolerance · kcal
 * @param {number} [tolerance=0.3]
 */
export function energyConsistent(n, tolerance = 0.3) {
  const kcal = Number(n['energy-kcal_100g']);
  const p = Number(n['proteins_100g']);
  const h = Number(n['carbohydrates_100g']);
  const f = Number(n['fat_100g']);

  if (kcal === 0) return p === 0 && h === 0 && f === 0;
  const expected = 4 * p + 4 * h + 9 * f;
  const delta = Math.abs(kcal - expected);
  return delta <= tolerance * kcal;
}

// ---------------------------------------------------------------------------
// ID & unit helpers
// ---------------------------------------------------------------------------

/** Build a stable, unique food id: `off_<country>_<barcode>`. */
export function buildFoodId(country, barcode) {
  const cc = (country || 'xx').toLowerCase().replace(/[^a-z]/g, '');
  return `off_${cc}_${barcode}`;
}

/**
 * Pick the appropriate unit: "ml" for beverages, "g" otherwise.
 *
 * Algorithm (strict whitelist, exact equality after stripping language prefix):
 *   1. If any slug matches an explicit SOLID set → "g" (overrides beverages).
 *   2. Else if any slug matches the BEVERAGES set → "ml".
 *   3. Otherwise → "g".
 *
 * No substring / includes / partial matches are used.
 * "dairies" is NOT a beverage — only explicit drinkable-milk slugs count.
 */
export function pickUnit(categoriesTags) {
  if (!Array.isArray(categoriesTags)) return 'g';

  // Strip language prefix (e.g. "en:dairies" → "dairies", "fr:pates" → "pates")
  const slugs = categoriesTags
    .map(t => (typeof t === 'string' ? t.toLowerCase() : ''))
    .map(t => (t.includes(':') ? t.slice(t.indexOf(':') + 1) : t))
    .filter(Boolean);

  // -- 1. Explicit solid-category slugs → always "g" ---------------------------
  const SOLIDS = new Set([
    'milkfat', 'dairy-spreads', 'butters', 'butter', 'cheeses', 'cheese',
    'yogurts', 'yogurt', 'yoghurt', 'creams', 'cream',
  ]);
  if (slugs.some(s => SOLIDS.has(s))) return 'g';

  // -- 2. Beverage slugs (exact match only) ------------------------------------
  const BEVERAGES = new Set([
    'beverages', 'drinks', 'sodas', 'juices', 'water', 'waters',
    'smoothies', 'milkshakes', 'coffees', 'coffee', 'teas', 'tea',
    'hot-drinks', 'syrups', 'iced-tea', 'iced-teas', 'energy-drinks',
    'beers', 'wines', 'alcohol', 'plant-milks',
    'milks', 'whole-milks', 'semi-skimmed-milks', 'skimmed-milks',
    'plant-based-milks', 'soy-milks', 'plant-based-beverages',
    'almond-milks', 'oat-milks', 'rice-milks', 'coconut-milks',
    'soft-drinks', 'fruit-juices', 'vegetable-juices', 'cola', 'colas',
    'lemonades', 'herbal-teas', 'coconut-water',
    'non-alcoholic-beverages', 'alcoholic-beverages',
    'cocktails', 'liqueurs', 'ciders', 'whiskies', 'vodkas', 'rums',
    'champagne', 'sparkling-waters', 'mineral-waters', 'still-waters',
    'carbonated-drinks', 'tonic-water', 'kombucha', 'fermented-drinks',
    'fruit-nectars', 'smoothie', 'orange-juices', 'spirits',
    'spring-waters', 'natural-mineral-waters',
  ]);
  if (slugs.some(s => BEVERAGES.has(s))) return 'ml';

  // -- 3. Default --------------------------------------------------------------
  return 'g';
}
/**
 * Deduplicate an array of food objects.
 * - First by barcode (keep first occurrence)
 * - Then by normalised name (keep first occurrence)
 */
export function dedupe(list) {
  const seenBarcode = new Set();
  const seenName = new Set();
  const result = [];

  for (const item of list) {
    const bc = item.barcode;
    if (bc != null && bc !== '') {
      if (seenBarcode.has(bc)) continue;
      seenBarcode.add(bc);
    }

    const norm = normalizeName(item.name);
    if (!norm) continue;
    if (seenName.has(norm)) continue;
    seenName.add(norm);

    result.push(item);
  }

  return result;
}