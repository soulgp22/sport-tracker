import { isExerciseCompatibleWithProfile } from '../constants/equipmentProfiles';
import { getCatalogExercise, useExerciseCatalogStore } from '../store/exerciseCatalogStore';
import type { CatalogExercise, Program, ProgramExercise } from '../types';
import type { EquipmentProfileId } from '../types/equipment';

export type MovementPattern =
  | 'horizontal-press'
  | 'vertical-press'
  | 'chest-fly'
  | 'horizontal-pull'
  | 'vertical-pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'knee-extension'
  | 'knee-flexion'
  | 'calf-raise'
  | 'biceps-curl'
  | 'triceps-extension'
  | 'lateral-raise'
  | 'rear-delt'
  | 'hip-abduction'
  | 'hip-adduction'
  | 'hip-extension'
  | 'core-flexion'
  | 'core-rotation'
  | 'cardio'
  | 'mobility'
  | 'other';

const PATTERNS: [MovementPattern, RegExp][] = [
  ['chest-fly', /\b(fly|flye|butterfly|pec deck|cross over)\b/i],
  ['vertical-pull', /\b(pull-?up|chin-?up|pulldown|lat pull|rear pull-up)\b/i],
  ['horizontal-pull', /\b(row|rowing)\b/i],
  ['vertical-press', /\b(shoulder press|military press|overhead press|push press|arnold press)\b/i],
  ['horizontal-press', /\b(bench press|chest press|floor press|push-?up|press-up)\b/i],
  ['knee-extension', /\b(leg extension|sissy squat)\b/i],
  ['knee-flexion', /\b(leg curl|hamstring curl|glute-ham raise)\b/i],
  ['hip-abduction', /\b(abduct|monster walk)\b/i],
  ['hip-adduction', /\b(adduct)\b/i],
  ['hip-extension', /\b(hip thrust|glute bridge|hip raise|glute kickback|pull through)\b/i],
  ['lunge', /\b(lunge|split squat|step-up|step up)\b/i],
  ['squat', /\b(squat|leg press|hack squat)\b/i],
  ['hinge', /\b(deadlift|good morning|hyperextension|back extension|kettlebell swing)\b/i],
  ['calf-raise', /\b(calf|calves)\b/i],
  ['biceps-curl', /\b(curl)\b/i],
  ['triceps-extension', /\b(tricep|triceps|skullcrusher|pushdown|pressdown)\b/i],
  ['lateral-raise', /\b(lateral raise|side lateral)\b/i],
  ['rear-delt', /\b(rear delt|reverse fly|face pull)\b/i],
  ['core-rotation', /\b(twist|rotation|wood chop|pallof|side bend)\b/i],
  ['core-flexion', /\b(crunch|sit-up|sit up|leg raise|knee raise|ab rollout)\b/i],
  ['cardio', /\b(run|walk|cycling|bike|elliptical|rowing|stair|stepmill|jump rope)\b/i],
  ['mobility', /\b(stretch|smr|foam roll|mobility)\b/i],
];

export function getMovementPattern(exercise: CatalogExercise): MovementPattern {
  const name = `${exercise.name} ${exercise.nameFr ?? ''}`;
  return PATTERNS.find(([, pattern]) => pattern.test(name))?.[0] ?? 'other';
}

function sharedMuscles(a: CatalogExercise, b: CatalogExercise) {
  const musclesA = new Set([a.target, a.bodyPart, ...a.secondaryMuscles]);
  return [b.target, b.bodyPart, ...b.secondaryMuscles].filter((muscle) =>
    musclesA.has(muscle)
  ).length;
}

function relationScore(source: CatalogExercise, candidate: CatalogExercise) {
  let score = 0;
  const sourcePattern = getMovementPattern(source);
  const candidatePattern = getMovementPattern(candidate);

  if (source.target === candidate.target) score += 55;
  if (source.bodyPart === candidate.bodyPart) score += 25;
  if (sourcePattern !== 'other' && sourcePattern === candidatePattern) score += 60;
  if (source.equipment !== candidate.equipment) score += 8;
  score += Math.min(15, sharedMuscles(source, candidate) * 4);

  if ((sourcePattern === 'mobility') !== (candidatePattern === 'mobility')) score -= 80;
  if ((sourcePattern === 'cardio') !== (candidatePattern === 'cardio')) score -= 80;

  return score;
}

export function getRelatedExerciseIds(
  exerciseId: string,
  equipmentProfileId: EquipmentProfileId = 'full-gym',
  limit = 6
) {
  const source = getCatalogExercise(exerciseId);
  if (!source) return [];

  return useExerciseCatalogStore
    .getState()
    .all()
    .filter(
      (candidate) =>
        candidate.id !== source.id && isExerciseCompatibleWithProfile(candidate, equipmentProfileId)
    )
    .map((candidate) => ({ id: candidate.id, score: relationScore(source, candidate) }))
    .filter(({ score }) => score >= 65)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map(({ id }) => id);
}

export interface ExerciseCompatibilityIssue {
  dayId: string;
  programExerciseId: string;
  exerciseId: string;
  replacementId?: string;
  replacementSource?: 'manual' | 'automatic';
}

export interface ProgramCompatibility {
  equipmentProfileId: EquipmentProfileId;
  total: number;
  compatible: number;
  percentage: number;
  issues: ExerciseCompatibilityIssue[];
  replaceable: number;
  unresolved: number;
}

function findReplacement(
  exercise: ProgramExercise,
  equipmentProfileId: EquipmentProfileId
): Pick<ExerciseCompatibilityIssue, 'replacementId' | 'replacementSource'> {
  const manualReplacement = exercise.alternativeExerciseIds
    ?.map((id) => getCatalogExercise(id))
    .find((candidate) => candidate && isExerciseCompatibleWithProfile(candidate, equipmentProfileId));

  if (manualReplacement) {
    return { replacementId: manualReplacement.id, replacementSource: 'manual' };
  }

  const automaticReplacementId = getRelatedExerciseIds(exercise.exerciseId, equipmentProfileId, 1)[0];
  return automaticReplacementId
    ? { replacementId: automaticReplacementId, replacementSource: 'automatic' }
    : {};
}

export function analyzeProgramCompatibility(
  program: Program,
  equipmentProfileId: EquipmentProfileId
): ProgramCompatibility {
  const issues: ExerciseCompatibilityIssue[] = [];
  let total = 0;
  let compatible = 0;

  for (const day of program.days) {
    for (const exercise of day.exercises) {
      total += 1;
      const catalogExercise = getCatalogExercise(exercise.exerciseId);
      if (catalogExercise && isExerciseCompatibleWithProfile(catalogExercise, equipmentProfileId)) {
        compatible += 1;
        continue;
      }

      issues.push({
        dayId: day.id,
        programExerciseId: exercise.id,
        exerciseId: exercise.exerciseId,
        ...findReplacement(exercise, equipmentProfileId),
      });
    }
  }

  const replaceable = issues.filter((issue) => issue.replacementId).length;
  return {
    equipmentProfileId,
    total,
    compatible,
    percentage: total === 0 ? 100 : Math.round((compatible / total) * 100),
    issues,
    replaceable,
    unresolved: issues.length - replaceable,
  };
}
