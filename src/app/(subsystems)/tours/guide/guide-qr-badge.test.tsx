/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { GuideQrBadge } from "@/app/(subsystems)/tours/guide/guide-qr-badge";

describe("approved guide QR badge", () => {
  it("offers a downloadable PNG and a print-ready badge", () => {
    const print = jest.spyOn(window, "print").mockImplementation(() => undefined);
    render(
      <GuideQrBadge
        guideId="7f1c1988-d352-46bb-9ac8-37a8d0197a11"
        fullName="Maya Santos"
        qrDataUrl="data:image/png;base64,qr"
      />,
    );

    const download = screen.getByRole("link", { name: /download qr as png/i });
    expect(download).toHaveAttribute("download", "connect-daet-guide-badge-7f1c1988.png");
    expect(download).toHaveAttribute("href", "data:image/png;base64,qr");

    fireEvent.click(screen.getByRole("button", { name: /print badge/i }));
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });
});
