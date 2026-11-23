import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExerciseThumb } from '../../src/components/ExerciseThumb';
import { Button, Card, Chip, Muted, Title } from '../../src/components/ui';
import { muscleLabel, WEEKDAYS } from '../../src/data/muscles';
import {
  dayForWeekday,
  formatRepRange,
  getActiveRoutine,
  type RoutineDetail,
} from '../../src/db/repositories/routines';
import { getOpenWorkout, startWorkout, type Workout } from '../../src/db/repositories/workouts';
import { useColors } from '../../src/theme';

const openSession = (id: number) =>
  router.push({ pathname: '/sesion/[id]', params: { id: String(id) } });

export default function TodayScreen() {
  const db = useSQLiteContext();
  const c = useColors();
  const [routine, setRoutine] = useState<RoutineDetail | null | undefined>(undefined);
  const [openWorkout, setOpenWorkout] = useState<Workout | null>(null);
  const [pickedDayId, setPickedDayId] = useState<number | null>(null);
  const weekday = new Date().getDay();

  useFocusEffect(
    useCallback(() => {
      getActiveRoutine(db).then(setRoutine);
      getOpenWorkout(db).then(setOpenWorkout);
    }, [db]),
  );

  if (routine === undefined) return null;

  if (routine === null) {
    return (
      <View style={styles.content}>
        <Card>
          <Title>Sin rutina activa</Title>
          <Muted>Crea una rutina y márcala como activa para ver aquí lo que toca hoy.</Muted>
          <Button label="Ir a Rutinas" onPress={() => router.navigate('/rutinas')} />
        </Card>
      </View>
    );
  }

  const todaysDay = dayForWeekday(routine, weekday);
  const day = routine.days.find((d) => d.id === pickedDayId) ?? todaysDay;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Muted>
        {WEEKDAYS[weekday]} · {routine.name}
      </Muted>

      {openWorkout && (
        <Card style={{ borderColor: c.primary }}>
          <Title>Entrenamiento en curso</Title>
          <Muted>Lo dejaste a medias. Tus series ya están guardadas.</Muted>
          <Button label="Continuar" icon="play" onPress={() => openSession(openWorkout.id)} />
        </Card>
      )}

      {routine.days.length > 1 && (
        <View style={styles.chips}>
          {routine.days.map((d) => (
            <Chip
              key={d.id}
              label={d.name}
              selected={day?.id === d.id}
              onPress={() => setPickedDayId(d.id)}
            />
          ))}
        </View>
      )}

      {day ? (
        <Card>
          <Title>{day.name}</Title>
          {day.id !== todaysDay?.id && (
            <Muted>No es el día asignado a hoy, pero puedes hacerlo.</Muted>
          )}
          {day.exercises.length === 0 && <Muted>Este día aún no tiene ejercicios.</Muted>}
          {day.exercises.map((e) => (
            <Pressable
              key={e.id}
              style={styles.exercise}
              onPress={() =>
                router.push({ pathname: '/ejercicio/[id]', params: { id: String(e.exercise_id) } })
              }>
              <ExerciseThumb slug={e.exercise_slug} size={56} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>
                  {e.exercise_name}
                </Text>
                <Muted>
                  {muscleLabel(e.muscle_primary)} · {e.target_sets} × {formatRepRange(e)} reps ·{' '}
                  {e.rest_seconds} s descanso
                </Muted>
              </View>
            </Pressable>
          ))}
          {!openWorkout && day.exercises.length > 0 && (
            <Button
              label="Empezar entrenamiento"
              icon="play"
              onPress={async () => openSession(await startWorkout(db, day.id))}
            />
          )}
        </Card>
      ) : (
        <Card>
          <Title>Día de descanso</Title>
          <Muted>
            Tu rutina activa no tiene ningún día asignado al {WEEKDAYS[weekday].toLowerCase()}.
            {routine.days.length > 0 ? ' Si quieres entrenar igual, elige un día arriba.' : ''}
          </Muted>
        </Card>
      )}
      <Button
        label="Editar rutina"
        variant="secondary"
        icon="create-outline"
        onPress={() =>
          router.push({ pathname: '/rutina/[id]', params: { id: String(routine.id) } })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
});
