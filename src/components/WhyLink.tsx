import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import type { RuleId } from '../science/rules';
import { useColors } from '../theme';

/** Small "¿Por qué?" link that opens the evidence behind a rule. */
export function WhyLink({ rule }: { rule: RuleId }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={8}
      onPress={() => router.push({ pathname: '/por-que', params: { rule } })}>
      <Text style={{ color: c.primary, fontWeight: '600' }}>¿Por qué?</Text>
    </Pressable>
  );
}
