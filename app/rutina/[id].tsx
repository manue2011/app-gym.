import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExerciseThumb } from '../../src/components/ExerciseThumb';
import {
  Button,
  Card,
  Chip,
  CommitTextInput,
  IconButton,
  Muted,
  NumberField,
} from '../../src/components/ui';
import { muscleLabel, WEEKDAY_ORDER, WEEKDAYS, WEEKDAYS_SHORT } from '../../src/data/muscles';
import {
  addDay,
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
import { useRoutinesStore } from '../../src/store/routines';
import { useColors } from '../../src/theme';

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
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

      {routine.days.map((day, dayIndex) => (
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
          <Muted>{day.weekday === null ? 'Sin día fijo' : WEEKDAYS[day.weekday]}</Muted>

          {day.exercises.map((ex, exIndex) => (
            <ExerciseEditor
              key={ex.id}
              exercise={ex}
              isFirst={exIndex === 0}
              isLast={exIndex === day.exercises.length - 1}
              onChange={(patch) => save(() => updateRoutineExercise(db, ex.id, patch))}
              onMove={(delta) =>
                save(() =>
                  reorderExercises(
                    db,
                    day.id,
                    move(
                      day.exercises.map((e) => e.id),
                      exIndex,
                      delta,
                    ),
                  ),
                )
              }
              onRemove={() => save(() => removeRoutineExercise(db, ex.id))}
            />
          ))}

          <Button
            label="Añadir ejercicio"
            icon="add"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/elegir-ejercicio', params: { dayId: String(day.id) } })
            }
          />
        </Card>
      ))}

      <Button
        label="Añadir día"
        icon="add"
        onPress={() =>
          save(() => addDay(db, routine.id, { name: `Día ${routine.days.length + 1}` }))
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

function ExerciseEditor({
  exercise: ex,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  exercise: RoutineExercise;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<ExerciseTargets>) => void;
  onMove: (delta: -1 | 1) => void;
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
        <IconButton icon="arrow-up" label="Subir" disabled={isFirst} onPress={() => onMove(-1)} />
        <IconButton icon="arrow-down" label="Bajar" disabled={isLast} onPress={() => onMove(1)} />
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
});
