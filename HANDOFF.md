# HANDOFF — Contexte de travail (passation à Kimi Code)

> Document de contexte pour tout agent qui reprend ce projet.
> Dernière mise à jour : 26 juillet 2026.

## Projet

**Life Sport Tracker** — application mobile de suivi de musculation (Expo / React Native, expo-router, TypeScript). 100 % hors-ligne (AsyncStorage uniquement, aucune donnée envoyée).
Racine du projet : `E:\AI\Claude Code\sport-tracker`

## Objectifs business

1. Publier l'app sur le **Google Play Store** (en cours, voir état ci-dessous).
2. **Produire et vendre des animations 3D d'exercices** (dans l'app + en standalone) — autoproduction via mocap/Cascadeur, JAMAIS de packs achetés pour la revente.

## Environnement (vérifié)

- Node : ajouter au PATH → `export PATH="/c/Program Files/nodejs:$PATH"` (Git Bash)
- eas-cli : `C:\Users\soulg\AppData\Roaming\kimi-desktop\daimon-share\daimon\npm-global\eas.cmd` (PAS dans le PATH utilisateur ; utiliser le chemin complet ou `setx PATH`)
- Compte Expo : **soulgp** (seirais@outlook.fr) — `eas login` fait
- Compte GitHub : **soulgp22** (credentials Git présents, token dans le credential manager)
- adb : `E:\Android\Sdk\platform-tools\adb.exe`
- Blender 5.2 : `E:\AI\blender-test\blender-5.2.0-windows-x64\blender.exe` (⚠️ 5.2 : `Action.fcurves` supprimé, export FBX d'action cassé → travailler dans une seule session Blender)
- Python managé Kimi : `python` dans Bash (MediaPipe 0.10.35 installé, modèle `C:\Users\soulg\Documents\kimi\workspace\pose_landmarker_heavy.task`)
- App Expo/RN : version 1.0.0, package `com.sportracker.app`, SDK 56

## État d'avancement

### ✅ Fait
- **Audit complet** (code mort, bugs P0/P1 corrigés, tsc 0 erreur, 218/218 tests verts) → documenté dans `docs\AUDIT_PLAYSTORE.md`
- **AAB production buildé** : `sport-tracker-1.0.0.aab` (93 Mo, versionCode 2, keystore EAS « Build Credentials 3uVMZXWvgx »). Rebuild : `eas build --platform android --profile production`
- **Créatives Play Store** : `docs\play-store\assets\playstore-icon-512.png` + `playstore-feature-1024x500.png` (régénérables via `C:\Users\soulg\Documents\kimi\workspace\make_store_assets.py`)
- **Textes fiche** : `docs\play-store\FICHE_PLAY_STORE.md` (descriptions, Data Safety = aucune donnée, IARC PEGI 3)
- **Politique de confidentialité en ligne** : https://soulgp22.github.io/life-sport-tracker-privacy/ (repo `soulgp22/life-sport-tracker-privacy`, contact seirais@outlook.fr)
- **Play Console** : app créée, test interne publié (release 2 (1.0.0), 26/07 00:22) puis **releases 3 (1.1.0), 4 (1.1.1), 6 (1.1.2) et 7 (1.1.3) soumises automatiquement via `eas submit`** (28/07 00:30, statut COMPLETED — clé de service `pc-api-key.json` gitignorée, track internal configuré dans `eas.json`). 1.1.0 = correctif encodage, 72 programmes onboarding, harmonisation UI, i18n complète. 1.1.1 = correctifs dialogues, badge équipement, version dynamique, viewer 3D (GLB en data-URI base64). 1.1.2 = mannequin blanc (lumières GLB offline-128 retirées). 1.1.3 = filtres programmes communauté, aliments à l'unité (unitWeightGrams), programmes 100 % sans matériel. Propagation en cours
- **eas submit opérationnel** : pour la prochaine release → bumper `version` dans `app.json`, `eas build --platform android --profile production`, `eas submit --platform android --profile production --latest --non-interactive`
- **Pipeline mocap maison** (fonctionnel, qualité insuffisante) : `C:\Users\soulg\Documents\kimi\workspace\blender-poc\npz_to_glb.py`, chirurgie GLB `blender-poc\glb_surgery.py`
- **Projet fine-tune VLM repas (décidé 28/07)** : socle Nutrition5k (CC BY 4.0) + capture maison (balance + protocole studio, mode capture à coder dans l'app) + flywheel corrections opt-in (codé, `src/lib/mealPhotoTrainingLog.ts`). Entraînement : Unsloth LoRA vision sur Gemma 4 (Apache 2.0, ~10 Go VRAM QLoRA, GPU loué < 50 $). Export : GGUF + llama.rn (principal), LiteRT-LM (plan B). Éval : F1 ingrédients + MAE grammes base vs fine-tuné sur split test officiel — ship seulement si gain réel. **Synthétique Blender EXCLU (usine à gaz prouvée : NV3D2D/MDPI 2025 + Stanford CS231n)**. FPB (ISSAI, grammes labo) en complément si licence confirmée.
  **ÉTAT DATA+MODÈLE (29/07)** : PIPELINE COMPLET VALIDÉ. Dataset `dataset/train.jsonl` (4015→4014 après filtre <5 g + cap 8 items/plat) + `dataset/test.jsonl` (706). **Modèle maison `lfm450m-v2`** : LoRA langage-only (r=16, 2 epochs, RTX 5080 locale 19 min) sur LFM2.5-VL-450M → **F1 0,654 / MAE total 49,6 g / MAE item 28,7 g vs base 0,469/112/86** (éval 200 plats, `finetune/eval_results_v2.json`). Mergé → GGUF Q4_K_M dans `models/lfm450m-v2/` (gguf 709 Mo + mmproj 189 Mo → 418 Mo quantifié, vision OK, validé dans le comparateur : JSON 3/3, modèle le plus rapide 2,4-4,8 s). Prompt final EN : `finetune/PROMPT_FINAL.txt` (l'app doit l'utiliser). Scripts : `finetune/train.py|eval.py|merge_lora.py`, venv `E:/AI/venv-ft`, page suivi webcompare `/training`. Comparateur modèles : `webcompare/app.py` (4 modèles dont lfm450m-v2, http://localhost:5050). **PROCHAINES ÉTAPES : intégration app = remplacer executorch/Gemma 4 (4,4 Go) par llama.rn + GGUF 418 Mo (gating RAM ~3-4 Go au lieu de 7), prompt EN, RAG sur table ingrédients N5k (`ingredients_metadata.csv`), parser tolérant troncature.** Améliorations futures : 3-4 epochs, r=32, items 2-5 g partiels, capture maison (mode capture app). Bug connu à corriger : téléchargement du modèle sur device échoue (URLs OK depuis PC — logcat adb + push direct du modèle via `adb run-as` prévus).
- **Skill Gemini Robotics-ER** installé : `E:\AI\skills\gemini-robotics-er\SKILL.md` (+ copie dans les skills Kimi) — analyse spatiale d'images, protocole test à l'aveugle

### ⏳ En cours / à faire
0. **Spike IA photo repas (VLM on-device)** — implémenté, EN VALIDATION sur device via builds APK preview : modèle **Gemma 4 E2B multimodal** (executorch 0.9.2, ~4,5 Go téléchargés à la demande, backend Vulkan — swap depuis LFM2.5-VL 1.6B jugé trop faible), gating Android 13+/RAM 7 Go/stockage 6 Go. Pipeline : photo → liste {aliments, grammes} → matching base locale → écran de validation obligatoire (l'IA pré-remplit, ne calcule jamais les macros). Crash sortie d'écran corrigé (jamais de démontage pendant génération — controller.delete() lève sinon). Follow-ups : purge du modèle (deleteResources), hébergement R2 + sha256 si prod, licence Gemma Terms of Use (notice affichée dans l'app). Play Console : déclaration permissions santé Health Connect soumise par l'utilisateur (28/07) + privacy policy mise à jour en ligne
1. **Play Store** : attendre propagation test interne → tester l'install sur téléphone → recruter **12-20 testeurs fermés pendant 14 jours** (obligatoire avant production, annonce Upwork rédigée dans la conversation Kimi) → captures d'écran à prendre depuis le téléphone (min. 2 : accueil, timer, exo 3D, stats)
2. **Cascadeur Premium (mocap vidéo → FBX)** — piste principale pour les animations :
   - Vidéo de référence bench press : `E:\AI\motioncapture\developpe-couche-barre\output\bench_trim_8s.mp4` (8,3 s, 250 frames)
   - Marche à suivre : ouvrir une scène avec personnage (`C:\Program Files\Cascadeur\samples\` — UE5_Manny.casc), importer la vidéo en référence, sélectionner la plage timeline, bouton **Mocap** (package ~700 Mo au 1er usage), puis **File → Export → FBX** (preset Animation, Bake coché) → `E:\AI\motioncapture\developpe-couche-barre\output\bench_cascadeur.fbx`
   - Ensuite : retarget FBX → avatar de l'app → GLB optimisé → validation visuelle (skill gemini-robotics-er, test à l'aveugle + vue de profil + mesure géométrique)
3. **24 dossiers exercices P1** prêts : `E:\AI\motioncapture\<exo>\videos|output` (l'utilisateur dépose les vidéos, l'agent traite)
4. **Tableaux de suivi** : `docs\animations\CATALOGUE_HARMONISE.csv` + `ETAT_AVANCEMENT.md` — vérifiés complets et cohérents avec les 24 dossiers P1 (26/07)
5. Dette technique : ~~mémorisation prop `dom`~~ (fait 26/07), ~~`expo install --check`~~ (fait 26/07 : 9 modules maj + plugin expo-web-browser, tsc 0 err, 218/218 tests verts), vérif webp animé — assets OK (23/23 animés, Metro OK, `.easignore` OK) mais **lecture animée à valider sur téléphone** via le test interne

## Règles de collaboration avec l'utilisateur

- Français, tutoiement. **Allergique au gaspillage de tokens** : pas de boucles, pas de relecture inutile, actions directes.
- Veut une **validation visuelle AVANT** de tester quoi que ce soit. Exigence : « rendu parfait, aucun compromis ».
- Les vidéos d'exercices sont fournies par l'utilisateur ; l'agent gère tout le pipeline ensuite.
- Ne JAMAIS proposer d'animations sous licence restrictive pour la revente (Sketchfab/Fab interdits en standalone).
