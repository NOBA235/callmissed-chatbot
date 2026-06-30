import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(),
  },

  // Ensure the OpenAI SDK (and its native deps) stay in the Node.js layer
  // and are never accidentally bundled into client JS.
  serverExternalPackages: ["openai"],

  // Disable the x-powered-by header (minor security hygiene)
  poweredByHeader: false,
};

export default nextConfig;
