import { Stack } from 'expo-router';

import { tabStackOptions } from '@/components/nav';

export default function SkinLayout() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: 'Skin' }} />
    </Stack>
  );
}
