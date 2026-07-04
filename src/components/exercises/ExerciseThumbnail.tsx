import { AnimatedExerciseImage } from './AnimatedExerciseImage';

export function ExerciseThumbnail({ id, size = 42 }: { id: string; size?: number }) {
  return <AnimatedExerciseImage id={id} size={size} animate={false} />;
}
