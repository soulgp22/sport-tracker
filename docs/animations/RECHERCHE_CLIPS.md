# Recherche de clips mocap — table de travail pour l'agent de sourcing

> **Mission** : trouver pour chaque produit ci-dessous un clip de capture de mouvement (mocap) ou
> d'animation 3D du bon exercice de musculation, retargetable sur notre héros
> (`Superhero_Male_FullBody.gltf`, rig Xbot-compatible). Le pipeline Blender existe déjà
> (`blender-poc/batch_exercise.py`) : il accepte un FBX d'animation + un Xbot T-pose.
>
> **Règle d'or (aucun compromis)** : un pratiquant de musculation doit reconnaître le mouvement
> **immédiatement**. Un clip « presque pareil » est un rejet, pas une approximation.
> En cas de doute, exporter un GLB de test et faire valider visuellement avant d'adopter.

---

## 1. Format de livraison attendu de l'agent

Pour chaque produit traité, mettre à jour ce tableau (colonne **Statut** + **Clip trouvé / source**)
et déposer les fichiers dans `blender-poc/clips/` avec mise à jour de `blender-poc/clips/mapping.json` :

```json
{ "produit": "Tractions", "fichier": "clips/pullup.fbx", "source": "<url/banque>", "licence": "<…>" }
```

Formats acceptés par le pipeline : **FBX** (idéal), BVH ou GLB animé (convertissables via Blender).
Licence : vérifier et noter la licence de chaque clip (usage commercial prévu — **les animations seront vendues**).

## 2. Statuts Mixamo — à NE PAS réessayer

Mixamo a été ratissé (~38 requêtes, agent de sourcing V1a). Ces pistes sont **mortes** :

| Produit | Clip Mixamo essayé | Verdict |
|---|---|---|
| Développé couché (barre/haltères), floor press, incliné | — | AUCUN clip de press allongé n'existe sur Mixamo |
| Rowing un bras haltère | — | AUCUN clip trouvé |
| Fentes | — | AUCUN clip trouvé |
| Développé épaules haltères | « Front Raises » | REJETÉ — élévations avant, mauvais plan |
| Élévations latérales | « Front Raises » | REJETÉ — mauvais plan |
| Tractions | « Braced Hang Hop Up » | REJETÉ — grimpe/escalade, suspendu dans le vide |

Mixamo reste utilisable pour des mouvements génériques non listés ci-dessus, mais ne pas relancer
de recherches sur ces 6 produits côté Mixamo.

## 3. Pistes de sourcing (par ordre de préférence)

1. **Banques mocap gratuites/libres** : CMU Graphics Lab Motion Capture Database (BVH, libre),
   ACCAD (Ohio State), HDM05 (recherche), LaFAN1 (Ubisoft, licence recherche — vérifier).
2. **Mixamo** : uniquement pour les produits non marqués « morts » ci-dessus.
3. **Assets Unity/Unreal marketplaces** : packs d'animations « gym / workout / fitness »
   (souvent FBX inclus, licence commerciale claire — **piste privilégiée si budget**).
4. **Blender community / Sketchfab** : animations sous CC-BY (noter l'attribution).
5. **Composition** : assembler le mouvement à partir de poses clés dans Blender
   (dernier recours, coûteux en temps — réserver aux exercices simples comme Crunch, Russian twist).
6. **Mocap maison** (plus tard) : vidéo → mocap (Rokoko Video, Plask, DeepMotion) — à évaluer
   si les banques échouent sur les produits top.

## 4. Produits P1 — file de recherche (ordre = priorité business)

| # | Produit (canonique FR) | Usages cumulés | Props à afficher | Description du mouvement cible | Mots-clés de recherche (EN) | Statut | Clip trouvé / source |
|---|---|---|---|---|---|---|---|
| 1 | Tractions | 27 | barre de traction | Corps suspendu à une barre, traction jusqu'au menton au-dessus de la barre, descente contrôlée bras tendus | pull-up, chin-up, hanging pull up mocap | ❌ NON TROUVÉ | Aucune source libre (CMU/ACCAD/Sketchfab/GitHub ratissés, sourcing V2). Piste payante : CGTrader « Anatomy Pull-up Animated » (~215 $). Sinon mocap maison (Rokoko/Plask) |
| 2 | Fentes | 27 | haltères (option) | Grand pas en avant, flexion des deux genoux à ~90°, retour debout ; variantes avant/arrière acceptables | lunge, forward lunge, dumbbell lunge | ❌ NON TROUVÉ | CMU 144_17/144_11 « Lunges » téléchargés et testés = fentes d'arts martiaux, garde haute, pas de reps → REJETÉS (`clips/p1/_rejected_cmu/`). Pistes payantes : Fab « Gym Animation Pack » (DumbbellLungesFwdBH01_IP) ; Fab « Gym Animation Pack - Legs » (3 variantes) |
| 3 | Développé couché barre | 25 | barre + banc | Allongé sur banc, barre descendue à la poitrine puis poussée bras tendus | bench press, barbell bench press, lying chest press | ❌ NON TROUVÉ | Sketchfab CC-BY « WYN Bench Press » (uid d60b068a5a9a4589998115ceb43e8aa8) — téléchargement derrière login Sketchfab. Piste payante : Fab « Gym Animation Pack » (BarbellBenchPress01_IP, sample FBX gratuit offert sur la fiche) |
| 4 | Soulevé de terre roumain (RDL) | 21 | barre | Debout, barre en mains, hanche bascule en arrière jambes quasi tendues, barre glisse le long des cuisses, remontée par les hanches | romanian deadlift, RDL, stiff leg deadlift | ❌ NON TROUVÉ | Aucune source libre exacte. Existant projet : offline-397 « Lifting Object » (hinge, confidence 2) à réévaluer. Piste payante : Fab « 36 Fitness exercices, mocaped, set 2 » (deadlift) |
| 5 | Développé couché haltères | 20 | haltères + banc | Comme bench press mais un haltère par main | dumbbell bench press | ❌ NON TROUVÉ | Pistes payantes : Fab « 36 Fitness exercices, mocaped, set 2 » (chest press) ; CGTrader « 32 Fitness Workout Animation Pack FBX ». Sketchfab : rien en CC |
| 6 | Élévations latérales | 19 | haltères | Debout, bras montés sur les côtés jusqu'à l'horizontale, coudes légèrement fléchis | lateral raise, side raise, dumbbell side raise | ❌ NON TROUVÉ | Aucune source (libre ou payante) spécifique identifiée. Mouvement simple → composition Blender (poses clés) recommandée, ou mocap maison |
| 7 | Rowing barre penché | 19 | barre | Bustre penché ~45°, barre tirée vers le nombril, coudes le long du corps | bent over row, barbell row | ❌ NON TROUVÉ | CMU 79_95 « rowing » testé = aviron pantomime debout → REJETÉ. Piste payante : Fab « GYM Workout Animation Pack » (barbell_pronated_row / supinated_row / pendlay / meadows) |
| 8 | Développé épaules haltères | 18 | haltères | Debout ou assis, haltères poussés au-dessus de la tête | shoulder press, overhead press, dumbbell shoulder press | ❌ NON TROUVÉ | Sketchfab CC-BY « Barbell Overhead Press » dendiexpress (uid dd84736d8a3b4955ab5e3f31b7cc5b45) — login requis, barre ≠ haltères. Piste payante : Fab « Gym Animation Pack » (BarbellShoulderPress01_IP) |
| 9 | Soulevé de terre barre | 18 | barre | Barre au sol, saisie, levée jusqu'à debout complet, dos droit | deadlift, barbell deadlift | ❌ NON TROUVÉ | Sketchfab CC-BY « Sumo Deadlift » dendiexpress (uid 2fecbadf7d0d4fbd8adc64d5bb0bc603) — login requis, sumo ≠ conventionnel. Piste payante : Fab « Gym Animation Pack » (BarbellDeadlift01_IP) |
| 10 | Relevé de mollets debout | 17 | haltères (option) | Debout, montées sur la pointe des pieds | calf raise, standing calf raise, heel raise | ❌ NON TROUVÉ | Aucune source identifiée (même payante). Exercice très simple → composition Blender (poses clés) recommandée |
| 11 | Pont fessier (glute bridge) | 16 | aucun | Allongé dos au sol, pieds au sol, hanches poussées vers le haut | glute bridge, hip bridge, butt lift | ☐ À chercher | |
| 12 | Extension triceps au-dessus de la tête | 15 | haltère | Haltère tenu à deux mains au-dessus de la tête, flexion/extension des avant-bras | overhead triceps extension, triceps extension | ☐ À chercher | |
| 13 | Oiseau / reverse fly | 14 | haltères | Penché en avant, bras ouverts sur les côtés comme des ailes | reverse fly, rear delt fly, bent over fly | ☐ À chercher | |
| 14 | Squat barre arrière | 13 | barre | Barre sur les trapèzes, squat profond, remontée | barbell squat, back squat | ☐ À chercher | |
| 15 | Face pull | 13 | poulie/bande | Tirage vers le visage, coudes hauts et écartés | face pull, rope face pull | ☐ À chercher | |
| 16 | Développé incliné haltères | 12 | haltères + banc incliné | Bench press sur banc incliné ~30-45° | incline dumbbell press | ☐ À chercher | |
| 17 | Rowing un bras haltère | 12 | haltère (+ banc) | Une main et un genou sur banc, haltère tiré vers la hanche | one arm dumbbell row, single arm row | ☐ À chercher | |
| 18 | Rowing penché deux haltères | 9 | haltères | Comme rowing barre mais un haltère par main | two dumbbell row, bent over dumbbell row | ☐ À chercher | |
| 19 | Curl marteau | 9 | haltères | Curl biceps prise neutre (paumes face à face) | hammer curl | ☐ À chercher | |
| 20 | Floor press haltères | 8 | haltères | Bench press allongé au sol, coudes touchent le sol | dumbbell floor press | ☐ À chercher | |
| 21 | Curl barre | 8 | barre/EZ | Curl biceps à la barre debout | barbell curl, ez bar curl | ☐ À chercher | |
| 22 | Dips | 6 | barres parallèles | Corps entre deux barres, flexion/extension des bras, poitrine vers l'avant | dips, parallel bar dips, chest dips | ☐ À chercher | |
| 23 | Russian twist | 3 | aucun | Assis, pieds décollés, rotation du buste gauche-droite | russian twist, seated torso twist | ☐ À chercher | |
| 24 | Crunch | 3 | aucun | Allongé, relevé de buste partiel, lombaires au sol | crunch, abdominal crunch | ☐ À chercher | |

**Vague 1 recommandée (top 10)** : lignes 1 à 10 — couvre 210 usages cumulés sur 24 P1.

## 5. P2 — machines/poulies (à traiter APRÈS P1, nécessitent des props)

| Produit | Usages | Prop bloquant | Note |
|---|---|---|---|
| Leg curl allongé | 36 | machine leg curl | Plus gros usage hors P1 — à réévaluer en priorité si props machines avancent |
| Tirage vertical poulie (lat pulldown) | 23 | poulie haute | |
| Tirage horizontal poulie (seated row) | 23 | poulie basse + siège | |
| Presse à cuisses (leg press) | 21 | machine leg press | |
| Développé militaire barre | 19 | barre | Peut passer P1 sans prop nouveau — clip « military/overhead barbell press » |
| Band pull apart | 15 | bande élastique | |
| Leg extension | 14 | machine | |
| Autres P2 (mollets assis, incliné barre, pushdown, front squat, step-up, curl incliné, planche latérale, mountain climbers, skullcrusher, rowing inversé, shrugs, hip thrust) | — | divers | Voir CATALOGUE_HARMONISE.csv |

## 6. Props à créer dans le template Blender (à prévoir)

Le décor actuel gère déjà : haltères, sol/salle. À ajouter au template `batch_exercise.py` :

| Prop | Produits concernés | Priorité |
|---|---|---|
| Barre olympique | Dév. couché barre, RDL, SDT barre, rowing barre, squat barre, curl barre, militaire | **HAUTE** (6+ produits P1) |
| Banc (plat, inclinable) | Dév. couché, incliné, rowing un bras, hip thrust | **HAUTE** |
| Barre de traction | Tractions | HAUTE (produit #1) |
| Barres à dips | Dips | Moyenne |
| Poulie / bande élastique | Face pull, P2 poulies/bandes | Basse (P2) |
| Machines (leg curl, leg press, leg extension) | P2 machines | À décider plus tard — gros travail de modélisation |

Les props ne sont PAS exportés animés dans le GLB héros : ils sont ajoutés dans la scène Blender
comme le décor actuel, puis exportés avec le modèle. Adapter `batch_exercise.py` avec un nouvel
argument prop : `dumbbell | barbell | bench | pullup-bar | dip-bars | bodyweight`.

## 7. Critères d'acceptation (checklist par clip)

- [ ] Le mouvement est **immédiatement reconnaissable** par un pratiquant de muscu
- [ ] Amplitude complète (pas de demi-répétition tronquée)
- [ ] Posture correcte (dos, placement des pieds/mains plausible pour l'exercice)
- [ ] Boucle propre possible (début/fin proches) — sinon on coupe en post-traitement
- [ ] Pas de déplacement horizontal (mouvement en place uniquement)
- [ ] Licence notée et compatible avec une **vente commerciale**
- [ ] Export GLB de test validé visuellement (Chrome, page `__kimi_dom_test.html`) avant adoption

## 8. Références

- Catalogue harmonisé complet : `docs/animations/CATALOGUE_HARMONISE.csv`
- État du pipeline : `docs/animations/ETAT_AVANCEMENT.md`
- Clips déjà en ligne (exemples de qualité attendue) : `assets/models/offline-*.glb`

---

## 9. Journal de sourcing V2 (agent Kimi, 23 juillet 2026)

**Résultat : 0/10 clips adoptés en gratuit.** Aucun clip libre de droits ne passe la règle d'or
pour les 10 produits P1. Détail des sources ratissées :

| Source | Verdict |
|---|---|
| CMU mocap (miroir BVH `una-dinosauria/cmu-mocap`) | 5 candidats téléchargés et contrôlés visuellement (stick-figure Blender, bandes PNG dans `clips/p1/_rejected_cmu/`) : 144_11/144_17 « Lunges » = fentes d'arts martiaux (garde haute, une seule stance, pas de répétitions) ; 79_93 « weight lifting » = pantomime type curls debout ; 79_95 « rowing » = aviron debout. TOUS REJETÉS. Le reste de la base CMU ne contient aucun mouvement de musculation avec charge |
| ACCAD (Ohio State) | Catalogue = marche/course/arts martiaux/danse uniquement. Aucun contenu gym. Licence CC-BY 3.0 mais rien d'exploitable |
| Bandai Namco Research Motiondataset (GitHub, 3000+ BVH) | **CC BY-NC 4.0 → BLOQUANT** pour usage commercial |
| Sketchfab (recherche API publique) | Modèles animés **CC-BY téléchargeables existants** mais téléchargement derrière login Sketchfab : « WYN Bench Press » (uid d60b068a5a9a4589998115ceb43e8aa8), « Sumo Deadlift » + « Barbell Overhead Press » + « Kettlebell Squat » + « Barbell Bicep Curl » + « Bodyweight Crunch » (dendiexpress), 2× « Fitness Character » 5 anims chacun (uid c8b5908934ec4afcb9e1c67a8b2f7afb, bb977296b2cf4d0eb8d743b3400b2525, contenu des anims inconnu). **Action possible : les télécharger via le navigateur de l'utilisateur (session Sketchfab) avec kimi-webbridge** |
| GitHub (recherches repo : gym mocap, workout fbx, bench-press, deadlift, fitness rig…) | Aucun pack d'animations gym libre. `J-Beardmore/FreeMotionPack1` (CC0, FBX) = gestuelles sociales uniquement |
| Quaternius Universal Animation Library 1 & 2 (CC0) | Catalogues locomotion/combat/parkour/ferme/pêche — aucune animation gym |
| MoveKit (movekit.com) | Vend des « clips » par exercice (~5 $/exercice, ~45 $ la bibliothèque) mais **format vidéo HD (MP4), pas de FBX** → inutilisable pour le pipeline |
| gym-animations.com | 4200+ exercices mais **MP4/MOV uniquement** → inutilisable |
| MoCap Online | Pas de pack gym au catalogue (Mobility, Rifle, Ninja, Dance…). Pack démo gratuit derrière inscription |
| Kevin Iglesias (Unity Asset Store) | Packs gratuits = locomotion/mêlée/danse etc., pas d'exercices de musculation confirmés |

**Meilleures pistes payantes (FBX, licence commerciale, squelette UE5 Manny ou FBX brut) :**

1. **Fab « Gym Animation Pack »** (27 anims mocap) — couvre #2 fentes (DumbbellLungesFwdBH01_**IP**), #3 bench press (BarbellBenchPress01_IP), #8 shoulder press barre (BarbellShoulderPress01_IP), #9 deadlift (BarbellDeadlift01_IP) + rowing un bras, curls, pompes, jumping jacks. **Sample FBX gratuit offert sur la fiche** (lien derrière JS/Cloudflare, non récupéré). https://www.fab.com/listings/39841328-c98e-4d8d-b7fd-951cc0f17c00 — prix non extrait (page JS)
2. **Fab « GYM Workout Animation Pack »** (43 anims) — couvre #3 (barbell_bench_press), #7 rowing barre (pronated/supinated/pendlay/meadows), #2 (forward/reverse/side lunge), rows un bras, curls. https://www.fab.com/listings/01bd321a-bfce-46b1-b10e-1eb93fd66b29 — prix non extrait
3. **Fab « 36 Fitness exercices, mocaped, set 2 »** (+ set 1, 32 exos) — lunge droite/gauche, deadlift, chest press, hip thrust… https://www.fab.com/listings/b5327bd1-4851-4fd5-86e1-584ab2be1490 — prix non extrait
4. **Fab « Gym Animation Pack - Legs »** — lunges 3 variantes, leg press, squat. https://www.fab.com/listings/ce48ab8f-f8f8-41b4-a49f-237b9e5dcd83
5. CGTrader « 32 Fitness Workout Animation Pack » (FBX Cascadeur) et « Anatomy Pull-up/Bench Press Animated » (~200-300 $, cher)

**Couverture résiduelle même en achetant les packs** : #1 tractions (aucun pack FBX trouvé — mocap maison recommandé), #6 élévations latérales et #10 relevé de mollets (mouvements simples → composition Blender poses clés), #4 RDL (le plus proche = deadlift des packs, retouche du pattern hinge possible).

**Outil livré** : `blender-poc/clips/preview_bvh.py` — rend une bande PNG de contrôle visuel pour n'importe quel BVH
(`blender -b -P preview_bvh.py -- <in.bvh> <out_dir> <nframes> [azimut] [f_start] [f_end]`).
Réutiliser systématiquement avant d'adopter un clip (checklist section 7).

`mapping.json` : **aucun ajout** (aucun clip adopté). Les 5 BVH CMU rejetés sont archivés dans
`clips/p1/_rejected_cmu/` avec leurs bandes de contrôle visuel.
