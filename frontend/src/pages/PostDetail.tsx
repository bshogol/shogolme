import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, ArrowRight, Clock, Eye } from 'lucide-react';
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
      <div className="max-w-4xl mx-auto px-6 py-24 text-df-text-dim text-[15px] animate-pulse">
        Loading post...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-df-red text-[15px] border border-df-border rounded-xl px-6 py-4 bg-[#050508]">
          Post not found or failed to load.
        </div>
        <Link to="/" className="text-[14px] text-df-accent mt-4 inline-block hover:text-df-accent-hover transition-colors">
          ← Back to posts
        </Link>
      </div>
    );
  }

  const tocItems = extractTOC(post.content);
  const readingTime = Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200));

  const currentIdx = allPosts?.findIndex((p) => p.slug === post.slug) ?? -1;
  const prevPost = currentIdx > 0 ? allPosts![currentIdx - 1] : null;
  const nextPost = currentIdx >= 0 && currentIdx < (allPosts?.length ?? 0) - 1 ? allPosts![currentIdx + 1] : null;

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
        {/* Mobile TOC */}
        {tocItems.length > 0 && <MobileTOC items={tocItems} />}

        <div className="flex gap-12">
          <article className="flex-1 min-w-0 max-w-4xl">
            {/* Back link */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[14px] text-df-accent hover:text-df-accent-hover transition-colors mb-8"
            >
              <ArrowLeft size={14} />
              Back
            </Link>

            {/* Series navigation */}
            {post.series && <SeriesNav series={post.series} currentSlug={post.slug} />}

            {/* Post header */}
            <header className="mb-10">
              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  {post.tags.map((t) => (
                    <Link
                      key={t}
                      to={`/?tag=${t}`}
                      className="px-2.5 py-0.5 text-[12px] rounded-full border border-df-border text-df-accent hover:border-df-accent/30 transition-colors"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              )}

              <h1 className="text-[clamp(2rem,5vw,2.75rem)] font-bold text-df-text-bright tracking-[-0.03em] leading-[1.15] mb-4">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-[13px] text-df-text-dim">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {new Date(post.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {readingTime} min read
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye size={13} />
                  {post.view_count} views
                </span>
              </div>
            </header>

            {/* Markdown content */}
            <div className="prose-df text-[15px] leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeSlug]}
                components={{
                  pre({ children }) {
                    const codeChild = Array.isArray(children)
                      ? children.find((c: any) => c?.type === 'code' || c?.props?.className)
                      : (children as any);
                    const className = codeChild?.props?.className ?? '';

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
              <div className="mt-16 pt-8 border-t border-[#111] grid grid-cols-2 gap-6">
                {prevPost ? (
                  <Link
                    to={`/post/${prevPost.slug}`}
                    className="group flex flex-col gap-1.5 text-left"
                  >
                    <span className="text-[12px] uppercase tracking-wider text-df-text-dim flex items-center gap-1 font-medium">
                      <ArrowLeft size={11} /> Previous
                    </span>
                    <span className="text-[15px] text-df-text group-hover:text-df-accent transition-colors line-clamp-1">
                      {prevPost.title}
                    </span>
                  </Link>
                ) : <div />}
                {nextPost ? (
                  <Link
                    to={`/post/${nextPost.slug}`}
                    className="group flex flex-col gap-1.5 text-right"
                  >
                    <span className="text-[12px] uppercase tracking-wider text-df-text-dim flex items-center gap-1 justify-end font-medium">
                      Next <ArrowRight size={11} />
                    </span>
                    <span className="text-[15px] text-df-text group-hover:text-df-accent transition-colors line-clamp-1">
                      {nextPost.title}
                    </span>
                  </Link>
                ) : <div />}
              </div>
            )}
          </article>

          {/* Right sidebar - TOC (desktop) */}
          {tocItems.length > 0 && (
            <aside className="hidden lg:block w-56 shrink-0 pt-24">
              <TableOfContents items={tocItems} />
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
