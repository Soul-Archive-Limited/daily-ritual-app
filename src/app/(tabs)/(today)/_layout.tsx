import { Stack } from 'expo-router';

import { tabStackOptions } from '@/components/nav';

export default function TodayLayout() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: '', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
