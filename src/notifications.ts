import {
  AndroidImportance,
  cancelScheduledNotificationAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

const REST_CHANNEL = 'rest';

// In the foreground the rest bar and the vibration already tell the user; the notification is
// only for when the phone is locked or the app is in the background.
setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let ready: Promise<boolean> | null = null;

/** Asks for permission once and creates the Android channel. False if the user said no. */
function prepare(): Promise<boolean> {
  ready ??= (async () => {
    if (Platform.OS === 'android') {
      await setNotificationChannelAsync(REST_CHANNEL, {
        name: 'Fin del descanso',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 400, 200, 400],
        sound: 'default',
      });
    }
    const current = await getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await requestPermissionsAsync()).granted;
  })().catch(() => false);
  return ready;
}

/**
 * Schedules the "rest is over" notification for `endAt` (ms timestamp).
 * Returns a function that cancels it; safe to call before scheduling finished.
 */
export function scheduleRestEnd(endAt: number): () => void {
  let cancelled = false;
  let id: string | null = null;
  (async () => {
    if (!(await prepare()) || cancelled) return;
    id = await scheduleNotificationAsync({
      content: { title: 'Descanso terminado', body: '¡A por la siguiente serie! 💪' },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: new Date(endAt),
        channelId: REST_CHANNEL,
      },
    });
    if (cancelled) cancelScheduledNotificationAsync(id);
  })().catch(() => {});
  return () => {
    cancelled = true;
    if (id) cancelScheduledNotificationAsync(id).catch(() => {});
  };
}
