import { Stack } from 'expo-router';

import { DraftProvider } from '@/components/welcome/draft';
import { colors } from '@/theme/tokens';

/** First-run setup: welcome slides, a short quiz, then the plan reveal. */
export default function WelcomeLayout() {
  return (
    <DraftProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="about" />
        {/* No swipe back here: iOS 26's full-width back swipe would swallow the slide control. */}
        <Stack.Screen name="ready" options={{ gestureEnabled: false }} />
      </Stack>
    </DraftProvider>
  );
}
