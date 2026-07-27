#!/usr/bin/env python3
"""Génère les programmes communautaires de la matrice onboarding.

Matrice : objectif (4) × niveau (3) × profil d'équipement (6) = 72 programmes.
Chaque programme est écrit dans community/<id>.json et inscrit dans
community/index.json (idempotent : ré-exécuter remplace les entrées générées).

Format validé par scripts/validate-community.mjs :
- pack version 1, un programme par fichier, nom identique au manifeste
- exerciseName / alternativeExerciseNames présents dans le catalogue
- weight = 0, reps et restSeconds entiers > 0
- daysCount / exercisesCount du manifeste = contenu réel
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMMUNITY = os.path.join(ROOT, 'community')
CATALOG_PATH = os.path.join(ROOT, 'src', 'data', 'exercises.catalog.json')
INDEX_PATH = os.path.join(COMMUNITY, 'index.json')

GENERATED_TAG = 'gen-onboarding'  # tag marqueur pour repérer les entrées générées

# --- Profils d'équipement -------------------------------------------------

EQUIPMENT_ALLOWED = {
    'bodyweight': {'body only'},
    'home-basic': {'body only', 'bands', 'exercise ball', 'kettlebells', 'medicine ball'},
    'dumbbells': {'body only', 'dumbbell'},
    'machines': {'machine', 'cable'},
    'barbell': {'barbell', 'dumbbell', 'e-z curl bar', 'body only'},
    'full-gym': None,  # tout le catalogue
}

EQUIP_LABEL = {
    'bodyweight': 'Poids du corps',
    'home-basic': 'Petit matériel',
    'dumbbells': 'Haltères',
    'machines': 'Machines',
    'barbell': 'Barre & haltères',
    'full-gym': 'Salle complète',
}

EQUIP_DESCRIPTION = {
    'bodyweight': 'Aucun matériel (100 % poids du corps)',
    'home-basic': 'Élastiques, ballon ou kettlebell (petit matériel)',
    'dumbbells': 'Une paire d’haltères',
    'machines': 'Machines guidées et poulies',
    'barbell': 'Barre, haltères et poids du corps',
    'full-gym': 'Salle complète (barres, haltères, poulies, machines)',
}

GOAL_LABEL = {
    'muscle': 'Hypertrophie',
    'strength': 'Force',
    'weight_loss': 'Perte de poids',
    'fitness': 'Forme & santé',
}

LEVEL_LABEL = {
    'beginner': 'Débutant',
    'intermediate': 'Intermédiaire',
    'advanced': 'Avancé',
}

PROGRESSION = {
    'muscle': 'Double progression à RIR 1–3 : augmentez d’abord les répétitions dans la fourchette, puis ajoutez 2,5 kg (haut du corps) ou 5 kg (bas du corps) quand le haut de fourchette est atteint sur toutes les séries. Deload toutes les 4 à 6 semaines.',
    'strength': 'Double progression orientée force : conservez 1–2 répétitions en réserve sur les mouvements lourds, montez la charge de 2,5 kg quand toutes les séries sont réussies avec une technique propre. Deload toutes les 4 à 6 semaines.',
    'weight_loss': 'Progression en densité : réduisez d’abord les temps de repos, puis augmentez les répétitions, puis la charge. L’objectif est de maintenir la masse musculaire tout en augmentant la dépense.',
    'fitness': 'Progression douce : ajoutez une répétition par exercice et par séance quand c’est confortable, puis augmentez légèrement la charge. Régularité avant intensité.',
}

# --- Slots d'exercices ------------------------------------------------------
# bodyParts acceptés + candidats triés par préférence (noms exacts du catalogue).

SLOTS = {
    'squat': (['quadriceps'], [
        'Barbell Full Squat', 'Barbell Squat', 'Front Barbell Squat', 'Leg Press',
        'Hack Squat', 'Narrow Stance Leg Press', 'Dumbbell Squat', 'Goblet Squat',
        'Smith Machine Leg Press', 'Dumbbell Squat To A Bench', 'Bodyweight Squat',
        'Chair Squat', 'Squats - With Bands', 'Freehand Jump Squat', 'Split Squats',
    ]),
    'hinge': (['hamstrings', 'lower back'], [
        'Barbell Deadlift', 'Trap Bar Deadlift', 'Romanian Deadlift',
        'Stiff-Legged Dumbbell Deadlift', 'Smith Machine Stiff-Legged Deadlift',
        'Band Good Morning', 'Barbell Glute Bridge', 'Butt Lift (Bridge)',
        'Single Leg Glute Bridge', 'Floor Glute-Ham Raise', 'Lying Leg Curls',
        'Seated Leg Curl',
    ]),
    'lunge': (['quadriceps', 'glutes'], [
        'Dumbbell Lunges', 'Barbell Walking Lunge', 'Bodyweight Walking Lunge',
        'Split Squat with Dumbbells', 'Split Squats', 'Dumbbell Rear Lunge',
        'Smith Single-Leg Split Squat', 'Dumbbell Step Ups',
    ]),
    'horizontal_push': (['chest'], [
        'Barbell Bench Press - Medium Grip', 'Dumbbell Bench Press',
        'Machine Bench Press', 'Smith Machine Bench Press', 'Leverage Chest Press',
        'Dumbbell Floor Press', 'Pushups', 'Push-Up Wide', 'Cable Chest Press',
        'Butterfly', 'Incline Push-Up',
    ]),
    'incline_push': (['chest'], [
        'Barbell Incline Bench Press - Medium Grip', 'Incline Dumbbell Press',
        'Smith Machine Incline Bench Press', 'Leverage Incline Chest Press',
        'Hammer Grip Incline DB Bench Press', 'Incline Push-Up',
    ]),
    'vertical_push': (['shoulders'], [
        'Barbell Shoulder Press', 'Dumbbell Shoulder Press', 'Standing Dumbbell Press',
        'Machine Shoulder (Military) Press', 'Smith Machine Overhead Shoulder Press',
        'Leverage Shoulder Press', 'Arnold Dumbbell Press', 'Push Press',
        'Standing Alternating Dumbbell Press', 'Shoulder Press - With Bands',
        'Handstand Push-Ups',
    ]),
    'horizontal_pull': (['middle back', 'lats'], [
        'Bent Over Barbell Row', 'One-Arm Dumbbell Row', 'Seated Cable Rows',
        'Bent Over Two-Dumbbell Row', 'Leverage Iso Row', 'Smith Machine Bent Over Row',
        'Inverted Row', 'T-Bar Row with Handle', 'Dumbbell Incline Row',
    ]),
    'vertical_pull': (['lats'], [
        'Pullups', 'Chin-Up', 'Wide-Grip Lat Pulldown', 'Close-Grip Front Lat Pulldown',
        'Band Assisted Pull-Up', 'Straight-Arm Pulldown',
    ]),
    'lateral': (['shoulders'], [
        'Side Lateral Raise', 'Seated Side Lateral Raise', 'Cable Seated Lateral Raise',
        'Lateral Raise - With Bands', 'Reverse Flyes', 'Back Flyes - With Bands',
        'Dumbbell Lying Rear Lateral Raise', 'Band Pull Apart',
    ]),
    'biceps': (['biceps'], [
        'Barbell Curl', 'EZ-Bar Curl', 'Dumbbell Bicep Curl',
        'Dumbbell Alternate Bicep Curl', 'Hammer Curls',
        'Cable Hammer Curls - Rope Attachment', 'Machine Bicep Curl',
        'Cable Preacher Curl', 'Incline Dumbbell Curl',
    ]),
    'triceps': (['triceps'], [
        'Dips - Triceps Version', 'Dip Machine', 'Triceps Pushdown',
        'Lying Triceps Press', 'Lying Dumbbell Tricep Extension',
        'Standing Dumbbell Triceps Extension', 'Seated Triceps Press',
        'Machine Triceps Extension', 'Push-Ups - Close Triceps Position',
        'Dumbbell One-Arm Triceps Extension', 'Cable Rope Overhead Triceps Extension',
    ]),
    'calves': (['calves'], [
        'Standing Calf Raises', 'Standing Dumbbell Calf Raise',
        'Calf Press On The Leg Press Machine', 'Seated Calf Raise',
        'Calf Raises - With Bands',
    ]),
    'core': (['abdominals'], [
        'Plank', 'Crunches', 'Cross-Body Crunch', 'Russian Twist', 'Dead Bug',
        'Side Bridge', '3/4 Sit-Up', 'Ab Crunch Machine', 'Smith Machine Hip Raise',
    ]),
    'finisher': (['abdominals', 'quadriceps', 'cardiovascular system'], [
        'Mountain Climbers', 'Freehand Jump Squat', 'Knee Tuck Jump', 'Star Jump',
        'Rope Jumping', 'Fast Skipping', 'Bicycling, Stationary',
        'Rowing, Stationary', 'Elliptical Trainer', 'Plank',
    ]),
    # Chaîne postérieure au sol — le SEUL travail « tirage/dos » possible
    # en 100 % poids du corps (aucune traction/rowing sans barre n'existe).
    'posterior': (['lower back', 'middle back', 'hamstrings', 'glutes'], [
        'Superman', 'Hyperextensions With No Hyperextension Bench',
        'Prone Manual Hamstring', 'Rear Leg Raises', 'One Half Locust',
        'Inchworm', 'Glute Kickback', 'Floor Glute-Ham Raise',
        'Natural Glute Ham Raise', 'Flutter Kicks',
    ]),
}

# Le catalogue n'a pas d'exercice d'isolation biceps avec du petit matériel :
# on le travaille via les tractions en supination (barre + élastique).
# Pour le poids du corps, les tractions sont EXCLUES (barre = matériel) :
# les splits dédiés ci-dessous n'ont ni vertical_pull, ni horizontal_pull,
# ni biceps — remplacés par le slot 'posterior' et des poussées variées.
PROFILE_CANDIDATE_OVERRIDES = {
    'bodyweight': {
        'horizontal_push': [
            'Pushups', 'Push-Up Wide', 'Clock Push-Up',
            'Pushups (Close and Wide Hand Positions)', 'Push Up to Side Plank',
            'Plyo Push-up', 'Single-Arm Push-Up',
        ],
        'triceps': [
            'Push-Ups - Close Triceps Position', 'Body Tricep Press', 'Body-Up',
        ],
    },
    'home-basic': {'biceps': ['Chin-Up', 'Pullups', 'V-Bar Pullup']},
}

# Slots sans exercice pertinent dans le catalogue pour ce profil :
# poids du corps → pas de mollets ni d'élévations latérales exploitables
# (uniquement des étirements / cercles de bras).
PROFILE_SLOT_DROP = {
    'bodyweight': {'calves', 'lateral'},
}

# Splits 100 % sans matériel (remplacent SPLITS pour le profil bodyweight) :
# aucune barre fixe, aucun banc, aucune chaise — sol uniquement, à l'exception
# du poirier contre un mur pour les avancés (standard calisthenics 2026).
PROFILE_SPLIT_OVERRIDES = {
    'bodyweight': {
        'beginner': [
            ('Full Body A', ['squat', 'horizontal_push', 'posterior', 'core']),
            ('Full Body B', ['hinge', 'horizontal_push', 'triceps', 'core']),
            ('Full Body C', ['lunge', 'horizontal_push', 'posterior', 'core']),
        ],
        'intermediate': [
            ('Haut du corps A', ['horizontal_push', 'triceps', 'posterior', 'core']),
            ('Bas du corps A', ['squat', 'hinge', 'lunge', 'core']),
            ('Haut du corps B', ['horizontal_push', 'triceps', 'posterior', 'core']),
            ('Bas du corps B', ['hinge', 'squat', 'lunge', 'core']),
        ],
        'advanced': [
            ('Poussée', ['horizontal_push', 'vertical_push', 'horizontal_push', 'triceps', 'triceps']),
            ('Chaîne postérieure', ['posterior', 'posterior', 'hinge', 'posterior', 'core']),
            ('Jambes', ['squat', 'hinge', 'lunge', 'squat', 'core']),
            ('Haut du corps', ['horizontal_push', 'triceps', 'posterior', 'core']),
            ('Bas du corps', ['hinge', 'squat', 'lunge', 'core']),
        ],
    },
}

# Exercices isométriques / au temps : reps = secondes.
TIMED_EXERCISES = {
    'Plank', 'Side Bridge', 'Rope Jumping', 'Fast Skipping', 'Mountain Climbers',
    'Star Jump', 'Knee Tuck Jump', 'Freehand Jump Squat', 'Wall Sit' ,
}

COMPOUND_SLOTS = {'squat', 'hinge', 'lunge', 'horizontal_push', 'incline_push',
                  'vertical_push', 'horizontal_pull', 'vertical_pull', 'posterior'}

# --- Templates de splits ----------------------------------------------------

SPLITS = {
    'beginner': [
        ('Full Body A', ['squat', 'horizontal_push', 'horizontal_pull', 'vertical_push', 'core']),
        ('Full Body B', ['hinge', 'incline_push', 'vertical_pull', 'biceps', 'core']),
        ('Full Body C', ['lunge', 'horizontal_push', 'horizontal_pull', 'triceps', 'calves']),
    ],
    'intermediate': [
        ('Haut du corps A', ['horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull', 'biceps', 'triceps']),
        ('Bas du corps A', ['squat', 'hinge', 'lunge', 'calves', 'core']),
        ('Haut du corps B', ['incline_push', 'vertical_pull', 'horizontal_pull', 'lateral', 'triceps', 'biceps']),
        ('Bas du corps B', ['hinge', 'squat', 'lunge', 'calves', 'core']),
    ],
    'advanced': [
        ('Poussée', ['horizontal_push', 'incline_push', 'vertical_push', 'lateral', 'triceps']),
        ('Tirage', ['vertical_pull', 'horizontal_pull', 'horizontal_pull', 'biceps', 'biceps']),
        ('Jambes', ['squat', 'hinge', 'lunge', 'calves', 'core']),
        ('Haut du corps', ['incline_push', 'vertical_pull', 'vertical_push', 'biceps', 'triceps']),
        ('Bas du corps', ['hinge', 'squat', 'lunge', 'calves', 'core']),
    ],
}

# --- Schémas séries/reps/repos par objectif ----------------------------------
# rôle -> (séries, reps, repos secondes) ; reps = secondes pour les exercices TIMED.

def scheme(goal, level, role, exercise_name):
    timed = exercise_name in TIMED_EXERCISES
    if goal == 'muscle':
        table = {'compound': (3, 8, 120), 'secondary': (3, 10, 90),
                 'isolation': (3, 12, 60), 'calves': (4, 12, 45), 'core': (3, 12, 45)}
    elif goal == 'strength':
        heavy = (3, 5, 150) if level == 'beginner' else (4, 5, 180)
        table = {'compound': heavy, 'secondary': (3, 6, 120),
                 'isolation': (3, 8, 90), 'calves': (4, 8, 60), 'core': (3, 10, 60)}
    elif goal == 'weight_loss':
        table = {'compound': (3, 12, 60), 'secondary': (3, 15, 45),
                 'isolation': (3, 15, 45), 'calves': (3, 15, 30), 'core': (3, 15, 30)}
    else:  # fitness
        table = {'compound': (3, 10, 90), 'secondary': (3, 12, 75),
                 'isolation': (3, 12, 60), 'calves': (3, 15, 45), 'core': (3, 12, 45)}
    sets, reps, rest = table[role]
    if timed:
        reps = {'muscle': 40, 'strength': 30, 'weight_loss': 45, 'fitness': 40}[goal]
    return [{'reps': reps, 'weight': 0, 'restSeconds': rest} for _ in range(sets)]


def finisher_sets(exercise_name):
    timed = exercise_name in TIMED_EXERCISES
    return [{'reps': 30 if timed else 15, 'weight': 0, 'restSeconds': 30} for _ in range(3)]


# --- Sélection des exercices --------------------------------------------------

class Pool:
    def __init__(self, catalog, equipment_profile):
        allowed = EQUIPMENT_ALLOWED[equipment_profile]
        self.profile = equipment_profile
        self.catalog = [e for e in catalog if allowed is None or e['equipment'] in allowed]
        self.by_name = {e['name']: e for e in catalog}
        self.report = []

    def pick(self, slot, offset, used):
        """Choisit un exercice du slot : candidat curaté si possible, sinon
        n'importe quel exercice du bon bodyPart dans le pool. `offset` fait
        tourner la sélection entre les jours. `used` évite les doublons du jour."""
        body_parts, default_candidates = SLOTS[slot]
        candidates = PROFILE_CANDIDATE_OVERRIDES.get(self.profile, {}).get(slot, default_candidates)
        available = [name for name in candidates
                     if name in self.by_name and self.by_name[name] in self.catalog]
        if not available:
            pool = sorted((e['name'] for e in self.catalog if e['bodyPart'] in body_parts))
            if not pool:
                self.report.append(f'SLOT VIDE : {slot}')
                return None
            available = pool
            self.report.append(f'fallback catalogue pour {slot} -> {pool[0]}')
        for i in range(len(available)):
            name = available[(offset + i) % len(available)]
            if name not in used:
                used.add(name)
                alternative = next((n for n in available if n != name), None)
                return name, alternative
        # Tous déjà utilisés : reprendre le premier disponible sans doublon critique
        name = available[offset % len(available)]
        alternative = next((n for n in available if n != name), None)
        return name, alternative


def role_for(slot, position_in_day):
    if slot == 'calves':
        return 'calves'
    if slot == 'core':
        return 'core'
    if slot in COMPOUND_SLOTS:
        return 'compound' if position_in_day == 0 else 'secondary'
    return 'isolation'


def build_program(goal, level, equipment):
    catalog = json.load(open(CATALOG_PATH, encoding='utf-8'))
    pool = Pool(catalog, equipment)
    days = []
    total_sets_seconds = 5 * 60  # échauffement forfaitaire
    split = PROFILE_SPLIT_OVERRIDES.get(equipment, {}).get(level) or SPLITS[level]
    for day_index, (day_name, day_slots) in enumerate(split):
        slots = [s for s in day_slots if s not in PROFILE_SLOT_DROP.get(equipment, set())]
        used = set()
        exercises = []
        for position, slot in enumerate(slots):
            picked = pool.pick(slot, day_index + position, used)
            if not picked:
                continue
            name, alternative = picked
            entry = {
                'exerciseName': name,
                'sets': scheme(goal, level, role_for(slot, position), name),
            }
            if alternative:
                entry['alternativeExerciseNames'] = [alternative]
            exercises.append(entry)
            for s in entry['sets']:
                total_sets_seconds += 40 + s['restSeconds']
        if goal == 'weight_loss':
            picked = pool.pick('finisher', day_index, used)
            if picked:
                name, _ = picked
                exercises.append({'exerciseName': name, 'sets': finisher_sets(name)})
                for s in exercises[-1]['sets']:
                    total_sets_seconds += 40 + s['restSeconds']
        days.append({'name': day_name, 'exercises': exercises})
    session_minutes = max(20, round(total_sets_seconds / len(days) / 60))
    return days, session_minutes, pool.report


def main():
    with open(INDEX_PATH, encoding='utf-8') as f:
        manifest = json.load(f)

    # Retirer les anciennes entrées générées (idempotence)
    manifest['programs'] = [p for p in manifest['programs']
                            if GENERATED_TAG not in (p.get('tags') or [])]

    reports = []
    count = 0
    for equipment in EQUIPMENT_ALLOWED:
        for level in LEVEL_LABEL:
            for goal in GOAL_LABEL:
                program_id = f'{equipment}-{goal}-{level}'
                name = f'{EQUIP_LABEL[equipment]} — {GOAL_LABEL[goal]} — {LEVEL_LABEL[level]}'
                days, session_minutes, report = build_program(goal, level, equipment)
                reports.extend(f'{program_id}: {r}' for r in report)

                payload = {'version': 1, 'programs': [{'name': name, 'days': days}]}
                file_name = f'{program_id}.json'
                with open(os.path.join(COMMUNITY, file_name), 'w', encoding='utf-8') as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
                    f.write('\n')

                exercises_count = sum(len(d['exercises']) for d in days)
                manifest['programs'].append({
                    'id': program_id,
                    'name': name,
                    'description': (
                        f'Programme {GOAL_LABEL[goal].lower()} niveau {LEVEL_LABEL[level].lower()}, '
                        f'{len(days)} séances par semaine, {EQUIP_DESCRIPTION[equipment].lower()}.'
                    ),
                    'author': 'Life Sport Tracker',
                    'level': level,
                    'daysCount': len(days),
                    'exercisesCount': exercises_count,
                    'file': file_name,
                    'goal': f'{GOAL_LABEL[goal]} ({LEVEL_LABEL[level]})',
                    'goalId': goal,
                    'equipment': EQUIP_DESCRIPTION[equipment],
                    'equipmentProfileIds': [equipment],
                    'sessionsPerWeek': len(days),
                    'sessionMinutes': session_minutes,
                    'progression': PROGRESSION[goal],
                    'tags': [GENERATED_TAG, LEVEL_LABEL[level].lower(),
                             GOAL_LABEL[goal].lower(), EQUIP_LABEL[equipment].lower(),
                             f'{len(days)} jours'],
                })
                count += 1

    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write('\n')

    print(f'{count} programmes générés.')
    unique_reports = sorted(set(reports))
    if unique_reports:
        print('Rapport de sélection :')
        for line in unique_reports:
            print(' -', line)


if __name__ == '__main__':
    sys.exit(main())
