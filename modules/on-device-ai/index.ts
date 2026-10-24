import { CodedError, requireOptionalNativeModule } from 'expo-modules-core';

export type UnavailableReason =
  | 'osTooOld'
  | 'deviceNotEligible'
  | 'appleIntelligenceNotEnabled'
  | 'modelNotReady'
  | 'unknown';

export type Availability = { available: boolean; reason?: UnavailableReason };

export type RespondOptions = {
  /** Who the model is and what it may talk about. Capped at 4,000 characters natively. */
  instructions: string;
  /** The question plus any data. Instructions + prompt are capped at 12,000 characters natively. */
  prompt: string;
  /** Longest answer in tokens (1–4,000). */
  maxTokens?: number;
  /** 0–2; lower is steadier. */
  temperature?: number;
};

/** `error.code` of a rejected `respond`. */
export type OnDeviceAIErrorCode =
  | 'unavailable'
  | 'guardrailViolation'
  | 'exceededContextWindowSize'
  | 'cancelled'
  | 'other';

export const MAX_INPUT_CHARS = 12_000;

type Native = {
  isAvailable(): Promise<Availability>;
  respond(instructions: string, prompt: string, maxTokens?: number, temperature?: number): Promise<string>;
};

// Optional so the app still runs in a build made before this module existed (and on Android/web).
const Native = requireOptionalNativeModule<Native>('OnDeviceAI');

/** Whether Apple's on-device model can answer now (iOS 26+, Apple Intelligence on and downloaded). */
export async function isAvailable(): Promise<Availability> {
  if (!Native) return { available: false, reason: 'unknown' };
  return Native.isAvailable();
}

/** One answer from a fresh on-device session. Rejects with a `CodedError` whose code is an `OnDeviceAIErrorCode`. */
export async function respond({ instructions, prompt, maxTokens, temperature }: RespondOptions): Promise<string> {
  if (!Native) throw new CodedError('unavailable', 'On-device AI needs a new build of the app.');
  return Native.respond(instructions, prompt, maxTokens, temperature);
}

/** The error code of anything `respond` threw. */
export function errorCode(e: unknown): OnDeviceAIErrorCode {
  const code = (e as { code?: unknown } | null)?.code;
  switch (code) {
    case 'unavailable':
    case 'guardrailViolation':
    case 'exceededContextWindowSize':
    case 'cancelled':
      return code;
    default:
      return 'other';
  }
}
