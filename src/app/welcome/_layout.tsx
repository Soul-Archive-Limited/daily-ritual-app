import { Stack } from 'expo-router';

import { tabStackOptions } from '@/components/nav';
import { DraftProvider } from '@/components/welcome/draft';

/** First-run setup: welcome, about you, starter routine, reminders and location. */
export default function WelcomeLayout() {
  return (
    <DraftProvider>
      <Stack screenOptions={{ ...tabStackOptions, headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ title: 'About you' }} />
        <Stack.Screen name="routine" options={{ title: 'Your routine' }} />
        <Stack.Screen name="ready" options={{ title: 'Almost there' }} />
      </Stack>
    </DraftProvider>
  );
}
