import assert from 'node:assert/strict'
import { buildArtifact, normalise, parseCsv } from './growth-discovery.mjs'

const header = 'query,cluster,intent,audience,problem,outcome,existing,gap,title,primary,secondary,competition,opportunity,connection,type,cta,links,priority,status'
const good = `${header}\n"poster, print",Print,workflow,designer,problem,outcome,,gap,title,primary,secondary,L,H,Editor,guide,Open Editor,,1,planned\n`

const rows = parseCsv(good)
assert.equal(rows.length, 2)
assert.equal(rows[1][0], 'poster, print')

const records = normalise(rows)
assert.equal(records.length, 1)
assert.equal(records[0].priority, 1)
assert.equal(records[0].competition, 'L')
assert.equal(records[0].opportunity, 'H')

const artifact = buildArtifact(records)
assert.equal(artifact.total, 1)
assert.deepEqual(artifact.clusters, ['Print'])
assert.match(artifact.evidence, /No search-volume/)
assert.equal('volume' in artifact, false)
assert.equal('keywordDifficulty' in artifact, false)

assert.throws(() => normalise(parseCsv(`${header}\nq,c,i,a,p,o,,g,t,pr,s,X,H,c,t,cta,,1,planned\n`)), /invalid competition/)
assert.throws(() => normalise(parseCsv(`${header}\nq,c,i,a,p,o,,g,t,pr,s,L,H,c,t,cta,,9,planned\n`)), /priority must be 1-5/)
assert.throws(() => normalise(parseCsv(`${header}\nq,c,i,a,p,o,,g,t,pr,s,L,H,c,t,cta,,1,planned\nq,c,i,a,p,o,,g,t,pr,s,L,H,c,t,cta,,1,planned\n`)), /Duplicate query/)
assert.throws(() => parseCsv(`${header}\n"unclosed`), /unclosed quoted field/)

console.log('Growth discovery parser tests passed')
