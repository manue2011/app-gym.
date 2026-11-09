import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from '../src/db/migrate';
import { useColors } from '../src/theme';

export default function RootLayout() {
  const c = useColors();
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
        <Stack.Screen
          name="sesion/[id]"
          options={{ title: 'Entrenamiento', gestureEnabled: false }}
        />
      </Stack>
    </SQLiteProvider>
  );
}
