import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // @taila/core ships TypeScript source, not a build output, so Next must
  // compile it as part of this app.
  transpilePackages: ["@taila/core"],
};

export default nextConfig;
