import { StyleSheet, View } from 'react-native';

import { Card, Muted, Title } from '../../src/components/ui';

// Charts come in roadmap step 4, once sessions are logged.
export default function ProgressScreen() {
  return (
    <View style={styles.content}>
      <Card>
        <Title>Progreso</Title>
        <Muted>
          Aquí verás la evolución de tus pesos y repeticiones cuando registres sesiones.
        </Muted>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({ content: { padding: 16 } });
