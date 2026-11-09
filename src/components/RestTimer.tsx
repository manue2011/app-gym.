import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '../theme';

const format = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Countdown bar shown after completing a set. `endAt` is a timestamp in ms. */
export function RestTimer({
  endAt,
  onChange,
}: {
  endAt: number | null;
  onChange: (endAt: number | null) => void;
}) {
  const c = useColors();
  const [now, setNow] = useState(() => Date.now());
  const notifiedFor = useRef<number | null>(null);

  useEffect(() => {
    if (endAt === null) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [endAt]);

  const remaining = endAt === null ? 0 : Math.max(0, Math.ceil((endAt - now) / 1000));

  useEffect(() => {
    if (endAt !== null && remaining === 0 && notifiedFor.current !== endAt) {
      notifiedFor.current = endAt;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [endAt, remaining]);

  if (endAt === null) return null;
  const done = remaining === 0;

  return (
    <View style={[styles.bar, { backgroundColor: done ? c.primary : c.text }]}>
      <Text style={[styles.time, { color: done ? c.primaryText : c.background }]}>
        {done ? '¡A por la siguiente serie!' : `Descanso ${format(remaining)}`}
      </Text>
      {!done && (
        <Pressable hitSlop={8} onPress={() => onChange(endAt + 30_000)}>
          <Text style={[styles.action, { color: c.primary }]}>+30 s</Text>
        </Pressable>
      )}
      <Pressable hitSlop={8} onPress={() => onChange(null)}>
        <Text style={[styles.action, { color: done ? c.primaryText : c.primary }]}>
          {done ? 'Cerrar' : 'Saltar'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    margin: 12,
    borderRadius: 14,
  },
  time: { flex: 1, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  action: { fontSize: 15, fontWeight: '700' },
});
