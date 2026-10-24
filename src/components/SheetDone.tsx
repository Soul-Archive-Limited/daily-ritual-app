import { router, Stack } from 'expo-router';

/** The "Done" button at the top right of a sheet. */
export function SheetDone({ label = 'Done', onPress }: { label?: string; onPress?: () => void }) {
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button variant="done" onPress={onPress ?? (() => router.back())}>
        {label}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}
