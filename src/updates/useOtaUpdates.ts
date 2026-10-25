import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Gets new versions to people without a second restart: on open, a waiting update is downloaded and
 * applied straight away; when the app comes back from the background it downloads quietly and applies
 * on the next open. Off in development builds.
 */
export function useOtaUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let busy = false;
    const check = async (applyNow: boolean) => {
      if (busy) return;
      busy = true;
      try {
        const r = await Updates.checkForUpdateAsync();
        if (!r.isAvailable) return;
        const f = await Updates.fetchUpdateAsync();
        if (f.isNew && applyNow) await Updates.reloadAsync();
      } catch {
        // Offline or the server is unreachable: try again next time.
      } finally {
        busy = false;
      }
    };
    void check(true);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void check(false));
    return () => sub.remove();
  }, []);
}

/** Which version is running, for Profile: "Update 25 Oct 13:23" or "Built-in". */
export function versionLabel() {
  if (__DEV__) return 'Development build';
  if (!Updates.isEnabled || Updates.isEmbeddedLaunch || !Updates.createdAt) return 'Built-in version';
  return `Update ${Updates.createdAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
}
