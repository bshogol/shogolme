export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  published: boolean;
  view_count: number;
  series_id?: string;
  series_order?: number;
  series?: PostSeriesInfo;
}

export interface BlogPostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  created_at: string;
  published: boolean;
  view_count: number;
  series_id?: string;
  series_order?: number;
}

export interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export interface SeriesInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface SeriesPostItem {
  id: string;
  slug: string;
  title: string;
  series_order: number;
}

export interface PostSeriesInfo {
  id: string;
  slug: string;
  name: string;
  posts: SeriesPostItem[];
}

export interface SeriesWithPosts extends SeriesInfo {
  posts: SeriesPostItem[];
}

export interface SearchResult {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  created_at: string;
  snippet: string;
  rank: number;
}

export interface TagWithCount {
  name: string;
  count: number;
}
