# on-device-ai

Local Expo module wrapping Apple's **FoundationModels** framework (the on-device Apple Intelligence model, iOS 26+). No server, no API key, nothing leaves the phone.

```ts
import { isAvailable, respond, errorCode } from '../modules/on-device-ai'; // or add a tsconfig path like subject-lift

const { available, reason } = await isAvailable();
// reason: 'osTooOld' | 'deviceNotEligible' | 'appleIntelligenceNotEnabled' | 'modelNotReady' | 'unknown'

try {
  const text = await respond({ instructions, prompt, maxTokens: 300, temperature: 0.4 });
} catch (e) {
  errorCode(e); // 'unavailable' | 'guardrailViolation' | 'exceededContextWindowSize' | 'cancelled' | 'other'
}
```

## Behaviour

- Each `respond` call is a fresh `LanguageModelSession(instructions:)` — no memory between calls.
- Input is capped natively: instructions to 4,000 characters, instructions + prompt to 12,000 (the model's whole context is about 4k tokens, answer included). `maxTokens` is clamped to 1–4,000, `temperature` to 0–2.
- Errors from both the iOS 26 types (`LanguageModelSession.GenerationError`) and the iOS 27 ones (`LanguageModelError`, `SystemLanguageModel.Error`) are mapped to the codes above. Refusals count as `guardrailViolation`; missing model assets count as `unavailable`.
- The app keeps its deployment target. Everything is behind `#if canImport(FoundationModels)` and `#available(iOS 26.0, *)`, and the framework is weak-linked, so older iOS gets `{ available: false, reason: 'osTooOld' }`. A build from an SDK without the framework reports `'unknown'`, as does a build made before this module existed.
- Scope (skincare only, tone, length) belongs in the `instructions` string written in JS.

## Files

- `ios/OnDeviceAI.swift` — all model logic, no Expo import, so it can be type-checked alone:
  `xcrun swiftc -typecheck -sdk $(xcrun --sdk iphonesimulator --show-sdk-path) -target arm64-apple-ios16.4-simulator ios/OnDeviceAI.swift`
- `ios/OnDeviceAIModule.swift` — thin Expo wrapper (`OnDeviceAI` native module).
- `index.ts` — typed JS API.

The simulator only answers when the Mac itself has Apple Intelligence on; test real answers on an iPhone 15 Pro or later.
