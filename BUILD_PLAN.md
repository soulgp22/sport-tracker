# BUILD_PLAN — Sport Tracker

> Taches ordonnees. Tag `[LOCAL]` = qwen3:14b suffit. Tag `[DEEPSEEK]` = logique complexe / integration.
> Commiter apres chaque tache terminee.
> Chemins de code : tout sous `src/` (convention template Expo SDK 56).

---

## Phase 1 — Scaffold & infra (TERMINEE)

| # | Tache | Tag | Statut |
|---|---|---|---|
| 1.1 | Scaffold Expo + installer toutes les deps | [LOCAL] | OK |
| 1.2 | Produire ARCHITECTURE.md + BUILD_PLAN.md | [DEEPSEEK] | OK |
| 1.3 | Verifier `npx expo start` demarre | [LOCAL] | OK |

---

## Phase 2 — Fondations TS & store

| # | Tache | Tag | Detail |
|---|---|---|---|
| 2.1 | Types TS | [LOCAL] | Creer `src/types/index.ts` (types du bloc ARCHITECTURE.md) |
| 2.2 | Storage adapter | [LOCAL] | `src/storage/storageAdapter.ts` — wrapper AsyncStorage pour Zustand persist |
| 2.3 | programStore | [LOCAL] | `src/store/programStore.ts` — Zustand CRUD programmes + exercices, persiste |
| 2.4 | sessionStore | [LOCAL] | `src/store/sessionStore.ts` — Zustand historique seances, persiste |
| 2.5 | activeSessionStore | [LOCAL] | `src/store/activeSessionStore.ts` — seance en cours (non persiste) |

---

## Phase 3 — Navigation & layout

| # | Tache | Tag | Detail |
|---|---|---|---|
| 3.1 | Root layout | [LOCAL] | `src/app/_layout.tsx` — SafeAreaProvider + hydratation stores |
| 3.2 | Tab layout | [LOCAL] | `src/app/(tabs)/_layout.tsx` — 4 onglets avec icones Expo Vector Icons |
| 3.3 | Ecrans placeholder | [LOCAL] | Un ecran vide par onglet (text centre) pour valider la navigation |

---

## Phase 4 — Ecrans Programmes

| # | Tache | Tag | Detail |
|---|---|---|---|
| 4.1 | Composants UI de base | [LOCAL] | `Button`, `TextInput`, `EmptyState` dans `src/components/ui/` |
| 4.2 | Liste programmes | [LOCAL] | `src/app/(tabs)/programs/index.tsx` — FlatList + ProgramCard + bouton + |
| 4.3 | Creation programme | [LOCAL] | `src/app/(tabs)/programs/new.tsx` — formulaire nom + ajout jours |
| 4.4 | Detail/edition programme | [DEEPSEEK] | `src/app/(tabs)/programs/[id]/index.tsx` — edition inline jours/exercices/series |
| 4.5 | Edition d'un jour | [DEEPSEEK] | `src/app/(tabs)/programs/[id]/day/[dayId].tsx` — reordonner exercices, editer series |

---

## Phase 5 — Seance live

| # | Tache | Tag | Detail |
|---|---|---|---|
| 5.1 | Selection programme | [LOCAL] | `src/app/(tabs)/session/index.tsx` — choisir programme + jour -> demarrer |
| 5.2 | Hook timer repos | [LOCAL] | `src/hooks/useRestTimer.ts` — countdown avec pause/reset |
| 5.3 | Ecran seance active | [DEEPSEEK] | `src/app/(tabs)/session/active.tsx` — exercice courant, log set, serie suivante |
| 5.4 | Modal timer repos | [LOCAL] | `src/components/session/RestTimerModal.tsx` — plein ecran countdown |
| 5.5 | Finalisation seance | [LOCAL] | Bouton Terminer -> sauvegarde sessionStore -> redirect historique |

---

## Phase 6 — Historique

| # | Tache | Tag | Detail |
|---|---|---|---|
| 6.1 | Liste historique | [LOCAL] | `src/app/(tabs)/history/index.tsx` — FlatList sessions triees par date |
| 6.2 | Detail seance | [LOCAL] | `src/app/(tabs)/history/[id].tsx` — tableau exercices/series realisees |

---

## Phase 7 — Progression (graphiques)

| # | Tache | Tag | Detail |
|---|---|---|---|
| 7.1 | Hook donnees progression | [DEEPSEEK] | `src/hooks/useProgressData.ts` — agreger sessions par exercice, series temporelles |
| 7.2 | WeightChart | [LOCAL] | `src/components/progress/WeightChart.tsx` — LineChart poids max par date |
| 7.3 | VolumeChart | [LOCAL] | `src/components/progress/VolumeChart.tsx` — BarChart volume par seance |
| 7.4 | Ecran progression | [DEEPSEEK] | `src/app/(tabs)/progress/index.tsx` — selecteur exercice + 2 graphiques |

---

## Phase 8 — Polish & QA

| # | Tache | Tag | Detail |
|---|---|---|---|
| 8.1 | Gestion erreurs & etats vides | [LOCAL] | EmptyState sur chaque liste, validation formulaires |
| 8.2 | UX timer & feedback haptique | [LOCAL] | `expo-haptics` sur log set + fin timer |
| 8.3 | Test persistance | [LOCAL] | Fermer/rouvrir app, verifier donnees presentes |
| 8.4 | Test navigation complete | [LOCAL] | Parcours complet : creer programme -> seance -> historique -> graphique |

---

## Notes de test (a remplir)

| Tache | Cerveau | Resultat | Notes |
|---|---|---|---|
| Phase 1 scaffold | Claude Code | OK — Metro demarre | SDK 56, React 19, expo-router sur src/app/ |
