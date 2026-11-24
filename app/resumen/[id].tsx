import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { recordText } from '../../src/components/recordText';
import { Button, Card, Muted, Title } from '../../src/components/ui';
import { getExercise } from '../../src/db/repositories/exercises';
import {
  getWorkoutRecords,
  getWorkoutSummary,
  type PersonalRecord,
  type WorkoutSummary,
} from '../../src/db/repositories/records';
import { useWeightUnit } from '../../src/store/settings';
import { useColors } from '../../src/theme';
import { formatWeightUnit } from '../../src/units';

/** Shown after finishing a workout: totals and the personal records beaten. */
export default function WorkoutSummaryScreen() {
  const db = useSQLiteContext();
  const c = useColors();
  const unit = useWeightUnit();
  const workoutId = Number(useLocalSearchParams<{ id: string }>().id);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [records, setRecords] = useState<(PersonalRecord & { name: string })[]>([]);

  useEffect(() => {
    (async () => {
      setSummary(await getWorkoutSummary(db, workoutId));
      const list = await getWorkoutRecords(db, workoutId);
      const named = [];
      for (const r of list)
        named.push({ ...r, name: (await getExercise(db, r.exercise_id))?.name ?? '' });
      setRecords(named);
    })();
  }, [db, workoutId]);

  if (!summary) return null;

  const stats: [string, string][] = [
    ['Duración', summary.duration_min === null ? '—' : `${summary.duration_min} min`],
    ['Series', String(summary.sets)],
    ['Ejercicios', String(summary.exercises)],
    ['Repeticiones', String(summary.total_reps)],
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={[styles.hero, { color: c.text }]}>💪 ¡Entrenamiento completado!</Text>
        <Muted>Todo quedó guardado en tu historial.</Muted>
      </Card>

      <View style={styles.grid}>
        {stats.map(([label, value]) => (
          <Card key={label} style={styles.stat}>
            <Muted>{label}</Muted>
            <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
          </Card>
        ))}
      </View>
      <Card>
        <Muted>Volumen total (peso × repeticiones)</Muted>
        <Text style={[styles.statValue, { color: c.text }]}>
          {formatWeightUnit(Math.round(summary.volume_kg), unit)}
        </Text>
      </Card>

      <Card>
        <Title>Récords personales</Title>
        {records.length === 0 ? (
          <Muted>
            Hoy no hubo récords. Mantener el peso también es progreso: la constancia es lo que hace
            crecer el músculo.
          </Muted>
        ) : (
          records.map((r) => (
            <View key={r.exercise_id} style={[styles.record, { borderColor: c.border }]}>
              <Text style={{ color: c.text, fontWeight: '700' }}>{r.name}</Text>
              <Muted>{recordText(r, unit)}</Muted>
            </View>
          ))
        )}
      </Card>

      <Button label="Listo" icon="checkmark" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  hero: { fontSize: 22, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flexBasis: '46%', flexGrow: 1, gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  record: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 2 },
});
