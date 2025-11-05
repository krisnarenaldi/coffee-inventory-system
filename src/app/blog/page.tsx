import { getAllPosts } from '@/lib/blog';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coffee Business Blog | CoffeeLogica',
  description: 'Expert insights on coffee inventory management, roastery operations, and business optimization for coffee professionals.',
  keywords: 'coffee business, inventory management, roastery, coffee shop operations',
};

interface BlogPageProps {
  searchParams: {
    tag?: string;
  };
}

export default function BlogPage({ searchParams }: BlogPageProps) {
  const allPosts = getAllPosts();
  const selectedTag = searchParams.tag;
  
  // Filter posts by tag if a tag is selected
  const posts = selectedTag 
    ? allPosts.filter(post => post.tags.includes(selectedTag))
    : allPosts;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="mb-8">
            <Link 
              href="/"
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              ← Back to Home
            </Link>
          </nav>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Coffee Business Blog
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Expert insights on coffee inventory management, roastery operations, and business optimization
            </p>
          </div>
        </div>
      </div>

      {/* Tag Filter Display */}
      {selectedTag && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Filtered by tag:</span>
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
              {selectedTag}
            </span>
            <Link
              href="/blog"
              className="text-amber-600 hover:text-amber-700 text-sm font-medium"
            >
              Clear filter ×
            </Link>
          </div>
        </div>
      )}

      {/* Blog Posts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              No blog posts yet
            </h2>
            <p className="text-gray-600">
              Check back soon for expert insights on coffee business management.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <span className="mx-2">•</span>
                    <span>{post.readTime} min read</span>
                  </div>
                  
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                    <Link 
                      href={`/blog/${post.slug}`}
                      className="hover:text-amber-600 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {post.tags.slice(0, 2).map((tag) => (
                        <Link
                          key={tag}
                          href={`/blog?tag=${encodeURIComponent(tag)}`}
                          className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full hover:bg-amber-200 transition-colors cursor-pointer"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                    
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-amber-600 hover:text-amber-700 font-medium text-sm"
                    >
                      Read more →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>


    </div>
  );
}