/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build gates RE-ENABLED: TypeScript and ESLint errors will now block production builds.
  // This was disabled during development (ignoreBuildErrors/ignoreDuringBuilds) — now restored
  // as part of the hotfix sprint quality gate restoration.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
