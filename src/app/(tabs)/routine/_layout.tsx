import { Stack } from 'expo-router';

import { tabStackOptions } from '@/components/nav';

export default function RoutineLayout() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Routine' }} />
    </Stack>
  );
}
