import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EXERCISE_MEDIA } from '../data/exerciseMedia';
import { EQUIPMENT, MUSCLE_IDS, muscleLabel, type Equipment } from '../data/muscles';
import { listExercises, type Exercise } from '../db/repositories/exercises';
import { useColors } from '../theme';
import { Chip, IconButton, Muted } from './ui';

/** Searchable exercise catalog, filterable by primary muscle. Used by the library and the picker. */
export function ExerciseList({
  onSelect,
  onInfo,
  header,
}: {
  onSelect: (exercise: Exercise) => void;
  /** When set, shows an info button next to each exercise. */
  onInfo?: (exercise: Exercise) => void;
  header?: ReactElement;
}) {
  const db = useSQLiteContext();
  const c = useColors();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      listExercises(db).then(setExercises);
    }, [db]),
  );

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es');
    return exercises.filter(
      (e) =>
        (!muscle || e.muscle_primary === muscle) &&
        (!q || e.name.toLocaleLowerCase('es').includes(q)),
    );
  }, [exercises, muscle, query]);

  return (
    <FlatList
      data={visible}
      keyExtractor={(e) => String(e.id)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          {header}
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar ejercicio"
            placeholderTextColor={c.muted}
            style={[
              styles.search,
              { color: c.text, borderColor: c.border, backgroundColor: c.card },
            ]}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}>
            <Chip label="Todos" selected={muscle === null} onPress={() => setMuscle(null)} />
            {MUSCLE_IDS.map((m) => (
              <Chip
                key={m}
                label={muscleLabel(m)}
                selected={muscle === m}
                onPress={() => setMuscle(m)}
              />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={<Muted>No hay ejercicios con ese filtro.</Muted>}
      renderItem={({ item }) => {
        const media = item.slug ? EXERCISE_MEDIA[item.slug] : undefined;
        return (
          <Pressable
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
            ]}>
            <View style={styles.thumb}>
              {media ? (
                <Image source={media.image} autoplay={false} style={styles.thumbImage} />
              ) : (
                <Ionicons name="barbell-outline" size={22} color="#9CA3AF" />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>{item.name}</Text>
              <Muted>
                {muscleLabel(item.muscle_primary)}
                {item.equipment
                  ? ` · ${EQUIPMENT[item.equipment as Equipment] ?? item.equipment}`
                  : ''}
                {item.is_custom ? ' · Propio' : ''}
              </Muted>
            </View>
            {onInfo && (
              <IconButton
                icon="information-circle-outline"
                label="Ver cómo se hace"
                onPress={() => onInfo(item)}
              />
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  search: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10, fontSize: 15 },
  chips: { gap: 6, paddingBottom: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: 56, height: 56 },
});
