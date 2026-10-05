import { describe, expect, it } from 'vitest'
import { getArticle } from '@/content/learn/index'
import { buildToolLearnGraph, invalidToolLinks, learnForTool, toolForArticle } from './contentGraph'

describe('Learn ↔ tool graph', () => {
  it('has no Learn links to missing quick tools', () => {
    expect(invalidToolLinks()).toEqual([])
  })

  it('connects the halftone search guide to the halftone tool', () => {
    const a = getArticle('make-a-halftone-portrait')!
    expect(toolForArticle(a)?.slug).toBe('halftone')
    expect(learnForTool('halftone').some(x => x.article === a.slug)).toBe(true)
  })

  it('builds a graph for every current tool that Learn mentions', () => {
    const graph = buildToolLearnGraph()
    expect(graph.some(x => x.tool === 'halftone')).toBe(true)
    expect(graph.some(x => x.tool === 'dither')).toBe(true)
    expect(graph.some(x => x.tool === 'glitch')).toBe(true)
  })
})
