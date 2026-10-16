import { getOwnOperatorApplicationStatus } from "@/lib/tours/operator-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: jest.fn(),
}));

const mockCreateAdmin = createSupabaseAdminClient as jest.MockedFunction<
  typeof createSupabaseAdminClient
>;
const USER_ID = "7f1c1988-d352-46bb-9ac8-37a8d0197a11";

describe("getOwnOperatorApplicationStatus", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    mockCreateAdmin.mockReset();
    consoleError.mockClear();
  });

  it("uses a narrowly scoped server-side query for the authenticated user", async () => {
    const application = {
      id: "operator-row-id",
      accreditation_status: "rejected",
      rejection_reason: "Please provide an updated permit.",
      created_at: "2026-10-01T12:00:00.000Z",
    };
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: application, error: null }),
    };
    mockCreateAdmin.mockReturnValue({
      from: jest.fn().mockReturnValue(query),
    } as never);

    const result = await getOwnOperatorApplicationStatus(USER_ID);

    expect(result).toEqual({ ok: true, application });
    expect(query.eq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(query.select).toHaveBeenCalledWith(
      "id,accreditation_status,rejection_reason,created_at",
    );
  });

  it("treats no application as a valid status result", async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockCreateAdmin.mockReturnValue({
      from: jest.fn().mockReturnValue(query),
    } as never);

    await expect(getOwnOperatorApplicationStatus(USER_ID)).resolves.toEqual({
      ok: true,
      application: null,
    });
  });

  it("does not query with an invalid user ID", async () => {
    await expect(getOwnOperatorApplicationStatus("not-a-uuid")).resolves.toEqual({
      ok: false,
    });

    expect(mockCreateAdmin).not.toHaveBeenCalled();
  });

  it("fails closed when the status query fails", async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: { code: "42501" },
      }),
    };
    mockCreateAdmin.mockReturnValue({
      from: jest.fn().mockReturnValue(query),
    } as never);

    await expect(getOwnOperatorApplicationStatus(USER_ID)).resolves.toEqual({
      ok: false,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Could not load an operator's own application status.",
      { code: "42501" },
    );
  });

  it("fails closed when the server-only client cannot be initialized", async () => {
    mockCreateAdmin.mockImplementation(() => {
      throw new Error("service key missing");
    });

    await expect(getOwnOperatorApplicationStatus(USER_ID)).resolves.toEqual({
      ok: false,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Could not initialize or complete an operator status lookup.",
    );
  });
});
