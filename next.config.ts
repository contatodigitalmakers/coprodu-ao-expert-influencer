import type { NextConfig } from "next";

// Cabeçalhos de segurança em todas as respostas.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" }, // não pode ser embutido em outro site (clickjacking)
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// A prévia do gerador de apresentação abre num iframe do próprio CRM.
// Vem depois da regra geral e por isso a substitui nesse caminho.
const presentationPreviewHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/apresentacoes/previa", headers: presentationPreviewHeaders },
    ];
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
