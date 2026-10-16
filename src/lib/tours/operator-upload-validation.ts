export const MAX_OPERATOR_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_OPERATOR_TOTAL_UPLOAD_BYTES = 15 * 1024 * 1024;

export type OperatorUploadField = "dtiDocument" | "businessPermit" | "gcashQr";
export type DetectedUpload = {
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  extension: "jpg" | "png" | "webp" | "pdf";
};

const SIGNATURES: Record<DetectedUpload["mimeType"], DetectedUpload["extension"]> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function detectMimeType(bytes: Uint8Array): DetectedUpload["mimeType"] | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  if (String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") {
    return "application/pdf";
  }
  return null;
}

export async function inspectOperatorUpload(
  file: File,
  field: OperatorUploadField,
): Promise<{ ok: true; detected: DetectedUpload } | { ok: false; message: string }> {
  if (file.size <= 0) {
    return { ok: false, message: "Choose a non-empty file." };
  }

  if (file.size > MAX_OPERATOR_FILE_BYTES) {
    return { ok: false, message: "Each file must be 5 MB or smaller after image compression." };
  }

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const mimeType = detectMimeType(header);
  if (!mimeType) {
    return {
      ok: false,
      message: "This file type is not supported. Use a JPG, PNG, WebP, or PDF document.",
    };
  }

  if (field === "gcashQr" && mimeType === "application/pdf") {
    return { ok: false, message: "Upload the GCash QR as a JPG, PNG, or WebP image." };
  }

  // The browser MIME type is untrusted, but rejecting a mismatch helps catch
  // accidental file selection errors. An empty/octet-stream type is allowed
  // because the signature above is authoritative.
  const declaredMime = file.type.trim().toLowerCase();
  if (
    declaredMime &&
    declaredMime !== "application/octet-stream" &&
    declaredMime !== mimeType
  ) {
    return { ok: false, message: "The selected file contents do not match its file type." };
  }

  return { ok: true, detected: { mimeType, extension: SIGNATURES[mimeType] } };
}

export function isAllowedTotalUploadSize(totalBytes: number): boolean {
  return totalBytes > 0 && totalBytes <= MAX_OPERATOR_TOTAL_UPLOAD_BYTES;
}
