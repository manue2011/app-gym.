import { router } from 'expo-router';

import { ExerciseList } from '../../src/components/ExerciseList';

const openExercise = (id: number) =>
  router.push({ pathname: '/ejercicio/[id]', params: { id: String(id) } });

export default function ExercisesScreen() {
  return <ExerciseList onSelect={(e) => openExercise(e.id)} />;
}
