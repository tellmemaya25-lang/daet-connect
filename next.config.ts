import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Arena preview is hosted on a dynamic e2b.app subdomain. Allow its
  // origin for Next dev assets and Server Action requests through the proxy.
  allowedDevOrigins: ["*.e2b.app"],
  // Registration sends small document uploads through a Server Action. Each
  // guide file is independently capped and validated on the server.
  experimental: {
    serverActions: {
      allowedOrigins: ["*.e2b.app"],
      bodySizeLimit: "18mb",
    },
  },
};

export default nextConfig;
