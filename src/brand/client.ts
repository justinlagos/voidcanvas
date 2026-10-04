import {
  blobToCanvas,
  canvasToBlob,
  getBrand,
  saveBrand,
  sendHandoff,
} from '@/editor/io'
import { newBrand, useJobs, type ClientBrand } from '@/studio/jobs'
import { MAX_PUBLICATION, systemFor, type Asset, type Snapshot } from './model'
export const dataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = reject
    r.readAsDataURL(blob)
  })
export async function asset(blob: Blob, name: string): Promise<Asset> {
  // Only inert raster images reach the reader. SVG originals stay local.
  const c = await blobToCanvas(blob, 1600)
  return { name, data: await dataUrl(await canvasToBlob(c, 'image/png')) }
}
export async function snapshot(b: ClientBrand): Promise<Snapshot> {
  const logos = await Promise.all(
    b.logos.map(async (l) => ({
      ...(await asset(l.blob, l.name)),
      variant: l.variant,
      w: l.w,
      h: l.h,
    })),
  )
  const imagery = await Promise.all(
    (b.imagery ?? []).map((p) => asset(p.blob, p.name)),
  )
  let system = systemFor(b),
    pages: Asset[] = []
  const source = b.guideline?.source
  if (source) {
    const { eachPage } = await import('@/studio/brand-pages'),
      { analyseLogo } = await import('@/studio/brand/logo')
    const primary = b.logos.find((l) => l.variant === 'primary') ?? b.logos[0]
    const logo = primary
      ? await analyseLogo(
          new File([primary.blob], primary.name, { type: primary.blob.type }),
        )
      : null
    const photos = await Promise.all(
      (b.imagery ?? []).map(async (p) => ({
        ...p,
        img: await blobToCanvas(p.blob, 1600),
      })),
    )
    await eachPage(
      source.pages,
      system,
      logo,
      source.orientation,
      0.7,
      async (c) => {
        pages.push({
          name: `Guideline page ${pages.length + 1}`,
          data: c.toDataURL('image/jpeg', 0.8),
        })
      },
      source.decisions,
      photos,
    )
  } else if (b.guideline) {
    const old = b.guideline.system
    const same =
      old.name === b.name &&
      old.fonts.heading.family === b.display &&
      old.fonts.body.family === b.body &&
      b.colors
        .filter((c) => ['primary', 'secondary', 'accent'].includes(c.role))
        .every((c) =>
          old.roles.some((r) => r.hex.toLowerCase() === c.hex.toLowerCase()),
        )
    if (same) {
      system = {
        ...old,
        voice: { tone: b.voice.join(', '), dos: b.dos, donts: b.donts },
      }
      pages = b.guideline.pages
    }
  }
  return {
    name: b.name,
    colors: b.colors,
    display: b.display,
    body: b.body,
    scale: b.scale,
    logoMin: b.logoMin,
    clearSpace: b.clearSpace,
    voice: b.voice,
    dos: b.dos,
    donts: b.donts,
    logos,
    imagery,
    system,
    pages,
  }
}
export async function fingerprint(b: ClientBrand): Promise<string> {
  const {
    updatedAt,
    syncedAt,
    pushedAt,
    publication,
    workspaceId,
    ...content
  } = b
  const files = [
    ...b.logos.map((l) => l.blob),
    ...(b.imagery ?? []).map((l) => l.blob),
  ]
  const digests = await Promise.all(
    files.map(async (f) =>
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', await f.arrayBuffer()),
        ),
      ).join(','),
    ),
  )
  const bytes = new TextEncoder().encode(
    JSON.stringify(content) + digests.join(':'),
  )
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  )
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')
}
export async function publish(
  b: ClientBrand,
  slug: string,
  visibility: 'link' | 'public',
) {
  const body = JSON.stringify({
    snapshot: await snapshot(b),
    sourceId: b.id,
    visibility,
    version: b.publication?.slug === slug ? b.publication.version : 0,
  })
  if (new TextEncoder().encode(body).length > MAX_PUBLICATION)
    throw new Error(
      'This guideline is too large to publish. Use fewer or smaller images.',
    )
  const { freshToken } = await import('@/lib/account')
  const r = await fetch(`/api/brand/${slug}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await freshToken()}`,
    },
    body,
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error)
  return { ...d, fingerprint: await fingerprint(b) } as NonNullable<
    ClientBrand['publication']
  >
}
export async function createWithBrand(b: ClientBrand): Promise<string> {
  await useJobs.getState().saveBrand(b)
  const kit = await getBrand()
  await saveBrand({
    ...kit,
    colors: b.colors.map((c) => c.hex),
    fonts: [b.display, b.body],
    logos: b.logos.map((l) => ({ id: l.id, name: l.name, blob: l.blob })),
  })
  const id = await sendHandoff({
    from: 'brand',
    name: `${b.name} design`,
    images: [],
    palette: b.colors.map((c) => c.hex),
    size: { width: 1080, height: 1350 },
    fonts: { display: b.display, body: b.body },
    brandId: b.id,
  })
  return `/editor?inbox=${id}`
}
export async function importSnapshot(s: Snapshot): Promise<ClientBrand> {
  const logos = await Promise.all(
    s.logos.map(async (l, i) => ({
      id: `logo-${i}`,
      name: l.name,
      blob: await (await fetch(l.data)).blob(),
      w: l.w,
      h: l.h,
      variant: l.variant as ClientBrand['logos'][number]['variant'],
    })),
  )
  return newBrand({
    name: s.name,
    client: s.name,
    colors: s.colors,
    display: s.display,
    body: s.body,
    scale: s.scale,
    logoMin: s.logoMin,
    clearSpace: s.clearSpace,
    voice: s.voice,
    dos: s.dos,
    donts: s.donts,
    logos,
    guideline: { system: s.system, pages: s.pages },
  })
}
