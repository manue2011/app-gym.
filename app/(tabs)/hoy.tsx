import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Muted, Title } from '../../src/components/ui';
import { muscleLabel, WEEKDAYS } from '../../src/data/muscles';
import {
  dayForWeekday,
  getActiveRoutine,
  type RoutineDetail,
} from '../../src/db/repositories/routines';
import { useColors } from '../../src/theme';

export default function TodayScreen() {
  const db = useSQLiteContext();
  const c = useColors();
  const [routine, setRoutine] = useState<RoutineDetail | null | undefined>(undefined);
  const weekday = new Date().getDay();

  useFocusEffect(
    useCallback(() => {
      getActiveRoutine(db).then(setRoutine);
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

  const day = dayForWeekday(routine, weekday);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Muted>
        {WEEKDAYS[weekday]} · {routine.name}
      </Muted>
      {day ? (
        <Card>
          <Title>{day.name}</Title>
          {day.exercises.length === 0 && <Muted>Este día aún no tiene ejercicios.</Muted>}
          {day.exercises.map((e) => (
            <View key={e.id} style={styles.exercise}>
              <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>
                {e.exercise_name}
              </Text>
              <Muted>
                {muscleLabel(e.muscle_primary)} · {e.target_sets} × {e.rep_min}–{e.rep_max} reps ·{' '}
                {e.rest_seconds} s descanso
              </Muted>
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          <Title>Día de descanso</Title>
          <Muted>
            Tu rutina activa no tiene ningún día asignado al {WEEKDAYS[weekday].toLowerCase()}.
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
  exercise: { gap: 2 },
});
