import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// Sin NEXT_PUBLIC_API_URL (desarrollo local), el navegador llama a /api/v1 y Next lo reenvía al backend.
// En producción la variable apunta al backend y las llamadas van directas, sin proxy.
const proxyApi = !process.env.NEXT_PUBLIC_API_URL;
const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");

// IPs de la red local, para abrir el servidor de desarrollo desde el teléfono sin editar nada si cambia la IP.
const lanIps = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n?.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: [...lanIps, "*.trycloudflare.com"],
  async rewrites() {
    return proxyApi ? [{ source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` }] : [];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
