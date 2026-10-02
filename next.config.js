/** @type {import('next').NextConfig} */
// DESKTOP=1 builds a static export into out/, which the desktop app bundles and serves offline.
const desktop = process.env.DESKTOP === '1'
// The app version goes on every usage event, so a change can be compared before and after.
const appVersion = require('./desktop/package.json').version

const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_APP_VERSION: appVersion, ...(desktop ? { NEXT_PUBLIC_DESKTOP: '1' } : {}) },
  // Files named *.web.tsx are routes the web build serves and the desktop export leaves out: the Open Graph images
  // under src/app/og, which next/og cannot prerender on Windows and which an offline app has no use for.
  pageExtensions: desktop ? ['tsx', 'ts', 'jsx', 'js'] : ['web.tsx', 'tsx', 'ts', 'jsx', 'js'],
  ...(desktop ? { output: 'export', distDir: '.next-desktop', images: { unoptimized: true } } : {}),
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
