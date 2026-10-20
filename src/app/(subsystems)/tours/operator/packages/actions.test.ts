import {
  createPackage,
  getPackageDetail,
  listOperatorPackages,
  replacePackageStops,
  replacePriceVariants,
  submitPackageForReview,
  updatePackageCore,
  type PackageCoreInput,
} from "@/app/(subsystems)/tours/operator/packages/actions";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/tours/server-auth", () => ({ getAuthenticatedSession: jest.fn() }));
jest.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const mockGetSession = getAuthenticatedSession as jest.MockedFunction<typeof getAuthenticatedSession>;
const mockCreateSessionClient = createSupabaseServerClient as jest.MockedFunction<
  typeof createSupabaseServerClient
>;

const packageId = "46f8a59e-3d31-4508-86a8-d2b8919eec31";
const operatorId = "39b3e5fc-29e0-4335-b8aa-56f699b34132";
const profileId = "972f6ec1-a283-4d42-a93c-080d13d56467";
const variantId = "27bd88bd-7a58-4a8b-9561-8fb81f4d7fd7";
const foreignOperatorId = "b1d5f3a2-9c4e-4a7b-8f21-6d0e4c9a1b77";

type QueryResult = { data?: unknown; error?: unknown };

/**
 * Builds a chainable query mock that mirrors supabase-js: intermediate methods
 * return the builder, and it is also thenable so a chain can be awaited
 * directly (which is how the list and child-collection reads are written).
 */
function query(result: QueryResult) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "insert", "update", "single", "maybeSingle"]) {
    chain[method] = jest.fn(() => chain);
  }
  chain.single = jest.fn(async () => result);
  chain.maybeSingle = jest.fn(async () => result);
  chain.then = (onFulfilled: (value: QueryResult) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return chain;
}

/** Each `from(table)` call consumes the next configured result for that table. */
function sessionClient(routes: Record<string, QueryResult[]>, rpcResult: QueryResult = { error: null }) {
  const rpc = jest.fn(async () => rpcResult);
  const from = jest.fn((table: string) => {
    const queue = routes[table] ?? [{ data: null, error: null }];
    const result = queue.length > 1 ? (queue.shift() as QueryResult) : queue[0];
    return query(result);
  });
  return { from, rpc };
}

const approvedOperator = { id: operatorId, accreditation_status: "approved" };
const draftPackage = { id: packageId, operator_id: operatorId, status: "draft" };

const coreInput: PackageCoreInput = {
  title: "Bagasbas Surf Day Tour",
  description: "A full day on the coast.",
  locationName: "Bagasbas Beach, Daet",
  durationValue: 8,
  durationType: "hours",
  inclusions: ["Boat rental"],
  exclusions: ["Personal expenses"],
  coverImageUrl: null,
  galleryUrls: [],
};

function approveSession(role: string | null = "operator") {
  mockGetSession.mockResolvedValue({ user: { id: profileId } as never, role, error: null });
}

function mockClient(client: unknown) {
  mockCreateSessionClient.mockResolvedValue(client as never);
}

describe("package price variant Server Action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockReset();
    mockCreateSessionClient.mockReset();
  });

  it("requires the caller's approved operator row and calls the replacement RPC with validated fields", async () => {
    approveSession();
    const client = sessionClient({
      tours_operators: [{ data: approvedOperator, error: null }],
      tours_packages: [{ data: draftPackage, error: null }],
    });
    mockClient(client);

    const result = await replacePriceVariants(packageId, [
      {
        id: variantId,
        variantName: "Standard",
        minPax: 1,
        maxPax: null,
        pricePerPax: 125,
        flatPrice: 400,
        isDefault: true,
        // Extra client fields must not be forwarded to the RPC.
        package_id: "foreign-package",
        stop_order: 99,
      } as never,
    ]);

    expect(result).toEqual({ success: true });
    expect(client.rpc).toHaveBeenCalledWith("replace_package_price_variants", {
      p_package_id: packageId,
      p_variants: [
        {
          id: variantId,
          variantName: "Standard",
          minPax: 1,
          maxPax: null,
          pricePerPax: 125,
          flatPrice: 400,
          isDefault: true,
        },
      ],
    });
  });

  it("rejects a caller whose role is not operator", async () => {
    approveSession("tourist");
    mockClient(sessionClient({}));

    const result = await replacePriceVariants(packageId, [
      { variantName: "Standard", minPax: 1, maxPax: null, pricePerPax: 100, flatPrice: null, isDefault: true },
    ]);

    expect(result).toEqual({
      success: false,
      error: "Only an approved operator can manage packages.",
    });
  });

  it("rejects an operator whose accreditation is not approved", async () => {
    approveSession();
    mockClient(
      sessionClient({
        tours_operators: [{ data: { id: operatorId, accreditation_status: "pending" }, error: null }],
      }),
    );

    const result = await replacePriceVariants(packageId, [
      { variantName: "Standard", minPax: 1, maxPax: null, pricePerPax: 100, flatPrice: null, isDefault: true },
    ]);

    expect(result).toEqual({
      success: false,
      error: "Your operator account is not yet approved.",
    });
  });

  it("rejects a package owned by a different operator", async () => {
    approveSession();
    mockClient(
      sessionClient({
        tours_operators: [{ data: approvedOperator, error: null }],
        tours_packages: [{ data: { ...draftPackage, operator_id: foreignOperatorId }, error: null }],
      }),
    );

    const result = await replacePriceVariants(packageId, [
      { variantName: "Standard", minPax: 1, maxPax: null, pricePerPax: 100, flatPrice: null, isDefault: true },
    ]);

    expect(result).toEqual({
      success: false,
      error: "You do not have access to this package.",
    });
  });

  it("rejects editing a package that is no longer a draft", async () => {
    approveSession();
    mockClient(
      sessionClient({
        tours_operators: [{ data: approvedOperator, error: null }],
        tours_packages: [{ data: { ...draftPackage, status: "published" }, error: null }],
      }),
    );

    const result = await replacePriceVariants(packageId, [
      { variantName: "Standard", minPax: 1, maxPax: null, pricePerPax: 100, flatPrice: null, isDefault: true },
    ]);

    expect(result).toEqual({
      success: false,
      error: 'Package cannot be edited while status is "published".',
    });
  });

  it("rejects variants without exactly one default", async () => {
    approveSession();
    mockClient(sessionClient({}));

    const result = await replacePriceVariants(packageId, [
      { variantName: "A", minPax: 1, maxPax: null, pricePerPax: 100, flatPrice: null, isDefault: false },
      { variantName: "B", minPax: 2, maxPax: null, pricePerPax: 90, flatPrice: null, isDefault: false },
    ]);

    expect(result).toEqual({
      success: false,
      error: "Exactly one price variant must be marked as default.",
    });
  });

  it("rejects a negative price", async () => {
    approveSession();
    mockClient(sessionClient({}));

    const result = await replacePriceVariants(packageId, [
      { variantName: "A", minPax: 1, maxPax: null, pricePerPax: -5, flatPrice: null, isDefault: true },
    ]);

    expect(result).toEqual({ success: false, error: "Prices cannot be negative." });
  });

  it("rejects a malformed package identifier", async () => {
    const result = await replacePriceVariants("not-a-uuid", []);
    expect(result).toEqual({ success: false, error: "The package identifier is invalid." });
  });
});

describe("package map stop Server Action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends stops in array order and never a client-supplied stop_order", async () => {
    approveSession();
    const client = sessionClient({
      tours_operators: [{ data: approvedOperator, error: null }],
      tours_packages: [{ data: draftPackage, error: null }],
    });
    mockClient(client);

    const result = await replacePackageStops(packageId, [
      {
        locationName: "Bagasbas Beach",
        latitude: 14.1086,
        longitude: 122.9398,
        description: "Surf spot",
        estimatedDurationMinutes: 45,
        // Must be stripped before the RPC call.
        stop_order: 99,
      } as never,
      {
        locationName: "Daet Cathedral",
        latitude: 14.1122,
        longitude: 122.9551,
        description: null,
        estimatedDurationMinutes: null,
      },
    ]);

    expect(result).toEqual({ success: true });
    expect(client.rpc).toHaveBeenCalledWith("replace_package_stops", {
      p_package_id: packageId,
      p_stops: [
        {
          locationName: "Bagasbas Beach",
          latitude: 14.1086,
          longitude: 122.9398,
          description: "Surf spot",
          estimatedDurationMinutes: 45,
        },
        {
          locationName: "Daet Cathedral",
          latitude: 14.1122,
          longitude: 122.9551,
          description: null,
          estimatedDurationMinutes: null,
        },
      ],
    });
  });

  it("rejects a fractional estimated duration", async () => {
    approveSession();
    mockClient(sessionClient({}));

    const result = await replacePackageStops(packageId, [
      {
        locationName: "Bagasbas Beach",
        latitude: 14.1086,
        longitude: 122.9398,
        description: null,
        estimatedDurationMinutes: 45.5,
      },
    ]);

    expect(result).toEqual({
      success: false,
      error: "Estimated duration must be a whole number of minutes, 0 or more.",
    });
  });

  it("rejects coordinates outside valid range", async () => {
    approveSession();
    mockClient(sessionClient({}));

    const result = await replacePackageStops(packageId, [
      { locationName: "X", latitude: 95, longitude: 0, description: null, estimatedDurationMinutes: null },
    ]);

    expect(result).toEqual({ success: false, error: "Latitude must be between -90 and 90." });
  });
});

describe("package core Server Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a draft package and returns its id", async () => {
    approveSession();
    const client = sessionClient({
      tours_operators: [{ data: approvedOperator, error: null }],
      tours_packages: [{ data: { id: packageId }, error: null }],
    });
    mockClient(client);

    const result = await createPackage(coreInput);

    expect(result).toEqual({ success: true, data: { packageId } });
  });

  it("rejects a fractional duration because the column is an integer", async () => {
    approveSession();
    mockClient(sessionClient({}));

    const result = await createPackage({ ...coreInput, durationValue: 2.5 });

    expect(result).toEqual({
      success: false,
      error: "Duration must be a whole number greater than zero.",
    });
  });

  it("rejects a missing title before touching the database", async () => {
    const result = await createPackage({ ...coreInput, title: "   " });
    expect(result).toEqual({ success: false, error: "Title is required." });
    expect(mockCreateSessionClient).not.toHaveBeenCalled();
  });

  it("updates core fields only while the package is a draft", async () => {
    approveSession();
    const client = sessionClient({
      tours_operators: [{ data: approvedOperator, error: null }],
      tours_packages: [
        { data: draftPackage, error: null },
        { data: { id: packageId }, error: null },
      ],
    });
    mockClient(client);

    const result = await updatePackageCore(packageId, coreInput);
    expect(result).toEqual({ success: true });
  });

  it("reports a database failure instead of implying the package vanished", async () => {
    approveSession();
    // The action logs the failure by design; keep the test output clean.
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockClient(
      sessionClient({
        tours_operators: [{ data: approvedOperator, error: null }],
        tours_packages: [{ data: draftPackage, error: null }, { data: null, error: { code: "42501" } }],
      }),
    );

    const result = await updatePackageCore(packageId, coreInput);

    expect(result).toEqual({
      success: false,
      error: "Package could not be updated; it may no longer be editable.",
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("submitPackageForReview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls the atomic RPC once ownership and approval are confirmed", async () => {
    approveSession();
    const client = sessionClient({
      tours_operators: [{ data: approvedOperator, error: null }],
    });
    mockClient(client);

    const result = await submitPackageForReview(packageId);

    expect(result).toEqual({ success: true });
    expect(client.rpc).toHaveBeenCalledWith("submit_package_for_review", {
      p_package_id: packageId,
    });
  });

  it("surfaces the RPC's completeness messages verbatim", async () => {
    approveSession();
    mockClient(
      sessionClient(
        { tours_operators: [{ data: approvedOperator, error: null }] },
        { error: { message: "Add at least one map stop before submitting." } },
      ),
    );

    const result = await submitPackageForReview(packageId);

    expect(result).toEqual({
      success: false,
      error: "Add at least one map stop before submitting.",
    });
  });

  it("surfaces the draft-status message verbatim", async () => {
    approveSession();
    mockClient(
      sessionClient(
        { tours_operators: [{ data: approvedOperator, error: null }] },
        {
          error: {
            message: "Not authorized to submit this package, or package is not in draft status.",
          },
        },
      ),
    );

    const result = await submitPackageForReview(packageId);

    expect(result).toEqual({
      success: false,
      error: "Not authorized to submit this package, or package is not in draft status.",
    });
  });

  it("hides unexpected database errors behind a generic message", async () => {
    approveSession();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockClient(
      sessionClient(
        { tours_operators: [{ data: approvedOperator, error: null }] },
        { error: { code: "42501", message: "permission denied for column profile_id" } },
      ),
    );

    const result = await submitPackageForReview(packageId);

    expect(result).toEqual({
      success: false,
      error: "Could not submit package for review. Please try again.",
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("rejects a caller who is not an approved operator before calling the RPC", async () => {
    approveSession("tourist");
    const client = sessionClient({});
    mockClient(client);

    const result = await submitPackageForReview(packageId);

    expect(result).toEqual({
      success: false,
      error: "Only an approved operator can manage packages.",
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("rejects a malformed identifier before any database call", async () => {
    const result = await submitPackageForReview("not-a-uuid");
    expect(result).toEqual({
      success: false,
      error: "The package identifier is invalid.",
    });
    expect(mockCreateSessionClient).not.toHaveBeenCalled();
  });

  it("requires a signed-in session", async () => {
    mockGetSession.mockResolvedValue({ user: null, role: null, error: null });
    mockClient(sessionClient({}));

    const result = await submitPackageForReview(packageId);
    expect(result).toEqual({ success: false, error: "You must be signed in." });
  });
});

describe("package reads", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the operator's own packages", async () => {
    approveSession();
    mockClient(
      sessionClient({
        tours_operators: [{ data: approvedOperator, error: null }],
        tours_packages: [{ data: [{ id: packageId, title: "Tour" }], error: null }],
      }),
    );

    const result = await listOperatorPackages();
    expect(result.success).toBe(true);
    expect(result.data).toEqual([{ id: packageId, title: "Tour" }]);
  });

  it("distinguishes a detail read failure from a missing package", async () => {
    approveSession();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockClient(
      sessionClient({
        tours_operators: [{ data: approvedOperator, error: null }],
        tours_packages: [{ data: null, error: { code: "42501", message: "denied" } }],
      }),
    );

    const result = await getPackageDetail(packageId);

    expect(result).toEqual({
      success: false,
      error: "Package details could not be loaded. Please try again.",
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("reports a missing package without implying a database failure", async () => {
    approveSession();
    mockClient(
      sessionClient({
        tours_operators: [{ data: approvedOperator, error: null }],
        tours_packages: [{ data: null, error: null }],
      }),
    );

    const result = await getPackageDetail(packageId);
    expect(result).toEqual({
      success: false,
      error: "Package not found or you do not have access.",
    });
  });

  it("rejects a malformed identifier before any database call", async () => {
    const result = await getPackageDetail("not-a-uuid");
    expect(result).toEqual({
      success: false,
      error: "Package not found or you do not have access.",
    });
    expect(mockCreateSessionClient).not.toHaveBeenCalled();
  });
});
