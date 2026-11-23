import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { IMAGE_CACHE_CLEARED_KEY } from '../src/data/settings';
import { initDatabase } from '../src/db/migrate';
import { useColors } from '../src/theme';

export default function RootLayout() {
  const c = useColors();
  useEffect(() => {
    // Older builds disk-cached bundled images by resource id; clear them once (see ExerciseThumb).
    if (Storage.getItemSync(IMAGE_CACHE_CLEARED_KEY)) return;
    Image.clearDiskCache().then(() => Storage.setItemSync(IMAGE_CACHE_CLEARED_KEY, '1'));
  }, []);
  return (
    <SQLiteProvider databaseName="app_gym.db" onInit={initDatabase}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.card },
          headerTintColor: c.text,
          contentStyle: { backgroundColor: c.background },
          headerBackTitle: 'Atrás',
        }}>
        <Stack.Screen name="aviso" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="rutina/[id]" options={{ title: 'Editar rutina' }} />
        <Stack.Screen
          name="elegir-ejercicio"
          options={{ title: 'Añadir ejercicio', presentation: 'modal' }}
        />
        <Stack.Screen
          name="ejercicio/[id]"
          options={{ title: 'Ejercicio', presentation: 'modal' }}
        />
        <Stack.Screen name="por-que" options={{ title: '¿Por qué?', presentation: 'modal' }} />
        <Stack.Screen
          name="sesion/[id]"
          options={{ title: 'Entrenamiento', gestureEnabled: false }}
        />
      </Stack>
    </SQLiteProvider>
  );
}
