import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const pulsoTables = {
  // Encuestas
  surveys: defineTable({
    question: v.string(),
    context: v.optional(v.string()),
    options: v.array(v.string()),
    status: v.union(v.literal('draft'), v.literal('running'), v.literal('completed')),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    worldId: v.optional(v.id('worlds')),
  })
    .index('status', ['status'])
    .index('createdAt', ['createdAt']),

  // Respuestas de los agentes a las encuestas
  surveyResponses: defineTable({
    surveyId: v.id('surveys'),
    playerId: v.string(), // agentId como "a:1", "a:3", etc.
    playerName: v.string(),
    response: v.string(),
    createdAt: v.number(),
  })
    .index('surveyId', ['surveyId'])
    .index('playerId', ['playerId']),

  // Agentes del panel (extensión de playerDescriptions)
  panelAgents: defineTable({
    playerId: v.string(), // "p:0", "p:2", etc.
    name: v.string(),
    age: v.number(),
    gse: v.string(), // Grupo Socioeconómico: AB, C1a, C1b, C2, C3, D, E
    region: v.string(),
    comuna: v.string(),
    politicalLeaning: v.number(), // -100 (izquierda) a 100 (derecha)
    interests: v.array(v.string()),
    worldId: v.id('worlds'),
    isVisible: v.boolean(), // Solo el 5% será visible para no saturar el mapa
    x: v.number(), // Coordenada X en el mapa
    y: v.number(), // Coordenada Y en el mapa
  })
    .index('playerId', ['playerId'])
    .index('gse', ['gse'])
    .index('region', ['region'])
    .index('isVisible', ['isVisible']),
};