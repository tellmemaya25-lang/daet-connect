import { inspectGuideIdDocument } from "@/lib/tours/guide-upload-validation";

describe("guide ID uploads", () => {
  it("accepts a PDF when the file signature matches the declared type", async () => {
    const file = new File([new TextEncoder().encode("%PDF-1.7 ID document")], "identity.pdf", { type: "application/pdf" });
    await expect(inspectGuideIdDocument(file)).resolves.toMatchObject({
      ok: true,
      detected: { mimeType: "application/pdf", extension: "pdf" },
    });
  });

  it("rejects a mismatched file type", async () => {
    const file = new File(["not a real image"], "identity.png", { type: "image/png" });
    await expect(inspectGuideIdDocument(file)).resolves.toMatchObject({ ok: false });
  });
});
