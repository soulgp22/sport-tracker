#!/usr/bin/env node
/**
 * Genere les pages legales servies par le VPS (/privacy, /terms) depuis les
 * sources Markdown du depot, pour que la version publiee ne diverge plus de
 * la version relue (voir known_bugs.md : la page en ligne datait d'avant la
 * reecriture).
 *
 * Usage : node scripts/build-legal-pages.mjs <dossier-de-sortie>
 * Puis copier privacy.html et terms.html dans /opt/meal-training/www/.
 *
 * `marked` plutot qu'un convertisseur maison : tableaux, listes et liens sont
 * utilises dans ces documents, et marked est la reference sans dependance.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';

const PAGES = [
  { source: 'docs/play-store/POLITIQUE_CONFIDENTIALITE.md', output: 'privacy.html' },
  { source: 'docs/play-store/CONDITIONS_ABONNEMENT.md', output: 'terms.html' },
];

// Liens entre documents du depot -> routes publiques.
const LINKS = [
  ['POLITIQUE_CONFIDENTIALITE.md', '/privacy'],
  ['CONDITIONS_ABONNEMENT.md', '/terms'],
];

const STYLE = `body { font-family: system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px 16px; line-height: 1.6; color: #1a1d24; }
h1 { font-size: 1.5rem; } h2 { font-size: 1.2rem; margin-top: 1.6em; } h3 { font-size: 1.05rem; }
li { margin: .3em 0; } code { font-size: .85em; }
table { border-collapse: collapse; width: 100%; font-size: .95em; } th, td { border: 1px solid #d9dce1; padding: 6px 8px; text-align: left; }
blockquote { margin: 0; padding: 8px 12px; background: #f2f4f7; border-left: 3px solid #1f5fe0; }`;

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

const outDir = process.argv[2];
if (!outDir) {
  console.error('Usage : node scripts/build-legal-pages.mjs <dossier-de-sortie>');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

for (const { source, output } of PAGES) {
  let markdown = readFileSync(source, 'utf8');
  // L'avertissement « projet a faire relire » ne doit pas partir en ligne.
  markdown = markdown.replace(/^> Projet rédigé[\s\S]*?(?:\r?\n){2}/m, '');
  for (const [file, route] of LINKS) markdown = markdown.split(`(${file})`).join(`(${route})`);

  const title = (markdown.match(/^# (.+)$/m) ?? [, 'Life Sport Tracker'])[1];
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
${STYLE}
</style>
</head>
<body>
${marked.parse(markdown)}
</body>
</html>
`;
  writeFileSync(join(outDir, output), html, 'utf8');
  console.log(`${output} <- ${source}`);
}
