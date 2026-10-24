import ExpoModulesCore

/// Exposes Apple's on-device language model to JS. All model logic lives in `OnDeviceAI`.
public final class OnDeviceAIModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OnDeviceAI")

    AsyncFunction("isAvailable") { () -> [String: Any] in
      guard let reason = OnDeviceAI.unavailableReason() else { return ["available": true] }
      return ["available": false, "reason": reason.rawValue]
    }

    AsyncFunction("respond") {
      (instructions: String, prompt: String, maxTokens: Int?, temperature: Double?) async throws -> String in
      do {
        return try await OnDeviceAI.respond(
          instructions: instructions, prompt: prompt, maxTokens: maxTokens, temperature: temperature)
      } catch let f as OnDeviceAIFailure {
        throw Exception(name: "OnDeviceAIError", description: f.message, code: f.code)
      } catch {
        throw Exception(name: "OnDeviceAIError", description: error.localizedDescription, code: "other")
      }
    }
  }
}
