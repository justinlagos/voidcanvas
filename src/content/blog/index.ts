import type { Post } from '../types'
import { posts } from './posts'

// One post a week. A post dated in the future is queued: it stays out of every list, feed and URL until its day
// (London time), and the blog pages revalidate hourly so it appears without a redeploy.

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) // YYYY-MM-DD

export const isLive = (p: Post, now = today()) => p.date <= now
export const livePosts = (now = today()) => posts.filter(p => isLive(p, now)).sort((a, b) => b.date.localeCompare(a.date))
export const getPost = (slug: string) => posts.find(p => p.slug === slug)
export const allPosts = posts

export const fmtDate = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
