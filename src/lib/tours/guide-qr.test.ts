import { createGuideQrPayload } from "@/lib/tours/guide-qr";

describe("guide QR payload", () => {
  it("encodes only the public guide reference", () => {
    const guideId = "7f1c1988-d352-46bb-9ac8-37a8d0197a11";
    const payload = createGuideQrPayload(guideId);
    expect(payload).toBe(`CONNECT-DAET-GUIDE:${guideId}`);
    expect(payload).not.toMatch(/id_number|document|consent|Maya|1234/i);
  });
});
