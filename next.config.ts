import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Registration sends three small document images/PDFs through a Server Action.
  // The action independently caps each file and the combined request size.
  experimental: {
    serverActions: {
      bodySizeLimit: "18mb",
    },
  },
};

export default nextConfig;
