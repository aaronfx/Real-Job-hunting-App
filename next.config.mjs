/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  output: "standalone",
};

export default nextConfig;
