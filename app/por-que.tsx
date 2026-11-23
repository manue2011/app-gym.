import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Muted, Title } from '../src/components/ui';
import { isRuleId, RULE_ORDER, RULES, type RuleId } from '../src/science/rules';
import { doiUrl, SOURCES } from '../src/science/sources';
import { useColors } from '../src/theme';

/** Evidence behind the app's recommendations: one rule (`?rule=`) or all of them. */
export default function WhyScreen() {
  const c = useColors();
  const param = useLocalSearchParams<{ rule?: string }>().rule;
  const single = param && isRuleId(param) ? param : null;
  const ids: RuleId[] = single ? [single] : RULE_ORDER;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: single ? '¿Por qué?' : 'Recomendaciones' }} />
      {!single && (
        <Muted>
          Estas son las recomendaciones que usa la app, cada una con el estudio que la respalda. Son
          orientaciones generales: no sustituyen a un profesional.
        </Muted>
      )}
      {ids.map((id) => {
        const rule = RULES[id];
        return (
          <Card key={id}>
            <Title>{rule.title}</Title>
            <Text style={[styles.summary, { color: c.text }]}>{rule.summary}</Text>
            <Text style={[styles.detail, { color: c.text }]}>{rule.detail}</Text>
            <View style={[styles.sources, { borderColor: c.border }]}>
              <Muted>Fuente</Muted>
              {rule.sources.map((sid) => {
                const s = SOURCES[sid];
                return (
                  <Pressable
                    key={sid}
                    accessibilityRole="link"
                    onPress={() => Linking.openURL(doiUrl(s))}>
                    <Text style={{ color: c.muted, lineHeight: 20 }}>
                      {s.authors} ({s.year}). {s.title}.{' '}
                      <Text style={styles.italic}>{s.journal}</Text>.{' '}
                      <Text style={{ color: c.primary }}>doi:{s.doi}</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        );
      })}
      {single && (
        <Button
          label="Ver todas las recomendaciones"
          variant="secondary"
          onPress={() => router.setParams({ rule: '' })}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  summary: { fontSize: 16, fontWeight: '600' },
  detail: { fontSize: 15, lineHeight: 22 },
  sources: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 6 },
  italic: { fontStyle: 'italic' },
});
