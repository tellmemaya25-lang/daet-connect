/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { OperatorRegistrationForm } from "@/app/(subsystems)/tours/operator/operator-registration-form";

jest.mock("@/app/(subsystems)/tours/operator/actions", () => ({
  submitOperatorRegistration: jest.fn(async () => ({ status: "idle", message: "" })),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

describe("operator registration steps", () => {
  it("keeps the mobile application to three short steps", () => {
    render(<OperatorRegistrationForm initialEmail="operator@example.ph" />);

    expect(screen.getByRole("group", { name: "Business information" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Registered business name/i), { target: { value: "Bagasbas Coast Tours" } });
    fireEvent.change(screen.getByLabelText(/Authorized contact person/i), { target: { value: "Maya Santos" } });
    fireEvent.change(screen.getByLabelText(/Mobile or contact number/i), { target: { value: "09171234567" } });
    fireEvent.change(screen.getByLabelText(/Business address/i), { target: { value: "Purok 1, Brgy. Bagasbas, Daet, Camarines Norte" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("group", { name: "Business documents" })).toBeInTheDocument();

    const dtiInput = screen.getByLabelText(/DTI \/ business registration document/i);
    const permitInput = screen.getByLabelText(/Mayor’s \/ business permit/i);
    fireEvent.change(dtiInput, {
      target: { files: [new File(["%PDF-1.4"], "dti.pdf", { type: "application/pdf" })] },
    });
    fireEvent.change(permitInput, {
      target: { files: [new File(["%PDF-1.4"], "permit.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("GCash QR code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit for approval/i })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /application steps/i }).querySelectorAll("li")).toHaveLength(3);
  });
});
