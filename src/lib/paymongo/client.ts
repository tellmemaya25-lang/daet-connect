import { PayMongo } from "@paymongo/core";

if (!process.env.PAYMONGO_SECRET_KEY) {
  throw new Error("Missing PAYMONGO_SECRET_KEY in environment variables");
}

export const paymongoClient = new PayMongo(process.env.PAYMONGO_SECRET_KEY);

export function isPayMongoConfigured(): boolean {
  return Boolean(
    process.env.PAYMONGO_SECRET_KEY &&
    process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY
  );
}
