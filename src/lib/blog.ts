import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'src/content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  author: string;
  tags: string[];
  content: string;
  readTime: number;
}

export function getAllPosts(): BlogPost[] {
  try {
    if (!fs.existsSync(postsDirectory)) {
      return [];
    }

    const fileNames = fs.readdirSync(postsDirectory);
    const allPostsData = fileNames
      .filter(fileName => fileName.endsWith('.md'))
      .map((fileName) => {
        const slug = fileName.replace(/\.md$/, '');
        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);

        // Calculate read time (average 200 words per minute)
        const wordCount = content.split(/\s+/).length;
        const readTime = Math.ceil(wordCount / 200);

        return {
          slug,
          title: data.title || 'Untitled',
          date: data.date || new Date().toISOString(),
          excerpt: data.excerpt || content.substring(0, 160) + '...',
          author: data.author || 'CoffeeLogica Team',
          tags: data.tags || [],
          content,
          readTime,
        } as BlogPost;
      });

    return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch (error) {
    console.error('Error reading blog posts:', error);
    return [];
  }
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    // Calculate read time
    const wordCount = content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    return {
      slug,
      title: data.title || 'Untitled',
      date: data.date || new Date().toISOString(),
      excerpt: data.excerpt || content.substring(0, 160) + '...',
      author: data.author || 'CoffeeLogica Team',
      tags: data.tags || [],
      content,
      readTime,
    } as BlogPost;
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
}

export function getRelatedPosts(currentSlug: string, tags: string[], limit: number = 3): BlogPost[] {
  const allPosts = getAllPosts();
  
  return allPosts
    .filter(post => post.slug !== currentSlug)
    .filter(post => post.tags.some(tag => tags.includes(tag)))
    .slice(0, limit);
}