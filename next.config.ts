import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Este é um painel 100% dinâmico (dados mudam a cada segundo), então o cache
  // de componentes não traz benefício e proíbe `export const dynamic`.
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
