import { mkdir, copyFile } from 'node:fs/promises'
await mkdir('public/colour',{recursive:true})
await copyFile('node_modules/lcms-wasm/dist/lcms.min.js','public/colour/lcms.js')
await copyFile('node_modules/lcms-wasm/dist/lcms.wasm','public/colour/lcms.wasm')
await copyFile('node_modules/lcms-wasm/LICENSE.md','public/colour/LICENSE.md')
