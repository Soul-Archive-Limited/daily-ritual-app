import { Stack } from 'expo-router';

import { tabStackOptions } from '@/components/nav';

export default function ShelfLayout() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Shelf' }} />
    </Stack>
  );
}
