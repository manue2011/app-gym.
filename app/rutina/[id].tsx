import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState, type ReactElement } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DraggableList } from '../../src/components/DraggableList';
import { ExerciseThumb } from '../../src/components/ExerciseThumb';
import { WhyLink } from '../../src/components/WhyLink';
import {
  Button,
  Card,
  Chip,
  CommitTextInput,
  IconButton,
  Muted,
  NumberField,
  Title,
} from '../../src/components/ui';
import { muscleLabel, WEEKDAY_ORDER, WEEKDAYS, WEEKDAYS_SHORT } from '../../src/data/muscles';
import {
  addDay,
  dayForWeekday,
  getRoutine,
  removeDay,
  removeRoutineExercise,
  renameRoutine,
  reorderDays,
  reorderExercises,
  updateDay,
  updateRoutineExercise,
  type ExerciseTargets,
  type RoutineDetail,
  type RoutineExercise,
} from '../../src/db/repositories/routines';
import {
  repRangeWarnings,
  volumeWarnings,
  weeklyVolume,
  type RoutineWarning,
} from '../../src/science/routineAnalysis';
import { MIN_WEEKLY_SETS, type RuleId } from '../../src/science/rules';
import { useRoutinesStore } from '../../src/store/routines';
import { useColors } from '../../src/theme';

/** Matches the Card gap, so dragged items move exactly one slot. */
const CARD_GAP = 10;

/** Returns a copy of `ids` with the item at `index` moved by `delta` (-1 up, +1 down). */
function move(ids: number[], index: number, delta: -1 | 1): number[] {
  const next = [...ids];
  const target = index + delta;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function RoutineEditorScreen() {
  const db = useSQLiteContext();
  const c = useColors();
  const routineId = Number(useLocalSearchParams<{ id: string }>().id);
  const [routine, setRoutine] = useState<RoutineDetail | null | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  /** Day shown in the editor; null = today's day (or the first one). */
  const [shownDay, setShownDay] = useState<number | 'all' | null>(null);
  const { setActive, duplicate, remove } = useRoutinesStore();

  const reload = useCallback(async () => {
    setRoutine(await getRoutine(db, routineId));
  }, [db, routineId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  /** Saves a change, reports validation errors in Spanish, and re-reads from SQLite. */
  const save = async (change: () => Promise<unknown>) => {
    try {
      await change();
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : String(e));
    }
    await reload();
  };

  if (routine === undefined) return null;
  if (routine === null) {
    return (
      <View style={styles.content}>
        <Muted>Esta rutina no existe o fue eliminada.</Muted>
      </View>
    );
  }

  const dayIds = routine.days.map((d) => d.id);
  const selected =
    shownDay === 'all'
      ? 'all'
      : (routine.days.find((d) => d.id === shownDay) ??
        dayForWeekday(routine, new Date().getDay()) ??
        routine.days[0]);
  const visibleDays =
    selected === 'all' ? routine.days : routine.days.filter((d) => d.id === selected?.id);

  const confirmRemoveDay = (dayId: number, name: string) =>
    Alert.alert('Quitar día', `¿Quitar "${name}" de la rutina?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => save(() => removeDay(db, dayId)) },
    ]);

  const confirmDeleteRoutine = () =>
    Alert.alert(
      'Eliminar rutina',
      `¿Eliminar "${routine.name}"? Tu historial de entrenamientos no se borra.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await remove(db, routine.id, routine.name);
            router.back();
          },
        },
      ],
    );

  const onDuplicate = async () => {
    const id = await duplicate(db, routine.id);
    router.replace({ pathname: '/rutina/[id]', params: { id: String(id) } });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={!dragging}>
      <Stack.Screen options={{ title: routine.name }} />

      <Card>
        <Muted>Nombre de la rutina</Muted>
        <CommitTextInput
          value={routine.name}
          onCommit={(name) => save(() => renameRoutine(db, routine.id, name))}
          placeholder="Ej. Push/Pull/Legs"
          returnKeyType="done"
          style={styles.routineName}
        />
        {routine.is_active ? (
          <Muted>★ Es tu rutina activa: la pestaña Hoy muestra el día que toca.</Muted>
        ) : (
          <Button
            label="Marcar como activa"
            icon="star-outline"
            variant="secondary"
            onPress={() => save(() => setActive(db, routine.id))}
          />
        )}
      </Card>

      <WeeklySummary routine={routine} />

      {routine.days.length > 1 && (
        <View style={styles.chips}>
          {routine.days.map((d) => (
            <Chip
              key={d.id}
              label={d.weekday === null ? d.name : `${WEEKDAYS[d.weekday]} · ${d.name}`}
              selected={selected !== 'all' && selected?.id === d.id}
              onPress={() => setShownDay(d.id)}
            />
          ))}
          <Chip
            label="Toda la semana"
            selected={selected === 'all'}
            onPress={() => setShownDay('all')}
          />
        </View>
      )}

      {visibleDays.map((day) => {
        const dayIndex = dayIds.indexOf(day.id);
        return (
          <Card key={day.id}>
            <View style={styles.row}>
              <CommitTextInput
                value={day.name}
                onCommit={(name) => save(() => updateDay(db, day.id, { name }))}
                placeholder="Ej. Pecho y tríceps"
                returnKeyType="done"
                style={styles.dayName}
              />
              <IconButton
                icon="arrow-up"
                label="Subir día"
                disabled={dayIndex === 0}
                onPress={() => save(() => reorderDays(db, routine.id, move(dayIds, dayIndex, -1)))}
              />
              <IconButton
                icon="arrow-down"
                label="Bajar día"
                disabled={dayIndex === dayIds.length - 1}
                onPress={() => save(() => reorderDays(db, routine.id, move(dayIds, dayIndex, 1)))}
              />
              <IconButton
                icon="trash-outline"
                label="Quitar día"
                color={c.danger}
                onPress={() => confirmRemoveDay(day.id, day.name)}
              />
            </View>

            <Muted>
              Día de la semana: {day.weekday === null ? 'sin día fijo' : WEEKDAYS[day.weekday]}
            </Muted>
            <View style={styles.chips}>
              {WEEKDAY_ORDER.map((wd) => (
                <Chip
                  key={wd}
                  label={WEEKDAYS_SHORT[wd]}
                  selected={day.weekday === wd}
                  onPress={() =>
                    save(() => updateDay(db, day.id, { weekday: day.weekday === wd ? null : wd }))
                  }
                />
              ))}
            </View>

            <DraggableList
              items={day.exercises}
              keyOf={(ex) => ex.id}
              gap={CARD_GAP}
              onDragChange={setDragging}
              onReorder={(ids) => {
                // Show the new order at once; SQLite is the source of truth after the reload.
                setRoutine({
                  ...routine,
                  days: routine.days.map((d) =>
                    d.id === day.id
                      ? { ...d, exercises: ids.map((id) => d.exercises.find((e) => e.id === id)!) }
                      : d,
                  ),
                });
                save(() => reorderExercises(db, day.id, ids));
              }}
              renderItem={(ex, handle) => (
                <ExerciseEditor
                  exercise={ex}
                  handle={handle}
                  onChange={(patch) => save(() => updateRoutineExercise(db, ex.id, patch))}
                  onRemove={() => save(() => removeRoutineExercise(db, ex.id))}
                />
              )}
            />

            <Button
              label="Añadir ejercicio"
              icon="add"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: '/elegir-ejercicio', params: { dayId: String(day.id) } })
              }
            />
          </Card>
        );
      })}

      <Button
        label="Añadir día"
        icon="add"
        onPress={() =>
          save(async () =>
            setShownDay(await addDay(db, routine.id, { name: `Día ${routine.days.length + 1}` })),
          )
        }
      />

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Button label="Duplicar" icon="copy-outline" variant="secondary" onPress={onDuplicate} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Eliminar"
            icon="trash-outline"
            variant="danger"
            onPress={confirmDeleteRoutine}
          />
        </View>
      </View>
    </ScrollView>
  );
}

/** Planned weekly sets per muscle, with evidence-based warnings. */
function WeeklySummary({ routine }: { routine: RoutineDetail }) {
  const c = useColors();
  const volume = weeklyVolume(routine.days);
  if (volume.length === 0) return null;
  const warnings = [...volumeWarnings(volume, muscleLabel), ...repRangeWarnings(routine.days)];
  const byRule = new Map<RuleId, RoutineWarning[]>();
  for (const w of warnings) byRule.set(w.rule, [...(byRule.get(w.rule) ?? []), w]);
  const heading: Record<string, string> = {
    volume: 'Poco volumen',
    frequency: 'Poca frecuencia',
    repRange: 'Repeticiones fuera de rango',
  };

  return (
    <Card>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Title>Resumen semanal</Title>
        </View>
        <WhyLink rule="volume" />
      </View>
      <Muted>Series por semana del músculo principal de cada ejercicio.</Muted>
      {volume.map((v) => (
        <View key={v.muscle} style={styles.row}>
          <Text style={{ color: c.text, flex: 1 }}>{muscleLabel(v.muscle)}</Text>
          <Text
            style={{
              color: v.sets < MIN_WEEKLY_SETS ? c.danger : c.text,
              fontWeight: '600',
            }}>
            {v.sets} series · {v.days === 1 ? '1 día' : `${v.days} días`}
          </Text>
        </View>
      ))}
      {[...byRule].map(([rule, list]) => (
        <View key={rule} style={[styles.warning, { backgroundColor: c.chip }]}>
          <View style={styles.row}>
            <Text style={{ color: c.text, fontWeight: '700', flex: 1 }}>⚠️ {heading[rule]}</Text>
            <WhyLink rule={rule} />
          </View>
          {list.map((w) => (
            <Muted key={w.message}>{w.message}</Muted>
          ))}
        </View>
      ))}
      {warnings.length === 0 && (
        <Muted>✅ Volumen, frecuencia y repeticiones dentro de lo recomendado.</Muted>
      )}
    </Card>
  );
}

function ExerciseEditor({
  exercise: ex,
  handle,
  onChange,
  onRemove,
}: {
  exercise: RoutineExercise;
  handle: ReactElement;
  onChange: (patch: Partial<ExerciseTargets>) => void;
  onRemove: () => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.exercise, { borderColor: c.border }]}>
      <View style={styles.row}>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/ejercicio/[id]', params: { id: String(ex.exercise_id) } })
          }>
          <ExerciseThumb slug={ex.exercise_slug} size={52} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>{ex.exercise_name}</Text>
          <Muted>{muscleLabel(ex.muscle_primary)}</Muted>
        </View>
        {handle}
        <IconButton icon="close" label="Quitar ejercicio" color={c.danger} onPress={onRemove} />
      </View>
      <View style={styles.row}>
        <NumberField
          label="Series"
          value={ex.target_sets}
          onCommit={(n) => onChange({ target_sets: n })}
        />
        <NumberField
          label="Reps mín"
          value={ex.rep_min}
          onCommit={(n) => onChange({ rep_min: n })}
        />
        <NumberField
          label="Reps máx"
          value={ex.rep_max}
          onCommit={(n) => onChange({ rep_max: n })}
        />
        <NumberField
          label="Descanso (s)"
          value={ex.rest_seconds}
          onCommit={(n) => onChange({ rest_seconds: n })}
        />
      </View>
      <CommitTextInput
        value={ex.notes ?? ''}
        onCommit={(notes) => onChange({ notes })}
        placeholder="Notas (opcional)"
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  routineName: { fontSize: 18, fontWeight: '700' },
  dayName: { flex: 1, fontSize: 16, fontWeight: '700' },
  exercise: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 8 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 8 },
  warning: { borderRadius: 10, padding: 10, gap: 4 },
});
