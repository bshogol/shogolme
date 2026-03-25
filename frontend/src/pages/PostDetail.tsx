import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, ArrowRight, Tag, Clock, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { fetchPost, fetchPosts } from '../api/posts';
import { extractTOC } from '../lib/toc';
import { TableOfContents } from '../components/TableOfContents';
import { MobileTOC } from '../components/MobileTOC';
import { CodeBlock } from '../components/CodeBlock';
import { MermaidBlock } from '../components/MermaidBlock';
import { SeriesNav } from '../components/SeriesNav';
import { ReadingProgress } from '../components/ReadingProgress';

function extractTextContent(node: any): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  if (node?.props?.children) return extractTextContent(node.props.children);
  return '';
}

export function PostDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchPost(slug!),
    enabled: !!slug,
  });

  const { data: allPosts } = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetchPosts(),
  });

  if (isLoading) {
    return (
      <div className="px-4 py-8 max-w-3xl mx-auto text-terminal-text-dim text-sm animate-pulse">
        <span className="text-terminal-yellow">⟳</span> Loading post...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <div className="text-terminal-red text-sm border border-terminal-red/30 rounded px-3 py-2 bg-terminal-red/5">
          <span className="font-semibold">error:</span> Post not found or failed to load.
        </div>
        <Link to="/" className="text-xs text-terminal-accent mt-4 inline-block hover:underline">
          ← back to posts
        </Link>
      </div>
    );
  }

  const tocItems = extractTOC(post.content);
  const readingTime = Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200));

  // Find prev/next posts
  const currentIdx = allPosts?.findIndex((p) => p.slug === post.slug) ?? -1;
  const prevPost = currentIdx > 0 ? allPosts![currentIdx - 1] : null;
  const nextPost = currentIdx >= 0 && currentIdx < (allPosts?.length ?? 0) - 1 ? allPosts![currentIdx + 1] : null;

  return (
    <>
      <ReadingProgress />
      <div className="px-4 py-8">
        {/* Mobile TOC */}
        {tocItems.length > 0 && <MobileTOC items={tocItems} />}

        <div className="flex gap-8">
          {/* Main content */}
          <article className="flex-1 min-w-0">
            {/* Back link */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-terminal-text-dim hover:text-terminal-accent transition-colors mb-6"
            >
              <ArrowLeft size={12} />
              cd ..
            </Link>

            {/* Series navigation */}
            {post.series && <SeriesNav series={post.series} currentSlug={post.slug} />}

            {/* Post header */}
            <header className="mb-8">
              <div className="text-xs text-terminal-text-dim mb-2">
                <span className="text-terminal-green">$</span> cat {post.slug}.md
              </div>
              <h1 className="text-2xl font-bold text-terminal-text-bright mb-3">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-terminal-text-dim">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(post.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {readingTime} min read
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  {post.view_count} views
                </span>
                {post.tags.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Tag size={12} />
                    {post.tags.map((t) => (
                      <Link
                        key={t}
                        to={`/?tag=${t}`}
                        className="text-terminal-accent hover:text-terminal-accent transition-colors"
                      >
                        #{t}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </header>

            {/* Markdown content */}
            <div className="prose-terminal text-sm leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeSlug]}
                components={{
                  pre({ children }) {
                    const codeChild = Array.isArray(children)
                      ? children.find((c: any) => c?.type === 'code' || c?.props?.className)
                      : (children as any);
                    const className = codeChild?.props?.className ?? '';

                    // Detect mermaid code blocks
                    if (className.includes('language-mermaid')) {
                      const code = extractTextContent(codeChild?.props?.children);
                      return <MermaidBlock code={code.trim()} />;
                    }

                    return (
                      <CodeBlock className={className}>
                        {children}
                      </CodeBlock>
                    );
                  },
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Prev / Next navigation */}
            {(prevPost || nextPost) && (
              <div className="mt-12 pt-6 border-t border-terminal-border grid grid-cols-2 gap-4">
                {prevPost ? (
                  <Link
                    to={`/post/${prevPost.slug}`}
                    className="group flex flex-col gap-1 text-left"
                  >
                    <span className="text-[10px] uppercase tracking-wider text-terminal-text-dim flex items-center gap-1">
                      <ArrowLeft size={10} /> previous
                    </span>
                    <span className="text-xs text-terminal-text group-hover:text-terminal-accent transition-colors line-clamp-1">
                      {prevPost.title}
                    </span>
                  </Link>
                ) : <div />}
                {nextPost ? (
                  <Link
                    to={`/post/${nextPost.slug}`}
                    className="group flex flex-col gap-1 text-right"
                  >
                    <span className="text-[10px] uppercase tracking-wider text-terminal-text-dim flex items-center gap-1 justify-end">
                      next <ArrowRight size={10} />
                    </span>
                    <span className="text-xs text-terminal-text group-hover:text-terminal-accent transition-colors line-clamp-1">
                      {nextPost.title}
                    </span>
                  </Link>
                ) : <div />}
              </div>
            )}
          </article>

          {/* Right sidebar - TOC (desktop) */}
          {tocItems.length > 0 && (
            <aside className="hidden lg:block w-56 shrink-0 pt-20">
              <TableOfContents items={tocItems} />
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
