import { v } from 'convex/values';
import { action, internalAction } from '../_generated/server';
import { api, internal } from '../_generated/api';
import { 
  saveNewsToSupabase, 
  searchSimilarNews,
  generateEmbedding 
} from '../lib/supabase';

// Interfaz para noticias de GNews
export interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
  url: string;
  image?: string;
  category?: string[];
}

// Action para obtener noticias de GNews y guardarlas en Supabase
export const fetchAndSaveNews = action({
  args: {
    query: v.optional(v.string()),
    category: v.optional(v.string()),
    country: v.optional(v.string()),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) {
      throw new Error('GNEWS_API_KEY no está configurado');
    }

    const maxResults = args.maxResults || 10;
    const query = args.query || 'Chile';
    const category = args.category || 'general';
    const country = args.country || 'cl';

    const url = new URL('https://gnews.io/api/v4/search');
    url.searchParams.append('q', query);
    url.searchParams.append('category', category);
    url.searchParams.append('country', country);
    url.searchParams.append('max', maxResults.toString());
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('lang', 'es');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Error fetching GNews: ${response.statusText}`);
    }

    const data = await response.json();
    const articles: GNewsArticle[] = data.articles || [];

    // Guardar cada noticia en Supabase con su embedding
    const savedCount = await Promise.allSettled(
      articles.map(async (article) => {
        try {
          await saveNewsToSupabase({
            title: article.title,
            content: article.description || article.content || '',
            published_at: article.publishedAt,
            tags: article.category || [category],
          });
          return true;
        } catch (error) {
          console.error('Error guardando artículo:', article.title, error);
          return false;
        }
      })
    );

    const successCount = savedCount.filter(r => r.status === 'fulfilled' && r.value).length;

    return {
      total: articles.length,
      saved: successCount,
      articles: articles.map(a => ({
        title: a.title,
        url: a.url,
        publishedAt: a.publishedAt,
      })),
    };
  },
});

// Action para buscar noticias relevantes por similitud vectorial
export const searchRelevantNews = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    const similarNews = await searchSimilarNews(args.query, limit);
    
    return similarNews.map(news => ({
      title: news.title,
      content: news.content,
      published_at: news.published_at,
      tags: news.tags,
    }));
  },
});

// Action para obtener contexto de noticias para un agente
export const getNewsContextForAgent = action({
  args: {
    agentId: v.string(),
    interests: v.array(v.string()),
    region: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 3;
    
    // Construir query basado en intereses y región del agente
    const queryTerms = [
      ...args.interests,
      args.region,
      'Chile',
    ].join(' ');

    const relevantNews = await searchSimilarNews(queryTerms, limit);
    
    return relevantNews.map(news => ({
      title: news.title,
      content: news.content,
      published_at: news.published_at,
      tags: news.tags,
    }));
  },
});

// Internal action para generar embedding de texto
export const generateTextEmbedding = internalAction({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return await generateEmbedding(args.text);
  },
});
