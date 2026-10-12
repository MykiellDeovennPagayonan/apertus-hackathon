import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolate browser-test output from an existing development server.
  distDir: process.env.APERTUS_BROWSER_TEST_DIR ?? ".next",
  reactCompiler: true,
  output: "standalone",
  async headers() {
    return [{ source: "/component-authoring/v1/:file*.html", headers: [
      { key: "Content-Disposition", value: "attachment" },
      { key: "Content-Security-Policy", value: "sandbox; default-src 'none'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ] }];
  },
};

export default nextConfig;
