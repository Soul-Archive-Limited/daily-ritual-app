import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useStore } from '@/data/store';

/** Tapping a reminder opens Today with that routine unfolded. */
export function NotificationRouter() {
  const s = useStore();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  const setFocus = s?.setFocus;

  useEffect(() => {
    if (!response || !setFocus) return;
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (handled.current === key) return;
    handled.current = key;
    const data = response.notification.request.content.data as { kind?: string; slot?: 'am' | 'pm'; id?: string };
    if (data?.kind === 'routine' && data.slot) {
      router.navigate('/');
      setFocus({ slot: data.slot, at: Date.now() });
    } else if (data?.kind === 'restock' && data.id) {
      router.navigate('/shelf');
      router.push({ pathname: '/product/[id]', params: { id: data.id } });
    } else if (data?.kind === 'checkin') {
      router.navigate('/skin');
      router.push('/checkin');
    }
    Notifications.clearLastNotificationResponse();
  }, [response, setFocus]);

  return null;
}
