import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Muted, Title } from '../../src/components/ui';
import { EXERCISE_MEDIA, type MediaCredit } from '../../src/data/exerciseMedia';
import { EQUIPMENT, muscleLabel, type Equipment } from '../../src/data/muscles';
import { getExercise, type Exercise } from '../../src/db/repositories/exercises';
import { useColors } from '../../src/theme';

function Credit({ label, credit }: { label: string; credit: MediaCredit }) {
  const c = useColors();
  return (
    <Text style={{ color: c.muted, fontSize: 12 }}>
      {label}: {credit.author} ({credit.source}),{' '}
      <Text
        style={{ textDecorationLine: 'underline' }}
        onPress={() => Linking.openURL(credit.licenseUrl)}>
        {credit.license}
      </Text>
    </Text>
  );
}

export default function ExerciseDetailScreen() {
  const db = useSQLiteContext();
  const c = useColors();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const [exercise, setExercise] = useState<Exercise | null | undefined>(undefined);

  useEffect(() => {
    getExercise(db, id).then(setExercise);
  }, [db, id]);

  if (exercise === undefined) return null;
  if (exercise === null) {
    return (
      <View style={styles.content}>
        <Muted>Ejercicio no encontrado.</Muted>
      </View>
    );
  }

  const media = exercise.slug ? EXERCISE_MEDIA[exercise.slug] : undefined;
  const muscles = [exercise.muscle_primary, ...exercise.muscles_secondary].map(muscleLabel);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: exercise.name }} />
      {media ? (
        <View style={styles.imageBox}>
          <Image
            source={media.image}
            style={styles.image}
            contentFit="contain"
            accessibilityLabel={`Cómo hacer ${exercise.name}`}
          />
        </View>
      ) : (
        <Card>
          <Muted>Este ejercicio todavía no tiene animación.</Muted>
        </Card>
      )}
      {media?.animated && <Muted>Alterna entre la posición inicial y la final.</Muted>}

      <Card>
        <Title>{exercise.name}</Title>
        <Text style={{ color: c.text }}>
          <Text style={{ fontWeight: '700' }}>Músculos: </Text>
          {muscles.join(', ')}
        </Text>
        {exercise.equipment && (
          <Text style={{ color: c.text }}>
            <Text style={{ fontWeight: '700' }}>Material: </Text>
            {EQUIPMENT[exercise.equipment as Equipment] ?? exercise.equipment}
          </Text>
        )}
      </Card>

      {exercise.instructions && (
        <Card>
          <Title>Cómo se hace</Title>
          <Text style={{ color: c.text, lineHeight: 21 }}>{exercise.instructions}</Text>
        </Card>
      )}

      {media && (
        <View style={styles.credits}>
          <Credit label="Imagen" credit={media.imageCredit} />
          {media.textCredit && exercise.instructions && (
            <Credit label="Texto" credit={media.textCredit} />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  // Source drawings are black lines on white, so keep a white box in dark mode too.
  imageBox: { backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1 },
  credits: { gap: 4 },
});
