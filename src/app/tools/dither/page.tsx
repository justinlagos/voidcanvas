import { ToolPage } from '@/tools/ToolPage'
import { TOOLS } from '@/tools/defs'
import { metadataForTool } from '@/tools/factory'

const def = TOOLS.dither
export const metadata = metadataForTool(def)

export default function Page() { return <ToolPage def={def} /> }
