import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useColors } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.title, { color: c.text }]}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.muted }}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const c = useColors();
  const bg = variant === 'primary' ? c.primary : c.chip;
  const fg = variant === 'primary' ? c.primaryText : variant === 'danger' ? c.danger : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  disabled,
  color,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  disabled?: boolean;
  color?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { opacity: disabled ? 0.3 : pressed ? 0.5 : 1 }]}>
      <Ionicons name={icon} size={20} color={color ?? c.muted} />
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? c.primary : c.chip }]}>
      <Text style={{ color: selected ? c.primaryText : c.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

/** Text field that saves when editing ends (blur or submit), not on every keystroke. */
export function CommitTextInput({
  value,
  onCommit,
  style,
  ...rest
}: Omit<TextInputProps, 'value' | 'onChangeText'> & {
  value: string;
  onCommit: (text: string) => void;
}) {
  const c = useColors();
  const [text, setText] = useState(value);
  // Reset the draft when the saved value changes (e.g. after a reload from SQLite).
  const [saved, setSaved] = useState(value);
  if (value !== saved) {
    setSaved(value);
    setText(value);
  }
  return (
    <TextInput
      {...rest}
      value={text}
      onChangeText={setText}
      onEndEditing={() => {
        if (text !== value) onCommit(text);
      }}
      placeholderTextColor={c.muted}
      style={[styles.input, { color: c.text, borderColor: c.border }, style]}
    />
  );
}

export function NumberField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.numberField}>
      <Text style={[styles.numberLabel, { color: c.muted }]}>{label}</Text>
      <CommitTextInput
        value={String(value)}
        keyboardType="number-pad"
        selectTextOnFocus
        onCommit={(t) => onCommit(Number(t.trim() === '' ? NaN : t))}
        style={styles.numberInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  title: { fontSize: 18, fontWeight: '700' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
  iconButton: { padding: 4 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
  numberField: { flex: 1, gap: 4 },
  numberLabel: { fontSize: 12 },
  numberInput: { textAlign: 'center' },
});
