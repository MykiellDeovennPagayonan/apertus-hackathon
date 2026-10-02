import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolate browser-test output from an existing development server.
  distDir: process.env.APERTUS_BROWSER_TEST_DIR ?? ".next",
  reactCompiler: true,
};

export default nextConfig;
