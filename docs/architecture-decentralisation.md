# Décentralisation des briques — décision d'architecture

> Statut : **décidé, non implémenté** · 9 août 2026
> Décisions prises par Islam ; ce document fige le contrat avant tout code.
> Voir [api.md](../api.md), [connexions.md](../connexions.md), [AGENTS.md](../AGENTS.md).

---

## Décisions

| Question | Décision | Conséquence |
|---|---|---|
| Fonctionnement hors ligne | **abandonné** pour les catalogues | l'app devient dépendante du réseau pour chercher aliments et exercices |
| Comportement sans réseau | **cache des dernières consultations** | ce qui a été vu reste accessible ; le reste affiche « connexion requise » |
| Données personnelles | **restent locales** | aucun compte, aucune authentification, aucune obligation RGPD supplémentaire |
| Hébergement | **VPS Hetzner existant** | pas de service supplémentaire ; le serverless reste une option ultérieure |
| IA de profondeur | **prévue, non branchée** | le contrat doit l'accueillir sans être modifié |

### Pourquoi le VPS et pas un hébergeur d'API léger

Ce qui est déporté est de la **lecture avec cache** : un CX23 l'encaisse pour des
milliers de requêtes par minute. Ajouter Cloudflare Workers ou Vercel
introduirait un service de plus à déployer et surveiller, pour un gain nul à ce
stade. Caddy, systemd et le routeur existent déjà.

Le serverless deviendra pertinent en cas d'audience multi-continents ou de pics
imprévisibles. L'architecture ci-dessous permet de basculer **sans toucher à
l'app**, puisque celle-ci ne connaît qu'une URL de passerelle.

### Ce qui reste local, et pourquoi

Séances, historique, poids corporel, objectifs, journal alimentaire : **sur
l'appareil**. Les déporter imposerait comptes, authentification, sauvegardes et
conformité RGPD — un projet à part entière, sans bénéfice pour un usage
mono-appareil.

---

## Architecture cible

```
App ──► passerelle unique (une URL, une clé)
         ├─ GET  /v1/products/{barcode}   → cache → OpenFoodFacts
         ├─ GET  /v1/foods?q=             → catalogue aliments
         ├─ GET  /v1/exercises?q=         → catalogue exercices
         └─ POST /v1/meal/analyze         → pipeline IA interne
                  ├─ [à venir] service de profondeur
                  └─ Gemini (ou modèle maison v9)
```

**Règle structurante : l'app ne sait jamais combien d'IA travaillent derrière.**
Elle envoie une photo, elle reçoit des aliments et des grammes. L'ajout de la
profondeur enrichira le pipeline **interne** sans modifier le contrat, donc sans
republier l'app ni bloquer les utilisateurs restés sur une ancienne version.

### Deux champs prévus dès maintenant pour ne pas casser le contrat plus tard

Toute réponse d'analyse porte :

```json
{
  "items": [ { "name": "…", "grams": 120 } ],
  "pipeline_version": "1",
  "estimation_method": "vision"
}
```

`estimation_method` vaudra `"vision+depth"` quand la profondeur sera branchée.
L'app peut l'ignorer aujourd'hui et l'exploiter demain (afficher « estimé par
volume ») sans changement de protocole.

---

## Contrat des points d'entrée

Authentification : en-tête `Authorization: Bearer <clé>`, la même que l'analyse
photo. Réponses en JSON, erreurs au format `{ "error": { "code", "message" } }`.

### `GET /v1/products/{barcode}`

Remplace l'appel direct à OpenFoodFacts depuis l'app.

Réponse : produit **normalisé par le serveur** (nom, marque, nutriments pour
100 g, unité, poids unitaire si connu). `404` si introuvable.

Bénéfices : cache partagé entre tous les utilisateurs, normalisation centralisée,
source substituable sans republier l'app.

### `GET /v1/foods?q=<terme>&limit=<n>` · `GET /v1/exercises?q=<terme>&limit=<n>`

Recherche paginée. Remplace les packs téléchargés depuis GitHub.

### `POST /v1/meal/analyze`

Reprend l'actuel `/v1/chat/completions?engine=gemini` derrière un contrat propre
à l'application, au lieu d'exposer un format OpenAI que l'app n'a pas à connaître.

Entrée : `{ "image_jpeg_base64": "…" }` (photo compressée à 768 px / JPEG 0.6
côté app, comme aujourd'hui).

---

## Comportement sans réseau

| Situation | Ce que fait l'app |
|---|---|
| Élément déjà consulté | servi depuis le cache local |
| Élément jamais consulté | message « connexion requise », aucune valeur inventée |
| Séance en cours | fonctionne normalement, tout est local |
| Analyse photo | indisponible, message explicite |

Le cache est une **mémoire de lecture**, pas une base : il conserve ce qui a été
consulté, avec une durée de validité. Il ne prétend jamais être complet.

**Interdit** : afficher une valeur par défaut ou approximative en cas
d'indisponibilité. Un chiffre faux est pire qu'une absence de chiffre — voir la
dépense énergétique à 0 qui déclenchait une alerte d'excédent fictive.

---

## Plan de migration — une brique par branche

L'ordre n'est pas négociable : chaque étape valide le patron pour la suivante.

| # | Brique | Portée | Pourquoi cet ordre |
|---|---|---|---|
| 1 | **Code-barres** | serveur + client + cache | la plus simple ; valide passerelle, cache et gestion hors réseau |
| 2 | **Catalogue aliments** | serveur + recherche + cache | réutilise le patron de l'étape 1 |
| 3 | **Catalogue exercices** | idem | permet d'alléger `exercises.catalog.json` (1,6 Mo embarqués) |
| 4 | **Onboarding** | app | retrait de l'étape « télécharger » (7 → 6 étapes), devenue sans objet |
| 5 | `/v1/meal/analyze` | serveur + client | remplace le contrat OpenAI ; prépare la profondeur |

Chaque étape : une branche, un périmètre, des tests, une validation sur émulateur
avant fusion.

---

## Risques identifiés

**Le VPS n'a pas de GPU.** Un CX23 offre 2 vCPU et 4 Go de RAM. Le modèle v9 y
tourne déjà en CPU. Une IA de profondeur en CPU coûterait **5 à 15 s par image**,
contre 1,5 s aujourd'hui pour Gemini. Trois voies : CPU (probablement
rédhibitoire), GPU à la demande (Replicate/RunPod/Modal, ~0,001 €/image), ou VPS
GPU (50 à 200 €/mois). **À trancher après mesure**, pas avant.

**Le VPS devient un point de défaillance unique.** Aujourd'hui seule l'analyse
photo en dépend ; après migration, chercher un aliment aussi. Une panne rend l'app
partiellement inutilisable. À prévoir : surveillance, et une page de statut ou un
message d'indisponibilité clair.

**La clé Bearer n'est pas un secret.** Elle est inlinée dans le bundle, donc
extractible de l'APK. Déporter plus de fonctionnalités derrière elle augmente ce
qu'un tiers peut consommer à tes frais — notamment le quota Gemini. Un quota par
appareil ou un jeton signé devient nécessaire avant toute audience réelle.
