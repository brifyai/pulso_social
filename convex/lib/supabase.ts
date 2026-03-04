import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cliente de Supabase para Cold Storage y Vector Database
// Configurado para Self-Hosted (puede requerir ajustes de SSL en local)

let supabaseClient: SupabaseClient | null = null;

// Función para obtener el cliente (lazy initialization)
function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan credenciales de Supabase (URL o SERVICE_ROLE_KEY) en Convex ENV.');
  }

  // Configuración para Self-Hosted
  // A veces SSL falla en local, cuidado con certificados
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // No necesitamos sesión de usuario en el servidor
      autoRefreshToken: false,
    },
  });
  
  return supabaseClient;
}

// Exportar el cliente como un getter para uso directo
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    return client[prop as keyof SupabaseClient];
  },
});

// Tipos para las tablas de Supabase
export interface NewsArchive {
  id?: bigint;
  title: string;
  content: string;
  source?: string;
  url?: string;
  published_at: string;
  tags: string[];
  embedding?: number[];
}

export interface AgentMemory {
  id?: bigint;
  agent_convex_id: string;
  memory_text: string;
  embedding?: number[];
  created_at?: string;
}

// Función para generar embeddings usando OpenAI
export async function generateEmbedding(text: string): Promise<number[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY no está configurado');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error generando embedding: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Guardar noticia en Supabase con embedding
export async function saveNewsToSupabase(news: {
  title: string;
  content: string;
  source?: string;
  url?: string;
  published_at: string;
  tags: string[];
}): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const embedding = await generateEmbedding(`${news.title}. ${news.content}`);
    
    const { error } = await supabase
      .from('news_archive')
      .insert({
        title: news.title,
        content: news.content,
        source: news.source,
        url: news.url,
        published_at: news.published_at,
        tags: news.tags,
        embedding,
      });

    if (error) {
      console.error('Error guardando noticia en Supabase:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error en saveNewsToSupabase:', error);
    throw error;
  }
}

// Buscar noticias similares por similitud vectorial
export async function searchSimilarNews(query: string, limit: number = 5): Promise<NewsArchive[]> {
  try {
    const supabase = getSupabaseClient();
    const queryEmbedding = await generateEmbedding(query);
    
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
  } catch (error) {
    console.error('Error en searchSimilarNews:', error);
    throw error;
  }
}

// Guardar memoria de agente en Supabase
export async function saveAgentMemoryToSupabase(memory: {
  agent_convex_id: string;
  memory_text: string;
}): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const embedding = await generateEmbedding(memory.memory_text);
    
    const { error } = await supabase
      .from('agent_memories')
      .insert({
        agent_convex_id: memory.agent_convex_id,
        memory_text: memory.memory_text,
        embedding,
      });

    if (error) {
      console.error('Error guardando memoria en Supabase:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error en saveAgentMemoryToSupabase:', error);
    throw error;
  }
}

// Buscar memorias similares de un agente
export async function searchAgentMemories(
  agent_convex_id: string,
  query: string,
  limit: number = 5
): Promise<AgentMemory[]> {
  try {
    const supabase = getSupabaseClient();
    const queryEmbedding = await generateEmbedding(query);
    
    const { data, error } = await supabase.rpc('match_agent_memories', {
      query_embedding: queryEmbedding,
      agent_id: agent_convex_id,
      match_threshold: 0.7,
      match_count: limit,
    });

    if (error) {
      console.error('Error buscando memorias del agente:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error en searchAgentMemories:', error);
    throw error;
  }
}
