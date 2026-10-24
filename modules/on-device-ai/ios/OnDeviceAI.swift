import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Why the on-device model can't answer. Raw values are what JS sees.
enum OnDeviceAIUnavailable: String {
  case osTooOld, deviceNotEligible, appleIntelligenceNotEnabled, modelNotReady, unknown
}

/// Every way `respond` can fail. `code` is the error code JS sees.
struct OnDeviceAIFailure: Error {
  let code: String
  let message: String

  static func unavailable(_ m: String) -> Self { Self(code: "unavailable", message: m) }
  static func guardrailViolation(_ m: String) -> Self { Self(code: "guardrailViolation", message: m) }
  static func exceededContextWindowSize(_ m: String) -> Self { Self(code: "exceededContextWindowSize", message: m) }
  static func cancelled(_ m: String) -> Self { Self(code: "cancelled", message: m) }
  static func other(_ m: String) -> Self { Self(code: "other", message: m) }
}

/// Apple's on-device language model (FoundationModels, iOS 26+). Kept free of Expo so it can be
/// type-checked on its own. Compiles to "unavailable" on older iOS and on SDKs without the framework.
enum OnDeviceAI {
  /// The on-device context is about 4k tokens shared by instructions, prompt and answer,
  /// so the input is capped well below that. Instructions get at most a third; the prompt the rest.
  static let maxInputChars = 12_000
  static let maxInstructionChars = 4_000

  /// nil when the model can answer now.
  static func unavailableReason() -> OnDeviceAIUnavailable? {
    #if canImport(FoundationModels)
    if #available(iOS 26.0, *) {
      switch SystemLanguageModel.default.availability {
      case .available:
        return nil
      case .unavailable(let reason):
        switch reason {
        case .deviceNotEligible: return .deviceNotEligible
        case .appleIntelligenceNotEnabled: return .appleIntelligenceNotEnabled
        case .modelNotReady: return .modelNotReady
        @unknown default: return .unknown
        }
      }
    }
    return .osTooOld
    #else
    // Built with an SDK that has no FoundationModels.
    return .unknown
    #endif
  }

  /// One-shot answer in a fresh session. Throws only `OnDeviceAIFailure`.
  static func respond(instructions: String, prompt: String, maxTokens: Int?, temperature: Double?) async throws -> String {
    if let reason = unavailableReason() {
      throw OnDeviceAIFailure.unavailable("The on-device model isn’t available (\(reason.rawValue)).")
    }
    let (inst, text) = capped(instructions: instructions, prompt: prompt)
    if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      throw OnDeviceAIFailure.other("The prompt is empty.")
    }

    #if canImport(FoundationModels)
    if #available(iOS 26.0, *) {
      let session = LanguageModelSession(instructions: inst.isEmpty ? nil : inst)
      let options = GenerationOptions(
        temperature: temperature.map { min(max($0, 0), 2) },
        maximumResponseTokens: maxTokens.map { min(max($0, 1), 4_000) })
      do {
        return try await session.respond(to: text, options: options).content
      } catch {
        throw failure(for: error)
      }
    }
    #endif
    throw OnDeviceAIFailure.unavailable("The on-device model isn’t available.")
  }

  static func capped(instructions: String, prompt: String) -> (String, String) {
    let inst = String(instructions.prefix(maxInstructionChars))
    let text = String(prompt.prefix(maxInputChars - inst.count))
    return (inst, text)
  }

  #if canImport(FoundationModels)
  @available(iOS 26.0, *)
  static func failure(for error: Error) -> OnDeviceAIFailure {
    if error is CancellationError {
      return .cancelled("The answer was cancelled.")
    }

    // iOS 27 throws new error types; the iOS 26 ones below are deprecated there but still
    // what iOS 26 throws. Only Xcode 27's compiler (Swift 6.4) knows the new types.
    #if compiler(>=6.4)
    if #available(iOS 27.0, *) {
      if let e = error as? LanguageModelError {
        switch e {
        case .contextSizeExceeded: return .exceededContextWindowSize(tooLong)
        case .guardrailViolation, .refusal: return .guardrailViolation(blocked)
        default: return .other(e.localizedDescription)
        }
      }
      if error is SystemLanguageModel.Error {
        return .unavailable("The on-device model is still downloading or can’t be used right now.")
      }
    }
    #endif

    if let e = error as? LanguageModelSession.GenerationError {
      switch e {
      case .exceededContextWindowSize: return .exceededContextWindowSize(tooLong)
      case .guardrailViolation, .refusal: return .guardrailViolation(blocked)
      case .assetsUnavailable:
        return .unavailable("The on-device model is still downloading or can’t be used right now.")
      default: return .other(e.localizedDescription)
      }
    }
    return .other(error.localizedDescription)
  }

  private static let tooLong = "That was too long for the on-device model."
  private static let blocked = "The on-device model declined to answer that."
  #endif
}
