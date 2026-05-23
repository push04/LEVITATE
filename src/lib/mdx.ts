import matter from 'gray-matter';
import { serialize } from 'next-mdx-remote/serialize';

export interface MdxPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  readingTime: string;
}

export async function getPostBySlug(slug: string): Promise<MdxPost | null> {
  return null;
}

export async function getAllPosts(): Promise<MdxPost[]> {
  return [];
}
