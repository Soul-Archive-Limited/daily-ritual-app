import { Stack } from 'expo-router';

import { tabStackOptions } from '@/components/nav';

export default function ProgressLayout() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Progress' }} />
    </Stack>
  );
}
