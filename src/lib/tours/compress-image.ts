const MAX_EDGE_PIXELS = 2200;
const MAX_QR_EDGE_PIXELS = 2400;

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This image could not be opened. Please choose another file."));
    };
    image.src = objectUrl;
  });
}

/**
 * Re-encodes images locally before they cross the network. Document photos are
 * optimized as JPEG; QR images use lossless PNG where possible to keep the
 * code's high-contrast edges readable. PDFs are deliberately left untouched.
 */
export async function compressOperatorImage(
  file: File,
  preserveQrSharpness = false,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let source: ImageBitmap | HTMLImageElement | null = null;
  try {
    source = await loadBitmap(file);
    const width = source.width;
    const height = source.height;
    if (!width || !height) throw new Error("This image has invalid dimensions.");

    const maxEdge = preserveQrSharpness ? MAX_QR_EDGE_PIXELS : MAX_EDGE_PIXELS;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image optimization is not supported in this browser.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    if (!preserveQrSharpness && file.type !== "image/png") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(source, 0, 0, canvas.width, canvas.height);

    const outputType = preserveQrSharpness ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Image optimization failed. Please try a different image."));
        },
        outputType,
        outputType === "image/jpeg" ? 0.84 : undefined,
      );
    });

    // Never replace a smaller source with a larger re-encoding. If the source
    // is already more compact, keep it; the server still checks its signature,
    // supported format, and byte limit before storage.
    if (blob.size >= file.size) return file;

    const extension = blob.type === "image/png" ? "png" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, "") || "operator-upload";
    return new File([blob], `${name}.${extension}`, {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } finally {
    if (source && "close" in source && typeof source.close === "function") {
      source.close();
    }
  }
}
