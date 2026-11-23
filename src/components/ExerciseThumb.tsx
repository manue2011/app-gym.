import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { EXERCISE_MEDIA } from '../data/exerciseMedia';

/**
 * Bundled images must not use the disk cache: on Android release builds they are keyed by
 * resource id, which shifts when assets are added, so an update would show the wrong image.
 */
export const BUNDLED_IMAGE_CACHE = 'memory' as const;

/** Still image of the exercise; a barbell icon when it has no media. */
export function ExerciseThumb({ slug, size = 64 }: { slug: string | null; size?: number }) {
  const media = slug ? EXERCISE_MEDIA[slug] : undefined;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {media ? (
        <Image
          source={media.frames[0]}
          style={{ width: size, height: size }}
          contentFit="contain"
          cachePolicy={BUNDLED_IMAGE_CACHE}
        />
      ) : (
        <Ionicons name="barbell-outline" size={size * 0.4} color="#9CA3AF" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Drawings are black lines on white, so the box stays white in dark mode too.
  box: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
