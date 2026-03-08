import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

const appRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig | ((phase: string) => import('next').NextConfig)} */
const nextConfig = (phase) => ({
  // Keep dev/build artifacts isolated to avoid mixed chunk/runtime outputs.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  outputFileTracingRoot: appRoot,
  typedRoutes: false,

  // Docker standalone output
  output: 'standalone',

  // Required for Docker
  trailingSlash: false,
});

export default nextConfig;
