# Genere CATALOGUE_HARMONISE.csv : regroupe les 184 exercices utilises en
# "produits" (1 animation = 1 produit) avec alias, usages cumules, tier.
import json, glob, collections, csv

usage = collections.Counter()
for f in glob.glob('community/*.json'):
    data = json.load(open(f, encoding='utf-8'))
    for prog in data.get('programs', []):
        for day in prog.get('days', []):
            for ex in day.get('exercises', []):
                usage[ex['exerciseName']] += 1
                for alt in ex.get('alternativeExerciseNames', []):
                    usage[alt] += 1
cat = {c['name']: c for c in json.load(open('src/data/exercises.catalog.json', encoding='utf-8'))}

# (nom produit, tier, props, statut, clip, notes, [alias exacts du catalogue])
G = [
 ("Curl haltères alterné", "DONE", "haltères", "EN LIGNE", "Mixamo Bicep Curl", "validé téléphone",
  ["Dumbbell Alternate Bicep Curl", "Dumbbell Bicep Curl"]),
 ("Planche", "DONE", "aucun", "EN LIGNE", "Mixamo Plank", "",
  ["Plank"]),
 ("Pompes", "DONE", "aucun", "EN LIGNE", "Mixamo Push Up", "variantes incliné/décliné/large alias",
  ["Pushups", "Incline Push-Up", "Decline Push-Up", "Push-Up Wide", "Push-Ups - Close Triceps Position", "Incline Push-Up Close-Grip", "Plyo Push-up", "Incline Push-Up Depth Jump"]),
 ("Squat haltères / goblet", "DONE", "haltères", "EN LIGNE", "Mixamo Air Squat Bent Arms", "goblet = 1 haltère tenu devant",
  ["Dumbbell Squat", "Goblet Squat", "Bodyweight Squat", "Dumbbell Squat To A Bench", "Chair Squat", "Squats - With Bands", "Freehand Jump Squat"]),
 ("Soulevé de terre jambes tendues haltères", "DONE", "haltères", "EN LIGNE ⚠️", "Mixamo Lifting Object", "genoux un peu fléchis, à réévaluer",
  ["Stiff-Legged Dumbbell Deadlift"]),
 ("Dead Bug", "DONE", "aucun", "EN LIGNE ⚠️", "Mixamo Bicycle Crunch", "ressemble plutôt à un crunch, à réévaluer",
  ["Dead Bug"]),

 ("Développé couché haltères", "P1", "haltères + banc", "CLIP MANQUANT", "", "EXERCICE #1 des usages",
  ["Dumbbell Bench Press", "Dumbbell Bench Press with Neutral Grip"]),
 ("Développé incliné haltères", "P1", "haltères + banc incliné", "CLIP MANQUANT", "",
  "", ["Incline Dumbbell Press", "Hammer Grip Incline DB Bench Press"]),
 ("Développé couché barre", "P1", "barre + banc", "CLIP MANQUANT", "", "machines en alias (même mouvement)",
  ["Barbell Bench Press - Medium Grip", "Bench Press - Powerlifting", "Close-Grip Barbell Bench Press", "Machine Bench Press", "Smith Machine Bench Press", "Leverage Chest Press"]),
 ("Développé incliné barre", "P2", "barre + banc incliné", "CLIP MANQUANT", "",
  "", ["Barbell Incline Bench Press - Medium Grip", "Smith Machine Incline Bench Press", "Leverage Incline Chest Press"]),
 ("Floor press haltères", "P1", "haltères (au sol)", "CLIP MANQUANT", "", "pas de banc nécessaire",
  ["Dumbbell Floor Press"]),
 ("Développé épaules haltères", "P1", "haltères", "CLIP MANQUANT", "", "Mixamo Front Raises REJETÉ (mauvais plan)",
  ["Dumbbell Shoulder Press", "Standing Dumbbell Press", "Standing Alternating Dumbbell Press", "Shoulder Press - With Bands"]),
 ("Développé militaire barre", "P2", "barre", "CLIP MANQUANT", "",
  "", ["Barbell Shoulder Press", "Push Press", "Leverage Shoulder Press", "Machine Shoulder (Military) Press", "Smith Machine Overhead Shoulder Press"]),
 ("Arnold press", "P3", "haltères", "CLIP MANQUANT", "", "", ["Arnold Dumbbell Press"]),
 ("Élévations latérales", "P1", "haltères", "CLIP MANQUANT", "", "Mixamo Front Raises REJETÉ",
  ["Side Lateral Raise", "Seated Side Lateral Raise", "Lateral Raise - With Bands", "Cable Seated Lateral Raise"]),
 ("Rowing un bras haltère", "P1", "haltère (+ banc optionnel)", "CLIP MANQUANT", "", "EXERCICE TOP 10",
  ["One-Arm Dumbbell Row", "Dumbbell Incline Row"]),
 ("Rowing penché deux haltères", "P1", "haltères", "CLIP MANQUANT", "",
  "", ["Bent Over Two-Dumbbell Row", "Bent Over Two-Dumbbell Row With Palms In"]),
 ("Rowing barre penché", "P1", "barre", "CLIP MANQUANT", "",
  "", ["Bent Over Barbell Row", "Reverse Grip Bent-Over Rows", "T-Bar Row with Handle", "Lying T-Bar Row", "Smith Machine Bent Over Row"]),
 ("Tractions", "P1", "barre de traction (prop à créer)", "CLIP MANQUANT", "", "Mixamo Hang Hop Up REJETÉ (escalade). chin-up = variante prise supination",
  ["Pullups", "Chin-Up", "Weighted Pull Ups", "Band Assisted Pull-Up", "Wide-Grip Rear Pull-Up", "Scapular Pull-Up"]),
 ("Fentes", "P1", "haltères ou poids du corps", "CLIP MANQUANT", "", "avant/arrière/marchée = même produit",
  ["Dumbbell Lunges", "Dumbbell Rear Lunge", "Bodyweight Walking Lunge", "Split Squats", "Split Squat with Dumbbells", "Barbell Walking Lunge", "Smith Single-Leg Split Squat"]),
 ("Soulevé de terre roumain (RDL)", "P1", "barre", "CLIP MANQUANT", "", "EXERCICE TOP 5",
  ["Romanian Deadlift", "Smith Machine Stiff-Legged Deadlift", "Band Good Morning"]),
 ("Soulevé de terre barre", "P1", "barre", "CLIP MANQUANT", "", "trap bar en alias",
  ["Barbell Deadlift", "Trap Bar Deadlift"]),
 ("Soulevé de terre sumo", "P3", "barre", "CLIP MANQUANT", "", "", ["Sumo Deadlift"]),
 ("Squat barre arrière", "P1", "barre", "CLIP MANQUANT", "",
  "", ["Barbell Full Squat", "Box Squat"]),
 ("Squat barre avant", "P2", "barre", "CLIP MANQUANT", "", "", ["Front Barbell Squat"]),
 ("Curl marteau", "P1", "haltères", "CLIP MANQUANT", "",
  "", ["Hammer Curls", "Alternate Hammer Curl", "Cable Hammer Curls - Rope Attachment"]),
 ("Curl barre", "P1", "barre / EZ", "CLIP MANQUANT", "",
  "", ["Barbell Curl", "EZ-Bar Curl"]),
 ("Curl incliné haltères", "P2", "haltères + banc incliné", "CLIP MANQUANT", "", "", ["Incline Dumbbell Curl"]),
 ("Curl pupitre (preacher)", "P3", "banc pupitre", "CLIP MANQUANT", "",
  "", ["Cable Preacher Curl", "Machine Preacher Curls", "Machine Bicep Curl"]),
 ("Dips", "P1", "barres parallèles (prop)", "CLIP MANQUANT", "",
  "", ["Dips - Triceps Version", "Dip Machine"]),
 ("Extension triceps poulie (pushdown)", "P2", "poulie / bande", "CLIP MANQUANT", "",
  "", ["Triceps Pushdown", "Band Skull Crusher"]),
 ("Extension triceps au-dessus de la tête", "P1", "haltère", "CLIP MANQUANT", "",
  "", ["Standing Dumbbell Triceps Extension", "Seated Triceps Press", "Dumbbell One-Arm Triceps Extension", "Cable Rope Overhead Triceps Extension", "Machine Triceps Extension"]),
 ("Extension triceps allongé (skullcrusher)", "P2", "haltères/barre", "CLIP MANQUANT", "",
  "", ["Lying Dumbbell Tricep Extension", "Lying Triceps Press"]),
 ("Relevé de mollets debout", "P1", "haltères ou poids du corps", "CLIP MANQUANT", "",
  "", ["Standing Calf Raises", "Standing Dumbbell Calf Raise", "Calf Raises - With Bands", "Calf Press", "Calf Press On The Leg Press Machine"]),
 ("Relevé de mollets assis", "P2", "machine/banc + poids", "CLIP MANQUANT", "",
  "", ["Seated Calf Raise", "Dumbbell Seated One-Leg Calf Raise"]),
 ("Face pull", "P1", "poulie ou bande", "CLIP MANQUANT", "", "13 usages",
  ["Face Pull"]),
 ("Oiseau / reverse fly (deltoïde post.)", "P1", "haltères", "CLIP MANQUANT", "",
  "", ["Reverse Flyes", "Reverse Machine Flyes", "Back Flyes - With Bands", "Dumbbell Lying Rear Lateral Raise", "Bent Over Dumbbell Rear Delt Raise With Head On Bench"]),
 ("Band pull apart", "P2", "bande élastique", "CLIP MANQUANT", "", "", ["Band Pull Apart", "External Rotation with Band"]),
 ("Pont fessier (glute bridge)", "P1", "aucun", "CLIP MANQUANT", "", "variantes 1 jambe/bande alias",
  ["Butt Lift (Bridge)", "Single Leg Glute Bridge", "Hip Lift with Band", "Smith Machine Hip Raise", "Barbell Glute Bridge"]),
 ("Hip thrust", "P2", "barre + banc", "CLIP MANQUANT", "", "", ["Barbell Hip Thrust"]),
 ("Relevés de hanche arrière au sol", "P3", "aucun", "CLIP MANQUANT", "", "", ["Rear Leg Raises"]),
 ("Russian twist", "P1", "aucun", "CLIP MANQUANT", "", "", ["Russian Twist"]),
 ("Crunch", "P1", "aucun", "CLIP MANQUANT", "", "", ["Crunches", "Cross-Body Crunch"]),
 ("Planche latérale", "P2", "aucun", "CLIP MANQUANT", "", "", ["Side Bridge"]),
 ("Mountain climbers", "P2", "aucun", "CLIP MANQUANT", "", "", ["Mountain Climbers"]),
 ("Step-up", "P2", "marche/box + haltères", "CLIP MANQUANT", "", "", ["Dumbbell Step Ups", "Step-up with Knee Raise"]),
 ("Rowing inversé", "P2", "barre basse", "CLIP MANQUANT", "", "", ["Inverted Row"]),
 ("Shrugs", "P2", "haltères", "CLIP MANQUANT", "", "", ["Dumbbell Shrug", "Leverage Shrug"]),
 ("Leg curl allongé", "P2", "machine (prop complexe)", "CLIP MANQUANT", "", "27 usages cumulés — fort candidat machine",
  ["Lying Leg Curls", "Seated Leg Curl", "Standing Leg Curl", "Glute Ham Raise", "Floor Glute-Ham Raise", "Natural Glute Ham Raise", "Reverse Hyperextension"]),
 ("Leg extension", "P2", "machine (prop)", "CLIP MANQUANT", "", "",
  ["Leg Extensions", "Single-Leg Leg Extension"]),
 ("Presse à cuisses (leg press)", "P2", "machine (prop)", "CLIP MANQUANT", "", "EXERCICE #1 TOUTES MACHINES (19 usages)",
  ["Leg Press", "Narrow Stance Leg Press", "Smith Machine Leg Press"]),
 ("Hack squat", "P3", "machine (prop)", "CLIP MANQUANT", "", "", ["Hack Squat", "Narrow Stance Hack Squats"]),
 ("Tirage vertical poulie (lat pulldown)", "P2", "poulie (prop)", "CLIP MANQUANT", "", "23 usages cumulés",
  ["Wide-Grip Lat Pulldown", "Close-Grip Front Lat Pulldown", "Straight-Arm Pulldown", "Rope Straight-Arm Pulldown"]),
 ("Tirage horizontal poulie (seated row)", "P2", "poulie (prop)", "CLIP MANQUANT", "", "27 usages cumulés",
  ["Seated Cable Rows", "Leverage Iso Row", "Leverage High Row"]),
 ("Écartés poulie/machine (fly)", "P3", "poulie/machine", "CLIP MANQUANT", "",
  "", ["Cable Crossover", "Butterfly", "Cable Chest Press"]),
 ("Abducteurs / adducteurs machine", "P3", "machine", "CLIP MANQUANT", "", "", ["Thigh Abductor", "Thigh Adductor"]),
 ("Pistol squat", "P3", "aucun", "CLIP MANQUANT", "", "", ["Smith Machine Pistol Squat"]),
 ("Développé nuque guidé", "P3", "machine", "CLIP MANQUANT", "", "", ["Smith Machine One-Arm Upright Row"]),
 ("Flexion latérale du tronc", "P3", "haltère", "CLIP MANQUANT", "", "", ["Dumbbell Side Bend"]),

 ("Clean / snatch (haltérophilie)", "P3", "barre/haltère", "CLIP MANQUANT", "", "mouvements explosifs complexes",
  ["Power Clean", "Hang Clean", "Power Snatch", "Hang Snatch", "Dumbbell Clean", "Vertical Swing", "Push Press"]),
 ("Plyométrie sur place (sauts verticaux)", "P3", "aucun", "CLIP MANQUANT", "", "sauts sur place seulement",
  ["Knee Tuck Jump", "Star Jump", "Rocket Jump", "Rope Jumping"]),
 ("Passes medicine ball", "P3", "ballon", "CLIP MANQUANT", "", "", ["Medicine Ball Chest Pass", "Chest Push from 3 point stance"]),

 ("Sprints et drills au sol", "DROP", "-", "HORS PRODUIT", "", "déplacement horizontal, non démontrable en place",
  ["Fast Skipping", "Wind Sprints", "Running, Treadmill", "Prowler Sprint", "Sled Push", "Bear Crawl Sled Drags", "Single-Cone Sprint Drill"]),
 ("Marches chargées", "DROP", "-", "HORS PRODUIT", "", "locomotion, pas de boucle en place",
  ["Farmer's Walk", "Rickshaw Carry"]),
 ("Sauts horizontaux", "DROP", "-", "HORS PRODUIT", "", "déplacement horizontal",
  ["Standing Long Jump", "Side Standing Long Jump", "Lateral Bound", "Front Box Jump"]),
]

rows = []
covered = set()
for name, tier, props, status, clip, notes, aliases in G:
    ids, total = [], 0
    for a in aliases:
        c = cat.get(a)
        if c:
            ids.append(c['id'])
            covered.add(a)
        else:
            ids.append('??' + a)
        total += usage.get(a, 0)
    rows.append([name, tier, total, props, status, clip, '|'.join(aliases), '|'.join(ids), notes])

# alias Push Press est dans 2 groupes (militaire + halterophilie) -> on le laisse en militaire
rows.sort(key=lambda r: ({'DONE':0,'P1':1,'P2':2,'P3':3,'DROP':4}[r[1]], -r[2]))

missing = [n for n in usage if n not in covered]
with open('docs/animations/CATALOGUE_HARMONISE.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['produit_animation', 'tier', 'usages_cumules', 'props', 'statut', 'clip_source', 'alias_catalogue', 'ids_catalogue', 'notes'])
    w.writerows(rows)
print('groupes:', len(rows), '| exercices couverts:', len(covered), '| non couverts:', missing)
for r in rows:
    if r[1] in ('DONE', 'P1'):
        print(f'{r[1]:5s} {r[2]:3d}  {r[0]}')
