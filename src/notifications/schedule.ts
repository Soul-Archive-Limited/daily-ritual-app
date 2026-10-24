import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';

import type { Config, Day, Step } from '@/db/types';
import { parseKey } from '@/logic/dates';

import type { SunDay } from '@/sun/sun';

import { buildPlan } from './plan';

/** Show reminders as a banner even when the app is open. */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function notificationsAllowed() {
  const s = await Notifications.getPermissionsAsync();
  return s.granted || s.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

export async function askForNotifications() {
  const s = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return s.granted || s.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

type Restock = NonNullable<Parameters<typeof buildPlan>[3]>['restock'];
type Args = {
  config: Config;
  steps: Step[];
  days: Record<string, Day>;
  sun: SunDay | null;
  restock: Restock;
  lastCheckin: string | null;
};
let running = false;
let queued: Args | null = null;

/**
 * Replace every queued reminder with a fresh plan. Calendar triggers carry no time zone,
 * so 09:30 means 09:30 wherever the phone is when it fires.
 * Calls made while one is running collapse into a single re-run with the newest data.
 */
export async function replanReminders(
  config: Config,
  steps: Step[],
  days: Record<string, Day>,
  sun: SunDay | null = null,
  restock: Restock = [],
  lastCheckin: string | null = null,
) {
  queued = { config, steps, days, sun, restock, lastCheckin };
  if (running) return;
  running = true;
  try {
    while (queued) {
      const a = queued;
      queued = null;
      await apply(a);
    }
  } finally {
    running = false;
  }
}

async function apply({ config, steps, days, sun, restock, lastCheckin }: Args) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!config.notify?.on || !(await notificationsAllowed())) return;
  for (const r of buildPlan(config, steps, days, { sun, restock, lastCheckin })) {
    const content = { title: r.title, body: r.body, data: r.data, sound: true };
    if (r.at) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
      });
      continue;
    }
    const d = parseKey(r.date);
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        hour: r.hour,
        minute: r.minute,
        repeats: false,
      },
    });
  }
}
