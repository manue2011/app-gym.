import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { ExerciseList } from '../src/components/ExerciseList';
import { Button, Card, Chip, Muted } from '../src/components/ui';
import { MUSCLE_IDS, muscleLabel, type Muscle } from '../src/data/muscles';
import { createCustomExercise } from '../src/db/repositories/exercises';
import { addExerciseToDay } from '../src/db/repositories/routines';
import { useColors } from '../src/theme';

export default function PickExerciseScreen() {
  const db = useSQLiteContext();
  const c = useColors();
  const dayId = Number(useLocalSearchParams<{ dayId: string }>().dayId);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<Muscle>('chest');

  const add = async (exerciseId: number) => {
    try {
      await addExerciseToDay(db, dayId, exerciseId);
      router.back();
    } catch (e) {
      Alert.alert('No se pudo añadir', e instanceof Error ? e.message : String(e));
    }
  };

  const createAndAdd = async () => {
    try {
      const id = await createCustomExercise(db, { name, muscle_primary: muscle });
      await add(id);
    } catch (e) {
      Alert.alert('No se pudo crear', e instanceof Error ? e.message : String(e));
    }
  };

  const header = creating ? (
    <Card>
      <Muted>Nombre del ejercicio</Muted>
      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder="Ej. Press en máquina Hammer"
        placeholderTextColor={c.muted}
        style={[styles.input, { color: c.text, borderColor: c.border }]}
      />
      <Muted>Músculo principal</Muted>
      <View style={styles.chips}>
        {MUSCLE_IDS.map((m) => (
          <Chip
            key={m}
            label={muscleLabel(m)}
            selected={muscle === m}
            onPress={() => setMuscle(m)}
          />
        ))}
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button label="Cancelar" variant="secondary" onPress={() => setCreating(false)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Crear y añadir" disabled={!name.trim()} onPress={createAndAdd} />
        </View>
      </View>
    </Card>
  ) : (
    <Button
      label="Crear ejercicio propio"
      icon="create-outline"
      variant="secondary"
      onPress={() => setCreating(true)}
    />
  );

  return <ExerciseList header={header} onSelect={(e) => add(e.id)} />;
}

const styles = StyleSheet.create({
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 10, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', gap: 12 },
});
