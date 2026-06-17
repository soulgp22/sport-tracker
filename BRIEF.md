# BRIEF — App de sport (test du CCR local)

> Ce fichier = les **exigences** + la **politique de cerveaux**. C'est TOI (la session
> `ccr code` locale) qui fais TOUT le travail technique : architecture, scaffold, code,
> tests. Le but est de stress-tester le routeur CCR sur un vrai projet complexe.

## L'app à construire
Un tracker de sport / musculation, en **Expo (React Native + TypeScript)**, testable sur
téléphone via **Expo Go**.

### Fonctionnalités (MVP)
1. **Programmes** — créer/éditer des programmes (jours × exercices × séries/reps/poids cible).
2. **Séance live** — démarrer une séance depuis un programme : logger les séries réalisées
   (poids/reps), timer de repos entre séries.
3. **Historique** — liste des séances passées avec détail.
4. **Progression** — graphiques : poids et volume par exercice dans le temps.
5. **Persistance locale** — AsyncStorage (aucun backend).
6. **Navigation** — expo-router, 4 onglets : Programmes / Séance / Historique / Progression.

## Politique de cerveaux (IMPORTANT — c'est le test du CCR)
- **Architecture & tâches complexes d'intégration → DeepSeek** :
  `/model deepseek,deepseek-chat`
- **Implémentation des tâches bien cadrées → local qwen3:14b** (défaut) :
  `/model ollama,qwen3:14b`
- **Tâche très lourde / gros fichier où le local cale → Codex** : `/codex <tâche>`
- Vérifie après chaque bascule : le champ `model` des réponses confirme le cerveau actif.

## Déroulé attendu
### Phase 1 — Archi & scaffold (cerveau : DeepSeek)
1. Lis ce BRIEF.
2. Produis `ARCHITECTURE.md` (stack, arborescence, types TS du modèle de données, gestion
   d'état, design storage, choix lib de graphes) et `BUILD_PLAN.md` (tâches ordonnées,
   chacune taguée `[LOCAL]` ou `[DEEPSEEK]`).
3. Scaffold le projet Expo (`npx create-expo-app`), installe les deps, vérifie que
   `npx expo start` démarre sans erreur.

### Phase 2 — Implémentation (cerveau : local qwen3:14b par défaut)
- Implémente les tâches `[LOCAL]` du `BUILD_PLAN.md` une par une, en commitant après chacune.
- Bascule sur DeepSeek pour les tâches `[DEEPSEEK]`, puis reviens au local.

## Définition de « terminé »
- `npx expo start` démarre, l'app s'ouvre dans Expo Go.
- Les 4 onglets fonctionnent, on peut créer un programme, logger une séance, la retrouver
  dans l'historique, et voir un graphique de progression.
- Données persistées après fermeture de l'app.

## Notes de test (à remplir au fur et à mesure)
- Quelle tâche a réussi avec quel cerveau, où le local a calé, où DeepSeek/Codex ont aidé.
