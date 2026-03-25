import type { BlogPost, BlogPostListItem, TagWithCount, SearchResult, SeriesInfo, SeriesWithPosts } from '../types/blog';

const BASE = '/api';

export async function fetchPosts(tag?: string): Promise<BlogPostListItem[]> {
  const params = new URLSearchParams();
  if (tag) params.set('tag', tag);
  const query = params.toString();
  const res = await fetch(`${BASE}/posts${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

export async function fetchPost(slug: string): Promise<BlogPost> {
  const res = await fetch(`${BASE}/posts/${slug}`);
  if (!res.ok) throw new Error('Failed to fetch post');
  return res.json();
}

export async function fetchTags(): Promise<string[]> {
  const res = await fetch(`${BASE}/tags`);
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

export async function fetchTagsWithCount(): Promise<TagWithCount[]> {
  const res = await fetch(`${BASE}/tags?counts=true`);
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

export async function searchPosts(q: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/posts/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Failed to search posts');
  return res.json();
}

export async function fetchSeries(): Promise<SeriesInfo[]> {
  const res = await fetch(`${BASE}/series`);
  if (!res.ok) throw new Error('Failed to fetch series');
  return res.json();
}

export async function fetchSeriesBySlug(slug: string): Promise<SeriesWithPosts> {
  const res = await fetch(`${BASE}/series/${slug}`);
  if (!res.ok) throw new Error('Failed to fetch series');
  return res.json();
}
