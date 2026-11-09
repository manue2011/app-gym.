import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, Muted, Title } from '../../src/components/ui';
import { EXERCISE_MEDIA, type MediaCredit } from '../../src/data/exerciseMedia';
import { EQUIPMENT, muscleLabel, type Equipment } from '../../src/data/muscles';
import { getExercise, type Exercise } from '../../src/db/repositories/exercises';
import { useColors } from '../../src/theme';

type MediaView = 'animation' | 'steps';

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
  const [view, setView] = useState<MediaView>('animation');

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
        <>
          <View style={styles.tabs}>
            <Chip
              label="Animación"
              selected={view === 'animation'}
              onPress={() => setView('animation')}
            />
            <Chip
              label="Paso a paso"
              selected={view === 'steps'}
              onPress={() => setView('steps')}
            />
          </View>
          {view === 'animation' ? (
            <View style={styles.imageBox}>
              <Image
                source={media.animation}
                style={styles.image}
                contentFit="contain"
                accessibilityLabel={`Animación de ${exercise.name}`}
              />
            </View>
          ) : (
            media.frames.map((frame, i) => (
              <View key={i} style={styles.imageBox}>
                <Image
                  source={frame}
                  style={styles.image}
                  contentFit="contain"
                  accessibilityLabel={`${exercise.name}: ${i === 0 ? 'músculo estirado' : 'músculo contraído'}`}
                />
                <Text style={styles.stepBadge}>
                  {i === 0 ? 'Músculo estirado' : 'Músculo contraído'}
                </Text>
              </View>
            ))
          )}
        </>
      ) : (
        <Card>
          <Muted>Este ejercicio todavía no tiene imagen.</Muted>
        </Card>
      )}

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
          {exercise.instructions.split('\n').map((step, i) => (
            <Text key={i} style={{ color: c.text, fontSize: 15, lineHeight: 22 }}>
              {step}
            </Text>
          ))}
        </Card>
      )}

      {media && (
        <View style={styles.credits}>
          <Credit label="Imagen" credit={media.imageCredit} />
          {exercise.instructions && <Credit label="Texto" credit={media.textCredit} />}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  tabs: { flexDirection: 'row', gap: 8 },
  // Drawings are black lines on white, so keep a white box in dark mode too.
  imageBox: { backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1 },
  stepBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#15171A',
    color: '#FFFFFF',
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  credits: { gap: 4 },
});
