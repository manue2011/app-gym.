import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, IconButton, Muted } from '../../src/components/ui';
import { ROUTINE_TEMPLATES } from '../../src/data/templates';
import type { Routine } from '../../src/db/repositories/routines';
import { useRoutinesStore } from '../../src/store/routines';
import { useColors } from '../../src/theme';

const openRoutine = (id: number) =>
  router.push({ pathname: '/rutina/[id]', params: { id: String(id) } });

export default function RoutinesScreen() {
  const db = useSQLiteContext();
  const c = useColors();
  const {
    routines,
    lastDeleted,
    refresh,
    create,
    createFromTemplate,
    duplicate,
    remove,
    undoRemove,
    dismissUndo,
  } = useRoutinesStore();

  useFocusEffect(
    useCallback(() => {
      refresh(db);
    }, [db, refresh]),
  );

  const onCreate = async () => {
    const id = await create(db, 'Nueva rutina');
    openRoutine(id);
  };

  const confirmDelete = (r: Routine) =>
    Alert.alert(
      'Eliminar rutina',
      `¿Eliminar "${r.name}"? Tu historial de entrenamientos no se borra.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => remove(db, r.id, r.name) },
      ],
    );

  return (
    <View style={styles.screen}>
      {lastDeleted && (
        <View style={[styles.undo, { backgroundColor: c.text }]}>
          <Text style={{ color: c.background, flex: 1 }} numberOfLines={1}>
            &quot;{lastDeleted.name}&quot; eliminada
          </Text>
          <Pressable onPress={() => undoRemove(db)} hitSlop={8}>
            <Text style={{ color: c.primary, fontWeight: '700' }}>DESHACER</Text>
          </Pressable>
          <IconButton icon="close" label="Cerrar" color={c.background} onPress={dismissUndo} />
        </View>
      )}
      <FlatList
        data={routines}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card>
            <Text style={[styles.name, { color: c.text }]}>Aún no tienes rutinas</Text>
            <Muted>Crea una, agrégale días y elige los ejercicios de cada día.</Muted>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openRoutine(item.id)}>
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.name, { color: c.text }]}>{item.name}</Text>
                  <Muted>{item.day_count === 1 ? '1 día' : `${item.day_count} días`}</Muted>
                </View>
                {item.is_active && (
                  <View style={[styles.badge, { backgroundColor: c.primary }]}>
                    <Ionicons name="star" size={12} color={c.primaryText} />
                    <Text style={{ color: c.primaryText, fontWeight: '700', fontSize: 12 }}>
                      Activa
                    </Text>
                  </View>
                )}
                <IconButton
                  icon="copy-outline"
                  label="Duplicar"
                  onPress={() => duplicate(db, item.id)}
                />
                <IconButton
                  icon="trash-outline"
                  label="Eliminar"
                  color={c.danger}
                  onPress={() => confirmDelete(item)}
                />
              </View>
            </Card>
          </Pressable>
        )}
        ListFooterComponent={
          <View style={{ gap: 12 }}>
            <Button label="Nueva rutina" icon="add" onPress={onCreate} />
            <Muted>O empieza desde una plantilla y edítala a tu gusto:</Muted>
            {ROUTINE_TEMPLATES.map((t) => (
              <Button
                key={t.id}
                label={t.name}
                icon="document-text-outline"
                variant="secondary"
                onPress={async () => openRoutine(await createFromTemplate(db, t))}
              />
            ))}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 10,
  },
});
