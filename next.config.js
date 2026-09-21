/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs references an optional Node 'canvas' module we never use in the browser build.
    config.resolve.alias = { ...config.resolve.alias, canvas: false }
    return config
  },
}

module.exports = nextConfig
