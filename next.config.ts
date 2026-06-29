import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the OpenAI SDK (and its native deps) stay in the Node.js layer
  // and are never accidentally bundled into client JS.
  serverExternalPackages: ["openai"],

  // Disable the x-powered-by header (minor security hygiene)
  poweredByHeader: false,
};

export default nextConfig;
