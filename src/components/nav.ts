import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

import { colors, font } from '@/theme/tokens';

/** iOS 26 draws its own scroll-edge glass under headers; older iOS needs a blur. */
const glassHeaders = Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) >= 26;

/** Native large title that shrinks to a small title on scroll, as in Apple's own apps. */
export const tabStackOptions: NativeStackNavigationOptions = {
  headerLargeTitleEnabled: true,
  headerTransparent: true,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerLargeStyle: { backgroundColor: 'transparent' },
  headerLargeTitleStyle: { ...font.bold, color: colors.text },
  headerTitleStyle: { ...font.semibold, color: colors.text },
  ...(glassHeaders ? {} : { headerBlurEffect: 'systemChromeMaterial' as const }),
  contentStyle: { backgroundColor: colors.bg },
};

/** Sheets get a small native title bar; each sheet adds its own Done button with `SheetDone`. */
export const sheetOptions = (title: string, detent = 0.92): NativeStackNavigationOptions => ({
  presentation: 'formSheet',
  sheetAllowedDetents: [detent],
  sheetGrabberVisible: true,
  headerShown: true,
  title,
  headerShadowVisible: false,
  headerTitleStyle: { ...font.semibold, color: colors.text },
  headerStyle: { backgroundColor: colors.bg },
  contentStyle: { backgroundColor: colors.bg },
});
