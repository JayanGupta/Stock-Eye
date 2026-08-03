import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*.monkeycode-ai.live"],
};

export default nextConfig;
