# 🔗 Quick Reference — Copy/Paste Patterns

Use these templates to accelerate your coding. Customize the names and details for your specific feature.

---

## Template 1: Contract File

**File**: `src/lib/tours/[module]-contract.ts`

```typescript
import "server-only";

export const [MODULE]_TABLE = "tours_[module]";

export const [MODULE]_FIELDS = {
  fieldOne: "field_one",
  fieldTwo: "field_two",
} as const;

export interface [Module]Record {
  id: string;
  field_one: string;
  field_two: string;
  created_at: string;
}

// Selection query for listing
export const [MODULE]_LIST_SELECT = `
  id,
  field_one,
  field_two,
  created_at
`;

// Selection query for detail view (with joins)
export const [MODULE]_DETAIL_SELECT = `
  id,
  field_one,
  field_two,
  related_table(id, name),
  created_at
`;
```

---

## Template 2: Validator File

**File**: `src/lib/tours/[module]-validation.ts`

```typescript
export function validate[Module](input: unknown): string | null {
  if (!input || typeof input !== "object") return "Input is invalid";

  const data = input as Record<string, unknown>;

  if (typeof data.fieldOne !== "string" || !data.fieldOne.trim()) {
    return "Field one is required";
  }

  if (typeof data.fieldTwo !== "string" || data.fieldTwo.length < 5) {
    return "Field two must be at least 5 characters";
  }

  return null; // Valid
}
```

---

## Template 3: Server Action File

**File**: `src/app/(subsystems)/tours/[role]/[module]/actions.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import { [MODULE]_TABLE, [MODULE]_FIELDS, type [Module]Record } from "@/lib/tours/[module]-contract";
import { validate[Module] } from "@/lib/tours/[module]-validation";

interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * List [module]s
 */
export async function list[Module]s(): Promise<ActionResult<[Module]Record[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from([MODULE]_TABLE)
      .select("[MODULE]_LIST_SELECT")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("list[Module]s error:", error);
      return { success: false, error: "Could not load [module]s" };
    }

    return { success: true, data: (data ?? []) as [Module]Record[] };
  } catch (err) {
    console.error("list[Module]s exception:", err);
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Create [module]
 */
export async function create[Module](input: {
  fieldOne: string;
  fieldTwo: string;
}): Promise<ActionResult<{ [moduleId]: string }>> {
  // 1. Auth check
  const session = await getAuthenticatedSession();
  if (!session.user) {
    return { success: false, error: "You must be signed in" };
  }
  if (session.role !== "appropriate_role") {
    return { success: false, error: "Not authorized" };
  }

  // 2. Validate
  const validationError = validate[Module](input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    // 3. Create
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from([MODULE]_TABLE)
      .insert({
        [FIELDS.fieldOne]: input.fieldOne,
        [FIELDS.fieldTwo]: input.fieldTwo,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("create[Module] error:", error);
      return { success: false, error: "Could not create [module]" };
    }

    // 4. Revalidate
    revalidatePath("/tours/[role]/[module]");

    return { success: true, data: { [moduleId]: data.id } };
  } catch (err) {
    console.error("create[Module] exception:", err);
    return { success: false, error: "Unexpected error" };
  }
}
```

---

## Template 4: Client Component

**File**: `src/app/(subsystems)/tours/[role]/[module]/[component].tsx`

```typescript
"use client";

import { useState } from "react";
import { create[Module] } from "./actions";

export function [Component]() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await create[Module]({
      fieldOne: formData.get("fieldOne") as string,
      fieldTwo: formData.get("fieldTwo") as string,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Success — redirect or reset form
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="fieldOne" className="block text-sm font-bold mb-2">
          Field One
        </label>
        <input
          id="fieldOne"
          name="fieldOne"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="fieldTwo" className="block text-sm font-bold mb-2">
          Field Two
        </label>
        <input
          id="fieldTwo"
          name="fieldTwo"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-full font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-12"
      >
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
```

---

## Template 5: Unit Test

**File**: `src/lib/tours/[module]-validation.test.ts`

```typescript
import { validate[Module] } from "./[module]-validation";

describe("validate[Module]", () => {
  it("should reject invalid input", () => {
    expect(validate[Module]({})).toBeTruthy();
  });

  it("should reject missing required field", () => {
    const error = validate[Module]({ fieldTwo: "value" });
    expect(error).toMatch(/field one/i);
  });

  it("should reject field too short", () => {
    const error = validate[Module]({ fieldOne: "ok", fieldTwo: "abc" });
    expect(error).toMatch(/5 characters/i);
  });

  it("should accept valid input", () => {
    const error = validate[Module]({
      fieldOne: "value",
      fieldTwo: "valid value",
    });
    expect(error).toBeNull();
  });
});
```

---

## Template 6: Server Action Test

**File**: `src/app/(subsystems)/tours/[role]/[module]/actions.test.ts`

```typescript
import { create[Module] } from "./actions";
import * as auth from "@/lib/tours/server-auth";
import * as supabase from "@/lib/supabase/server";

jest.mock("@/lib/tours/server-auth");
jest.mock("@/lib/supabase/server");

describe("create[Module]", () => {
  it("should require authentication", async () => {
    jest.mocked(auth.getAuthenticatedSession).mockResolvedValueOnce({
      user: null,
      role: null,
    });

    const result = await create[Module]({
      fieldOne: "value",
      fieldTwo: "value",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/signed in/i);
  });

  it("should validate input", async () => {
    jest.mocked(auth.getAuthenticatedSession).mockResolvedValueOnce({
      user: { id: "user1" },
      role: "operator",
    });

    const result = await create[Module]({
      fieldOne: "",
      fieldTwo: "value",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
```

---

## Common Patterns

### Query with Joins

```typescript
const { data, error } = await supabase
  .from("tours_bookings")
  .select(`
    id,
    total_amount,
    packages(title, description),
    tours_guides(profile_id, bio),
    profiles(full_name)
  `)
  .eq("id", bookingId)
  .single();
```

### Conditional Query

```typescript
let query = supabase
  .from("tours_packages")
  .select("id,title");

if (filter) {
  query = query.eq("status", "published");
}
if (search) {
  query = query.ilike("title", `%${search}%`);
}

const { data, error } = await query;
```

### Pagination

```typescript
const page = 1;
const pageSize = 20;
const offset = (page - 1) * pageSize;

const { data, error } = await supabase
  .from("tours_packages")
  .select("id,title")
  .order("created_at", { ascending: false })
  .range(offset, offset + pageSize - 1);
```

### Error Handling

```typescript
const { data, error } = await supabase.from("table").select("*");

if (error) {
  console.error("Database error:", error);
  return { success: false, error: "Could not load data" };
}

if (!data || data.length === 0) {
  return { success: false, error: "No data found" };
}

return { success: true, data };
```

---

## Styling Classes (Tailwind)

```typescript
// Full-width button (mobile)
className="w-full"

// Min height for touch targets
className="min-h-12" // 48px

// Rounded corners (design system)
className="rounded-2xl" // cards
className="rounded-full" // buttons

// Mobile-first responsive
className="w-full md:w-1/2 lg:w-1/3"
className="block md:grid md:grid-cols-2"

// Padding (mobile-first)
className="p-4 md:p-6"

// Text sizing
className="text-sm" // 14px
className="text-base" // 16px (min for mobile)
className="text-lg" // 18px
className="font-bold" // weight

// Colors
className="bg-blue-600 hover:bg-blue-700"
className="text-red-600"
className="border border-gray-300"
```

---

## Common Commands

```bash
# Development
npm run dev                    # Start server

# Testing
npm test                       # Run Jest
npm run test:watch           # Re-run on change
npm run test:e2e             # Playwright

# Quality
npm run typecheck            # Check types
npm run build                # Production build

# Database (Supabase SQL Editor)
SELECT * FROM information_schema.columns 
WHERE table_name = 'tours_bookings';
```

---

## Debugging Checklist

- [ ] Is the Server Action actually being called? (console.log)
- [ ] Is the database query returning data? (check RLS)
- [ ] Is the error caught correctly? (check error.message)
- [ ] Is the component re-rendering after data loads? (useState)
- [ ] Is the TypeScript type correct? (hover to see type)
- [ ] Are you using the right field names? (check contract file)

---

## Key Files to Reference

- Existing contracts: `src/lib/tours/operator-contract.ts`, `guide-contract.ts`, `package-contract.ts`
- Existing actions: `src/app/(subsystems)/tours/operator/actions.ts`, `guide/actions.ts`
- Shared utilities: `src/lib/tours/server-auth.ts`, `src/lib/supabase/server.ts`
- Components: `src/components/ui/*.tsx`

---

Keep this file open while coding. Copy templates, customize, done!
