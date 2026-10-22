import QRCode from "qrcode";

/**
 * The badge QR contains only the public guide row UUID and verification URL,
 * never an ID number, document path, consent value, or other personal/sensitive data.
 */
export function createGuideQrPayload(guideId: string): string {
  // Use full URL so scanning apps can open directly
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/tours/verify-guide/${guideId}`;
}

export async function createGuideQrPngDataUrl(guideId: string): Promise<string> {
  return QRCode.toDataURL(createGuideQrPayload(guideId), {
    type: "image/png",
    errorCorrectionLevel: "H",
    margin: 3,
    width: 720,
    color: {
      dark: "#172b24",
      light: "#ffffff",
    },
  });
}
