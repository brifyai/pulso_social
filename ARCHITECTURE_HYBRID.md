# Arquitectura Híbrida: Convex + Supabase

## 📋 Resumen

Pulso Social utiliza una arquitectura híbrida que combina **Convex** (Hot Storage) y **Supabase** (Cold Storage + Vector Database) para optimizar el rendimiento y la escalabilidad.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│                   Vite + React Router                       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│    CONVEX     │         │   SUPABASE    │
│  (Hot Storage)│         │(Cold Storage) │
└───────────────┘         └───────────────┘
```

## 🔥 Convex (Hot Storage & Lógica de Juego)

Convex maneja los datos en tiempo real necesarios para la simulación:

### Tablas en Convex

| Tabla | Propósito | Campos Clave |
|-------|-----------|--------------|
| `surveys` | Encuestas activas | question, options, status |
| `surveyResponses` | Votos en tiempo real | surveyId, playerId, response |
| `panelAgents` | Datos demográficos de agentes | name, gse, region, x, y, isVisible |
| `worlds` | Mundos del juego | map, players |
| `players` | Jugadores en el mapa | position, conversation |

### Funciones en Convex

- **Queries**: `listSurveys`, `getSurvey`, `listVisibleAgents`, `getRegionStats`
- **Mutations**: `createSurvey`, `addSurveyResponse`, `createPanelAgent`
- **Actions**: `fetchAndSaveNews`, `searchRelevantNews`, `getNewsContextForAgent`

## 💾 Supabase (Cold Storage & Vector Database)

Supabase almacena datos históricos y permite búsqueda semántica con embeddings.

### Tablas en Supabase

#### `news_archive`
Almacena noticias históricas con embeddings para búsqueda semántica.

```sql
CREATE TABLE news_archive (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    tags TEXT[] NOT NULL,
    embedding vector(1536)
);
```

#### `agent_memories`
Almacena memorias de agentes con embeddings para recuperación contextual.

```sql
CREATE TABLE agent_memories (
    id BIGINT PRIMARY KEY,
    agent_convex_id TEXT NOT NULL,
    memory_text TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE
);
```

### Funciones RPC en Supabase

- `match_news(query_embedding, match_threshold, match_count)`: Busca noticias similares
- `match_agent_memories(query_embedding, agent_id, match_threshold, match_count)`: Busca memorias de un agente
- `search_news_by_tags(search_tags, limit_count)`: Busca noticias por tags
- `get_agent_memories_count(agent_id)`: Cuenta memorias de un agente

## 🔄 Flujo de Datos

### 1. Obtener Noticias de GNews

```
Convex Action (fetchAndSaveNews)
    ↓
GNews API
    ↓
Generar Embedding (OpenAI)
    ↓
Guardar en Supabase (news_archive)
```

### 2. Agente Necesita Contexto

```
Agente solicita contexto
    ↓
Convex Action (getNewsContextForAgent)
    ↓
Supabase RPC (match_news)
    ↓
Retornar noticias relevantes
```

### 3. Guardar Memoria de Agente

```
Agente genera memoria
    ↓
Convex Action
    ↓
Generar Embedding (OpenAI)
    ↓
Guardar en Supabase (agent_memories)
```

## 🚀 Configuración

### 1. Configurar Supabase

1. Crear un proyecto en https://supabase.com
2. Ejecutar el script SQL en `supabase_setup.sql` en el SQL Editor
3. Obtener las credenciales en Settings → API

### 2. Variables de Entorno

```bash
# Convex
VITE_CONVEX_URL=https://tu-proyecto.convex.cloud
CONVEX_DEPLOYMENT=tu-deployment-id

# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_ANON_KEY=eyJhbGci...

# GNews (opcional)
GNEWS_API_KEY=...
```

### 3. Instalar Dependencias

```bash
npm install @supabase/supabase-js
```

## 📊 Ventajas de la Arquitectura

### Convex (RAM)
- ✅ Tiempo real para movimientos y votos
- ✅ Queries optimizadas para datos en vivo
- ✅ Mutaciones atómicas
- ✅ Subscriptions automáticas

### Supabase (Disco Inteligente)
- ✅ Almacenamiento ilimitado de noticias históricas
- ✅ Búsqueda semántica con embeddings
- ✅ PostgreSQL completo con extensiones
- ✅ Costo menor para grandes volúmenes de datos

## 🔧 Uso

### Obtener y Guardar Noticias

```typescript
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

function NewsManager() {
  const fetchNews = useAction(api['pulso/index'].fetchAndSaveNews);

  const handleFetch = async () => {
    const result = await fetchNews({
      query: 'Chile política',
      category: 'politics',
      maxResults: 10,
    });
    console.log(`Guardadas ${result.saved} de ${result.total} noticias`);
  };

  return <button onClick={handleFetch}>Obtener Noticias</button>;
}
```

### Buscar Noticias Relevantes

```typescript
const searchNews = useAction(api['pulso/index'].searchRelevantNews);

const handleSearch = async () => {
  const news = await searchNews({
    query: 'delincuencia Santiago',
    limit: 5,
  });
  console.log('Noticias relevantes:', news);
};
```

### Obtener Contexto para Agente

```typescript
const getContext = useAction(api['pulso/index'].getNewsContextForAgent);

const handleGetContext = async (agentId: string) => {
  const agent = await getAgent(agentId);
  const context = await getContext({
    agentId,
    interests: agent.interests,
    region: agent.region,
    limit: 3,
  });
  console.log('Contexto del agente:', context);
};
```

## 📝 Notas

- Los embeddings se generan usando OpenAI `text-embedding-3-small` (1536 dimensiones)
- El umbral de similitud por defecto es 0.7
- Solo el 5% de los agentes son visibles (embajadores) para optimizar rendimiento
- Las noticias se guardan en Supabase, no en Convex, para evitar saturar el hot storage
