import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { sheetOptions } from '@/components/nav';
import { ToastHost } from '@/components/ToastHost';
import { StoreProvider, useSetup, useStore } from '@/data/store';
import { migrateDb } from '@/db/schema';
import { NotificationRouter } from '@/notifications/NotificationRouter';
import { setupNotificationHandler } from '@/notifications/schedule';
import { SunProvider } from '@/sun/SunProvider';
import { SyncProvider } from '@/sync/SyncProvider';
import { useWidgetSync } from '@/widgets/useWidgetSync';
import { colors, usePalette } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

/** Navigation colours for the current light/dark mode. */
function useNavTheme() {
  const dark = useColorScheme() !== 'light';
  const p = usePalette();
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, background: p.bg, card: p.card, text: p.text, border: p.line2, primary: p.sage },
  };
}

/** Hide the splash once the data has loaded (or setup is needed). */
function Ready() {
  const ready = !!useStore();
  const { needsSetup } = useSetup();
  useEffect(() => {
    if (ready || needsSetup) SplashScreen.hideAsync();
  }, [ready, needsSetup]);
  return null;
}

/** The app once set up; the setup flow for someone new. */
function Routes() {
  const { needsSetup } = useSetup();
  useWidgetSync();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!needsSetup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" options={sheetOptions('Profile')} />
        <Stack.Screen name="step/[id]" options={sheetOptions('Step')} />
        <Stack.Screen name="product/[id]" options={sheetOptions('Product')} />
        <Stack.Screen name="product/new" options={sheetOptions('Add a product', 0.6)} />
        <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
        <Stack.Screen name="place" options={sheetOptions('Location', 0.6)} />
      </Stack.Protected>
      <Stack.Protected guard={needsSetup}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const theme = useNavTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ThemeProvider value={theme}>
        <StatusBar style="auto" />
        <SQLiteProvider databaseName="ritual.db" onInit={migrateDb}>
          <StoreProvider>
            <SunProvider>
              <Ready />
              <NotificationRouter />
              <SyncProvider>
                <Routes />
              </SyncProvider>
              <ToastHost />
            </SunProvider>
          </StoreProvider>
        </SQLiteProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
