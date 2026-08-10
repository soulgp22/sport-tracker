# api.md — API consommées et exposées

> Toute API ajoutée, modifiée ou retirée s'inscrit ici.
> Les valeurs sensibles ne figurent PAS dans ce fichier : voir [connexions.md](connexions.md).

---

## Principe d'architecture

Les capacités lourdes ou évolutives sont **déportées derrière une API** plutôt
qu'embarquées dans l'application. L'app envoie une entrée, reçoit un résultat
structuré, et n'a aucune connaissance du traitement.

Bénéfices recherchés : APK léger, modèle ou base modifiable sans republier,
capacité réutilisable par un autre client (web, autre app).

**État de la migration :**

| Capacité | Aujourd'hui | Cible |
|---|---|---|
| Estimation de repas par photo | ✅ API serveur | inchangé |
| Scan de code-barres | ❌ appel direct OpenFoodFacts depuis l'app | API serveur |
| Catalogue exercices / aliments | ❌ téléchargement de packs GitHub | API serveur à la demande |

---

## 1. Serveur repas — estimation par photo

**Client :** `src/lib/mealPhotoApi.ts`
**Base :** variable d'environnement `EXPO_PUBLIC_MEAL_SERVER_URL`
**Authentification :** en-tête `Authorization: Bearer <EXPO_PUBLIC_MEAL_SERVER_API_KEY>`

> ⚠️ Cette clé est **inlinée dans le bundle**, donc extractible de l'APK publié.
> Ce n'est pas un secret solide : c'est un portier contre les robots. Une vraie
> protection (quota par appareil, jeton signé) reste à faire.

### `POST /v1/chat/completions?engine=gemini`

Contrat **compatible OpenAI**. L'app force `engine=gemini` ; sans ce paramètre le
routeur sert le modèle maison v9.

Requête — image en base64 dans le message utilisateur :

```json
{ "messages": [ { "role": "user", "content": [
      { "type": "text", "text": "<PROMPT_FINAL.txt>" },
      { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,…" } }
] } ], "max_tokens": 256, "temperature": 0.1 }
```

Réponse attendue après extraction : `{ "items": [ { "name": …, "grams": … } ] }`

Contraintes : photo compressée à **768 px / JPEG 0.6** avant envoi
(`expo-image-manipulator`). Délais : 5 s à la connexion, 60 s à la réponse.
Le prompt vit dans `finetune/PROMPT_FINAL.txt` (projet training) — **ne pas le
modifier sans réévaluer** le modèle.

### `POST /v1/food-info`

Enrichissement d'un aliment par son nom. `{ "name": "<libellé>" }` → informations
nutritionnelles. Cache serveur partagé entre utilisateurs.

### `POST /training/submit`

Remontée d'une correction utilisateur : `{ record, photoJpegBase64 }`.

**Strictement conditionné à l'opt-in** (`aiTrainingOptInStore`, désactivé par
défaut). Garde-fou dans `src/lib/mealPhotoTrainingLog.ts` :

```js
if (!useAiTrainingOptInStore.getState().aiTrainingOptIn) return;
```

---

## 2. OpenFoodFacts — scan de code-barres

**Client :** `src/lib/openFoodFacts.ts`
**Base :** `https://world.openfoodfacts.org`
**Authentification :** aucune (API publique)

`GET /api/v2/product/<barcode>` → fiche produit.

> **À migrer.** L'app appelle aujourd'hui OpenFoodFacts directement. La cible est
> un point d'entrée sur le serveur, sur le modèle de l'estimation photo : l'app
> envoie le code-barres, le serveur répond avec le produit normalisé. Bénéfices :
> cache partagé, normalisation centralisée, source substituable sans republier
> l'app, et gestion du hors-ligne côté serveur.

---

## 3. Contenu communautaire — GitHub

**Client :** `src/store/communityStore.ts`
**Base :** `https://raw.githubusercontent.com/soulgp22/sport-tracker/main/`

Manifeste + packs de programmes, aliments et exercices, téléchargés à la demande.

> **À revoir.** Le téléchargement est aujourd'hui proposé pendant l'onboarding
> (« Installer ma sélection » / « Commencer sans téléchargement »). La cible est
> une récupération **à la demande** via API, sans étape d'installation initiale.

⚠️ **Piège LFS** : les fichiers suivis par Git LFS renvoient un **pointeur de
130 octets** sur `raw.githubusercontent.com`, pas le fichier. Les médias
d'exercices sont volontairement hors LFS (`media/`). Voir `known_bugs.md` n°9.

---

## 4. Health Connect — Android

**Client :** `src/lib/healthConnect.ts` (via `react-native-health-connect`)

Ce n'est pas une API réseau mais un fournisseur système. Trois permissions en
lecture : `READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_TOTAL_CALORIES_BURNED`.

**Deux exigences non négociables :**
1. `initialize()` avant **tout** appel (voir `known_bugs.md` n°6) ;
2. le manifeste doit exposer le point d'entrée Android 14+ (n°5).

Health Connect ne mesure rien : il stocke ce que d'autres applications y déposent.
Un entrepôt vide donne légitimement 0.

---

## Règles applicables à toute API

- **Timeouts explicites**, jamais d'attente infinie.
- **Échec silencieux interdit** : journaliser au moins sous `__DEV__`.
- **Aucun secret en dur** dans un fichier suivi (dépôt public).
- **Dégradation propre** : l'app doit rester utilisable hors ligne. Toute
  fonctionnalité réseau indique clairement son indisponibilité plutôt que
  d'afficher une valeur par défaut trompeuse.
