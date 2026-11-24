import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Muted, Title } from '../src/components/ui';
import { useUnitStore } from '../src/store/settings';
import { formatWeightUnit } from '../src/units';

export default function SettingsScreen() {
  const { unit, setUnit } = useUnitStore();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Title>Unidad de peso</Title>
        <View style={styles.row}>
          <Chip label="Kilogramos (kg)" selected={unit === 'kg'} onPress={() => setUnit('kg')} />
          <Chip label="Libras (lb)" selected={unit === 'lb'} onPress={() => setUnit('lb')} />
        </View>
        <Muted>
          Tus registros se guardan siempre en kg; cambiar la unidad solo cambia cómo se muestran y
          cómo los escribes. Ejemplo: {formatWeightUnit(60, unit)}.
        </Muted>
      </Card>

      <Card>
        <Title>Información</Title>
        <Muted>
          Las recomendaciones de la app se basan en estudios científicos y no sustituyen a un médico
          ni a un entrenador. Tus datos se quedan solo en este móvil.
        </Muted>
        <Button
          label="Recomendaciones y fuentes"
          icon="school-outline"
          variant="secondary"
          onPress={() => router.push('/por-que')}
        />
        <Muted>Versión {Constants.expoConfig?.version ?? '—'}</Muted>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
