/** @type {import('next').NextConfig} */
// QA may build in isolation while the developer's existing server keeps .next.
const nextConfig = {
  distDir: process.env.NEXT_VERIFY === "1" ? ".next-verify" : ".next",
  transpilePackages: ["@mr-little-coffee/erp"],
};
export default nextConfig;
