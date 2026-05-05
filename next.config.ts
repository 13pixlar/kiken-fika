import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "staticcdn.svenskfotboll.se",
        pathname: "/img/**",
      },
    ],
  },
  // Keep these on the Node runtime boundary. Webpack bundling breaks:
  // - @libsql/client / drizzle (DB writes in API routes)
  // - node-ical → temporal-polyfill ("h.BigInt is not a function" when minified)
  serverExternalPackages: [
    "@libsql/client",
    "drizzle-orm",
    "node-ical",
    "temporal-polyfill",
    "rrule-temporal",
  ],
};

export default nextConfig;
