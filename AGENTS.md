# AGENTS.md — Règles de travail sur Life Sport Tracker

> Ce fichier est la porte d'entrée. Tout agent (Claude, Codex, Cline/DeepSeek…)
> le lit avant d'écrire une ligne de code.
> `CLAUDE.md` pointe vers ce fichier — ne pas dupliquer les règles ailleurs.

## ⚠️ Expo a changé

Lire la documentation **versionnée** avant d'écrire du code Expo :
<https://docs.expo.dev/versions/v56.0.0/>
Ne jamais se fier à sa mémoire d'une API Expo : elle a probablement changé.

---

## Fichiers de référence — à lire ET à tenir à jour

| Fichier | Contenu | Quand l'ouvrir |
|---|---|---|
| [known_bugs.md](known_bugs.md) | bugs rencontrés, cause racine, comment les éviter | **avant** de diagnostiquer, **après** avoir corrigé |
| [reusable_functions.md](reusable_functions.md) | fonctions et motifs réutilisables du dépôt | avant d'écrire une capacité importante |
| [api.md](api.md) | toutes les API consommées ou exposées | avant de toucher au réseau |
| [connexions.md](connexions.md) | services, serveurs, clés, chemins d'accès | avant de configurer ou déployer |
| [Tests.md](Tests.md) | stratégie de test, un test par bug corrigé | avant de déclarer une tâche finie |
| [docs/tests-avant-prod.md](docs/tests-avant-prod.md) | portail de validation avant publication | avant tout `eas submit` |

**Règle de mise à jour :** un bug corrigé s'écrit dans `known_bugs.md` **et** donne
un test dans `Tests.md`. Une fonction réutilisable s'inscrit dans
`reusable_functions.md`. Une nouvelle API ou connexion s'inscrit dans `api.md` /
`connexions.md`. Ce n'est pas optionnel : c'est la partie « mémoire » du travail.

---

## Core Development Rules

### 1. Understand before coding

* Inspect the existing implementation before modifying anything.
* Reuse existing architecture, components, patterns and conventions.
* Never invent behaviour, APIs, database fields or business rules.
* If something is uncertain, verify it from the repository before deciding.

### 2. Respect task scope

* Modify only what is required for the current task.
* Do not perform opportunistic refactors.
* Do not introduce unrelated changes.
* Explicitly report any required change outside the requested scope.

### 3. UI consistency

* Before any UI change, identify the existing parent layout and at least one comparable screen/component.
* Reuse existing UI components, spacing, typography, colors and interaction patterns.
* Never place buttons, menus, filters or actions arbitrarily.
* Do not create a new UI pattern when an equivalent already exists.

### 4. Modular and headless by default

* Keep business logic independent from the graphical interface whenever reasonably possible.
* UI components should consume services/modules instead of containing important business logic.
* Design important capabilities as reusable modules with explicit inputs, outputs and errors.
* Expose reusable capabilities through a stable API/interface when useful.
* Prefer modular architecture; do not create microservices without a real benefit.

### 5. Reusability

Before implementing an important capability, check:

* Does an equivalent already exist?
* Can it become an independent module?
* Can another project reuse it?
* Can it work without the current UI?
* Should it expose an API, SDK or contract?

### 6. Bugs

* Reproduce the bug before fixing it when possible.
* Identify the root cause, not only the symptom.
* Add a regression test for reproducible bugs whenever practical.
* Record reusable lessons from recurring failures.

### 7. Tests and validation

Never declare a task complete until:

* acceptance criteria are satisfied;
* relevant tests pass;
* lint/typecheck pass when available;
* production build passes;
* the final diff has been inspected;
* no unrelated files were modified.

Never disable or weaken tests simply to make validation pass.

### 8. Independent review

* Implementation and review must be conceptually separate.
* Review the specification and final diff.
* Prioritize bugs, regressions, missing tests, architectural violations, UI inconsistencies and out-of-scope changes.

### 9. Git

* One coding task = one branch = one isolated scope.
* Use a worktree when parallel work is needed.
* Never push directly to `main`.
* Never mix unrelated tasks in the same branch.

### 10. Knowledge and memory

* The repository is the canonical source of truth.
* Tests and current code override agent memory or previous conversations.
* Important discoveries must be persisted as:
  * business rule;
  * architecture decision;
  * UI rule;
  * known failure;
  * regression test;
  * reusable skill/workflow.
* Do not make the same validated mistake twice.

### 11. Evidence over claims

Never finish with only “done” or “everything works”.
Report:

* what changed;
* files changed;
* tests/commands executed;
* validation results;
* unresolved risks or assumptions.

---

## Interdits propres à ce dépôt

Ces règles viennent d'incidents réels. Chacune a coûté une régression en production.

1. **Ne jamais combler un trou par de l'improvisation.** Si une information manque
   (valeur, comportement attendu, règle métier), **demander** ou **documenter
   l'hypothèse explicitement**. Une valeur inventée qui ressemble à une vraie est
   pire qu'une erreur visible.
2. **Justifier tout choix technique** dans le message de commit : pourquoi cette
   solution, quelles alternatives écartées, et à quel prix.
3. **Ne jamais épingler une version canary / beta / rc.** Une canary
   d'`expo-navigation-bar` a fait planter l'app au démarrage pour tous les
   utilisateurs (voir `known_bugs.md`).
4. **Interdit : correspondance par sous-chaîne (`includes`)** pour identifier ou
   router quoi que ce soit.
5. **Tout texte visible passe par l'i18n**, dans les 4 langues (fr, en, es, de).
   Le test de parité doit rester vert.
6. **Le dépôt est PUBLIC.** Aucun secret dans un fichier suivi — voir
   `connexions.md`.
7. **Un test qui ne peut pas échouer ne prouve rien.** Après avoir écrit un test
   de régression, réintroduire volontairement le défaut et vérifier qu'il rougit.
8. **Ne jamais faire confiance au rapport d'un agent exécutant.** Vérifier soi-même :
   diff, tests, et rendu à l'écran quand le changement est visible.

## Validation avant publication

Un `eas submit` n'est légitime qu'après avoir **lancé l'APK release sur
l'émulateur** `SportTracker_Pixel8` et constaté que l'app atteint l'écran
d'accueil, avec `adb logcat -b crash -d` vide. Quinze secondes de test auraient
évité un crash publié à tous les testeurs.

Détail complet : [docs/tests-avant-prod.md](docs/tests-avant-prod.md).
