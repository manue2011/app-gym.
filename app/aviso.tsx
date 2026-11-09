import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Title } from '../src/components/ui';
import { DISCLAIMER_KEY } from '../src/data/settings';
import { useColors } from '../src/theme';

export default function DisclaimerScreen() {
  const c = useColors();
  const accept = () => {
    Storage.setItemSync(DISCLAIMER_KEY, new Date().toISOString());
    router.replace('/hoy');
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Title>Antes de empezar</Title>
          <Text style={[styles.text, { color: c.text }]}>
            Esta app te ayuda a organizar tus rutinas y registrar tu progreso. No sustituye el
            consejo de un médico, fisioterapeuta ni entrenador profesional.
          </Text>
          <Text style={[styles.text, { color: c.text }]}>
            Si tienes lesiones o alguna enfermedad, en caso de embarazo o si hace tiempo que no
            haces ejercicio, consulta con un profesional de la salud antes de empezar.
          </Text>
          <Text style={[styles.text, { color: c.text }]}>
            Si sientes dolor agudo durante un ejercicio, detente y busca ayuda si persiste. Tus
            datos se guardan solo en este dispositivo.
          </Text>
          <Button label="Entendido" onPress={accept} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, flexGrow: 1, justifyContent: 'center' },
  text: { fontSize: 15, lineHeight: 22 },
});
