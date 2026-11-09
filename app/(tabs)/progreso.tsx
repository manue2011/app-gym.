import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { ExerciseThumb } from '../../src/components/ExerciseThumb';
import { Button, Card, Chip, Muted, Title } from '../../src/components/ui';
import { muscleLabel } from '../../src/data/muscles';
import {
  getExerciseHistory,
  listLoggedExercises,
  type LoggedExercise,
  type SessionSummary,
} from '../../src/db/repositories/workouts';
import { useColors } from '../../src/theme';

type Metric = 'top' | 'volume';

const SECTIONS = 4;

/** Smallest round axis maximum (1, 2, 2.5 or 5 × 10ⁿ per section) that fits `value`. */
function niceMax(value: number, sections: number): number {
  const raw = value / sections;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  return step * sections;
}

const formatKg = (kg: number) => (Math.round(kg * 10) / 10).toString().replace('.', ',');
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const c = useColors();
  const { width } = useWindowDimensions();
  const [exercises, setExercises] = useState<LoggedExercise[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [metric, setMetric] = useState<Metric>('top');
  // Read inside the focus effect without re-running it on every selection.
  const selectedRef = useRef<number | null>(null);

  const select = useCallback(
    async (id: number) => {
      selectedRef.current = id;
      setSelectedId(id);
      setHistory(await getExerciseHistory(db, id));
    },
    [db],
  );

  useFocusEffect(
    useCallback(() => {
      listLoggedExercises(db).then((list) => {
        setExercises(list);
        const keep = list.find((e) => e.exercise_id === selectedRef.current) ?? list[0];
        if (keep) select(keep.exercise_id);
      });
    }, [db, select]),
  );

  if (exercises === null) return null;

  if (exercises.length === 0) {
    return (
      <View style={styles.content}>
        <Card>
          <Title>Aún no hay datos</Title>
          <Muted>
            Cuando registres series en un entrenamiento, aquí verás cómo evolucionan tus pesos y tu
            volumen en cada ejercicio.
          </Muted>
          <Button label="Ir a Hoy" onPress={() => router.navigate('/hoy')} />
        </Card>
      </View>
    );
  }

  const selected = exercises.find((e) => e.exercise_id === selectedId) ?? exercises[0];
  const values = history.map((h) => (metric === 'top' ? h.top_weight_kg : h.volume_kg));
  const chartData = history.map((h, i) => ({
    value: values[i],
    label: shortDate(h.started_at),
    dataPointText: formatKg(values[i]),
  }));
  const best = history.reduce<SessionSummary | null>(
    (acc, h) =>
      !acc ||
      h.top_weight_kg > acc.top_weight_kg ||
      (h.top_weight_kg === acc.top_weight_kg && h.top_weight_reps > acc.top_weight_reps)
        ? h
        : acc,
    null,
  );
  const first = history[0];
  const last = history[history.length - 1];
  const chartWidth = width - 32 - 28 - 44 - 24;
  const spacing = Math.max(44, Math.min(80, chartWidth / Math.max(1, chartData.length)));
  const maxValue = niceMax(Math.max(...values, 1) * 1.1, SECTIONS);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {exercises.map((e) => (
          <Pressable
            key={e.exercise_id}
            onPress={() => select(e.exercise_id)}
            style={[
              styles.exerciseChip,
              {
                backgroundColor: c.card,
                borderColor: e.exercise_id === selected.exercise_id ? c.primary : c.border,
              },
            ]}>
            <ExerciseThumb slug={e.slug} size={56} />
            <Text style={{ color: c.text, fontSize: 12, width: 84 }} numberOfLines={2}>
              {e.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Card>
        <Title>{selected.name}</Title>
        <Muted>
          {muscleLabel(selected.muscle_primary)} ·{' '}
          {selected.sessions === 1 ? '1 sesión' : `${selected.sessions} sesiones`}
        </Muted>
        <View style={styles.row}>
          <Chip label="Peso máximo" selected={metric === 'top'} onPress={() => setMetric('top')} />
          <Chip
            label="Volumen"
            selected={metric === 'volume'}
            onPress={() => setMetric('volume')}
          />
        </View>
        {history.length > 0 && (
          <LineChart
            key={`${selected.exercise_id}-${metric}`}
            data={chartData}
            width={chartWidth}
            height={200}
            spacing={spacing}
            initialSpacing={20}
            endSpacing={20}
            maxValue={maxValue}
            noOfSections={SECTIONS}
            color={c.primary}
            thickness={3}
            dataPointsColor={c.primary}
            dataPointsRadius={5}
            textColor={c.text}
            textShiftY={-8}
            yAxisLabelWidth={44}
            yAxisTextStyle={{ color: c.muted, fontSize: 11 }}
            xAxisLabelTextStyle={{ color: c.muted, fontSize: 11 }}
            yAxisColor={c.border}
            xAxisColor={c.border}
            rulesColor={c.border}
            rulesType="solid"
            areaChart
            startFillColor={c.primary}
            endFillColor={c.primary}
            startOpacity={0.25}
            endOpacity={0.02}
            scrollToEnd
          />
        )}
        <Muted>
          {metric === 'top'
            ? 'Peso más alto levantado en cada sesión (kg).'
            : 'Volumen por sesión: suma de peso × repeticiones de todas las series (kg).'}
        </Muted>
      </Card>

      {best && first && last && (
        <View style={styles.row}>
          <Card style={styles.stat}>
            <Muted>Mejor marca</Muted>
            <Text style={[styles.statValue, { color: c.text }]}>
              {formatKg(best.top_weight_kg)} kg × {best.top_weight_reps}
            </Text>
            <Muted>{longDate(best.started_at)}</Muted>
          </Card>
          <Card style={styles.stat}>
            <Muted>Desde la 1.ª sesión</Muted>
            <Text style={[styles.statValue, { color: c.text }]}>
              {last.top_weight_kg - first.top_weight_kg >= 0 ? '+' : ''}
              {formatKg(last.top_weight_kg - first.top_weight_kg)} kg
            </Text>
            <Muted>en peso máximo</Muted>
          </Card>
        </View>
      )}

      <Card>
        <Title>Historial</Title>
        {[...history].reverse().map((h) => (
          <View key={h.workout_id} style={[styles.session, { borderColor: c.border }]}>
            <Text style={{ color: c.text, fontWeight: '600' }}>{longDate(h.started_at)}</Text>
            <Muted>{h.sets.map((s) => `${formatKg(s.weight_kg)}×${s.reps}`).join('  ·  ')}</Muted>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 8 },
  exerciseChip: {
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  stat: { flex: 1, gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  session: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 2 },
});
