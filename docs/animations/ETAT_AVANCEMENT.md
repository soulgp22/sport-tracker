# Animations 3D — État d'avancement (23/07/2026)

Objectif produit : créer, intégrer et **vendre** des animations 3D d'exercices
(démo interactive dans Life Sport Tracker + catalogue vendable).
Une animation = un produit. Plusieurs entrées du catalogue peuvent partager
le même GLB via la table d'alias (voir `CATALOGUE_HARMONISE.csv`).

## ✅ Ce qui est fait et validé

### 1. Viewer 3D dans l'app (Expo SDK 56, DOM Component)
- `src/components/exercises/dom/ExerciseModelViewer.tsx` : `'use dom'` +
  `@google/model-viewer` v4.3.1. Rotation caméra au doigt, autoplay, fond noir.
- `src/components/exercises/ExerciseModel3D.tsx` : wrapper natif
  (`Asset.fromModule(...).uri`, taille via `dom={{ style }}`).
- `src/data/exerciseModels.ts` : mapping id exercice → `require('...glb')`.
- Affiché dans `ExerciseDetailView.tsx` quand un GLB existe pour l'exercice.
- **Leçons apprises (ne pas ré-échouer dessus)** :
  - La page DOM d'Expo ne donne aucune hauteur à `html/body/#root` → tout
    `height:100%` s'effondre à 0 (écran blanc). Fix : hauteurs forcées +
    `position:fixed; inset:0`.
  - Metro n'indexe pas les nouveaux assets à chaud → **redémarrer Metro**
    après ajout de GLB.
  - Ne JAMAIS exporter les lumières Blender dans le GLB (cumul avec l'env du
    viewer = rendu cramé). Éclairage = celui du viewer uniquement.
- Page de test autonome : `public/__kimi_dom_test.html` (à supprimer avant release).

### 2. Pipeline Blender (Blender 5.2 headless, `E:\AI\blender-test\blender-5.2.0-windows-x64\blender.exe`)
- `blender-poc/batch_exercise.py` : clip Mixamo FBX (X Bot, 30 fps, avec skin)
  → retarget vers rig Superhero (65 os, delta de rotation monde T-pose↔T-pose)
  → haltères PBR keyframés dans les poings si exo haltères (poings fermés 100°)
  → décor studio → purge des actions parasites → export GLB → previews EEVEE.
  **~5 secondes par exercice.**
- `blender-poc/glb_surgery.py` : fusion des clips (armature + haltères → 1 clip
  `Exercise`) + compression textures (Superhero 1024, Hair 512, Eye 256 ;
  JPEG q85 sauf normals PNG). **13 Mo → ~2,5 Mo par GLB.**
- Héros : `E:\AI\blender-test\avatar\Superhero_Male_FullBody.gltf`.
- T-pose X Bot : `blender-poc/xbot_tpose.fbx`.

### 3. Décor studio (template gelé)
- Sol disque sombre Ø2,8 m + anneau émissif teal + haltères métal sombre.
- Fond noir monde. Pas de lumières dans le GLB (voir leçon ci-dessus).

### 4. Les 6 animations en ligne (GLB ~2,5 Mo chacun, ~15 Mo total)
| id | Exercice | Clip source | Statut |
|---|---|---|---|
| offline-128 | Dumbbell Alternate Bicep Curl | Mixamo « Bicep Curl » | ✅ validé téléphone |
| offline-060 | Plank | Mixamo « Plank » | ✅ |
| offline-266 | Pushups | Mixamo « Push Up » | ✅ |
| offline-546 | Dumbbell Squat | Mixamo « Air Squat Bent Arms » | ✅ |
| offline-397 | Stiff-Legged Dumbbell Deadlift | Mixamo « Lifting Object » | ⚠️ genoux fléchis, à réévaluer |
| offline-026 | Dead Bug | Mixamo « Bicycle Crunch » | ⚠️ plutôt crunch, à réévaluer |

### 5. Rejetés V1a (clip Mixamo inadéquat — ne pas réessayer ces clips)
- Pullups / Chin-Up via « Braced Hang Hop Up » : personnage suspendu dans le vide.
- Shoulder Press / Side Lateral Raise via « Front Raises » : mauvais plan de mouvement.

## 🔧 Infra de test
- Metro : `CI=1 npx expo start -c --port 8081` (téléphone sur le même réseau).
- Validation Chrome sans téléphone : WebBridge → `http://localhost:8081/__kimi_dom_test.html`.
- Builds APK debug : voir journal session (Gradle + JAVA_HOME jbr).

## 📌 Prochaines étapes
1. Sourcing clips pour les mouvements manquants → table `RECHERCHE_CLIPS.md`.
2. Props à ajouter au template : barre olympique, banc, barre de traction.
3. Multi-décors / multi-avatars au choix utilisateur (vision long terme).
4. Compression Draco/meshopt si besoin (décodeur à embarquer, sinon offline KO).
