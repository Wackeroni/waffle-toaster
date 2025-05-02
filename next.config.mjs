/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'export',
  // basePath: process.env.NODE_ENV === 'production' ? '/your-repo-name' : '',
  // Replace 'your-repo-name' with your actual GitHub repository name
}

export default nextConfig
