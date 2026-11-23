import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, type ColorValue } from 'react-native';

import { useColors } from '../../src/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        sceneStyle: { backgroundColor: c.background },
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recomendaciones científicas"
            hitSlop={8}
            style={{ paddingHorizontal: 16 }}
            onPress={() => router.push('/por-que')}>
            <Ionicons name="school-outline" size={22} color={c.primary} />
          </Pressable>
        ),
      }}>
      <Tabs.Screen name="hoy" options={{ title: 'Hoy', tabBarIcon: icon('today-outline') }} />
      <Tabs.Screen
        name="rutinas"
        options={{ title: 'Rutinas', tabBarIcon: icon('list-outline') }}
      />
      <Tabs.Screen
        name="progreso"
        options={{ title: 'Progreso', tabBarIcon: icon('stats-chart-outline') }}
      />
      <Tabs.Screen
        name="ejercicios"
        options={{ title: 'Ejercicios', tabBarIcon: icon('barbell-outline') }}
      />
    </Tabs>
  );
}
