import Ionicons from '@expo/vector-icons/Ionicons';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RestTimer } from '../../src/components/RestTimer';
import { Button, Card, Muted } from '../../src/components/ui';
import { muscleLabel } from '../../src/data/muscles';
import { getRoutineDay, type RoutineExercise } from '../../src/db/repositories/routines';
import {
  discardEmptyWorkout,
  finishWorkout,
  getLastPerformance,
  getWorkout,
  getWorkoutSets,
  logSet,
  prefillFor,
  type Workout,
  type WorkoutSet,
} from '../../src/db/repositories/workouts';
import { useColors } from '../../src/theme';

interface Draft {
  weight: string;
  reps: string;
  rir: string;
}

const parseDecimal = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));
const parseOptionalInt = (s: string) => (s.trim() === '' ? null : Number(s));
const formatKg = (kg: number) => String(kg).replace('.', ',');
const restEndsAt = (seconds: number) => Date.now() + seconds * 1000;

interface SessionData {
  workout: Workout;
  title: string;
  exercises: RoutineExercise[];
  sets: WorkoutSet[];
  last: Record<number, WorkoutSet[]>;
}

export default function SessionScreen() {
  useKeepAwake();
  const db = useSQLiteContext();
  const c = useColors();
  const workoutId = Number(useLocalSearchParams<{ id: string }>().id);
  const [data, setData] = useState<SessionData | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [extraSets, setExtraSets] = useState<Record<number, number>>({});
  const [restEndAt, setRestEndAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    const workout = await getWorkout(db, workoutId);
    if (!workout) return;
    const day = workout.routine_day_id ? await getRoutineDay(db, workout.routine_day_id) : null;
    const exercises = day?.exercises ?? [];
    const sets = await getWorkoutSets(db, workoutId);
    const last: Record<number, WorkoutSet[]> = {};
    for (const e of exercises)
      last[e.exercise_id] = await getLastPerformance(db, e.exercise_id, workoutId);
    setData({ workout, title: day?.name ?? 'Entrenamiento', exercises, sets, last });
  }, [db, workoutId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!data) return null;

  const logged = (exerciseId: number, setNumber: number) =>
    data.sets.find((s) => s.exercise_id === exerciseId && s.set_number === setNumber);

  const draftFor = (exerciseId: number, setNumber: number): Draft => {
    const key = `${exerciseId}:${setNumber}`;
    if (drafts[key]) return drafts[key];
    // Already logged > same set last time > previous set today > last set done last time.
    const lastTime = data.last[exerciseId] ?? [];
    const source =
      logged(exerciseId, setNumber) ??
      lastTime.find((s) => s.set_number === setNumber) ??
      (setNumber > 1 ? logged(exerciseId, setNumber - 1) : undefined) ??
      prefillFor(lastTime, setNumber);
    return source
      ? {
          weight: formatKg(source.weight_kg),
          reps: String(source.reps),
          rir: source.rir === null ? '' : String(source.rir),
        }
      : { weight: '', reps: '', rir: '' };
  };

  const editDraft = (exerciseId: number, setNumber: number, patch: Partial<Draft>) =>
    setDrafts((d) => ({
      ...d,
      [`${exerciseId}:${setNumber}`]: { ...draftFor(exerciseId, setNumber), ...patch },
    }));

  const completeSet = async (ex: RoutineExercise, setNumber: number) => {
    const d = draftFor(ex.exercise_id, setNumber);
    Keyboard.dismiss();
    try {
      await logSet(db, {
        workout_id: workoutId,
        exercise_id: ex.exercise_id,
        set_number: setNumber,
        weight_kg: parseDecimal(d.weight),
        reps: parseDecimal(d.reps),
        rir: parseOptionalInt(d.rir),
      });
    } catch (e) {
      Alert.alert('Revisa la serie', e instanceof Error ? e.message : String(e));
      return;
    }
    setDrafts(({ [`${ex.exercise_id}:${setNumber}`]: _saved, ...rest }) => rest);
    await load();
    if (ex.rest_seconds > 0) setRestEndAt(restEndsAt(ex.rest_seconds));
  };

  const finish = () => {
    if (data.sets.length === 0) {
      Alert.alert(
        'Salir sin guardar',
        'No registraste ninguna serie. ¿Descartar este entrenamiento?',
        [
          { text: 'Seguir entrenando', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: async () => {
              await discardEmptyWorkout(db, workoutId);
              router.back();
            },
          },
        ],
      );
      return;
    }
    Alert.alert('Terminar entrenamiento', `Guardaste ${data.sets.length} series. ¿Terminar?`, [
      { text: 'Seguir', style: 'cancel' },
      {
        text: 'Terminar',
        onPress: async () => {
          await finishWorkout(db, workoutId);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: data.title,
          headerRight: () => (
            <Pressable onPress={finish} hitSlop={8}>
              <Text style={{ color: c.primary, fontWeight: '700', fontSize: 16 }}>Terminar</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {data.exercises.length === 0 && (
          <Muted>Este día no tiene ejercicios. Añádelos desde el editor de la rutina.</Muted>
        )}
        {data.exercises.map((ex) => {
          const loggedCount = data.sets.filter((s) => s.exercise_id === ex.exercise_id).length;
          const maxLogged = Math.max(
            0,
            ...data.sets.filter((s) => s.exercise_id === ex.exercise_id).map((s) => s.set_number),
          );
          const rows = Math.max(ex.target_sets + (extraSets[ex.exercise_id] ?? 0), maxLogged);
          const last = data.last[ex.exercise_id] ?? [];
          return (
            <Card key={ex.id}>
              <Pressable
                style={styles.exerciseHeader}
                onPress={() =>
                  router.push({
                    pathname: '/ejercicio/[id]',
                    params: { id: String(ex.exercise_id) },
                  })
                }>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exerciseName, { color: c.text }]}>{ex.exercise_name}</Text>
                  <Muted>
                    {muscleLabel(ex.muscle_primary)} · objetivo {ex.target_sets} × {ex.rep_min}–
                    {ex.rep_max} · {loggedCount}/{ex.target_sets} hechas
                  </Muted>
                </View>
                <Ionicons name="play-circle-outline" size={28} color={c.primary} />
              </Pressable>
              {last.length > 0 ? (
                <Muted>
                  Última vez:{' '}
                  {last.map((s) => `${formatKg(s.weight_kg)} kg × ${s.reps}`).join(' · ')}
                </Muted>
              ) : (
                <Muted>Primera vez con este ejercicio.</Muted>
              )}
              {ex.notes && <Muted>📝 {ex.notes}</Muted>}

              <View style={styles.headerRow}>
                <Text style={[styles.colSet, styles.colLabel, { color: c.muted }]}>Serie</Text>
                <Text style={[styles.colInput, styles.colLabel, { color: c.muted }]}>kg</Text>
                <Text style={[styles.colInput, styles.colLabel, { color: c.muted }]}>Reps</Text>
                <Text style={[styles.colInput, styles.colLabel, { color: c.muted }]}>RIR</Text>
                <View style={styles.colCheck} />
              </View>
              {Array.from({ length: rows }, (_, i) => i + 1).map((n) => {
                const d = draftFor(ex.exercise_id, n);
                const saved = logged(ex.exercise_id, n);
                const dirty = drafts[`${ex.exercise_id}:${n}`] !== undefined;
                const input = (field: keyof Draft, keyboard: 'decimal-pad' | 'number-pad') => (
                  <TextInput
                    value={d[field]}
                    onChangeText={(t) => editDraft(ex.exercise_id, n, { [field]: t })}
                    keyboardType={keyboard}
                    selectTextOnFocus
                    placeholder="–"
                    placeholderTextColor={c.muted}
                    style={[
                      styles.colInput,
                      styles.input,
                      {
                        color: c.text,
                        borderColor: c.border,
                        backgroundColor: saved && !dirty ? c.chip : 'transparent',
                      },
                    ]}
                  />
                );
                return (
                  <View key={n} style={styles.setRow}>
                    <Text style={[styles.colSet, { color: c.text, fontWeight: '700' }]}>{n}</Text>
                    {input('weight', 'decimal-pad')}
                    {input('reps', 'number-pad')}
                    {input('rir', 'number-pad')}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Completar serie ${n}`}
                      hitSlop={6}
                      onPress={() => completeSet(ex, n)}
                      style={styles.colCheck}>
                      <Ionicons
                        name={saved && !dirty ? 'checkmark-circle' : 'checkmark-circle-outline'}
                        size={32}
                        color={saved && !dirty ? c.primary : c.muted}
                      />
                    </Pressable>
                  </View>
                );
              })}
              <Button
                label="Añadir serie"
                icon="add"
                variant="secondary"
                onPress={() =>
                  setExtraSets((x) => ({ ...x, [ex.exercise_id]: (x[ex.exercise_id] ?? 0) + 1 }))
                }
              />
            </Card>
          );
        })}
        <Muted>RIR = repeticiones que te quedaban en reserva (0 = al fallo). Es opcional.</Muted>
        <Button label="Terminar entrenamiento" icon="flag-outline" onPress={finish} />
      </ScrollView>
      <RestTimer endAt={restEndAt} onChange={setRestEndAt} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exerciseName: { fontSize: 17, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colLabel: { fontSize: 12, textAlign: 'center' },
  colSet: { width: 40, textAlign: 'center' },
  colInput: { flex: 1 },
  colCheck: { width: 40, alignItems: 'center' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 16,
  },
});
