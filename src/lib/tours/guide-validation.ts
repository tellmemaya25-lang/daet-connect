import { z } from "zod";

export const GUIDE_ID_TYPES = [
  { value: "philippine_national_id", label: "Philippine National ID" },
  { value: "drivers_license", label: "Driver’s license" },
  { value: "passport", label: "Passport" },
  { value: "sss_umid", label: "SSS / UMID" },
  { value: "other_government_id", label: "Other government-issued ID" },
] as const;

const GuideProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(160, "Name must be 160 characters or fewer."),
  contactPhone: z
    .string()
    .trim()
    .min(7, "Enter a contact number with at least 7 digits.")
    .max(24, "Contact number is too long.")
    .regex(/^[+\d\s().-]+$/, "Use digits and common phone-number characters only."),
  bio: z
    .string()
    .trim()
    .min(20, "Tell visitors a little about your guiding experience (at least 20 characters).")
    .max(1000, "Your introduction must be 1,000 characters or fewer."),
  idType: z.enum([
    "philippine_national_id",
    "drivers_license",
    "passport",
    "sss_umid",
    "other_government_id",
  ]),
  idNumber: z
    .string()
    .trim()
    .min(4, "Enter the number shown on your ID.")
    .max(40, "ID number must be 40 characters or fewer.")
    .regex(/^[A-Za-z0-9\s-]+$/, "Use letters, numbers, spaces, or hyphens only."),
});

export type GuideRegistrationValues = z.infer<typeof GuideProfileSchema>;

export function validateGuideRegistration(input: unknown) {
  return GuideProfileSchema.safeParse(input);
}

export function guideFieldErrors(error: z.ZodError): Record<string, string> {
  const flattened = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flattened)
      .map(([field, messages]) => [field, messages?.[0]])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

/** Exact checkbox parser shared by the action and its consent test. */
export function hasGuideIdConsent(value: FormDataEntryValue | null): boolean {
  return value === "true";
}
