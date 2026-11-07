import type { NextConfig } from "next";

// Cabeçalhos de segurança em todas as respostas.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" }, // não pode ser embutido em outro site (clickjacking)
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  experimental: {
    serverActions: {
      // A importação CSV envia até 1.000 linhas de uma vez.
      bodySizeLimit: "4mb",
    },
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
