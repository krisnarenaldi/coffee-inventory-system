import { getPostBySlug, getAllPosts, getRelatedPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  
  if (!post) {
    return {
      title: 'Post Not Found | CoffeeLogica Blog',
    };
  }

  return {
    title: `${post.title} | CoffeeLogica Blog`,
    description: post.excerpt,
    keywords: post.tags.join(', '),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getPostBySlug(params.slug);
  
  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(post.slug, post.tags);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="mb-8">
            <Link 
              href="/blog"
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              ← Back to Blog
            </Link>
          </nav>
          
          <div className="text-center">
            <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              <span className="mx-2">•</span>
              <span>{post.readTime} min read</span>
              <span className="mx-2">•</span>
              <span>By {post.author}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {post.tags.map((tag) => (
                
                  <Link
                          key={tag}
                          href={`/blog?tag=${encodeURIComponent(tag)}`}
                          className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full hover:bg-amber-200 transition-colors cursor-pointer"
                        >
                  {tag}
                  </Link>
                
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-gray-700 mb-4 space-y-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-700">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900">{children}</strong>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-amber-500 pl-4 italic text-gray-600 my-6">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
                a: ({ href, children }) => (
                  <a 
                    href={href}
                    className="text-amber-600 hover:text-amber-700 underline"
                    target={href?.startsWith('http') ? '_blank' : undefined}
                    rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <article
                  key={relatedPost.slug}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    <Link 
                      href={`/blog/${relatedPost.slug}`}
                      className="hover:text-amber-600 transition-colors"
                    >
                      {relatedPost.title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {relatedPost.excerpt}
                  </p>
                  <div className="text-xs text-gray-500">
                    {relatedPost.readTime} min read
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-12 bg-amber-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Optimize Your Coffee Business?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            CoffeeLogica provides comprehensive inventory management and business optimization tools designed specifically for coffee professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pitch"
              className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              Learn More
            </Link>
            <Link
              href="/blog"
              className="border border-amber-600 text-amber-600 px-6 py-3 rounded-lg hover:bg-amber-50 transition-colors font-medium"
            >
              Read More Articles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}