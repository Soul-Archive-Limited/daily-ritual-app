import CoreImage
import ExpoModulesCore
import UIKit
import Vision

/// Cuts the product out of a photo with iOS's own subject lifting (iOS 17+), trims it and centres it
/// on a transparent square. Falls back to a plain centre-square crop when nothing can be lifted.
public final class SubjectLiftModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SubjectLift")

    Function("isSupported") { () -> Bool in
      if #available(iOS 17.0, *) { return true }
      return false
    }

    AsyncFunction("liftAsync") { (inputUri: String, outputPath: String, maxSize: Int) -> [String: Any] in
      guard let input = URL(string: inputUri), let data = try? Data(contentsOf: input),
        let image = UIImage(data: data), let cg = Self.upright(image)
      else {
        throw Exception(name: "ERR_IMAGE", description: "Couldn’t read that photo.")
      }

      let side = CGFloat(max(256, min(maxSize, 2048)))
      if #available(iOS 17.0, *), let cut = try? Self.lift(cg) {
        let png = Self.centredSquare(cut, side: side, padding: 0.08)
        guard let bytes = png.pngData() else { throw Exception(name: "ERR_WRITE", description: "Couldn’t save the cut-out.") }
        let out = URL(fileURLWithPath: outputPath + ".png")
        try bytes.write(to: out, options: .atomic)
        return ["uri": out.absoluteString, "cut": true]
      }

      // Nothing to lift (or older iOS): keep the photo, cropped to a centred square.
      let square = Self.cropSquare(cg, side: side)
      guard let bytes = square.jpegData(compressionQuality: 0.85) else {
        throw Exception(name: "ERR_WRITE", description: "Couldn’t save the photo.")
      }
      let out = URL(fileURLWithPath: outputPath + ".jpg")
      try bytes.write(to: out, options: .atomic)
      return ["uri": out.absoluteString, "cut": false]
    }
  }

  /// Draws the image the right way up so Vision and cropping see what the camera saw.
  private static func upright(_ image: UIImage) -> CGImage? {
    if image.imageOrientation == .up, let cg = image.cgImage { return cg }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    let r = UIGraphicsImageRenderer(size: image.size, format: format)
    return r.image { _ in image.draw(in: CGRect(origin: .zero, size: image.size)) }.cgImage
  }

  /// The foreground instance under the centre of the photo (else the largest one), cut to its extent.
  @available(iOS 17.0, *)
  private static func lift(_ cg: CGImage) throws -> CGImage? {
    let handler = VNImageRequestHandler(cgImage: cg, orientation: .up)
    let request = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([request])
    guard let result = request.results?.first, !result.allInstances.isEmpty else { return nil }

    let pick = chooseInstance(result)
    let buffer = try result.generateMaskedImage(
      ofInstances: IndexSet(integer: pick), from: handler, croppedToInstancesExtent: true)
    let ci = CIImage(cvPixelBuffer: buffer)
    return CIContext().createCGImage(ci, from: ci.extent)
  }

  @available(iOS 17.0, *)
  private static func chooseInstance(_ result: VNInstanceMaskObservation) -> Int {
    let mask = result.instanceMask
    CVPixelBufferLockBaseAddress(mask, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(mask, .readOnly) }
    let w = CVPixelBufferGetWidth(mask)
    let h = CVPixelBufferGetHeight(mask)
    let row = CVPixelBufferGetBytesPerRow(mask)
    guard let base = CVPixelBufferGetBaseAddress(mask)?.assumingMemoryBound(to: UInt8.self) else {
      return result.allInstances.first ?? 1
    }
    let centre = Int(base[(h / 2) * row + w / 2])
    if centre != 0 && result.allInstances.contains(centre) { return centre }
    var counts = [Int: Int]()
    for y in stride(from: 0, to: h, by: 2) {
      for x in stride(from: 0, to: w, by: 2) {
        let v = Int(base[y * row + x])
        if v != 0 { counts[v, default: 0] += 1 }
      }
    }
    return counts.max(by: { $0.value < $1.value })?.key ?? (result.allInstances.first ?? 1)
  }

  /// Fit the cut-out into a transparent square with some breathing room.
  private static func centredSquare(_ cg: CGImage, side: CGFloat, padding: CGFloat) -> UIImage {
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = false
    let r = UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format)
    return r.image { _ in
      let inner = side * (1 - padding * 2)
      let w = CGFloat(cg.width)
      let h = CGFloat(cg.height)
      let k = min(inner / w, inner / h)
      let size = CGSize(width: w * k, height: h * k)
      let origin = CGPoint(x: (side - size.width) / 2, y: (side - size.height) / 2)
      UIImage(cgImage: cg).draw(in: CGRect(origin: origin, size: size))
    }
  }

  private static func cropSquare(_ cg: CGImage, side: CGFloat) -> UIImage {
    let s = min(cg.width, cg.height)
    let rect = CGRect(x: (cg.width - s) / 2, y: (cg.height - s) / 2, width: s, height: s)
    let cropped = cg.cropping(to: rect) ?? cg
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    let r = UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format)
    return r.image { _ in UIImage(cgImage: cropped).draw(in: CGRect(x: 0, y: 0, width: side, height: side)) }
  }
}
