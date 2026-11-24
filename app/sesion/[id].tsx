import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
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

import { ExerciseThumb } from '../../src/components/ExerciseThumb';
import { RestTimer } from '../../src/components/RestTimer';
import { WhyLink } from '../../src/components/WhyLink';
import { Button, Card, Muted } from '../../src/components/ui';
import { muscleLabel } from '../../src/data/muscles';
import {
  formatRepRange,
  getRoutineDay,
  type RoutineExercise,
} from '../../src/db/repositories/routines';
import { recordText } from '../../src/components/recordText';
import { findRecord, getSetsBefore, type PersonalRecord } from '../../src/db/repositories/records';
import {
  discardOpenWorkout,
  finishWorkout,
  getLastPerformance,
  getWorkout,
  getWorkoutSets,
  logSet,
  prefillFor,
  type Workout,
  type WorkoutSet,
} from '../../src/db/repositories/workouts';
import { suggestOverload } from '../../src/science/overload';
import { MAX_RECOMMENDED_RIR } from '../../src/science/rules';
import { useWeightUnit } from '../../src/store/settings';
import { useColors } from '../../src/theme';
import { formatWeight, formatWeightUnit, parseWeightToKg } from '../../src/units';

interface Draft {
  weight: string;
  reps: string;
  rir: string;
}

const parseInteger = (s: string) => (s.trim() === '' ? NaN : Number(s));
const parseOptionalInt = (s: string) => (s.trim() === '' ? null : Number(s));
const restEndsAt = (seconds: number) => Date.now() + seconds * 1000;

interface SessionData {
  workout: Workout;
  title: string;
  exercises: RoutineExercise[];
  sets: WorkoutSet[];
  last: Record<number, WorkoutSet[]>;
  /** Record beaten today per exercise, compared with every earlier workout. */
  records: Record<number, PersonalRecord | null>;
}

export default function SessionScreen() {
  useKeepAwake();
  const db = useSQLiteContext();
  const c = useColors();
  const unit = useWeightUnit();
  const workoutId = Number(useLocalSearchParams<{ id: string }>().id);
  const [data, setData] = useState<SessionData | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [extraSets, setExtraSets] = useState<Record<number, number>>({});
  const [restEndAt, setRestEndAt] = useState<number | null>(null);

  const load = useCallback(async (): Promise<SessionData | null> => {
    const workout = await getWorkout(db, workoutId);
    if (!workout) return null;
    const day = workout.routine_day_id ? await getRoutineDay(db, workout.routine_day_id) : null;
    const exercises = day?.exercises ?? [];
    const sets = await getWorkoutSets(db, workoutId);
    const last: Record<number, WorkoutSet[]> = {};
    const records: Record<number, PersonalRecord | null> = {};
    for (const e of exercises) {
      last[e.exercise_id] = await getLastPerformance(db, e.exercise_id, workoutId);
      records[e.exercise_id] = findRecord(
        e.exercise_id,
        sets.filter((s) => s.exercise_id === e.exercise_id),
        await getSetsBefore(db, e.exercise_id, workoutId),
      );
    }
    const next = { workout, title: day?.name ?? 'Entrenamiento', exercises, sets, last, records };
    setData(next);
    return next;
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
          weight: formatWeight(source.weight_kg, unit),
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
        weight_kg: parseWeightToKg(d.weight, unit),
        reps: parseInteger(d.reps),
        rir: parseOptionalInt(d.rir),
      });
    } catch (e) {
      Alert.alert('Revisa la serie', e instanceof Error ? e.message : String(e));
      return;
    }
    setDrafts(({ [`${ex.exercise_id}:${setNumber}`]: _saved, ...rest }) => rest);
    const before = data.records[ex.exercise_id];
    const after = (await load())?.records[ex.exercise_id];
    const newRecord =
      after && (!before || after.weight_kg !== before.weight_kg || after.reps !== before.reps);
    if (newRecord) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (ex.rest_seconds > 0) setRestEndAt(restEndsAt(ex.rest_seconds));
  };

  /** Leaves without saving anything from this workout. */
  const discard = () =>
    Alert.alert(
      'Descartar entrenamiento',
      data.sets.length === 0
        ? 'No registraste ninguna serie. ¿Salir sin guardar este entrenamiento?'
        : `Se borrarán las ${data.sets.length} series que marcaste hoy y no quedará en tu historial. ¿Descartar?`,
      [
        { text: 'Seguir entrenando', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            await discardOpenWorkout(db, workoutId);
            router.back();
          },
        },
      ],
    );

  const finish = () => {
    if (data.sets.length === 0) {
      discard();
      return;
    }
    Alert.alert('Terminar entrenamiento', `Guardaste ${data.sets.length} series. ¿Terminar?`, [
      { text: 'Seguir', style: 'cancel' },
      {
        text: 'Terminar',
        onPress: async () => {
          await finishWorkout(db, workoutId);
          router.replace({ pathname: '/resumen/[id]', params: { id: String(workoutId) } });
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
          const suggestion = suggestOverload(last, ex, unit);
          const record = data.records[ex.exercise_id];
          const highRir = data.sets.some(
            (s) =>
              s.exercise_id === ex.exercise_id && s.rir !== null && s.rir > MAX_RECOMMENDED_RIR,
          );
          const pending = Array.from({ length: rows }, (_, i) => i + 1).filter(
            (n) => !logged(ex.exercise_id, n),
          );
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
                <ExerciseThumb slug={ex.exercise_slug} size={56} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exerciseName, { color: c.text }]}>{ex.exercise_name}</Text>
                  <Muted>
                    {muscleLabel(ex.muscle_primary)} · objetivo {ex.target_sets} ×{' '}
                    {formatRepRange(ex)} · {loggedCount}/{ex.target_sets} hechas
                  </Muted>
                </View>
                <Ionicons name="play-circle-outline" size={28} color={c.primary} />
              </Pressable>
              {last.length > 0 ? (
                <Muted>
                  Última vez:{' '}
                  {last
                    .map((s) => `${formatWeightUnit(s.weight_kg, unit)} × ${s.reps}`)
                    .join(' · ')}
                </Muted>
              ) : (
                <Muted>Primera vez con este ejercicio.</Muted>
              )}
              {ex.notes && <Muted>📝 {ex.notes}</Muted>}
              {suggestion && (
                <View style={[styles.hint, { backgroundColor: c.chip }]}>
                  <Text style={{ color: c.text }}>
                    💡 La última vez llegaste a {ex.rep_max} reps en todas las series. Puedes probar
                    con {formatWeightUnit(suggestion.toKg, unit)} (antes{' '}
                    {formatWeightUnit(suggestion.fromKg, unit)}).
                  </Text>
                  <View style={styles.hintActions}>
                    {pending.length > 0 && (
                      <Pressable
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() =>
                          pending.forEach((n) =>
                            editDraft(ex.exercise_id, n, {
                              weight: formatWeight(suggestion.toKg, unit),
                            }),
                          )
                        }>
                        <Text style={{ color: c.primary, fontWeight: '700' }}>
                          Usar {formatWeightUnit(suggestion.toKg, unit)}
                        </Text>
                      </Pressable>
                    )}
                    <WhyLink rule="overload" />
                  </View>
                </View>
              )}
              {record && (
                <View style={[styles.hint, { backgroundColor: c.chip }]}>
                  <Text style={{ color: c.text, fontWeight: '600' }}>
                    {recordText(record, unit)}
                  </Text>
                </View>
              )}
              {highRir && (
                <View style={[styles.hint, { backgroundColor: c.chip }]}>
                  <Text style={{ color: c.text }}>
                    Te quedaron más de {MAX_RECOMMENDED_RIR} reps en reserva. Para ganar músculo,
                    acércate un poco más al fallo (RIR 0–{MAX_RECOMMENDED_RIR}).
                  </Text>
                  <View style={styles.hintActions}>
                    <WhyLink rule="proximity" />
                  </View>
                </View>
              )}

              <View style={styles.headerRow}>
                <Text style={[styles.colSet, styles.colLabel, { color: c.muted }]}>Serie</Text>
                <Text style={[styles.colInput, styles.colLabel, { color: c.muted }]}>{unit}</Text>
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
        <View style={styles.hintActions}>
          <View style={{ flex: 1 }}>
            <Muted>
              RIR = repeticiones que te quedaban en reserva (0 = al fallo). Es opcional.
            </Muted>
          </View>
          <WhyLink rule="proximity" />
        </View>
        <Button label="Terminar entrenamiento" icon="flag-outline" onPress={finish} />
        <Button
          label="Descartar entrenamiento"
          icon="trash-outline"
          variant="danger"
          onPress={discard}
        />
      </ScrollView>
      <RestTimer endAt={restEndAt} onChange={setRestEndAt} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseName: { fontSize: 17, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colLabel: { fontSize: 12, textAlign: 'center' },
  colSet: { width: 40, textAlign: 'center' },
  colInput: { flex: 1 },
  colCheck: { width: 40, alignItems: 'center' },
  hint: { borderRadius: 10, padding: 10, gap: 6 },
  hintActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 16,
  },
});
