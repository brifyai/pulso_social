"use node";
import { action } from '../_generated/server';
import { v } from 'convex/values';
import { supabase } from '../lib/supabase';

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
// Optimizado para evitar duplicados y manejar errores de self-hosted
export const getChileanNews = action({
  args: { 
    max: v.optional(v.number()), // Cuántas noticias traer (Default 5)
    forceRefresh: v.optional(v.boolean()) // Forzar bajada de GNews (costoso)
  },
  handler: async (ctx, args) => {
    try {
      // 1. Obtener noticias frescas de GNews
      const apiKey = process.env.GNEWS_API_KEY;
      if (!apiKey) throw new Error("Falta GNEWS_API_KEY");

      const limit = args.max || 5;
      const url = `https://gnews.io/api/v4/top-headlines?country=cl&lang=es&max=${limit}&apikey=${apiKey}`;
      
      console.log("📡 Bajando noticias de GNews...");
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.articles) throw new Error("Error en respuesta de GNews");

      const articles = data.articles;
      const processedNews: string[] = [];

      // 2. Procesar cada noticia (Generar Vector + Guardar en Supabase)
      // Usamos Promise.all para velocidad
      await Promise.all(articles.map(async (art: any) => {
        
        // A. Verificar si ya existe en Supabase (por URL) para no duplicar
        const { data: existing } = await supabase
          .from("news_archive")
          .select("id")
          .eq("url", art.url)
          .single();

        if (existing) {
          console.log(`ℹ️ Noticia ya existe: ${art.title}`);
          processedNews.push(`[EXISTENTE] ${art.title}`);
          return; // Saltamos
        }

        // B. Generar Embedding (Vector) con OpenAI
        // Combinamos Título + Descripción para mejor contexto semántico
        const textToEmbed = `${art.title} ${art.description || ""}`;
        
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) throw new Error("Falta OPENAI_API_KEY");

        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: textToEmbed.substring(0, 8000), // Cortamos por seguridad
            dimensions: 1536,
          }),
        });

        if (!embeddingResponse.ok) {
          throw new Error(`Error generando embedding: ${embeddingResponse.statusText}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        // C. Insertar en Supabase Self-Hosted
        const { error } = await supabase.from("news_archive").insert({
          title: art.title,
          content: art.description || "",
          source: art.source.name || "Desconocido",
          url: art.url,
          published_at: art.publishedAt || new Date().toISOString(),
          tags: art.category || [], // Podrías usar GPT para generar tags aquí
          embedding: embedding, // ¡Guardamos el vector!
        });

        if (error) {
          console.error(`❌ Error Supabase al guardar '${art.title}':`, error);
        } else {
          console.log(`✅ Noticia guardada y vectorizada: ${art.title}`);
          processedNews.push(`[NUEVA] ${art.title}`);
        }

      }));

      // 3. Retornar resumen al Frontend (Contexto manual)
      return processedNews.join("\n");

    } catch (error) {
      console.error("Fallo crítico en getChileanNews:", error);
      throw new Error(`Error al procesar noticias: ${error}`);
    }
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
    
    // Generar embedding de la query
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) throw new Error("Falta OPENAI_API_KEY");

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: args.query,
        dimensions: 1536,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Error generando embedding: ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;
    
    // Buscar en Supabase usando RPC
    const { data, error } = await supabase.rpc('match_news', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
    });

    if (error) {
      console.error('Error buscando noticias similares:', error);
      throw error;
    }

    return data || [];
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

    const relevantNews = await searchRelevantNews(queryTerms, limit);
    
    return relevantNews.map((news: any) => ({
      title: news.title,
      content: news.content,
      published_at: news.published_at,
      tags: news.tags,
    }));
  },
});

// Internal action para generar embedding de texto
export const generateTextEmbedding = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) throw new Error("Falta OPENAI_API_KEY");

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: args.text,
        dimensions: 1536,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error generando embedding: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  },
});
