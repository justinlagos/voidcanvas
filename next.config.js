/** @type {import('next').NextConfig} */
// DESKTOP=1 builds a static export into out/, which the desktop app bundles and serves offline.
const desktop = process.env.DESKTOP === '1'

const nextConfig = {
  reactStrictMode: true,
  ...(desktop ? { output: 'export', distDir: '.next-desktop', images: { unoptimized: true }, env: { NEXT_PUBLIC_DESKTOP: '1' } } : {}),
  webpack: (config) => {
    // pdfjs references an optional Node 'canvas' module we never use in the browser build.
    // paper.js: use the browser core build, never the Node build (which pulls in jsdom).
    config.resolve.alias = {
      ...config.resolve.alias, canvas: false, jsdom: false, 'jsdom/lib/jsdom/living/generated/utils': false,
      paper$: require.resolve('paper/dist/paper-core.js'),
      [require.resolve('paper/dist/node/self.js')]: false, [require.resolve('paper/dist/node/extend.js')]: false,
    }
    return config
  },
}

module.exports = nextConfig
