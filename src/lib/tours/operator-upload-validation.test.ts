import {
  inspectOperatorUpload,
  MAX_OPERATOR_FILE_BYTES,
} from "@/lib/tours/operator-upload-validation";

describe("operator document uploads", () => {
  it("accepts a PDF business document with a matching signature", async () => {
    const file = new File([new TextEncoder().encode("%PDF-1.7 test")], "permit.pdf", {
      type: "application/pdf",
    });

    await expect(inspectOperatorUpload(file, "businessPermit")).resolves.toMatchObject({
      ok: true,
      detected: { mimeType: "application/pdf", extension: "pdf" },
    });
  });

  it("rejects a file whose contents do not match its declared image type", async () => {
    const file = new File(["not an image"], "gcash.png", { type: "image/png" });

    await expect(inspectOperatorUpload(file, "gcashQr")).resolves.toMatchObject({ ok: false });
  });

  it("rejects PDFs as QR uploads and enforces the per-file limit", async () => {
    const pdf = new File([new TextEncoder().encode("%PDF-1.4 test")], "qr.pdf", {
      type: "application/pdf",
    });
    const oversized = new File(
      [new Uint8Array(MAX_OPERATOR_FILE_BYTES + 1)],
      "large.pdf",
      { type: "application/pdf" },
    );

    await expect(inspectOperatorUpload(pdf, "gcashQr")).resolves.toMatchObject({ ok: false });
    await expect(inspectOperatorUpload(oversized, "businessPermit")).resolves.toMatchObject({ ok: false });
  });
});
