import { requireOptionalNativeModule } from 'expo-modules-core';

type Native = {
  isSupported(): boolean;
  liftAsync(inputUri: string, outputPath: string, maxSize: number): Promise<{ uri: string; cut: boolean }>;
};

// Optional so the app still runs in a build made before this module existed.
const Native = requireOptionalNativeModule<Native>('SubjectLift');

/** True when the installed app can cut subjects out (iOS 17+ with this module built in). */
export const canLiftSubject = () => !!Native?.isSupported();

/**
 * Cut the main subject out of a photo onto a transparent square PNG.
 * `outputPath` is a file path without extension; `.png` (cut) or `.jpg` (plain square) is added.
 */
export async function liftSubject(inputUri: string, outputPath: string, maxSize = 1024) {
  if (!Native) throw new Error('Subject lifting needs a new build of the app.');
  return Native.liftAsync(inputUri, outputPath, maxSize);
}
