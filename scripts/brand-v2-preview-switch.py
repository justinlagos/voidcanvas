from pathlib import Path

p = Path('src/studio/BrandGuideline.tsx')
s = p.read_text()

anchor = "import type { Level } from '@/lib/intelligence/contrast'\n"
addition = "import { composeRuntimePages } from '@/brand/compose/runtime'\nimport { renderRuntimePage } from './brand-v2-render'\n"
if addition not in s:
    if anchor not in s:
        raise SystemExit('BrandGuideline import anchor not found')
    s = s.replace(anchor, anchor + addition, 1)

old = '''function Page({ spec, pageNo, pageCount, brand, logo, o, cssWidth }: { spec: PageSpec; pageNo: number; pageCount: number; brand: Brand; logo: LogoInfo | null; o: Orientation; cssWidth: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const d = useBrand(s => s.decisions)
  const photos = useBrand(s => s.photos)
  useEffect(() => {
    let live = true
    const big = cssWidth > 400
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const scale = Math.min(2, Math.max(0.25, (cssWidth * dpr) / SIZES[o].w))
    const t = setTimeout(() => {
      renderPage(spec, pageNo, pageCount, brand, logo, o, scale, d, spec.kind === 'photo' ? photos : []).then(c => { if (!live || !ref.current) return; const x = ref.current.getContext('2d')!; ref.current.width = c.width; ref.current.height = c.height; x.drawImage(c, 0, 0) })
    }, big ? 0 : 80)
    return () => { live = false; clearTimeout(t) }
  }, [spec, pageNo, pageCount, brand, logo, o, cssWidth, d, spec.kind === 'photo' ? photos : null]) // eslint-disable-line react-hooks/exhaustive-deps
  const ar = SIZES[o].h / SIZES[o].w
  return <canvas ref={ref} className="block rounded-md shadow-lg bg-white" style={{ width: cssWidth, height: cssWidth * ar }} />
}
'''

new = '''function Page({ spec, pageNo, pageCount, brand, logo, o, cssWidth }: { spec: PageSpec; pageNo: number; pageCount: number; brand: Brand; logo: LogoInfo | null; o: Orientation; cssWidth: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const d = useBrand(s => s.decisions)
  const photos = useBrand(s => s.photos)
  const pages = useBrand(s => s.pages)
  const salt = useBrand(s => s.tokens.salt)
  const layoutSalt = useBrand(s => s.tokens.layoutSalt ?? 0)
  const runtime = useMemo(() => composeRuntimePages({ brand, logo, pages, salt, layoutSalt }), [brand, logo, pages, salt, layoutSalt])
  const sourceIndex = pages.indexOf(spec)
  useEffect(() => {
    let live = true
    const big = cssWidth > 400
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const scale = Math.min(2, Math.max(0.25, (cssWidth * dpr) / SIZES[o].w))
    const t = setTimeout(() => {
      renderRuntimePage({ spec, irPage: runtime.irByIndex.get(sourceIndex), pageNo, pageCount, brand, logo, orientation: o, scale, decisions: d, photos }).then(c => {
        if (!live || !ref.current) return
        const x = ref.current.getContext('2d')!
        ref.current.width = c.width
        ref.current.height = c.height
        x.drawImage(c, 0, 0)
      })
    }, big ? 0 : 80)
    return () => { live = false; clearTimeout(t) }
  }, [spec, sourceIndex, pageNo, pageCount, brand, logo, o, cssWidth, d, photos, runtime])
  const ar = SIZES[o].h / SIZES[o].w
  return <canvas ref={ref} data-brand-renderer={o === 'landscape' && spec.variant === 0 && runtime.irByIndex.has(sourceIndex) ? 'v2' : 'legacy'} className="block rounded-md shadow-lg bg-white" style={{ width: cssWidth, height: cssWidth * ar }} />
}
'''

if old not in s:
    raise SystemExit('BrandGuideline Page block did not match expected source')
s = s.replace(old, new, 1)
p.write_text(s)
