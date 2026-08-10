# reusable_functions.md — Fonctions et motifs réutilisables

> À consulter **avant** d'écrire une capacité importante : l'équivalent existe
> peut-être déjà. À compléter dès qu'un morceau de code mérite d'être réutilisé.

---

## Modules métier existants — ne pas réécrire

| Module | Ce qu'il fait | Dépend de l'UI ? |
|---|---|---|
| `src/lib/energyBalance.ts` | TDEE, conversion pas → kcal, hiérarchie des sources de dépense | non |
| `src/lib/nutritionCalc.ts` | calculs de macros, progression vers les objectifs | non |
| `src/lib/performanceEngine.ts` | régularité, records, métriques de séance | non |
| `src/lib/healthConnect.ts` | lecture Health Connect (pas, calories) | non |
| `src/lib/mealPhotoApi.ts` | contrat HTTP du serveur repas | non |
| `src/lib/openFoodFacts.ts` | recherche produit par code-barres | non |
| `src/lib/foodValidation.ts` | validation d'un aliment importé | non |
| `src/lib/restTimerNotifications.ts` | notifications du minuteur de repos | non |

Tous sont **testables sans interface** : c'est la cible pour toute nouvelle
capacité (règle 4 d'`AGENTS.md`).

---

## Motifs éprouvés

### Fonction pure + hiérarchie de sources explicite

Quand une valeur peut venir de plusieurs origines de fiabilité inégale, la
fonction retourne **la valeur ET l'origine**, et l'interface nomme toujours la
source. Voir `estimateDailyEnergyExpenditure` dans `energyBalance.ts`.

```ts
// mesuré > estimé depuis capteur > estimé depuis profil > inconnu
{ value: number | null, source: 'healthConnectCalories' | 'healthConnectSteps'
                              | 'profileTdee' | 'unknown', sourceLabelKey: string }
```

**Ne jamais présenter une estimation comme une mesure.** Sur une app de santé,
afficher un chiffre sans dire d'où il vient est pire que ne rien afficher.

### Initialisation mémoïsée d'un SDK natif

```ts
let initializationPromise: Promise<boolean> | null = null;
function ensureInitialized(hc: Module): Promise<boolean> {
  if (!initializationPromise) initializationPromise = hc.initialize().catch(…);
  return initializationPromise;
}
```

Une seule initialisation même sur appels rapprochés. Voir `healthConnect.ts`.

### Appel natif protégé, mais pas silencieux

```ts
async function safeCall<T>(context: string, fn: (m: Module) => Promise<T>): Promise<T | null> {
  const m = loadModule();
  if (!m) return null;
  try { return await fn(m); }
  catch (error) { if (__DEV__) console.warn(`[module] ${context}`, error); return null; }
}
```

Le repli reste `null`, mais l'échec est **tracé**. Trois bugs de cette base ont
survécu des jours à cause d'un `catch` muet.

### Store persisté : `merge` défensive

Toute fonction `merge` d'un store `persist` doit :
1. restaurer **explicitement chaque champ** de `partialize` ;
2. être **incapable de lever** (garde objet + validation par champ + `try/catch`) ;
3. s'accompagner d'`onRehydrateStorage`, appelé sur le chemin succès **et** erreur.

Modèle complet : `src/store/onboardingStore.ts`.

### Configuration par variables d'environnement

```ts
export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? '';
```

Repli sur **chaîne vide**, jamais `undefined` : un `Bearer undefined` part sur le
réseau, une chaîne vide se teste. Le garde-fou en aval désactive proprement la
fonctionnalité.

### Hauteur bornée d'un panneau

Ne jamais utiliser un `maxHeight` en pourcentage si le parent n'a pas de hauteur
propre : le pourcentage ne se résout pas et l'élément croît sans limite. Utiliser
`useWindowDimensions()` et une valeur absolue.

### Respect de la barre système

```ts
const insets = useSafeAreaInsets();
// hauteur = contenu + inset, le fond couvre l'ensemble
height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
paddingBottom: insets.bottom,
```

Aucune valeur en dur : l'inset vaut ~48 dp en trois boutons, ~16 dp en geste, 0
sans barre. Voir `src/app/(tabs)/_layout.tsx`.

---

## Plugins de configuration locaux

Dans `plugins/`, réappliqués à chaque `prebuild` — c'est la **seule** façon de
modifier durablement `android/`, qui est gitignoré et régénéré.

| Plugin | Rôle |
|---|---|
| `withHealthConnect.js` | délégué de permissions + point d'entrée Android 14+ |
| `withCleanDomBundle.js` | vide `www.bundle` avant chaque bundling |

**Modèle à suivre** : commentaire d'en-tête expliquant le *pourquoi*, marqueur
unique testé avant injection (idempotence), erreur explicite si l'ancre est
introuvable.

---

## Outillage de vérification

```bash
# un média distant renvoie-t-il de vrais octets (pas un pointeur LFS) ?
curl -sL "$URL" | head -c 8 | grep -q RIFF || echo "ERREUR: pointeur LFS"

# signature d'un AAB (doit être la clé EAS)
python -c "import zipfile;print([n for n in zipfile.ZipFile('app.aab').namelist() if n.endswith('.RSA')])"

# manifeste compilé d'un APK
aapt2 dump xmltree app.apk --file AndroidManifest.xml | grep -i health

# décomposition du poids d'un APK par catégorie
python -c "import zipfile,collections; …"   # voir docs/tests-avant-prod.md
```
