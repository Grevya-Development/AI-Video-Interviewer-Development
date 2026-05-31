/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma needs to be treated as external on the server to avoid bundling issues.
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  images: {
    // Allow our trusted local SVG logo through next/image, sandboxed.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
