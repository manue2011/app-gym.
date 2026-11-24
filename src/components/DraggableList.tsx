import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Animated, PanResponder, View, type LayoutRectangle } from 'react-native';

import { useColors } from '../theme';

interface DragApi {
  start: (key: number) => void;
  move: (key: number, dy: number) => void;
  end: (key: number, dy: number) => void;
}

interface Drag {
  key: number;
  from: number;
  target: number;
  /** Height of the dragged item plus the gap: how far the others move to make room. */
  room: number;
}

/**
 * Vertical list reordered by dragging each item's handle (≡). The other items slide to show
 * where it will land; `onReorder` gets every key in the new order when the finger is lifted.
 */
export function DraggableList<T>({
  items,
  keyOf,
  gap = 0,
  renderItem,
  onReorder,
  onDragChange,
}: {
  items: T[];
  keyOf: (item: T) => number;
  gap?: number;
  /** `handle` must be placed somewhere in the item: dragging starts from it. */
  renderItem: (item: T, handle: ReactElement) => ReactNode;
  onReorder: (orderedKeys: number[]) => void;
  /** Lets the parent disable its ScrollView while dragging. */
  onDragChange?: (dragging: boolean) => void;
}) {
  const [layouts] = useState(() => new Map<number, LayoutRectangle>());
  const [dy] = useState(() => new Animated.Value(0));
  const c = useColors();
  const [drag, setDrag] = useState<Drag | null>(null);
  const keys = items.map(keyOf);

  /** Index where the dragged item would land: how many others have their centre above it. */
  const targetFor = (key: number, offset: number) => {
    const me = layouts.get(key);
    if (!me) return keys.indexOf(key);
    const centre = me.y + me.height / 2 + offset;
    return keys.filter((k) => {
      const l = layouts.get(k);
      return k !== key && l !== undefined && l.y + l.height / 2 < centre;
    }).length;
  };

  const api: DragApi = {
    start: (key) => {
      const from = keys.indexOf(key);
      dy.setValue(0);
      setDrag({ key, from, target: from, room: (layouts.get(key)?.height ?? 0) + gap });
      onDragChange?.(true);
      Haptics.selectionAsync();
    },
    move: (key, offset) => {
      dy.setValue(offset);
      const target = targetFor(key, offset);
      setDrag((d) => (d && d.target !== target ? { ...d, target } : d));
    },
    end: (key, offset) => {
      const from = keys.indexOf(key);
      const target = targetFor(key, offset);
      setDrag(null);
      dy.setValue(0);
      onDragChange?.(false);
      if (target === from) return;
      const next = keys.filter((k) => k !== key);
      next.splice(target, 0, key);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onReorder(next);
    },
  };

  return (
    <View style={{ gap }}>
      {items.map((item, index) => {
        const key = keyOf(item);
        const dragged = drag?.key === key;
        let shift = 0;
        if (drag && !dragged) {
          if (drag.from < drag.target && index > drag.from && index <= drag.target)
            shift = -drag.room;
          if (drag.target < drag.from && index >= drag.target && index < drag.from)
            shift = drag.room;
        }
        return (
          <Animated.View
            key={key}
            onLayout={(e) => layouts.set(key, e.nativeEvent.layout)}
            style={
              dragged
                ? {
                    transform: [{ translateY: dy }],
                    zIndex: 10,
                    elevation: 8,
                    backgroundColor: c.card,
                    opacity: 0.95,
                  }
                : { transform: [{ translateY: shift }] }
            }>
            {renderItem(item, <DragHandle id={key} api={api} />)}
          </Animated.View>
        );
      })}
    </View>
  );
}

function DragHandle({ id, api }: { id: number; api: DragApi }) {
  const c = useColors();
  // The responder lives as long as the handle; it always calls the latest callbacks.
  const latest = useRef(api);
  useLayoutEffect(() => {
    latest.current = api;
  });
  // The handlers read `latest` only when the user touches the handle, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => latest.current.start(id),
      onPanResponderMove: (_, g) => latest.current.move(id, g.dy),
      onPanResponderRelease: (_, g) => latest.current.end(id, g.dy),
      onPanResponderTerminate: (_, g) => latest.current.end(id, g.dy),
    }),
  );
  return (
    <View
      {...responder.panHandlers}
      accessibilityLabel="Mantén y arrastra para cambiar el orden"
      hitSlop={10}
      style={{ padding: 4 }}>
      <Ionicons name="reorder-three" size={28} color={c.muted} />
    </View>
  );
}
